import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define types based on the Prisma schema
type UserRole = 'ADMIN' | 'INVESTIGATOR' | 'ANALYST';
type CaseStatus = 'OPEN' | 'CLOSED' | 'ARCHIVED';
type CasePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Service for managing cases and related entities
 */
export const caseService = {
  /**
   * Create a new case
   */
  async createCase(data: {
    title: string;
    description?: string;
    caseNumber: string;
    status?: CaseStatus;
    priority?: CasePriority;
    createdById: string;
    assignedToId?: string;
  }) {
    try {
      return await (prisma as any).case.create({
        data: {
          title: data.title,
          description: data.description,
          caseNumber: data.caseNumber,
          status: data.status || 'OPEN',
          priority: data.priority,
          createdById: data.createdById,
          assignedToId: data.assignedToId,
        },
        include: {
          createdBy: true,
          assignedTo: true,
        },
      });
    } catch (error) {
      console.error('Error creating case:', error);
      throw error;
    }
  },

  /**
   * Get a case by ID
   */
  async getCaseById(id: string) {
    try {
      return await (prisma as any).case.findUnique({
        where: { id },
        include: {
          createdBy: true,
          assignedTo: true,
          evidence: true,
          notes: true,
          userAccess: {
            include: {
              user: true,
            },
          },
        },
      });
    } catch (error) {
      console.error(`Error getting case by ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get a case by case number
   */
  async getCaseByCaseNumber(caseNumber: string) {
    try {
      return await (prisma as any).case.findUnique({
        where: { caseNumber },
        include: {
          createdBy: true,
          assignedTo: true,
          evidence: true,
          notes: true,
        },
      });
    } catch (error) {
      console.error(`Error getting case by case number ${caseNumber}:`, error);
      throw error;
    }
  },

  /**
   * Get all cases
   */
  async getAllCases(options?: {
    status?: CaseStatus;
    userId?: string;
    skip?: number;
    take?: number;
  }) {
    try {
      const { status, userId, skip, take } = options || {};
      
      const where: any = {};
      
      if (status) {
        where.status = status;
      }
      
      if (userId) {
        where.OR = [
          { createdById: userId },
          { assignedToId: userId },
          { userAccess: { some: { userId } } },
        ];
      }
      
      return await (prisma as any).case.findMany({
        where,
        skip,
        take,
        include: {
          createdBy: true,
          assignedTo: true,
          _count: {
            select: {
              evidence: true,
              notes: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
    } catch (error) {
      console.error('Error getting all cases:', error);
      throw error;
    }
  },

  /**
   * Update a case
   */
  async updateCase(id: string, data: {
    title?: string;
    description?: string;
    status?: CaseStatus;
    priority?: CasePriority;
    assignedToId?: string | null;
  }) {
    try {
      return await (prisma as any).case.update({
        where: { id },
        data,
        include: {
          createdBy: true,
          assignedTo: true,
        },
      });
    } catch (error) {
      console.error(`Error updating case ${id}:`, error);
      throw error;
    }
  },

  /**
   * Close a case
   */
  async closeCase(id: string) {
    try {
      return await (prisma as any).case.update({
        where: { id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`Error closing case ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a case (soft delete by archiving)
   */
  async archiveCase(id: string) {
    try {
      return await (prisma as any).case.update({
        where: { id },
        data: {
          status: 'ARCHIVED',
        },
      });
    } catch (error) {
      console.error(`Error archiving case ${id}:`, error);
      throw error;
    }
  },

  /**
   * Add evidence to a case
   */
  async addEvidenceToCase(caseId: string, evidenceId: string) {
    try {
      return await (prisma as any).evidence.update({
        where: { id: evidenceId },
        data: {
          caseId,
        },
      });
    } catch (error) {
      console.error(`Error adding evidence ${evidenceId} to case ${caseId}:`, error);
      throw error;
    }
  },

  /**
   * Grant user access to a case
   */
  async grantUserAccess(data: {
    userId: string;
    caseId: string;
    role: string;
    expiresAt?: Date;
  }) {
    try {
      return await (prisma as any).userCaseAccess.create({
        data: {
          userId: data.userId,
          caseId: data.caseId,
          role: data.role,
          expiresAt: data.expiresAt,
        },
        include: {
          user: true,
          case: true,
        },
      });
    } catch (error) {
      console.error(`Error granting user ${data.userId} access to case ${data.caseId}:`, error);
      throw error;
    }
  },

  /**
   * Revoke user access to a case
   */
  async revokeUserAccess(userId: string, caseId: string) {
    try {
      return await (prisma as any).userCaseAccess.delete({
        where: {
          userId_caseId: {
            userId,
            caseId,
          },
        },
      });
    } catch (error) {
      console.error(`Error revoking user ${userId} access to case ${caseId}:`, error);
      throw error;
    }
  },
};

/**
 * Service for managing users
 */
export const userService = {
  /**
   * Create a new user
   */
  async createUser(data: {
    username: string;
    email: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    department?: string;
  }) {
    try {
      return await (prisma as any).user.create({
        data,
      });
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  /**
   * Get a user by ID
   */
  async getUserById(id: string) {
    try {
      return await (prisma as any).user.findUnique({
        where: { id },
      });
    } catch (error) {
      console.error(`Error getting user by ID ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get a user by username
   */
  async getUserByUsername(username: string) {
    try {
      return await (prisma as any).user.findUnique({
        where: { username },
      });
    } catch (error) {
      console.error(`Error getting user by username ${username}:`, error);
      throw error;
    }
  },

  /**
   * Get a user by email
   */
  async getUserByEmail(email: string) {
    try {
      return await (prisma as any).user.findUnique({
        where: { email },
      });
    } catch (error) {
      console.error(`Error getting user by email ${email}:`, error);
      throw error;
    }
  },

  /**
   * Update a user
   */
  async updateUser(id: string, data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: UserRole;
    department?: string;
    passwordHash?: string;
  }) {
    try {
      return await (prisma as any).user.update({
        where: { id },
        data,
      });
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get cases assigned to a user
   */
  async getUserCases(userId: string) {
    try {
      return await (prisma as any).case.findMany({
        where: {
          OR: [
            { createdById: userId },
            { assignedToId: userId },
            { userAccess: { some: { userId } } },
          ],
        },
        include: {
          createdBy: true,
          assignedTo: true,
          _count: {
            select: {
              evidence: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });
    } catch (error) {
      console.error(`Error getting cases assigned to user ${userId}:`, error);
      throw error;
    }
  },
};

/**
 * Service for managing notes
 */
export const noteService = {
  /**
   * Create a note
   */
  async createNote(data: {
    content: string;
    createdById: string;
    caseId?: string;
    evidenceId?: string;
    resultId?: string;
  }) {
    try {
      return await (prisma as any).note.create({
        data,
        include: {
          createdBy: true,
          case: true,
          evidence: true,
          result: true,
        },
      });
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  },

  /**
   * Get notes for a case
   */
  async getCaseNotes(caseId: string) {
    try {
      return await (prisma as any).note.findMany({
        where: { caseId },
        include: {
          createdBy: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      console.error(`Error getting notes for case ${caseId}:`, error);
      throw error;
    }
  },

  /**
   * Get notes for evidence
   */
  async getEvidenceNotes(evidenceId: string) {
    try {
      return await (prisma as any).note.findMany({
        where: { evidenceId },
        include: {
          createdBy: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    } catch (error) {
      console.error(`Error getting notes for evidence ${evidenceId}:`, error);
      throw error;
    }
  },
}; 