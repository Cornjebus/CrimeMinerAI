import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient, FileType } from '@prisma/client';
import crypto from 'crypto';
import { convertAudio, extractAudioFromVideo, AudioFormat } from './ffmpeg';

const prisma = new PrismaClient();

// Define the upload directory path
const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Ensure the upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Define file type information interface
interface FileTypeInfo {
  extension: string;
  type: string;
}

// Define allowed file types and their corresponding MIME types
export const ALLOWED_FILE_TYPES: Record<string, FileTypeInfo> = {
  // Images
  'image/jpeg': { extension: 'jpg', type: 'image' },
  'image/png': { extension: 'png', type: 'image' },
  'image/gif': { extension: 'gif', type: 'image' },
  'image/webp': { extension: 'webp', type: 'image' },
  'image/tiff': { extension: 'tiff', type: 'image' },
  'image/svg+xml': { extension: 'svg', type: 'image' },
  
  // Documents
  'application/pdf': { extension: 'pdf', type: 'document' },
  'text/plain': { extension: 'txt', type: 'document' },
  'application/msword': { extension: 'doc', type: 'document' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { extension: 'docx', type: 'document' },
  'application/vnd.ms-excel': { extension: 'xls', type: 'document' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { extension: 'xlsx', type: 'document' },
  'application/vnd.ms-powerpoint': { extension: 'ppt', type: 'document' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { extension: 'pptx', type: 'document' },
  'application/rtf': { extension: 'rtf', type: 'document' },
  'text/csv': { extension: 'csv', type: 'document' },
  'text/html': { extension: 'html', type: 'document' },
  'application/json': { extension: 'json', type: 'document' },
  'application/xml': { extension: 'xml', type: 'document' },
  
  // Audio
  'audio/mpeg': { extension: 'mp3', type: 'audio' },
  'audio/wav': { extension: 'wav', type: 'audio' },
  'audio/ogg': { extension: 'ogg', type: 'audio' },
  'audio/aac': { extension: 'aac', type: 'audio' },
  'audio/flac': { extension: 'flac', type: 'audio' },
  'audio/x-m4a': { extension: 'm4a', type: 'audio' },
  
  // Video
  'video/mp4': { extension: 'mp4', type: 'video' },
  'video/mpeg': { extension: 'mpeg', type: 'video' },
  'video/ogg': { extension: 'ogv', type: 'video' },
  'video/webm': { extension: 'webm', type: 'video' },
  'video/quicktime': { extension: 'mov', type: 'video' },
  'video/x-msvideo': { extension: 'avi', type: 'video' },
  'video/x-ms-wmv': { extension: 'wmv', type: 'video' },
};

// Interface for file metadata
export interface FileMetadata {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  fileType: string;
  size: number;
  path: string;
  createdAt: Date;
}

// Helper to convert string to FileType enum
function getFileTypeEnum(type: string): FileType {
  switch (type.toLowerCase()) {
    case 'audio':
      return FileType.AUDIO;
    case 'video':
      return FileType.VIDEO;
    case 'image':
      return FileType.IMAGE;
    case 'document':
      return FileType.DOCUMENT;
    default:
      return FileType.OTHER;
  }
}

/**
 * Saves an uploaded file to the filesystem and database
 * @param file The uploaded file buffer
 * @param originalName Original filename
 * @param mimeType MIME type of the file
 * @param caseId Optional case ID to associate the file with
 * @returns Metadata about the saved file
 */
export async function saveFile(
  file: Buffer,
  originalName: string,
  mimeType: string,
  caseId?: string
): Promise<FileMetadata> {
  console.log(`[UPLOAD] Starting file upload: ${originalName} (${mimeType})`);
  
  // Validate file type
  const fileTypeInfo = ALLOWED_FILE_TYPES[mimeType];
  if (!fileTypeInfo) {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
  console.log(`[UPLOAD] File type validated: ${fileTypeInfo.type}, extension: ${fileTypeInfo.extension}`);
  
  // Generate unique filename
  const id = crypto.randomUUID();
  const fileName = `${id}.${fileTypeInfo.extension}`;
  const filePath = path.join(process.cwd(), 'uploads', fileName);
  
  console.log(`[UPLOAD] Generated filename: ${fileName}, path: ${filePath}`);
  
  try {
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Save the original file to the filesystem
    fs.writeFileSync(filePath, file);
    console.log(`[UPLOAD] File saved to filesystem: ${filePath}`);
    
    let finalFilePath = filePath;
    let finalMimeType = mimeType;
    let finalExtension = fileTypeInfo.extension;
    let audioExtracted = false;

    // Handle WAV to MP3 conversion
    if (mimeType === 'audio/wav') {
      console.log(`[UPLOAD] Converting WAV to MP3: ${fileName}`);
      try {
        const mp3Path = await convertAudio(filePath, AudioFormat.MP3, {
          sampleRate: 44100,
          channels: 1,
          bitrate: '128k',
          normalize: true,
          noiseReduction: true,
          outputDir: uploadsDir
        });
        
        // Delete the original WAV file
        fs.unlinkSync(filePath);
        
        // Update file information
        finalFilePath = mp3Path;
        finalMimeType = 'audio/mpeg';
        finalExtension = 'mp3';
        console.log(`[UPLOAD] Successfully converted WAV to MP3: ${mp3Path}`);
      } catch (error: any) {
        console.error(`[UPLOAD] Failed to convert WAV to MP3:`, error);
        throw new Error(`Failed to convert WAV to MP3: ${error.message}`);
      }
    }
    
    // Handle audio extraction from video
    if (fileTypeInfo.type === 'video') {
      console.log(`[UPLOAD] Extracting audio from video: ${fileName}`);
      try {
        const audioPath = await extractAudioFromVideo(filePath, AudioFormat.MP3, {
          sampleRate: 44100,
          channels: 1,
          bitrate: '128k',
          outputDir: uploadsDir
        });
        
        // Create metadata for the extracted audio
        const audioId = crypto.randomUUID();
        const audioStats = fs.statSync(audioPath);
        const audioMetadata: FileMetadata = {
          id: audioId,
          originalName: `${path.parse(originalName).name}_audio.mp3`,
          fileName: path.basename(audioPath),
          mimeType: 'audio/mpeg',
          fileType: 'audio',
          size: audioStats.size,
          path: audioPath,
          createdAt: new Date(),
        };
        
        // Save audio metadata to database
        await prisma.evidence.create({
          data: {
            id: audioId,
            fileName: audioMetadata.fileName,
            filePath: audioPath,
            fileType: FileType.AUDIO,
            fileSize: audioStats.size,
            mimeType: 'audio/mpeg',
            metadata: JSON.stringify(audioMetadata),
            ...(caseId ? { case: { connect: { id: caseId } } } : {})
          }
        });
        
        audioExtracted = true;
        console.log(`[UPLOAD] Successfully extracted audio: ${audioPath}`);
      } catch (error: any) {
        console.error(`[UPLOAD] Failed to extract audio from video:`, error);
        // Don't throw error here, just log it and continue with the video file
      }
    }
    
    // Get file size of the final file
    const stats = fs.statSync(finalFilePath);
    console.log(`[UPLOAD] Final file size: ${stats.size} bytes`);
    
    // Create file metadata
    const metadata: FileMetadata = {
      id,
      originalName,
      fileName: path.basename(finalFilePath),
      mimeType: finalMimeType,
      fileType: fileTypeInfo.type,
      size: stats.size,
      path: finalFilePath,
      createdAt: new Date(),
    };
    
    console.log(`[UPLOAD] Attempting to save file metadata to database with ID: ${id}`);
    
    // Add case relationship data if caseId is provided
    let caseData = {};
    if (caseId) {
      console.log(`[UPLOAD] Associating file with case ID: ${caseId}`);
      caseData = {
        case: {
          connect: { id: caseId }
        }
      };
    }
    
    // Save to database with all necessary fields
    const dbMetadata = await prisma.evidence.create({
      data: {
        id,
        fileName: path.basename(finalFilePath),
        filePath: finalFilePath,
        fileType: getFileTypeEnum(fileTypeInfo.type),
        fileSize: stats.size,
        mimeType: finalMimeType,
        metadata: JSON.stringify({
          ...metadata,
          audioExtracted,
          originalMimeType: mimeType
        }),
        ...caseData
      }
    });
    
    console.log(`[UPLOAD] Successfully saved file metadata to database: ${id}`);
    return metadata;
  } catch (error: any) {
    // If there was an error, try to clean up the file if it was created
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupError: any) {
      console.error(`[UPLOAD] Error cleaning up file after failed upload: ${cleanupError.message}`);
    }
    
    throw error;
  }
}

/**
 * Retrieves a file by its ID
 * @param id File ID
 * @returns File metadata and content
 */
export async function getFile(id: string): Promise<{ metadata: FileMetadata; content: Buffer }> {
  console.log(`[GET_FILE] Retrieving file with ID: ${id}`);
  
  // Get file metadata from database
  const evidence = await prisma.evidence.findUnique({
    where: { id },
  });
  
  if (!evidence) {
    console.error(`[GET_FILE] File with ID ${id} not found in database`);
    throw new Error(`File with ID ${id} not found`);
  }
  
  console.log(`[GET_FILE] Found evidence record:`, evidence);
  
  // Parse metadata or create from evidence fields
  let metadata: FileMetadata;
  
  if (evidence.metadata) {
    try {
      // Try to use the metadata field first
      const parsedMetadata = typeof evidence.metadata === 'string' 
        ? JSON.parse(evidence.metadata) 
        : evidence.metadata;
      
      metadata = parsedMetadata as FileMetadata;
      console.log(`[GET_FILE] Successfully parsed metadata for file ${id}`);
    } catch (e) {
      console.error(`[GET_FILE] Error parsing metadata for file ${id}:`, e);
      // Fallback to constructing from database fields
      metadata = {
        id: evidence.id,
        originalName: evidence.fileName || 'unknown',
        fileName: evidence.fileName || 'unknown',
        mimeType: evidence.mimeType || 'application/octet-stream',
        fileType: String(evidence.fileType).toLowerCase(),
        size: Number(evidence.fileSize) || 0,
        path: evidence.filePath || '',
        createdAt: evidence.uploadedAt || new Date(),
      };
    }
  } else {
    console.log(`[GET_FILE] No metadata found, constructing from database fields for file ${id}`);
    // If no metadata, construct from database fields
    metadata = {
      id: evidence.id,
      originalName: evidence.fileName || 'unknown',
      fileName: evidence.fileName || 'unknown',
      mimeType: evidence.mimeType || 'application/octet-stream',
      fileType: String(evidence.fileType).toLowerCase(),
      size: Number(evidence.fileSize) || 0,
      path: evidence.filePath || '',
      createdAt: evidence.uploadedAt || new Date(),
    };
  }
  
  // Ensure we have a valid file path
  if (!metadata.path || !evidence.filePath) {
    console.error(`[GET_FILE] No valid file path found for file ${id}`);
    throw new Error('File path not found in metadata');
  }
  
  console.log(`[GET_FILE] Attempting to read file from path: ${metadata.path}`);
  
  try {
    // Read file content
    const content = fs.readFileSync(metadata.path);
    console.log(`[GET_FILE] Successfully read file content for ${id}`);
    return { metadata, content };
  } catch (error: any) {
    console.error(`[GET_FILE] Error reading file content for ${id}:`, error);
    throw new Error(`Error reading file: ${error.message}`);
  }
}

/**
 * Lists all files in the database
 * @param fileType Optional filter by file type
 * @returns Array of file metadata
 */
export async function listFiles(fileType?: string): Promise<FileMetadata[]> {
  // Query database for files
  const evidence = await prisma.evidence.findMany({
    where: fileType ? { 
      fileType: fileType.toUpperCase() as FileType 
    } : undefined,
    orderBy: { uploadedAt: 'desc' },
  });
  
  // Parse metadata for each file
  return evidence.map((item) => {
    if (item.metadata) {
      try {
        return item.metadata as unknown as FileMetadata;
      } catch (e) {
        console.error(`Error parsing metadata for evidence ${item.id}:`, e);
      }
    }
    
    // Fallback to database fields if metadata is missing or invalid
    return {
      id: item.id,
      originalName: item.fileName || 'unknown',
      fileName: item.fileName || 'unknown',
      mimeType: item.mimeType || 'application/octet-stream',
      fileType: String(item.fileType).toLowerCase(),
      size: Number(item.fileSize) || 0,
      path: item.filePath || '',
      createdAt: item.uploadedAt || new Date(),
    } as FileMetadata;
  });
}

/**
 * Deletes a file by its ID
 * @param id File ID
 */
export async function deleteFile(id: string): Promise<void> {
  // Get file metadata
  const { metadata } = await getFile(id);
  
  // Delete file from filesystem
  fs.unlinkSync(metadata.path);
  
  // Delete file metadata from database
  await prisma.evidence.delete({
    where: { id },
  });
} 