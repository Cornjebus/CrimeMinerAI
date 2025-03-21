import axios from 'axios';

// We'll try multiple ports if the default one doesn't work
const API_PORTS = [4000, 4001, 4002, 4003, 4004];

// Create a function to find an available API server
const findAvailableApiServer = async () => {
  // First check if we have a stored port that worked previously
  const storedPort = localStorage.getItem('api_port');
  if (storedPort) {
    const port = parseInt(storedPort);
    try {
      const response = await fetch(`http://localhost:${port}/health`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(1000) // 1 second timeout
      });
      if (response.ok) {
        console.log(`Successfully connected to API server on port ${port}`);
        return `http://localhost:${port}`;
      }
    } catch (error) {
      console.log(`Stored API port ${port} is not available, trying others...`);
    }
  }

  // Try each port in sequence
  for (const port of API_PORTS) {
    try {
      console.log(`Trying to connect to API server on port ${port}...`);
      const response = await fetch(`http://localhost:${port}/health`, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(1000) // 1 second timeout
      });
      
      if (response.ok) {
        console.log(`Successfully connected to API server on port ${port}`);
        // Store the working port for future use
        localStorage.setItem('api_port', port.toString());
        return `http://localhost:${port}`;
      }
    } catch (error) {
      console.log(`API server not available on port ${port}, trying next port...`);
    }
  }

  // If we get here, none of the ports worked
  console.warn('Could not connect to any API server port');
  return null;
};

// Start with a default URL, we'll update it when we find a working server
let baseApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Create the API instance
export const api = axios.create({
  baseURL: baseApiUrl,
  timeout: 180000, // 180 seconds timeout (3 minutes)
  headers: {
    'Content-Type': 'application/json',
  }
});

// Function to initialize the API with a working server
export const initApi = async () => {
  const apiUrl = await findAvailableApiServer();
  if (apiUrl) {
    baseApiUrl = apiUrl;
    api.defaults.baseURL = apiUrl;
    console.log('API initialized with server:', apiUrl);
    return true;
  }
  return false;
};

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`Making request to: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    console.log('Request data:', config.data);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log(`Response from ${response.config.url}:`, response.status);
    console.log('Response data:', response.data);
    return response;
  },
  (error) => {
    console.error('Response error:', error.message);
    if (error.response) {
      console.error('Error status:', error.response.status);
      console.error('Error data:', error.response.data);
      console.error('Error headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    console.error('Error config:', error.config);
    return Promise.reject(error);
  }
);

// API interface for text analysis endpoints
export const aiService = {
  // Original general-purpose analyze endpoint
  analyze: async (prompt: string) => {
    try {
      const response = await api.post('/api/analyze', { prompt });
      return response.data;
    } catch (error) {
      console.error('Error in analyze:', error);
      throw error;
    }
  },
  
  // Entity extraction
  extractEntities: async (text: string) => {
    try {
      console.log('Extracting entities for text:', text);
      const response = await api.post('/api/extract-entities', { text });
      return response.data;
    } catch (error) {
      console.error('Error in extractEntities:', error);
      throw error;
    }
  },
  
  // Evidence summarization
  summarizeEvidence: async (text: string, maxLength?: number) => {
    try {
      console.log('Summarizing evidence for text:', text);
      const response = await api.post('/api/summarize', { text, maxLength });
      return response.data;
    } catch (error) {
      console.error('Error in summarizeEvidence:', error);
      throw error;
    }
  },
  
  // Sentiment and intent analysis
  analyzeSentimentAndIntent: async (text: string) => {
    try {
      console.log('Analyzing sentiment for text:', text);
      const response = await api.post('/api/analyze-sentiment', { text });
      return response.data;
    } catch (error) {
      console.error('Error in analyzeSentimentAndIntent:', error);
      throw error;
    }
  },
  
  // Pattern identification
  identifyPatterns: async (text: string) => {
    try {
      console.log('Identifying patterns for text:', text);
      const response = await api.post('/api/identify-patterns', { text });
      return response.data;
    } catch (error) {
      console.error('Error in identifyPatterns:', error);
      throw error;
    }
  }
};

// File metadata interface
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

// API interface for file operations
export const fileService = {
  // Upload a file
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/api/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data as FileMetadata;
  },
  
  // Get all files
  getFiles: async (fileType?: string) => {
    const params = fileType ? { type: fileType } : undefined;
    const response = await api.get('/api/files', { params });
    return response.data as FileMetadata[];
  },
  
  // Get file metadata
  getFileMetadata: async (id: string) => {
    const response = await api.get(`/api/files/${id}/metadata`);
    return response.data as FileMetadata;
  },
  
  // Get file download URL
  getFileUrl: (id: string) => {
    return `${api.defaults.baseURL}/api/files/${id}`;
  },
  
  // Delete a file
  deleteFile: async (id: string) => {
    await api.delete(`/api/files/${id}`);
  },
  
  // Get supported file types
  getSupportedFileTypes: async () => {
    const response = await api.get('/api/files/types');
    return response.data;
  }
};

// Reference interface
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

// API interface for reference operations
export const referencesService = {
  // Extract entities and create references for a file
  extractReferences: async (fileId: string) => {
    const response = await api.post(`/api/references/extract/${fileId}`);
    return response.data;
  },
  
  // Get references for a file
  getReferencesForFile: async (fileId: string) => {
    const response = await api.get(`/api/references/file/${fileId}`);
    return response.data as Reference[];
  },
  
  // Get references for an entity
  getReferencesForEntity: async (entityText: string, entityType: string) => {
    const params = { entityText, entityType };
    const response = await api.get('/api/references/entity', { params });
    return response.data as Reference[];
  },
  
  // Generate a reference report for a case
  generateReport: async (caseId: string) => {
    const response = await api.get(`/api/references/report/${caseId}`, {
      responseType: 'text',
    });
    return response.data;
  },
  
  // Get report URL
  getReportUrl: (caseId: string) => {
    return `${api.defaults.baseURL}/api/references/report/${caseId}`;
  }
};

// Case interface
export interface User {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
}

export interface Case {
  id: string;
  caseNumber: string;
  title: string;
  description?: string;
  status: 'OPEN' | 'CLOSED' | 'ARCHIVED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdBy: User;
  assignedTo?: User;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  _count?: {
    evidence: number;
    notes: number;
  };
  evidence?: FileMetadata[];
  notes?: CaseNote[];
}

export interface CaseNote {
  id: string;
  content: string;
  createdBy: User;
  createdAt: Date;
}

export interface CaseStats {
  totalCases: number;
  openCases: number;
  closedCases: number;
  totalEvidence: number;
  recentCases: {
    id: string;
    title: string;
    caseNumber: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }[];
}

// API interface for case operations
export const caseService = {
  // Get all cases with optional filtering
  getCases: async (params?: {
    status?: string;
    userId?: string;
    assignedToId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await api.get('/api/cases', { params });
    
    // Convert date strings to Date objects
    const cases = response.data.cases.map((caseItem: any) => ({
      ...caseItem,
      createdAt: new Date(caseItem.createdAt),
      updatedAt: new Date(caseItem.updatedAt),
      closedAt: caseItem.closedAt ? new Date(caseItem.closedAt) : undefined
    }));
    
    return {
      ...response.data,
      cases
    };
  },
  
  // Get case by ID
  getCase: async (id: string) => {
    const response = await api.get(`/api/cases/${id}`);
    
    // Convert date strings to Date objects
    const caseData = {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
      closedAt: response.data.closedAt ? new Date(response.data.closedAt) : undefined,
      notes: response.data.notes?.map((note: any) => ({
        ...note,
        createdAt: new Date(note.createdAt)
      }))
    };
    
    return caseData as Case;
  },
  
  // Create a new case
  createCase: async (caseData: {
    title: string;
    caseNumber: string;
    description?: string;
    status?: 'OPEN' | 'CLOSED' | 'ARCHIVED';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    createdById: string;
    assignedToId?: string;
  }) => {
    const response = await api.post('/api/cases', caseData);
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt)
    } as Case;
  },
  
  // Update a case
  updateCase: async (id: string, updateData: {
    title?: string;
    description?: string;
    status?: 'OPEN' | 'CLOSED' | 'ARCHIVED';
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    assignedToId?: string;
  }) => {
    const response = await api.put(`/api/cases/${id}`, updateData);
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt),
      updatedAt: new Date(response.data.updatedAt),
      closedAt: response.data.closedAt ? new Date(response.data.closedAt) : undefined
    } as Case;
  },
  
  // Delete a case
  deleteCase: async (id: string) => {
    await api.delete(`/api/cases/${id}`);
  },
  
  // Add evidence to a case
  addEvidenceToCase: async (caseId: string, evidenceId: string) => {
    const response = await api.put(`/api/cases/${caseId}/evidence/${evidenceId}`);
    return response.data;
  },
  
  // Remove evidence from a case
  removeEvidenceFromCase: async (evidenceId: string) => {
    const response = await api.delete(`/api/cases/evidence/${evidenceId}`);
    return response.data;
  },
  
  // Add a note to a case
  addNote: async (caseId: string, content: string, createdById: string) => {
    const response = await api.post(`/api/cases/${caseId}/notes`, {
      content,
      createdById
    });
    
    return {
      ...response.data,
      createdAt: new Date(response.data.createdAt)
    } as CaseNote;
  },
  
  // Get case statistics
  getStats: async () => {
    const response = await api.get('/api/cases/stats/summary');
    
    // Convert date strings to Date objects for recentCases
    const recentCases = response.data.recentCases.map((caseItem: any) => ({
      ...caseItem,
      createdAt: new Date(caseItem.createdAt),
      updatedAt: new Date(caseItem.updatedAt)
    }));
    
    return {
      ...response.data,
      recentCases
    } as CaseStats;
  }
};
