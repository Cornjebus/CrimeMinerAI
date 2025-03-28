import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

/**
 * Interface for a reference to a specific location in an evidence file
 */
export interface Reference {
  id: string;
  fileId: string;
  fileType: string;
  location: {
    lineNumber?: number;
    charPosition?: number;
    startTime?: number;
    endTime?: number;
    page?: number;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  context: {
    entity: string;
    type: string;
    text: string;
  };
  confidence: number;
  timestamp: Date;
}

/**
 * Interface for entity extraction result
 */
interface EntityExtractionResult {
  people?: Array<{
    name: string;
    importance: string;
    confidence: number;
  }>;
  locations?: Array<{
    name: string;
    type: string;
    confidence: number;
  }>;
  organizations?: Array<{
    name: string;
    type: string;
    confidence: number;
  }>;
  error?: string;
  rawResponse?: string;
}

/**
 * Creates a new reference to a specific location in an evidence file
 * @param fileId ID of the evidence file
 * @param fileType Type of the evidence file (text, audio, video, image, document)
 * @param location Location information based on file type
 * @param context Context information about the reference
 * @param confidence Confidence score (0-1)
 * @returns The created reference
 */
export async function createReference(
  fileId: string,
  fileType: string,
  location: Reference['location'],
  context: Reference['context'],
  confidence: number = 1.0
): Promise<Reference> {
  const reference: Reference = {
    id: uuidv4(),
    fileId,
    fileType,
    location,
    context,
    confidence,
    timestamp: new Date()
  };

  // Store the reference in the database
  await prisma.$executeRaw`
    INSERT INTO "Reference" ("id", "evidenceId", "referenceType", "location", "context", "confidence", "createdAt", "updatedAt")
    VALUES (${reference.id}, ${reference.fileId}, ${fileType}, ${JSON.stringify(reference.location)}, ${JSON.stringify(reference.context)}, ${reference.confidence}, ${reference.timestamp}, ${reference.timestamp})
  `;

  return reference;
}

/**
 * Gets all references for a specific evidence file
 * @param fileId ID of the evidence file
 * @returns Array of references
 */
export async function getReferencesForFile(fileId: string): Promise<Reference[]> {
  const references = await prisma.$queryRaw<any[]>`
    SELECT * FROM "Reference" WHERE "evidenceId" = ${fileId}
  `;

  return references.map((ref: any) => ({
    id: ref.id,
    fileId: ref.evidenceId,
    fileType: ref.referenceType,
    location: JSON.parse(ref.location),
    context: JSON.parse(ref.context),
    confidence: ref.confidence,
    timestamp: ref.createdAt
  }));
}

/**
 * Gets all references for a specific entity
 * @param entityText Text of the entity
 * @param entityType Type of the entity
 * @returns Array of references
 */
export async function getReferencesForEntity(entityText: string, entityType: string): Promise<Reference[]> {
  const references = await prisma.$queryRaw<any[]>`
    SELECT * FROM "Reference" WHERE "context"::jsonb @> ${JSON.stringify({ entity: entityText, type: entityType })}::jsonb
  `;

  return references.map((ref: any) => ({
    id: ref.id,
    fileId: ref.evidenceId,
    fileType: ref.referenceType,
    location: JSON.parse(ref.location),
    context: JSON.parse(ref.context),
    confidence: ref.confidence,
    timestamp: ref.createdAt
  }));
}

/**
 * Extracts entities from text and creates references
 * @param fileId ID of the evidence file
 * @param content Text content to analyze
 * @returns Array of created references
 */
export async function extractEntitiesAndCreateReferences(fileId: string, content: string): Promise<Reference[]> {
  // Split the content into lines for reference tracking
  const lines = content.split('\n');
  
  // Extract entities using the existing AI module
  const { extractEntities } = await import('./ai.js');
  const entityResult = await extractEntities(content) as EntityExtractionResult;
  
  const references: Reference[] = [];
  
  // Process people entities
  if (entityResult.people && Array.isArray(entityResult.people)) {
    for (const person of entityResult.people) {
      const locations = findEntityLocations(content, lines, person.name);
      
      for (const location of locations) {
        const context = extractContext(lines, location.lineNumber, 2);
        
        const reference = await createReference(
          fileId,
          'text',
          { lineNumber: location.lineNumber, charPosition: location.charPosition },
          { entity: person.name, type: 'PERSON', text: context },
          person.confidence
        );
        
        references.push(reference);
      }
    }
  }
  
  // Process location entities
  if (entityResult.locations && Array.isArray(entityResult.locations)) {
    for (const location of entityResult.locations) {
      const locations = findEntityLocations(content, lines, location.name);
      
      for (const loc of locations) {
        const context = extractContext(lines, loc.lineNumber, 2);
        
        const reference = await createReference(
          fileId,
          'text',
          { lineNumber: loc.lineNumber, charPosition: loc.charPosition },
          { entity: location.name, type: 'LOCATION', text: context },
          location.confidence
        );
        
        references.push(reference);
      }
    }
  }
  
  // Process organization entities
  if (entityResult.organizations && Array.isArray(entityResult.organizations)) {
    for (const org of entityResult.organizations) {
      const locations = findEntityLocations(content, lines, org.name);
      
      for (const loc of locations) {
        const context = extractContext(lines, loc.lineNumber, 2);
        
        const reference = await createReference(
          fileId,
          'text',
          { lineNumber: loc.lineNumber, charPosition: loc.charPosition },
          { entity: org.name, type: 'ORGANIZATION', text: context },
          org.confidence
        );
        
        references.push(reference);
      }
    }
  }
  
  return references;
}

/**
 * Finds all occurrences of an entity in the text
 * @param content Full text content
 * @param lines Array of lines from the content
 * @param entityText Text of the entity to find
 * @returns Array of locations where the entity was found
 */
function findEntityLocations(content: string, lines: string[], entityText: string): Array<{ lineNumber: number, charPosition: number }> {
  const locations: Array<{ lineNumber: number, charPosition: number }> = [];
  
  // Find all occurrences of the entity in the full text
  let startIndex = 0;
  let index;
  
  while ((index = content.indexOf(entityText, startIndex)) !== -1) {
    // Calculate line number and character position
    const textBeforeEntity = content.substring(0, index);
    const lineNumber = (textBeforeEntity.match(/\n/g) || []).length + 1;
    
    // Find the start of the line
    const lastNewlineBeforeEntity = textBeforeEntity.lastIndexOf('\n');
    const charPosition = index - (lastNewlineBeforeEntity === -1 ? 0 : lastNewlineBeforeEntity + 1);
    
    locations.push({ lineNumber, charPosition });
    
    // Move to the next position
    startIndex = index + entityText.length;
  }
  
  return locations;
}

/**
 * Extracts context around a specific line
 * @param lines Array of lines from the content
 * @param lineNumber Line number to extract context around
 * @param contextSize Number of lines to include before and after
 * @returns Context text
 */
function extractContext(lines: string[], lineNumber: number, contextSize: number): string {
  const startLine = Math.max(0, lineNumber - contextSize - 1);
  const endLine = Math.min(lines.length - 1, lineNumber + contextSize - 1);
  
  return lines.slice(startLine, endLine + 1).join('\n');
}

/**
 * Generates an HTML report of all references
 * @param caseId ID of the case
 * @returns HTML content of the report
 */
export async function generateReferenceReport(caseId: string): Promise<string> {
  // Get all evidence files for the case
  const evidenceFiles = await prisma.$queryRaw<any[]>`
    SELECT * FROM "Evidence" WHERE "content"::jsonb->>'caseId' = ${caseId}
  `;
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Evidence References Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .file { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
        .file-header { background-color: #f5f5f5; padding: 10px; margin-bottom: 15px; border-radius: 3px; }
        .reference { margin-bottom: 15px; padding: 10px; border-left: 3px solid #007bff; background-color: #f8f9fa; }
        .location { color: #6c757d; font-size: 0.9em; }
        .context { white-space: pre-wrap; background-color: #fff; padding: 10px; border: 1px solid #ddd; margin-top: 5px; }
        .entity { font-weight: bold; color: #007bff; }
        .confidence { float: right; color: #28a745; }
        .person { border-left-color: #007bff; }
        .location { border-left-color: #28a745; }
        .organization { border-left-color: #fd7e14; }
      </style>
    </head>
    <body>
      <h1>Evidence References Report</h1>
  `;
  
  for (const file of evidenceFiles) {
    const metadata = JSON.parse(file.content);
    const references = await getReferencesForFile(file.id);
    
    html += `
      <div class="file">
        <div class="file-header">
          <h2>${metadata.originalName}</h2>
          <p>Type: ${file.type} | Size: ${formatFileSize(metadata.size)} | Created: ${metadata.createdAt}</p>
        </div>
    `;
    
    if (references.length === 0) {
      html += `<p>No references found for this file.</p>`;
    } else {
      for (const ref of references) {
        const locationStr = formatLocation(ref.location, ref.fileType);
        const contextStr = formatContext(ref.context, ref.fileType);
        
        html += `
          <div class="reference ${ref.context.type.toLowerCase()}">
            <div class="confidence">Confidence: ${(ref.confidence * 100).toFixed(1)}%</div>
            <div class="entity">${escapeHtml(ref.context.entity)} (${ref.context.type})</div>
            <div class="location">${locationStr}</div>
            <div class="context">${contextStr}</div>
          </div>
        `;
      }
    }
    
    html += `</div>`;
  }
  
  html += `
    </body>
    </html>
  `;
  
  return html;
}

/**
 * Formats a file size in bytes to a human-readable string
 * @param bytes File size in bytes
 * @returns Formatted file size string
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' bytes';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

/**
 * Formats a location object to a human-readable string
 * @param location Location object
 * @param fileType Type of the file
 * @returns Formatted location string
 */
function formatLocation(location: Reference['location'], fileType: string): string {
  if (fileType === 'text') {
    return `Line ${location.lineNumber}, Position ${location.charPosition}`;
  } else if (fileType === 'audio' || fileType === 'video') {
    return `${formatTimestamp(location.startTime || 0)} - ${formatTimestamp(location.endTime || 0)}`;
  } else if (fileType === 'image') {
    return `Position (${location.x}, ${location.y}), Size ${location.width}x${location.height}`;
  } else if (fileType === 'document') {
    return `Page ${location.page}, Position (${location.x}, ${location.y})`;
  }
  return 'Unknown location';
}

/**
 * Formats a context object to a human-readable string
 * @param context Context object
 * @param fileType Type of the file
 * @returns Formatted context string
 */
function formatContext(context: Reference['context'], fileType: string): string {
  return escapeHtml(context.text);
}

/**
 * Formats a timestamp in seconds to a human-readable string
 * @param seconds Timestamp in seconds
 * @returns Formatted timestamp string
 */
function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Escapes HTML special characters
 * @param text Text to escape
 * @returns Escaped text
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
} 