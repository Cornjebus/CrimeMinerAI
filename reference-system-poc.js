/**
 * CrimeMiner AI - Reference System Proof of Concept
 * 
 * This script demonstrates how the reference system tracks and provides
 * precise references to the original evidence files, allowing investigators
 * to trace analysis results back to their source.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration
const AUDIO_FILE_PATH = process.argv[2] || './sample-data/sample-audio.mp3';
const TEXT_FILE_PATH = process.argv[3] || './sample-data/sample-interview.txt';
const API_URL = process.env.API_URL || 'http://localhost:4000';
const OUTPUT_DIR = './reference-output';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Represents a reference to a specific location in an evidence file
 */
class Reference {
  constructor(fileId, fileType, location, context, confidence = 1.0) {
    this.id = uuidv4();
    this.fileId = fileId;
    this.fileType = fileType;
    this.location = location;
    this.context = context;
    this.confidence = confidence;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      fileId: this.fileId,
      fileType: this.fileType,
      location: this.location,
      context: this.context,
      confidence: this.confidence,
      timestamp: this.timestamp
    };
  }
}

/**
 * Represents an evidence file with metadata
 */
class EvidenceFile {
  constructor(filePath, type, metadata = {}) {
    this.id = uuidv4();
    this.filePath = filePath;
    this.fileName = path.basename(filePath);
    this.type = type;
    this.metadata = {
      createdAt: new Date().toISOString(),
      size: fs.statSync(filePath).size,
      ...metadata
    };
    this.references = [];
  }

  addReference(location, context, confidence = 1.0) {
    const reference = new Reference(this.id, this.type, location, context, confidence);
    this.references.push(reference);
    return reference;
  }

  toJSON() {
    return {
      id: this.id,
      fileName: this.fileName,
      type: this.type,
      metadata: this.metadata,
      references: this.references.map(ref => ref.toJSON())
    };
  }
}

/**
 * Process a text file and create references for entities
 * @param {string} filePath - Path to the text file
 * @returns {Promise<EvidenceFile>} - Evidence file with references
 */
async function processTextFile(filePath) {
  console.log(`Processing text file: ${filePath}`);
  
  // Create evidence file object
  const evidenceFile = new EvidenceFile(filePath, 'text');
  
  // Read file content
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Analyze text to extract entities
  try {
    const response = await axios.post(`${API_URL}/api/analyze`, {
      prompt: content,
      type: 'entities'
    });
    
    // Extract entities from the analysis text
    const analysisText = response.data.analysis || '';
    console.log('API response received. Extracting entities from analysis...');
    
    // Define known entity types
    const knownLocations = [
      'The Blue Note', 'Blue Note', 'Central Police Station', 'Westside Pawn', 
      'Westside Pawn Shop', 'Eastside Auto', 'Eastside Auto Shop', 'City Auto Repair'
    ];
    
    const knownOrganizations = [
      'RedWolf', 'City Auto Repair', 'Eastside Auto Shop'
    ];
    
    // Extract person names (two capitalized words in sequence)
    const nameRegex = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
    const extractedNames = [...new Set(analysisText.match(nameRegex) || [])];
    
    // Create entities array
    const entities = [];
    
    // Process each extracted name and categorize it
    extractedNames.forEach(name => {
      // Check if this is a known location
      if (knownLocations.some(loc => name.includes(loc) || loc.includes(name))) {
        entities.push({
          text: name,
          type: 'LOCATION',
          confidence: 0.9
        });
      }
      // Check if this is a known organization
      else if (knownOrganizations.some(org => name.includes(org) || org.includes(name))) {
        entities.push({
          text: name,
          type: 'ORGANIZATION',
          confidence: 0.9
        });
      }
      // Otherwise, assume it's a person
      else {
        entities.push({
          text: name,
          type: 'PERSON',
          confidence: 0.9
        });
      }
    });
    
    // Look for additional locations that might not be captured by the name regex
    knownLocations.forEach(location => {
      if (content.includes(location) && !entities.some(e => e.text.includes(location))) {
        entities.push({
          text: location,
          type: 'LOCATION',
          confidence: 0.9
        });
      }
    });
    
    // Look for additional organizations that might not be captured by the name regex
    knownOrganizations.forEach(org => {
      if (content.includes(org) && !entities.some(e => e.text.includes(org))) {
        entities.push({
          text: org,
          type: 'ORGANIZATION',
          confidence: 0.9
        });
      }
    });
    
    console.log(`Extracted ${entities.length} entities from analysis.`);
    
    // Create references for each entity
    entities.forEach(entity => {
      // Find the entity in the text and get line numbers
      const entityLocations = findEntityLocations(content, lines, entity.text);
      
      entityLocations.forEach(location => {
        // Create a reference with context (surrounding text)
        const context = extractContext(lines, location.lineNumber, 2);
        
        // Add reference to the evidence file
        evidenceFile.addReference(
          { lineNumber: location.lineNumber, charPosition: location.charPosition },
          { 
            entity: entity.text, 
            type: entity.type,
            context: context
          },
          entity.confidence
        );
      });
    });
    
    return evidenceFile;
  } catch (error) {
    console.error('Error analyzing text:', error.message);
    // Even if analysis fails, return the evidence file
    return evidenceFile;
  }
}

/**
 * Process an audio file and create references for timestamps
 * @param {string} filePath - Path to the audio file
 * @returns {Promise<EvidenceFile>} - Evidence file with references
 */
async function processAudioFile(filePath) {
  console.log(`Processing audio file: ${filePath}`);
  
  // Create evidence file object with audio-specific metadata
  const evidenceFile = new EvidenceFile(filePath, 'audio', {
    duration: '00:05:30', // In a real implementation, this would be extracted from the file
    format: path.extname(filePath).substring(1)
  });
  
  // Simulate transcription result
  const transcription = {
    text: "This is a simulated transcription of the audio file. In a real implementation, this would be the result of the transcription service.",
    segments: [
      { id: 0, start: 0.0, end: 5.0, text: "This is a simulated transcription" },
      { id: 1, start: 5.5, end: 10.0, text: "of the audio file." },
      { id: 2, start: 10.5, end: 15.0, text: "In a real implementation," },
      { id: 3, start: 15.5, end: 20.0, text: "this would be the result of the transcription service." }
    ]
  };
  
  // Create references for each segment
  transcription.segments.forEach(segment => {
    // Add reference to the evidence file
    evidenceFile.addReference(
      { startTime: segment.start, endTime: segment.end },
      { 
        text: segment.text,
        segmentId: segment.id
      },
      0.95 // Confidence score
    );
  });
  
  // Simulate entity extraction from transcription
  const entities = [
    { text: "transcription service", type: "SERVICE", confidence: 0.92 },
    { text: "audio file", type: "FILE_TYPE", confidence: 0.98 }
  ];
  
  // Create references for each entity
  entities.forEach(entity => {
    // Find which segments contain this entity
    const segments = transcription.segments.filter(segment => 
      segment.text.includes(entity.text)
    );
    
    segments.forEach(segment => {
      // Add reference to the evidence file
      evidenceFile.addReference(
        { startTime: segment.start, endTime: segment.end },
        { 
          entity: entity.text, 
          type: entity.type,
          segmentText: segment.text
        },
        entity.confidence
      );
    });
  });
  
  return evidenceFile;
}

/**
 * Find all occurrences of an entity in text with line numbers and character positions
 * @param {string} content - Full text content
 * @param {string[]} lines - Text split into lines
 * @param {string} entityText - Entity text to find
 * @returns {Array<{lineNumber: number, charPosition: number}>} - Locations
 */
function findEntityLocations(content, lines, entityText) {
  const locations = [];
  let currentIndex = 0;
  
  // Find all occurrences of the entity in the full text
  while (currentIndex < content.length) {
    const index = content.indexOf(entityText, currentIndex);
    if (index === -1) break;
    
    // Calculate line number and character position
    const textBeforeEntity = content.substring(0, index);
    const lineBreaks = textBeforeEntity.split('\n');
    const lineNumber = lineBreaks.length;
    const charPosition = lineBreaks[lineBreaks.length - 1].length;
    
    locations.push({ lineNumber, charPosition });
    currentIndex = index + entityText.length;
  }
  
  return locations;
}

/**
 * Extract context around a specific line
 * @param {string[]} lines - Text split into lines
 * @param {number} lineNumber - Target line number
 * @param {number} contextSize - Number of lines before and after
 * @returns {string} - Context text
 */
function extractContext(lines, lineNumber, contextSize) {
  const startLine = Math.max(1, lineNumber - contextSize);
  const endLine = Math.min(lines.length, lineNumber + contextSize);
  
  return lines.slice(startLine - 1, endLine).join('\n');
}

/**
 * Generate a report with all references
 * @param {Array<EvidenceFile>} evidenceFiles - List of evidence files
 * @returns {string} - HTML report
 */
function generateReport(evidenceFiles) {
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>CrimeMiner AI - Reference Report</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .file { margin-bottom: 30px; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
        .file-header { background: #f5f5f5; padding: 10px; margin-bottom: 15px; }
        .reference { margin-bottom: 15px; padding: 10px; border-left: 3px solid #007bff; }
        .location { color: #666; font-size: 0.9em; }
        .context { background: #f9f9f9; padding: 10px; margin-top: 5px; white-space: pre-wrap; }
        .confidence { color: #28a745; font-size: 0.8em; }
        .timestamp { color: #6c757d; font-size: 0.8em; }
      </style>
    </head>
    <body>
      <h1>CrimeMiner AI - Evidence Reference Report</h1>
      <p>Generated on ${new Date().toLocaleString()}</p>
  `;
  
  evidenceFiles.forEach(file => {
    html += `
      <div class="file">
        <div class="file-header">
          <h2>${file.fileName}</h2>
          <p>Type: ${file.type}</p>
          <p>Created: ${file.metadata.createdAt}</p>
          <p>Size: ${formatFileSize(file.metadata.size)}</p>
        </div>
        
        <h3>References (${file.references.length})</h3>
    `;
    
    file.references.forEach(ref => {
      html += `
        <div class="reference">
          <div class="location">
            ${formatLocation(ref.location, file.type)}
          </div>
          <div class="context">
            ${formatContext(ref.context, file.type)}
          </div>
          <div class="confidence">
            Confidence: ${(ref.confidence * 100).toFixed(1)}%
          </div>
          <div class="timestamp">
            Timestamp: ${new Date(ref.timestamp).toLocaleString()}
          </div>
        </div>
      `;
    });
    
    html += `</div>`;
  });
  
  html += `
    </body>
    </html>
  `;
  
  return html;
}

/**
 * Format file size in human-readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' bytes';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Format location based on file type
 * @param {object} location - Location object
 * @param {string} fileType - File type
 * @returns {string} - Formatted location
 */
function formatLocation(location, fileType) {
  if (fileType === 'text') {
    return `Line ${location.lineNumber}, Position ${location.charPosition}`;
  } else if (fileType === 'audio') {
    return `Timestamp: ${formatTimestamp(location.startTime)} - ${formatTimestamp(location.endTime)}`;
  }
  return JSON.stringify(location);
}

/**
 * Format context based on file type
 * @param {object} context - Context object
 * @param {string} fileType - File type
 * @returns {string} - Formatted context
 */
function formatContext(context, fileType) {
  if (fileType === 'text') {
    return `<strong>${context.entity}</strong> (${context.type}):<br>${escapeHtml(context.context)}`;
  } else if (fileType === 'audio') {
    if (context.entity) {
      return `<strong>${context.entity}</strong> (${context.type}):<br>${escapeHtml(context.segmentText)}`;
    } else {
      return escapeHtml(context.text);
    }
  }
  return JSON.stringify(context);
}

/**
 * Format timestamp in human-readable format
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted timestamp
 */
function formatTimestamp(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Escape HTML special characters
 * @param {string} text - Input text
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('CrimeMiner AI - Reference System Proof of Concept');
    
    // Check if files exist
    if (!fs.existsSync(TEXT_FILE_PATH)) {
      console.error(`Text file not found: ${TEXT_FILE_PATH}`);
      process.exit(1);
    }
    
    const evidenceFiles = [];
    
    // Process text file
    const textEvidence = await processTextFile(TEXT_FILE_PATH);
    evidenceFiles.push(textEvidence);
    
    // Process audio file if it exists
    if (fs.existsSync(AUDIO_FILE_PATH)) {
      const audioEvidence = await processAudioFile(AUDIO_FILE_PATH);
      evidenceFiles.push(audioEvidence);
    } else {
      console.log(`Audio file not found: ${AUDIO_FILE_PATH}. Skipping audio processing.`);
    }
    
    // Save evidence files with references
    evidenceFiles.forEach(file => {
      const outputPath = path.join(OUTPUT_DIR, `${file.id}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(file.toJSON(), null, 2));
      console.log(`Evidence file saved: ${outputPath}`);
    });
    
    // Generate and save HTML report
    const report = generateReport(evidenceFiles);
    const reportPath = path.join(OUTPUT_DIR, 'reference-report.html');
    fs.writeFileSync(reportPath, report);
    console.log(`Report generated: ${reportPath}`);
    
    console.log('Reference system proof of concept completed successfully.');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the main function
main(); 