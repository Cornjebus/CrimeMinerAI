import { PrismaClient, FileType } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Define a type for file records from the database that matches Prisma's Evidence model
interface EvidenceRecord {
  id: string;
  caseId: string | null;
  title: string | null;
  description: string | null;
  fileName: string;
  filePath: string;
  fileType: FileType;
  fileSize: bigint;
  mimeType: string | null;
  metadata: string | null;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  content: string | null;
}

/**
 * Lists all files that belong to a specific case
 * @param caseId The ID of the case to list files for
 * @param fileType Optional filter by file type
 * @returns Array of file metadata
 */
export async function listFilesByCase(caseId: string, fileType?: string): Promise<any[]> {
  console.log(`[FILES] Listing files for case ${caseId}${fileType ? ` with type ${fileType}` : ''}`);
  
  try {
    // Query for files associated with the specified case
    const whereClause: any = {
      caseId
    };
    
    // Add file type filter if specified
    if (fileType) {
      whereClause.fileType = fileType;
    }
    
    // Get files from database
    const files = await prisma.evidence.findMany({
      where: whereClause,
      orderBy: {
        uploadedAt: 'desc'
      }
    });
    
    console.log(`[FILES] Found ${files.length} files for case ${caseId}`);
    
    // Format files for API response
    return files.map((file: any) => {
      // Parse metadata JSON if present
      let metadata = {};
      if (file.metadata) {
        try {
          metadata = JSON.parse(file.metadata);
        } catch (error) {
          console.error(`[FILES] Failed to parse metadata for file ${file.id}:`, error);
        }
      }
      
      return {
        id: file.id,
        fileName: file.fileName,
        originalName: file.fileName, // Fallback if metadata doesn't have it
        fileType: file.fileType,
        fileSize: Number(file.fileSize),
        mimeType: file.mimeType || 'application/octet-stream', // Provide default if null
        uploadedAt: file.uploadedAt,
        caseId: file.caseId,
        ...metadata
      };
    });
  } catch (error) {
    console.error('[FILES] Error listing files by case:', error);
    throw error;
  }
} 