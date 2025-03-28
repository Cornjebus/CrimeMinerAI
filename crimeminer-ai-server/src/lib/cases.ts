import { PrismaClient, Case, CaseStatus, CasePriority } from '@prisma/client';

const prisma = new PrismaClient();

// Create a new case
export async function createCase(
  title: string,
  caseNumber: string,
  description: string | null,
  status: CaseStatus,
  priority: CasePriority | null,
  createdById: string,
  assignedToId?: string
): Promise<Case> {
  try {
    // For demo purposes, create a case without requiring existing users
    return await prisma.case.create({
      data: {
        title,
        caseNumber,
        description,
        status,
        priority,
        createdBy: {
          // Instead of connecting to an existing user, create one if needed
          connectOrCreate: {
            where: { id: createdById },
            create: {
              id: createdById,
              username: "demo_user",
              firstName: "Demo",
              lastName: "User",
              email: "demo@crimeminer.ai",
              passwordHash: "demo_not_real_password_hash" // Required field
            }
          }
        },
        ...(assignedToId 
          ? {
              assignedTo: {
                connectOrCreate: {
                  where: { id: assignedToId },
                  create: {
                    id: assignedToId,
                    username: "assigned_user",
                    firstName: "Assigned",
                    lastName: "User",
                    email: "assigned@crimeminer.ai",
                    passwordHash: "demo_not_real_password_hash" // Required field
                  }
                }
              }
            } 
          : {}),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          }
        }
      }
    });
  } catch (error) {
    console.error("Error creating case:", error);
    throw error;
  }
}

// Get all cases with optional filtering
export async function getCases({
  status,
  userId,
  assignedToId,
  limit = 50,
  offset = 0
}: {
  status?: CaseStatus;
  userId?: string;
  assignedToId?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const where: any = {};
  
  if (status) {
    where.status = status;
  }
  
  if (userId) {
    where.createdById = userId;
  }
  
  if (assignedToId) {
    where.assignedToId = assignedToId;
  }
  
  const [cases, total] = await Promise.all([
    prisma.case.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true,
          }
        },
        _count: {
          select: {
            evidence: true,
            notes: true,
          }
        }
      },
      skip: offset,
      take: limit,
      orderBy: {
        updatedAt: 'desc'
      }
    }),
    prisma.case.count({ where })
  ]);
  
  return {
    cases,
    total,
    limit,
    offset
  };
}

// Get case by ID
export async function getCaseById(id: string) {
  return prisma.case.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
        }
      },
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
        }
      },
      evidence: {
        select: {
          id: true,
          title: true,
          description: true,
          fileName: true,
          filePath: true,
          fileType: true,
          fileSize: true,
          mimeType: true,
          uploadedAt: true,
          processed: true,
          processingStatus: true,
          tags: true
        }
      },
      notes: {
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
            }
          }
        }
      },
      _count: {
        select: {
          evidence: true,
          notes: true,
        }
      }
    }
  });
}

// Update case
export async function updateCase(
  id: string,
  data: {
    title?: string;
    description?: string | null;
    status?: CaseStatus;
    priority?: CasePriority | null;
    assignedToId?: string | null;
    closedAt?: Date | null;
  }
) {
  const updateData: any = { ...data };
  
  // If status is being changed to CLOSED, set closedAt automatically
  if (data.status === 'CLOSED' && !data.closedAt) {
    updateData.closedAt = new Date();
  }
  
  // If assignedToId is provided, create a proper connect/disconnect structure
  if ('assignedToId' in data) {
    delete updateData.assignedToId;
    if (data.assignedToId) {
      updateData.assignedTo = {
        connect: { id: data.assignedToId }
      };
    } else {
      updateData.assignedTo = {
        disconnect: true
      };
    }
  }
  
  return prisma.case.update({
    where: { id },
    data: updateData,
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
        }
      },
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
        }
      }
    }
  });
}

// Delete case
export async function deleteCase(id: string) {
  return prisma.case.delete({
    where: { id }
  });
}

// Add evidence to case
export async function addEvidenceToCase(caseId: string, evidenceId: string) {
  return prisma.evidence.update({
    where: { id: evidenceId },
    data: {
      case: {
        connect: { id: caseId }
      }
    }
  });
}

// Remove evidence from case
export async function removeEvidenceFromCase(evidenceId: string) {
  return prisma.evidence.update({
    where: { id: evidenceId },
    data: {
      case: {
        disconnect: true
      }
    }
  });
}

// Add a note to a case
export async function addCaseNote(
  caseId: string,
  content: string,
  createdById: string
) {
  return prisma.note.create({
    data: {
      content,
      case: {
        connect: { id: caseId }
      },
      createdBy: {
        connect: { id: createdById }
      }
    },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
        }
      }
    }
  });
}

// Get summary stats
export async function getCaseStats() {
  const [
    totalCases,
    openCases,
    closedCases,
    totalEvidence,
    recentCases
  ] = await Promise.all([
    prisma.case.count(),
    prisma.case.count({ where: { status: 'OPEN' } }),
    prisma.case.count({ where: { status: 'CLOSED' } }),
    prisma.evidence.count(),
    prisma.case.findMany({
      take: 5,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        caseNumber: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      }
    })
  ]);
  
  return {
    totalCases,
    openCases,
    closedCases,
    totalEvidence,
    recentCases
  };
} 