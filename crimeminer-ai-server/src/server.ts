import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import multer from 'multer';
import { PrismaClient, CaseStatus } from '@prisma/client';
import timeout from 'connect-timeout';
import { 
  analyzeText, 
  extractEntities, 
  summarizeEvidence, 
  analyzeSentimentAndIntent, 
  identifyPatterns 
} from './lib/ai';
import {
  ALLOWED_FILE_TYPES,
  saveFile,
  getFile,
  listFiles,
  deleteFile
} from './lib/storage';
import { listFilesByCase } from './lib/files';
import {
  createReference,
  getReferencesForFile,
  getReferencesForEntity,
  extractEntitiesAndCreateReferences,
  generateReferenceReport
} from './lib/references';
import {
  createCase,
  getCases,
  getCaseById,
  updateCase,
  deleteCase,
  addEvidenceToCase,
  removeEvidenceFromCase,
  addCaseNote,
  getCaseStats
} from './lib/cases';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 4000;

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Helper function to handle BigInt serialization
const serializeWithBigInt = (data: any) => {
  return JSON.parse(JSON.stringify(data, (key, value) => 
    typeof value === 'bigint' ? value.toString() : value
  ));
};

// Middleware setup
app.use(cors({
  origin: '*', // Allow all origins during development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Set timeout for all requests to 3 minutes
app.use(timeout('180s'));
app.use((req: Request & { timedout?: boolean }, res: Response, next: NextFunction) => {
  if (!req.timedout) next();
});

// Basic health check route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'CrimeMiner AI Backend API running successfully!' });
});

// Dedicated health check endpoint for frontend connectivity verification
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'CrimeMiner AI Backend is healthy' });
});

// Original AI analysis route (maintained for backward compatibility)
app.post('/api/analyze', async (req: Request, res: Response) => {
  const { prompt } = req.body;

  if (!prompt) {
    res.status(400).json({ error: 'Prompt is required.' });
    return;
  }

  try {
    console.log('Analyzing prompt:', prompt);
    const analysisResult = await analyzeText(prompt);
    res.status(200).json({ analysis: analysisResult });
  } catch (error: any) {
    console.error('AI analysis error:', error);
    res.status(500).json({ error: 'AI analysis failed', details: error.message });
  }
});

// New endpoint for entity extraction
app.post('/api/extract-entities', async (req: Request, res: Response) => {
  const { text } = req.body;

  if (!text) {
    res.status(400).json({ error: 'Text is required.' });
    return;
  }

  try {
    console.log('Extracting entities from text:', text);
    const entities = await extractEntities(text);
    res.status(200).json(entities);
  } catch (error: any) {
    console.error('Entity extraction error:', error);
    res.status(500).json({ error: 'Entity extraction failed', details: error.message });
  }
});

// New endpoint for evidence summarization
app.post('/api/summarize', async (req: Request, res: Response) => {
  const { text, maxLength } = req.body;

  if (!text) {
    res.status(400).json({ error: 'Text is required.' });
    return;
  }

  try {
    console.log('Summarizing text:', text);
    const summary = await summarizeEvidence(text, maxLength);
    res.status(200).json(summary);
  } catch (error: any) {
    console.error('Summarization error:', error);
    res.status(500).json({ error: 'Summarization failed', details: error.message });
  }
});

// New endpoint for sentiment and intent analysis
app.post('/api/analyze-sentiment', async (req: Request, res: Response) => {
  const { text } = req.body;

  if (!text) {
    res.status(400).json({ error: 'Text is required.' });
    return;
  }

  try {
    console.log('Analyzing sentiment for text:', text);
    const sentimentAnalysis = await analyzeSentimentAndIntent(text);
    res.status(200).json(sentimentAnalysis);
  } catch (error: any) {
    console.error('Sentiment analysis error:', error);
    res.status(500).json({ error: 'Sentiment analysis failed', details: error.message });
  }
});

// New endpoint for criminal pattern identification
app.post('/api/identify-patterns', async (req: Request, res: Response) => {
  const { text } = req.body;

  if (!text) {
    res.status(400).json({ error: 'Text is required.' });
    return;
  }

  try {
    console.log('Identifying patterns in text:', text);
    const patterns = await identifyPatterns(text);
    res.status(200).json(patterns);
  } catch (error: any) {
    console.error('Pattern identification error:', error);
    res.status(500).json({ error: 'Pattern identification failed', details: error.message });
  }
});

// File Upload Routes

// Upload a file
app.post('/api/files/upload', upload.single('file'), async (req: Request, res: Response) => {
  console.log('[UPLOAD ENDPOINT] File upload request received');
  
  try {
    if (!req.file) {
      console.error('[UPLOAD ENDPOINT] No file in request');
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Require caseId in the request body
    const { caseId } = req.body;
    if (!caseId) {
      console.error('[UPLOAD ENDPOINT] No caseId provided');
      res.status(400).json({ error: 'caseId is required for uploads' });
      return;
    }

    console.log(`[UPLOAD ENDPOINT] Processing upload with caseId: ${caseId}`);

    // Validate that the case exists
    try {
      const caseExists = await prisma.case.findUnique({
        where: { id: caseId }
      });
      
      if (!caseExists) {
        console.error(`[UPLOAD ENDPOINT] Case with ID ${caseId} not found`);
        res.status(404).json({ error: `Case with ID ${caseId} not found` });
        return;
      }
      
      console.log(`[UPLOAD ENDPOINT] Case validated: ${caseExists.title} (${caseExists.caseNumber})`);
    } catch (caseError: any) {
      console.error('[UPLOAD ENDPOINT] Error validating case:', caseError);
      res.status(500).json({ 
        error: 'Error validating case',
        details: caseError.message
      });
      return;
    }

    const { originalname, mimetype, buffer, size } = req.file;
    console.log(`[UPLOAD ENDPOINT] Processing file: ${originalname} (${mimetype}, ${size} bytes) for case ${caseId}`);
    
    // Save the file
    try {
      const metadata = await saveFile(buffer, originalname, mimetype, caseId);
      console.log(`[UPLOAD ENDPOINT] File saved successfully with ID: ${metadata.id} for case ${caseId}`);
      res.status(201).json(metadata);
    } catch (saveError: any) {
      console.error('[UPLOAD ENDPOINT] Error saving file:', saveError);
      
      // Log more details about the error
      if (saveError.code) {
        console.error(`[UPLOAD ENDPOINT] Error code: ${saveError.code}`);
      }
      
      if (saveError.meta) {
        console.error('[UPLOAD ENDPOINT] Error metadata:', saveError.meta);
      }
      
      // Capture the stack trace
      console.error('[UPLOAD ENDPOINT] Stack trace:', saveError.stack);
      
      res.status(500).json({ 
        error: 'File upload failed', 
        details: saveError.message,
        code: saveError.code || 'UNKNOWN',
        meta: saveError.meta || {}
      });
    }
  } catch (error: any) {
    console.error('[UPLOAD ENDPOINT] Unexpected error in upload handler:', error);
    console.error('[UPLOAD ENDPOINT] Stack trace:', error.stack);
    
    res.status(500).json({ 
      error: 'Unexpected error in file upload process', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get all files
app.get('/api/files', async (req: Request, res: Response) => {
  try {
    const fileType = req.query.type as string | undefined;
    const files = await listFiles(fileType);
    res.status(200).json(files);
  } catch (error: any) {
    console.error('File listing error:', error);
    res.status(500).json({ error: 'File listing failed', details: error.message });
  }
});

// Get a specific file
app.get('/api/files/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { metadata, content } = await getFile(id);
    
    // Set appropriate content type
    res.setHeader('Content-Type', metadata.mimeType);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length');
    
    // Only set Content-Disposition: attachment for non-streamable files
    const streamableTypes = ['audio/', 'video/', 'image/', 'application/pdf'];
    const isStreamable = streamableTypes.some(type => metadata.mimeType.startsWith(type));
    
    if (!isStreamable) {
      res.setHeader('Content-Disposition', `attachment; filename="${metadata.originalName}"`);
    } else {
      // Add headers for better streaming support
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Handle range requests for audio/video streaming
      if (metadata.mimeType.startsWith('audio/') || metadata.mimeType.startsWith('video/')) {
        const range = req.headers.range;
        if (range) {
          const parts = range.replace(/bytes=/, '').split('-');
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : content.length - 1;
          const chunksize = (end - start) + 1;
          
          res.status(206);
          res.setHeader('Content-Range', `bytes ${start}-${end}/${content.length}`);
          res.setHeader('Content-Length', chunksize);
          res.send(content.slice(start, end + 1));
          return;
        }
      }
    }
    
    // Send the file
    res.send(content);
  } catch (error: any) {
    console.error('File retrieval error:', error);
    res.status(404).json({ error: 'File not found', details: error.message });
  }
});

// Get file metadata
app.get('/api/files/:id/metadata', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { metadata } = await getFile(id);
    res.status(200).json(metadata);
  } catch (error: any) {
    console.error('Metadata retrieval error:', error);
    res.status(404).json({ error: 'File not found', details: error.message });
  }
});

// Delete a file
app.delete('/api/files/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteFile(id);
    res.status(204).send();
  } catch (error: any) {
    console.error('File deletion error:', error);
    res.status(500).json({ error: 'File deletion failed', details: error.message });
  }
});

// Get supported file types
app.get('/api/files/types', (req: Request, res: Response) => {
  const fileTypes = Object.entries(ALLOWED_FILE_TYPES).map(([mimeType, info]) => ({
    mimeType,
    extension: info.extension,
    type: info.type
  }));
  
  res.status(200).json(fileTypes);
});

// Reference System Routes

// Extract entities and create references for a file
app.post('/api/references/extract/:fileId', async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    
    // Get the file content
    const { metadata, content } = await getFile(fileId);
    
    // Only process text files for now
    if (metadata.fileType !== 'document' || metadata.mimeType !== 'text/plain') {
      res.status(400).json({ error: 'Only text files are supported for reference extraction' });
      return;
    }
    
    // Extract entities and create references
    const references = await extractEntitiesAndCreateReferences(fileId, content.toString());
    
    res.status(200).json({ 
      fileId, 
      fileName: metadata.originalName,
      referencesCreated: references.length,
      references
    });
  } catch (error: any) {
    console.error('Reference extraction error:', error);
    res.status(500).json({ error: 'Reference extraction failed', details: error.message });
  }
});

// Get references for a file
app.get('/api/references/file/:fileId', async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const references = await getReferencesForFile(fileId);
    res.status(200).json(references);
  } catch (error: any) {
    console.error('Reference retrieval error:', error);
    res.status(500).json({ error: 'Reference retrieval failed', details: error.message });
  }
});

// Get references for an entity
app.get('/api/references/entity', async (req: Request, res: Response) => {
  try {
    const { entityText, entityType } = req.query;
    
    if (!entityText || !entityType) {
      res.status(400).json({ error: 'Entity text and type are required' });
      return;
    }
    
    const references = await getReferencesForEntity(entityText as string, entityType as string);
    res.status(200).json(references);
  } catch (error: any) {
    console.error('Entity reference retrieval error:', error);
    res.status(500).json({ error: 'Entity reference retrieval failed', details: error.message });
  }
});

// Generate a reference report for a case
app.get('/api/references/report/:caseId', async (req: Request, res: Response) => {
  try {
    const { caseId } = req.params;
    const report = await generateReferenceReport(caseId);
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(report);
  } catch (error: any) {
    console.error('Reference report generation error:', error);
    res.status(500).json({ error: 'Reference report generation failed', details: error.message });
  }
});

// Case Management Endpoints

// Get all cases with filtering
app.get('/api/cases', async (req: Request, res: Response) => {
  const status = req.query.status as CaseStatus | undefined;

  try {
    const casesData = await getCases({
      status
    });
    
    // Serialize to handle BigInt values
    const serializedCasesData = serializeWithBigInt(casesData);
    
    res.json(serializedCasesData);
  } catch (error: any) {
    console.error('Error fetching cases:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get case by ID
app.get('/api/cases/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    console.log(`Fetching case with ID: ${id}`);
    
    const caseData = await prisma.case.findUnique({
      where: { id },
      include: {
        evidence: true,
        notes: {
          include: {
            createdBy: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        createdBy: true,
        assignedTo: true,
        _count: {
          select: {
            evidence: true,
            notes: true
          }
        }
      }
    });
    
    if (!caseData) {
      console.log(`Case with ID ${id} not found`);
      return res.status(404).json({ error: 'Case not found' });
    }
    
    // Handle BigInt serialization
    const serializedCase = serializeWithBigInt(caseData);
    
    console.log(`Case found: ${caseData.title} (${caseData.caseNumber})`);
    res.json(serializedCase);
  } catch (error: any) {
    console.error('Error fetching case:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new case
app.post('/api/cases', async (req: Request, res: Response) => {
  try {
    const { title, caseNumber, description, status, priority, createdById, assignedToId } = req.body;
    
    // Validate required fields
    if (!title || !caseNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if the user exists, if not create a default user
    let userId = createdById;
    
    if (createdById) {
      const existingUser = await prisma.user.findUnique({
        where: { id: createdById }
      });
      
      if (!existingUser) {
        // Create a default user if the specified user doesn't exist
        const defaultUser = await prisma.user.create({
          data: {
            id: createdById,
            username: 'default_user',
            email: 'default@example.com',
            passwordHash: 'not_used_for_demo',
            firstName: 'Default',
            lastName: 'User',
            role: 'INVESTIGATOR'
          }
        });
        userId = defaultUser.id;
      }
    } else {
      // If no user ID provided, look for an existing default user or create one
      const defaultUser = await prisma.user.findFirst({
        where: { username: 'default_user' }
      }) || await prisma.user.create({
        data: {
          username: 'default_user',
          email: 'default@example.com',
          passwordHash: 'not_used_for_demo',
          firstName: 'Default',
          lastName: 'User',
          role: 'INVESTIGATOR'
        }
      });
      userId = defaultUser.id;
    }
    
    const newCase = await createCase(
      title,
      caseNumber,
      description || null,
      status || 'OPEN',
      priority || null,
      userId,
      assignedToId
    );
    
    res.status(201).json(newCase);
  } catch (error: any) {
    console.error('Error creating case:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a case
app.put('/api/cases/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, assignedToId } = req.body;
    
    const updatedCase = await updateCase(id, {
      title,
      description,
      status,
      priority,
      assignedToId
    });
    
    res.json(updatedCase);
  } catch (error: any) {
    console.error('Error updating case:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a case
app.delete('/api/cases/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await deleteCase(id);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting case:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add evidence to a case
app.put('/api/cases/:caseId/evidence/:evidenceId', async (req: Request, res: Response) => {
  console.log(`[EVIDENCE] Associating evidence ${req.params.evidenceId} with case ${req.params.caseId}`);
  
  try {
    const { caseId, evidenceId } = req.params;
    
    // Verify that both IDs exist
    console.log(`[EVIDENCE] Verifying evidence ID: ${evidenceId} and case ID: ${caseId}`);
    
    try {
      const updatedEvidence = await addEvidenceToCase(caseId, evidenceId);
      console.log(`[EVIDENCE] Successfully associated evidence with case: ${JSON.stringify(updatedEvidence)}`);
      res.json({ 
        success: true, 
        data: updatedEvidence 
      });
    } catch (associationError: any) {
      console.error('[EVIDENCE] Error in addEvidenceToCase function:', associationError);
      
      // Log detailed error information
      if (associationError.code) {
        console.error(`[EVIDENCE] Error code: ${associationError.code}`);
      }
      
      if (associationError.meta) {
        console.error('[EVIDENCE] Error metadata:', associationError.meta);
      }
      
      // Capture the stack trace
      console.error('[EVIDENCE] Stack trace:', associationError.stack);
      
      res.status(500).json({ 
        success: false,
        error: 'Failed to associate evidence with case', 
        details: associationError.message,
        code: associationError.code || 'UNKNOWN'
      });
    }
  } catch (error: any) {
    console.error('[EVIDENCE] Unexpected error in evidence association handler:', error);
    console.error('[EVIDENCE] Stack trace:', error.stack);
    
    res.status(500).json({ 
      success: false,
      error: 'Unexpected error associating evidence with case', 
      details: error.message
    });
  }
});

// Remove evidence from a case
app.delete('/api/cases/evidence/:evidenceId', async (req: Request, res: Response) => {
  try {
    const { evidenceId } = req.params;
    const updatedEvidence = await removeEvidenceFromCase(evidenceId);
    res.json(updatedEvidence);
  } catch (error: any) {
    console.error('Error removing evidence from case:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add a note to a case
app.post('/api/cases/:caseId/notes', async (req: Request, res: Response) => {
  try {
    const { caseId } = req.params;
    const { content, createdById } = req.body;
    
    if (!content || !createdById) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const note = await addCaseNote(caseId, content, createdById);
    res.status(201).json(note);
  } catch (error: any) {
    console.error('Error adding note to case:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get case statistics
app.get('/api/cases/stats/summary', async (req: Request, res: Response) => {
  try {
    const stats = await getCaseStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching case stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get files by case ID
app.get('/api/cases/:id/files', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const fileType = req.query.type as string | undefined;
    
    // Check if the case exists first
    const caseExists = await prisma.case.findUnique({
      where: { id }
    });
    
    if (!caseExists) {
      return res.status(404).json({ error: 'Case not found' });
    }
    
    const files = await listFilesByCase(id, fileType);
    res.status(200).json(files);
  } catch (error: any) {
    console.error('Error retrieving case files:', error);
    res.status(500).json({ error: 'Could not retrieve case files', details: error.message });
  }
});

// Server start (must clearly be at the end!)
app.listen(port, () => {
  console.log(`🚀 CrimeMiner AI backend listening at http://localhost:${port}`);
});
