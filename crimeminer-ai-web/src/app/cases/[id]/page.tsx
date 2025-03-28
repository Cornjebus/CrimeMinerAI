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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
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
  X,
  Download,
  Trash2,
  RefreshCw,
  Eye
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { Table, TableHeader, TableBody, TableCell, TableRow, TableHead } from '@/components/ui/table';
import Image from 'next/image';

export default function CaseDetailPage() {
  const router = useRouter();
  const { id } = useParams();
  const [newNote, setNewNote] = useState('');
  const [activeTab, setActiveTab] = useState('summary');
  
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

  // Fetch case files
  const { data: caseFiles = [], isLoading: isFilesLoading } = useQuery({
    queryKey: ['caseFiles', id],
    queryFn: async () => {
      try {
        console.log(`Fetching files for case ID: ${id}`);
        const files = await fileService.getFilesByCase(id as string);
        console.log(`Retrieved ${files.length} files for case ID: ${id}`, files);
        return files;
      } catch (error) {
        console.error(`Error fetching files for case ID: ${id}:`, error);
        return [];
      }
    },
    refetchOnWindowFocus: false
  });

  // Handle file deletion
  const handleDeleteFile = (fileId: string) => {
    if (window.confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
      fileService.deleteFile(fileId).then(() => {
        // Refresh the files list
        refetch();
      });
    }
  };

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

  // Format file size for display
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

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
  
  const openFileSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
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
    setUploadError(null);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const file of selectedFiles) {
        try {
          // Upload the file using the fileService
          await fileService.uploadFile(file, id as string);
          successCount++;
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          errorCount++;
        }
      }

      // Refresh file list and close dialog on success
      if (successCount > 0) {
        refetch();
        setIsFileUploadOpen(false);
        setSelectedFiles([]);
      }

      if (errorCount > 0) {
        setUploadError(`${errorCount} file(s) failed to upload. ${successCount} succeeded.`);
      }
    } catch (error) {
      console.error('File upload error:', error);
      setUploadError('An error occurred during upload');
    } finally {
      setIsUploading(false);
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

  // File Preview Dialog Component
  function FilePreviewDialog({ file }: { file: FileMetadata }) {
    // Parse createdAt if it's a string
    const createdAt = file.createdAt 
      ? (typeof file.createdAt === 'string' 
          ? new Date(file.createdAt) 
          : file.createdAt)
      : null;
      
    const formattedDate = createdAt && !isNaN(createdAt.getTime())
      ? formatDistanceToNow(createdAt, { addSuffix: true })
      : 'Unknown date';

    // Use a direct link for file URL
    const fileUrl = fileService.getFileUrl(file.id);

    return (
      <Dialog>
        <DialogTrigger>
          <Button variant="ghost" size="icon" aria-label={`Preview ${file.originalName}`}>
            <Eye className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{file.originalName}</DialogTitle>
            <DialogDescription>
              {file.fileType} - {formattedDate}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {file.fileType === 'image' ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-full max-h-[60vh] overflow-hidden rounded-lg">
                  <Image
                    src={fileUrl}
                    alt={file.originalName}
                    width={800}
                    height={600}
                    className="object-contain w-full h-full"
                    style={{ maxHeight: '60vh' }}
                  />
                </div>
                <a href={fileUrl} download={file.originalName}>
                  <Button variant="outline">Download Original</Button>
                </a>
              </div>
            ) : file.fileType === 'audio' ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-full max-w-2xl bg-muted rounded-lg p-4">
                  <audio controls className="w-full">
                    <source src={fileUrl} type={file.mimeType} />
                    Your browser does not support the audio element.
                  </audio>
                </div>
                <a href={fileUrl} download={file.originalName}>
                  <Button variant="outline">Download Audio</Button>
                </a>
              </div>
            ) : file.fileType === 'video' ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-full max-w-2xl bg-muted rounded-lg overflow-hidden">
                  <video controls className="w-full">
                    <source src={fileUrl} type={file.mimeType} />
                    Your browser does not support the video element.
                  </video>
                </div>
                <a href={fileUrl} download={file.originalName}>
                  <Button variant="outline">Download Video</Button>
                </a>
              </div>
            ) : file.fileType === 'document' && file.mimeType === 'application/pdf' ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-full h-[60vh] bg-muted rounded-lg overflow-hidden">
                  <iframe
                    src={`${fileUrl}#view=FitH`}
                    className="w-full h-full"
                    title={file.originalName}
                  />
                </div>
                <a href={fileUrl} download={file.originalName}>
                  <Button variant="outline">Download PDF</Button>
                </a>
              </div>
            ) : (
              <div className="border rounded p-4 text-center">
                <File className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="mb-4">This file type cannot be previewed directly in the browser</p>
                <a href={fileUrl} download={file.originalName}>
                  <Button>Download File</Button>
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
          <TabsTrigger value="notes">Notes ({caseData.notes?.length || 0})</TabsTrigger>
          <TabsTrigger value="files" className="font-semibold">Files {isFilesLoading ? "(Loading...)" : `(${caseFiles?.length || 0})`}</TabsTrigger>
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
                <Button variant="outline" className="w-full" onClick={() => setActiveTab('files')}>
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
        
        {/* Files Tab */}
        <TabsContent value="files">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Case Evidence Files</CardTitle>
                <CardDescription>
                  All files associated with this case
                </CardDescription>
              </div>
              <Button onClick={() => setIsFileUploadOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
            </CardHeader>
            <CardContent>
              {isFilesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !caseFiles || caseFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <File className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Files Found</h3>
                  <p className="text-muted-foreground mb-4">
                    This case does not have any files associated with it yet.
                  </p>
                  <div className="flex gap-4">
                    <Button onClick={() => setIsFileUploadOpen(true)}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Files
                    </Button>
                    <Button variant="outline" onClick={() => refetch()}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <Tabs defaultValue="audio">
                    <TabsList className="mb-4">
                      <TabsTrigger value="audio">
                        Audio ({caseFiles.filter(f => {
                          if (f.fileType === 'audio') return true;
                          try {
                            const metadata = f.metadata ? JSON.parse(f.metadata) : null;
                            return metadata?.audioExtracted === true;
                          } catch (e) {
                            return false;
                          }
                        }).length})
                      </TabsTrigger>
                      <TabsTrigger value="video">
                        Video ({caseFiles.filter(f => f.fileType === 'video').length})
                      </TabsTrigger>
                      <TabsTrigger value="images">
                        Images ({caseFiles.filter(f => f.fileType === 'image').length})
                      </TabsTrigger>
                      <TabsTrigger value="documents">
                        Documents ({caseFiles.filter(f => f.fileType === 'document').length})
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="audio">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium">Audio Files</h3>
                          <Button variant="outline" onClick={() => {/* TODO: Implement batch transcription */}}>
                            Transcribe All
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {caseFiles
                            .filter(f => {
                              if (f.fileType === 'audio') return true;
                              try {
                                const metadata = f.metadata ? JSON.parse(f.metadata) : null;
                                return metadata?.audioExtracted === true;
                              } catch (e) {
                                return false;
                              }
                            })
                            .map((file) => (
                              <div key={file.id} className="border rounded-lg p-4">
                                <div className="flex justify-between items-center mb-2">
                                  <div>
                                    <h4 className="font-medium">{file.originalName}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {formatFileSize(file.size)} • {formatDistanceToNow(new Date(file.createdAt))} ago
                                      {(() => {
                                        try {
                                          const metadata = file.metadata ? JSON.parse(file.metadata) : null;
                                          if (metadata?.audioExtracted) {
                                            return ' • Extracted from video';
                                          }
                                          return '';
                                        } catch (e) {
                                          return '';
                                        }
                                      })()}
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button variant="outline" size="sm">
                                      Transcribe
                                    </Button>
                                    <FilePreviewDialog file={file} />
                                  </div>
                                </div>
                                <div className="bg-muted rounded-md p-2">
                                  <audio controls className="w-full">
                                    <source src={fileService.getFileUrl(file.id)} type={file.mimeType} />
                                    Your browser does not support the audio element.
                                  </audio>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="video">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium">Video Files</h3>
                        </div>
                        <div className="space-y-2">
                          {caseFiles
                            .filter(f => f.fileType === 'video')
                            .map((file) => (
                              <div key={file.id} className="border rounded-lg p-4">
                                <div className="flex justify-between items-center mb-2">
                                  <div>
                                    <h4 className="font-medium">{file.originalName}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {formatFileSize(file.size)} • {formatDistanceToNow(new Date(file.createdAt))} ago
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <FilePreviewDialog file={file} />
                                  </div>
                                </div>
                                <div className="bg-muted rounded-md p-2">
                                  <video controls className="w-full">
                                    <source src={fileService.getFileUrl(file.id)} type={file.mimeType} />
                                    Your browser does not support the video element.
                                  </video>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="images">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium">Image Files</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {caseFiles
                            .filter(f => f.fileType === 'image')
                            .map((file) => (
                              <div key={file.id} className="border rounded-lg p-4">
                                <div className="flex justify-between items-center mb-2">
                                  <div>
                                    <h4 className="font-medium">{file.originalName}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {formatFileSize(file.size)} • {formatDistanceToNow(new Date(file.createdAt))} ago
                                    </p>
                                  </div>
                                  <FilePreviewDialog file={file} />
                                </div>
                                <div className="relative aspect-square">
                                  <Image
                                    src={fileService.getFileUrl(file.id)}
                                    alt={file.originalName}
                                    fill
                                    className="object-cover rounded-md"
                                  />
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="documents">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h3 className="text-lg font-medium">Document Files</h3>
                        </div>
                        <div className="space-y-2">
                          {caseFiles
                            .filter(f => f.fileType === 'document')
                            .map((file) => (
                              <div key={file.id} className="border rounded-lg p-4">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h4 className="font-medium">{file.originalName}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {formatFileSize(file.size)} • {formatDistanceToNow(new Date(file.createdAt))} ago
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <FilePreviewDialog file={file} />
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
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
      <Dialog open={isFileUploadOpen} onOpenChange={setIsFileUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Evidence Files</DialogTitle>
            <DialogDescription>
              Upload files to add as evidence to this case
            </DialogDescription>
          </DialogHeader>
          
          {uploadError && (
            <div className="bg-red-50 text-red-600 p-3 rounded border border-red-200 text-sm">
              {uploadError}
            </div>
          )}
          
          <div 
            className="border-2 border-dashed border-muted rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
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
            <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm mb-1">Drag files here or <span className="text-primary font-medium">click to browse</span></p>
            <p className="text-xs text-muted-foreground">Maximum file size: 10MB</p>
          </div>
          
          {selectedFiles.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-sm mb-2">Selected Files ({selectedFiles.length})</h4>
              <div className="max-h-48 overflow-y-auto border rounded divide-y">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex justify-between items-center p-2">
                    <div className="truncate flex-1 text-sm">
                      <span className="font-medium">{file.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(index);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsFileUploadOpen(false);
                setSelectedFiles([]);
                setUploadError(null);
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleFileUpload}
              disabled={isUploading || selectedFiles.length === 0}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
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