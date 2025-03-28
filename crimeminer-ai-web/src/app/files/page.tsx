'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fileService, FileMetadata, api, caseService } from '@/lib/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, File, Image as ImageIcon, FileAudio, FileVideo, Trash2, Download, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useRouter, useSearchParams } from 'next/navigation';

type FileType = 'all' | 'document' | 'image' | 'audio' | 'video';

export default function FilesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const caseId = searchParams.get('caseId');
  const [activeTab, setActiveTab] = useState<FileType>('all');
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const [showCaseRequiredError, setShowCaseRequiredError] = useState(false);
  const queryClient = useQueryClient();

  // Query to get available cases
  const { data: casesData = [], isLoading: isCasesLoading } = useQuery({
    queryKey: ['cases'],
    queryFn: async () => {
      try {
        // Use the caseService instead of direct API call
        const cases = await caseService.getCases();
        console.log('Cases retrieved for dropdown:', cases);
        return cases;
      } catch (error) {
        console.error('Error fetching cases:', error);
        return []; // Return empty array on error
      }
    },
    refetchOnWindowFocus: false
  });

  // Make sure we have an array of cases to map over
  const cases = Array.isArray(casesData) ? casesData : [];

  // Query to get files, modified to include caseId if available
  const { data: files = [], isLoading, error, refetch } = useQuery({
    queryKey: ['files', activeTab, caseId],
    queryFn: () => caseId 
      ? fileService.getFilesByCase(caseId, activeTab === 'all' ? undefined : activeTab)
      : fileService.getFiles(activeTab === 'all' ? undefined : activeTab),
    refetchOnWindowFocus: false
  });

  // Mutation to upload a file
  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      if (!caseId) {
        throw new Error('Case ID is required for uploads');
      }
      return fileService.uploadFile(file, caseId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      setUploadingFiles([]);
    },
    onError: (error) => {
      console.error('Upload error:', error);
      if (error.message.includes('Case ID is required')) {
        setShowCaseRequiredError(true);
      }
    }
  });

  // Mutation to delete a file
  const deleteMutation = useMutation({
    mutationFn: (id: string) => fileService.deleteFile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      setFileToDelete(null);
    }
  });

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadingFiles(Array.from(e.target.files));
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (uploadingFiles.length === 0) return;
    
    if (!caseId) {
      setShowCaseRequiredError(true);
      return;
    }
    
    // Upload each file
    for (const file of uploadingFiles) {
      await uploadMutation.mutateAsync(file);
    }
  };

  // Handle file deletion
  const handleDelete = (id: string) => {
    setFileToDelete(id);
  };

  // Confirm file deletion
  const confirmDelete = () => {
    if (fileToDelete) {
      deleteMutation.mutate(fileToDelete);
    }
  };

  // Get icon for file type
  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <ImageIcon className="h-5 w-5" />;
      case 'audio':
        return <FileAudio className="h-5 w-5" />;
      case 'video':
        return <FileVideo className="h-5 w-5" />;
      default:
        return <File className="h-5 w-5" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  // Handle case selection
  const handleCaseSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCaseId = e.target.value;
    if (selectedCaseId) {
      router.push(`/files?caseId=${selectedCaseId}`);
      setShowCaseRequiredError(false);
    } else {
      router.push('/files');
    }
  };

  // Get case name from ID
  const getCaseName = (caseId: string) => {
    const caseItem = cases.find((c: any) => c.id === caseId);
    if (caseItem) {
      return `#${caseItem.caseNumber} - ${caseItem.title}`;
    }
    return 'Case #' + caseId.substring(0, 8);
  };

  // Handle file drop
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setUploadingFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Evidence Files</h1>
      
      <div className="grid grid-cols-1 gap-6">
        {/* File Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Evidence</CardTitle>
            <CardDescription>
              Select a case and upload files to analyze as evidence
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Case Selector */}
            <div className="mb-4">
              <label htmlFor="case-select" className="block text-sm font-medium mb-1">
                Select Case
              </label>
              <div className="flex gap-2">
                <select 
                  id="case-select" 
                  className="w-full border rounded-md p-2"
                  value={caseId || ''}
                  onChange={handleCaseSelect}
                  disabled={isCasesLoading}
                >
                  <option value="">-- Select a case --</option>
                  {isCasesLoading ? (
                    <option disabled>Loading cases...</option>
                  ) : cases.length > 0 ? (
                    cases.map((caseItem: any) => (
                      <option key={caseItem.id} value={caseItem.id}>
                        #{caseItem.caseNumber || 'No ID'} - {caseItem.title || 'Untitled Case'}
                      </option>
                    ))
                  ) : (
                    <option disabled>No cases available</option>
                  )}
                </select>
                <Button
                  variant="outline"
                  onClick={() => router.push('/cases')}
                >
                  New Case
                </Button>
              </div>
              {showCaseRequiredError && (
                <p className="text-red-500 text-sm mt-1">
                  You must select a case before uploading files
                </p>
              )}
            </div>

            <div 
              className={`border-2 ${!caseId ? 'border-gray-200 bg-gray-50' : 'border-dashed'} rounded-lg p-6 text-center`}
              onDrop={caseId ? handleFileDrop : (e) => e.preventDefault()}
              onDragOver={handleDragOver}
            >
              <Upload className={`h-10 w-10 mx-auto mb-4 ${!caseId ? 'text-gray-300' : 'text-muted-foreground'}`} />
              {!caseId ? (
                <p className="mb-2 text-sm text-muted-foreground">
                  Please select a case above before uploading files
                </p>
              ) : (
                <p className="mb-2 text-sm text-muted-foreground">
                  Drag and drop files here, or click to select files
                </p>
              )}
              <Input
                type="file"
                className="hidden"
                id="file-upload"
                multiple
                onChange={handleFileSelect}
                disabled={!caseId}
              />
              <Button asChild variant="secondary" disabled={!caseId}>
                <label htmlFor="file-upload">Select Files</label>
              </Button>
            </div>

            {uploadingFiles.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Selected Files:</h3>
                <ul className="space-y-2">
                  {uploadingFiles.map((file, index) => (
                    <li key={index} className="text-sm flex items-center justify-between border p-2 rounded">
                      <div className="flex items-center">
                        <File className="h-4 w-4 mr-2" />
                        <span>{file.name}</span>
                      </div>
                      <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={handleUpload} 
                  className="w-full"
                  disabled={uploadingFiles.length === 0 || uploadMutation.isPending}
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Files
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* File Listing Section */}
        <Card>
          <CardHeader>
            <CardTitle>Evidence Files</CardTitle>
            <Tabs 
              defaultValue="all" 
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as FileType)}
            >
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="document">Documents</TabsTrigger>
                <TabsTrigger value="image">Images</TabsTrigger>
                <TabsTrigger value="audio">Audio</TabsTrigger>
                <TabsTrigger value="video">Video</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center text-red-500 h-64 flex items-center justify-center">
                <p>Error loading files. Please try again.</p>
              </div>
            ) : files.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <TableRow>
                          <TableHeader>Name</TableHeader>
                          <TableHeader>Type</TableHeader>
                          <TableHeader>Size</TableHeader>
                          <TableHeader>Uploaded</TableHeader>
                          <TableHeader>Case</TableHeader>
                          <TableHeader className="text-right">Actions</TableHeader>
                        </TableRow>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                          No files found
                        </TableCell>
                      </TableRow>
                    ) : (
                      files.map((file: FileMetadata) => (
                        <TableRow key={file.id}>
                          <TableCell>
                            <div className="flex items-center">
                              {getFileIcon(file.fileType)}
                              <span className="ml-2">{file.originalName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {file.fileType.charAt(0).toUpperCase() + file.fileType.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatFileSize(file.size)}</TableCell>
                          <TableCell>{formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}</TableCell>
                          <TableCell>
                            {file.caseId ? (
                              <Badge 
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() => router.push(`/cases/${file.caseId}`)}
                              >
                                {getCaseName(file.caseId)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">No case</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <FilePreviewDialog file={file} />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => window.open(fileService.getFileUrl(file.id), '_blank')}
                                aria-label={`Download ${file.originalName}`}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(file.id)}
                                aria-label={`Delete ${file.originalName}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center text-muted-foreground h-64 flex items-center justify-center">
                <p>No files found. Upload some files to get started.</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => refetch()}>
              Refresh
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              file from the server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

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
                <audio 
                  controls 
                  className="w-full"
                  onError={(e) => {
                    console.error('Audio playback error:', e);
                    const audio = e.currentTarget;
                    console.log('Audio element state:', {
                      error: audio.error?.code,
                      errorMessage: audio.error?.message,
                      readyState: audio.readyState,
                      networkState: audio.networkState,
                      src: audio.src,
                      currentTime: audio.currentTime,
                      duration: audio.duration,
                      paused: audio.paused,
                      ended: audio.ended,
                      muted: audio.muted,
                      volume: audio.volume
                    });
                  }}
                  onLoadStart={() => console.log('Audio loading started')}
                  onLoadedMetadata={(e) => console.log('Audio metadata loaded:', {
                    duration: e.currentTarget.duration,
                    readyState: e.currentTarget.readyState
                  })}
                  onCanPlay={() => console.log('Audio can start playing')}
                  onPlay={() => console.log('Audio started playing')}
                  onPause={() => console.log('Audio paused')}
                >
                  <source 
                    src={fileUrl} 
                    type={file.mimeType} 
                    onError={(e) => console.error('Source error:', e)}
                  />
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