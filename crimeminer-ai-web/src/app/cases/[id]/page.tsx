'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { caseService, fileService, Case, FileMetadata } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  FileText, 
  Clock, 
  CheckCircle, 
  ArchiveIcon, 
  User, 
  Calendar,
  File,
  Loader2,
  AlertTriangle,
  MessageSquare,
  Plus,
  Upload,
  X
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export default function CaseDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Dialog states
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
  const [isEditCaseOpen, setIsEditCaseOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Edit case form state
  const [editCaseForm, setEditCaseForm] = useState<{
    title: string;
    description: string;
    status: string;
    priority: string;
  }>({
    title: '',
    description: '',
    status: 'OPEN',
    priority: 'MEDIUM'
  });

  const { data: caseData, isLoading, error, refetch } = useQuery<Case, Error>({
    queryKey: ['case', id],
    queryFn: () => caseService.getCase(id as string),
    enabled: !!id
  });

  // Initialize the edit form when case data is loaded
  useEffect(() => {
    if (caseData) {
      setEditCaseForm({
        title: caseData.title,
        description: caseData.description || '',
        status: caseData.status,
        priority: caseData.priority || 'MEDIUM'
      });
    }
  }, [caseData]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    try {
      // Temporarily hardcode the user ID since we don't have auth yet
      // In a real implementation, this would come from the auth system
      await caseService.addNote(id as string, newNote, "00000000-0000-0000-0000-000000000000");
      setNewNote('');
      refetch();
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Failed to add note');
    }
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(filesArray);
    }
  };
  
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setUploadError('');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      setSelectedFiles(filesArray);
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  
  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) {
      setUploadError('Please select at least one file');
      return;
    }

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;
    let errorMessages = [];

    try {
      for (const file of selectedFiles) {
        // File size validation (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          setUploadError(`File ${file.name} exceeds the 10MB limit`);
          setIsUploading(false);
          return;
        }

        try {
          console.log(`Uploading file: ${file.name} (${file.type}), size: ${file.size} bytes`);
          
          // Upload file
          const formData = new FormData();
          formData.append('file', file);
          
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload`, {
            method: 'POST',
            body: formData,
          });

          // Get the response text regardless of status code
          const responseText = await response.text();
          let responseData;
          
          try {
            // Try to parse as JSON
            responseData = JSON.parse(responseText);
          } catch (e) {
            // If not valid JSON, use the text
            responseData = { error: responseText };
          }

          if (!response.ok) {
            console.error('File upload error response:', responseText);
            
            const errorMessage = responseData.error || responseData.message || `Server error ${response.status}`;
            errorMessages.push(`${file.name}: ${errorMessage}`);
            errorCount++;
            continue;
          }

          console.log('File uploaded successfully, adding to case:', responseData);

          // Associate file with case
          const evidenceResult = await caseService.addEvidenceToCase(id as string, responseData.id);
          console.log('Evidence association result:', evidenceResult);
          
          if (evidenceResult.success) {
            successCount++;
          } else {
            const errorMessage = evidenceResult.error || 'Unknown error associating file with case';
            console.error('Error associating evidence with case:', errorMessage);
            errorMessages.push(`${file.name}: ${errorMessage}`);
            errorCount++;
          }
        } catch (error) {
          console.error('Error uploading file:', error);
          errorMessages.push(`${file.name}: ${error.message || 'Unknown upload error'}`);
          errorCount++;
        }
      }

      if (successCount > 0) {
        setIsFileUploadOpen(false);
        setSelectedFiles([]);
        refetch();
      }

      if (errorCount > 0) {
        if (successCount > 0) {
          setUploadError(`${successCount} files uploaded successfully, ${errorCount} files failed. Errors: ${errorMessages.join('; ')}`);
        } else {
          setUploadError(`Failed to upload files. Errors: ${errorMessages.join('; ')}`);
        }
      }
    } catch (error) {
      console.error('Error in file upload process:', error);
      setUploadError(`An unexpected error occurred during upload: ${error.message || 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };
  
  const openFileSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Edit case functionality
  const handleEditCaseInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditCaseForm(prev => ({ ...prev, [name]: value }));
  };
  
  const handleEditCaseSelectChange = (name: string, value: string) => {
    setEditCaseForm(prev => ({ ...prev, [name]: value }));
  };
  
  const handleEditCase = async () => {
    try {
      await caseService.updateCase(id as string, {
        title: editCaseForm.title,
        description: editCaseForm.description,
        status: editCaseForm.status as 'OPEN' | 'CLOSED' | 'ARCHIVED',
        priority: editCaseForm.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
      });
      
      await refetch();
      setIsEditCaseOpen(false);
    } catch (error) {
      console.error('Error updating case:', error);
      alert('Failed to update case');
    }
  };

  const getCaseStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return (
          <div className="flex items-center">
            <Clock className="h-4 w-4 text-blue-500 mr-2" />
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Open</Badge>
          </div>
        );
      case 'CLOSED':
        return (
          <div className="flex items-center">
            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Closed</Badge>
          </div>
        );
      case 'ARCHIVED':
        return (
          <div className="flex items-center">
            <ArchiveIcon className="h-4 w-4 text-gray-500 mr-2" />
            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Archived</Badge>
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 flex flex-col justify-center items-center min-h-[60vh] text-red-500">
        <AlertTriangle className="h-16 w-16 mb-4" />
        <h2 className="text-xl font-bold mb-2">Error Loading Case</h2>
        <p className="mb-4">There was a problem loading the case details.</p>
        <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="container mx-auto py-8 flex flex-col justify-center items-center min-h-[60vh]">
        <FileText className="h-16 w-16 mb-4 text-gray-400" />
        <h2 className="text-xl font-bold mb-2">Case Not Found</h2>
        <p className="mb-4">The case you're looking for doesn't exist or has been deleted.</p>
        <Button asChild>
          <Link href="/cases">Back to Cases</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-6">
        <Button variant="outline" asChild className="mb-4">
          <Link href="/cases">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cases
          </Link>
        </Button>
        
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold">{caseData.title}</h1>
              {getCaseStatusBadge(caseData.status)}
            </div>
            <p className="text-muted-foreground mb-1">Case #{caseData.caseNumber}</p>
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-1" />
              <span>Created {formatDistanceToNow(caseData.createdAt)} ago</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditCaseOpen(true)}>Edit Case</Button>
            <Button 
              variant="destructive" 
              onClick={async () => {
                if (window.confirm('Are you sure you want to close this case?')) {
                  await caseService.updateCase(id as string, { status: 'CLOSED' });
                  refetch();
                }
              }}
              disabled={caseData.status === 'CLOSED'}
            >
              Close Case
            </Button>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="evidence">Evidence ({caseData.evidence?.length || 0})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({caseData.notes?.length || 0})</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Case Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                <p className="text-foreground">{caseData.description || 'No description provided'}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Creator</h3>
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>
                      {caseData.createdBy.firstName} {caseData.createdBy.lastName}
                    </span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Created</h3>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{format(caseData.createdAt, 'PPP')}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h3>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{format(caseData.updatedAt, 'PPP')}</span>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Priority</h3>
                  <span>{caseData.priority || 'None'}</span>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
                  <span>{caseData.status}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Evidence</CardTitle>
                <CardDescription>
                  {caseData.evidence?.length 
                    ? `${caseData.evidence.length} items attached` 
                    : 'No evidence attached'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!caseData.evidence?.length ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <File className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No evidence items attached to this case</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {caseData.evidence.slice(0, 5).map((item: any) => (
                      <div key={item.id} className="flex items-center p-2 border rounded hover:bg-muted transition">
                        <File className="h-5 w-5 mr-3 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.fileName}</p>
                          <p className="text-xs text-muted-foreground">{fileService.getFileUrl(item.id)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => setActiveTab('evidence')}>
                  View All Evidence
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Notes</CardTitle>
                <CardDescription>
                  {caseData.notes?.length 
                    ? `${caseData.notes.length} notes added` 
                    : 'No notes added'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!caseData.notes?.length ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No notes added to this case</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {caseData.notes.slice(0, 3).map((note) => (
                      <div key={note.id} className="p-3 border rounded">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {note.createdBy.firstName} {note.createdBy.lastName}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(note.createdAt)} ago
                          </span>
                        </div>
                        <p className="text-sm">{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => setActiveTab('notes')}>
                  View All Notes
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        {/* Evidence Tab */}
        <TabsContent value="evidence">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Evidence</CardTitle>
                <CardDescription>
                  Manage evidence attached to this case
                </CardDescription>
              </div>
              <Button onClick={() => setIsFileUploadOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Evidence
              </Button>
            </CardHeader>
            <CardContent>
              {!caseData.evidence?.length ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <File className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Evidence Attached</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by adding evidence files to this case
                  </p>
                  <Button onClick={() => setIsFileUploadOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Evidence
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {caseData.evidence.map((item: any) => (
                    <div key={item.id} className="flex items-center p-3 border rounded hover:bg-muted transition">
                      <File className="h-5 w-5 mr-3 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium">{item.fileName}</p>
                        <div className="flex text-xs text-muted-foreground">
                          <span>{item.fileType}</span>
                          <span className="mx-2">•</span>
                          <span>{Math.round(Number(item.fileSize) / 1024)} KB</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={fileService.getFileUrl(item.id)} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Notes Tab */}
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Case Notes</CardTitle>
              <CardDescription>
                Add and review notes about this case
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2">Add New Note</h3>
                <Textarea 
                  placeholder="Type your note here..." 
                  className="mb-2"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <Button onClick={handleAddNote} disabled={!newNote.trim()}>
                  Add Note
                </Button>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Notes History</h3>
                
                {!caseData.notes?.length ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No notes added to this case yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {caseData.notes.map((note) => (
                      <div key={note.id} className="p-3 border rounded">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="font-medium">
                              {note.createdBy.firstName} {note.createdBy.lastName}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDistanceToNow(note.createdAt)} ago
                          </span>
                        </div>
                        <p>{note.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* File Upload Dialog */}
      {isFileUploadOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Upload Evidence</h3>
            
            {uploadError && (
              <div className="mb-4 p-2 bg-red-100 text-red-800 rounded">
                {uploadError}
              </div>
            )}
            
            <div 
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 mb-4 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
              onClick={openFileSelector}
              onDrop={handleFileDrop}
              onDragOver={handleDragOver}
            >
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="mb-2">
                <svg className="w-8 h-8 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
              </p>
              <p>Drag files here or <span className="text-blue-500">click to browse</span></p>
              <p className="text-xs text-gray-500 mt-1">Maximum file size: 10MB</p>
            </div>
            
            {selectedFiles.length > 0 && (
              <div className="mb-4">
                <p className="font-medium mb-2">Selected Files ({selectedFiles.length})</p>
                <ul className="max-h-40 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <li key={index} className="flex justify-between items-center py-2 border-b">
                      <div className="truncate flex-1">
                        <span className="font-medium">{file.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setIsFileUploadOpen(false);
                  setSelectedFiles([]);
                  setUploadError('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 mr-2"
              >
                Cancel
              </button>
              <button
                onClick={handleFileUpload}
                disabled={isUploading || selectedFiles.length === 0}
                className={`px-4 py-2 rounded ${
                  isUploading || selectedFiles.length === 0
                    ? 'bg-blue-300 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Case Dialog */}
      <Dialog open={isEditCaseOpen} onOpenChange={setIsEditCaseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Case</DialogTitle>
            <DialogDescription>
              Update the details for this case.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">Title</label>
              <Input 
                id="title"
                name="title"
                value={editCaseForm.title}
                onChange={handleEditCaseInputChange}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">Description</label>
              <Textarea 
                id="description"
                name="description"
                value={editCaseForm.description}
                onChange={handleEditCaseInputChange}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="status" className="text-sm font-medium">Status</label>
                <Select 
                  value={editCaseForm.status} 
                  onValueChange={(value) => handleEditCaseSelectChange('status', value)}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="priority" className="text-sm font-medium">Priority</label>
                <Select 
                  value={editCaseForm.priority} 
                  onValueChange={(value) => handleEditCaseSelectChange('priority', value)}
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditCaseOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleEditCase}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 