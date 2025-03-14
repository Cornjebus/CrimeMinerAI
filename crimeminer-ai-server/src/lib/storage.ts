import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient, FileType } from '@prisma/client';

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
 * @returns Metadata about the saved file
 */
export async function saveFile(
  file: Buffer,
  originalName: string,
  mimeType: string
): Promise<FileMetadata> {
  console.log(`[UPLOAD] Starting file upload: ${originalName} (${mimeType})`);
  
  // Check if file type is allowed
  if (!ALLOWED_FILE_TYPES[mimeType]) {
    console.error(`[UPLOAD ERROR] File type ${mimeType} is not allowed`);
    throw new Error(`File type ${mimeType} is not allowed`);
  }
  
  const fileTypeInfo = ALLOWED_FILE_TYPES[mimeType];
  const extension = fileTypeInfo.extension;
  console.log(`[UPLOAD] File type validated: ${fileTypeInfo.type}, extension: ${extension}`);
  
  // Generate a unique filename
  const id = uuidv4();
  const fileName = `${id}.${extension}`;
  const filePath = path.join(UPLOAD_DIR, fileName);
  console.log(`[UPLOAD] Generated filename: ${fileName}, path: ${filePath}`);
  
  try {
    // Save the file to the filesystem
    fs.writeFileSync(filePath, file);
    console.log(`[UPLOAD] File saved to filesystem: ${filePath}`);
    
    // Get file size
    const stats = fs.statSync(filePath);
    console.log(`[UPLOAD] File size: ${stats.size} bytes`);
    
    // Create file metadata
    const metadata: FileMetadata = {
      id,
      originalName,
      fileName,
      mimeType,
      fileType: fileTypeInfo.type,
      size: stats.size,
      path: filePath,
      createdAt: new Date(),
    };
    
    console.log(`[UPLOAD] Attempting to save file metadata to database with ID: ${id}`);
    console.log(`[UPLOAD] Database fields to be used:`, {
      id,
      fileName,
      filePath,
      fileType: getFileTypeEnum(fileTypeInfo.type),
      fileSize: stats.size,
      mimeType,
      metadata: JSON.stringify(metadata)
    });
    
    try {
      // Save file metadata to database - only use fields directly in the schema
      const result = await prisma.evidence.create({
        data: {
          id,
          fileName,
          filePath,
          fileType: getFileTypeEnum(fileTypeInfo.type),
          fileSize: BigInt(stats.size),
          mimeType,
          // Store metadata as JSON but ONLY use fields that exist in the schema
          metadata: JSON.stringify(metadata),
          uploadedAt: new Date()
          // DO NOT include type or content fields here
        },
      });
      
      console.log(`[UPLOAD] Successfully saved file metadata to database: ${id}`);
      return metadata;
    } catch (error: any) {
      console.error('[UPLOAD ERROR] Error saving file to database:', error);
      
      // Log the exact Prisma error if available
      if (error.code) {
        console.error(`[UPLOAD ERROR] Prisma error code: ${error.code}`);
      }
      
      if (error.meta) {
        console.error('[UPLOAD ERROR] Prisma error metadata:', error.meta);
      }
      
      // Clean up the file if database save fails
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          console.log(`[UPLOAD] Deleted file ${filePath} due to database save failure`);
        } catch (deleteError) {
          console.error(`[UPLOAD ERROR] Failed to delete file ${filePath}:`, deleteError);
        }
      }
      
      throw error;
    }
  } catch (error: any) {
    console.error('[UPLOAD ERROR] Error in overall file save process:', error);
    throw error;
  }
}

/**
 * Retrieves a file by its ID
 * @param id File ID
 * @returns File metadata and content
 */
export async function getFile(id: string): Promise<{ metadata: FileMetadata; content: Buffer }> {
  // Get file metadata from database
  const evidence = await prisma.evidence.findUnique({
    where: { id },
  });
  
  if (!evidence) {
    throw new Error(`File with ID ${id} not found`);
  }
  
  // Parse metadata or create from evidence fields
  let metadata: FileMetadata;
  
  if (evidence.metadata) {
    try {
      // Try to use the metadata field first
      metadata = evidence.metadata as unknown as FileMetadata;
    } catch (e) {
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
  
  // Read file content
  const content = fs.readFileSync(metadata.path);
  
  return { metadata, content };
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