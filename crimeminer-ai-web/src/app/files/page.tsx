'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fileService, FileMetadata } from '@/lib/api';
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

type FileType = 'all' | 'document' | 'image' | 'audio' | 'video';

export default function FilesPage() {
  const [activeTab, setActiveTab] = useState<FileType>('all');
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);
  const queryClient = useQueryClient();

  // Query to get all files
  const { data: files = [], isLoading, error, refetch } = useQuery({
    queryKey: ['files', activeTab],
    queryFn: () => fileService.getFiles(activeTab === 'all' ? undefined : activeTab),
    refetchOnWindowFocus: false
  });

  // Mutation to upload a file
  const uploadMutation = useMutation({
    mutationFn: (file: File) => fileService.uploadFile(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      setUploadingFiles([]);
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

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Evidence Files</h1>
      
      <div className="grid grid-cols-1 gap-6">
        {/* File Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Evidence</CardTitle>
            <CardDescription>
              Upload files to analyze as evidence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground">
                Drag and drop files here, or click to select files
              </p>
              <Input
                type="file"
                className="hidden"
                id="file-upload"
                multiple
                onChange={handleFileSelect}
              />
              <Button asChild variant="secondary">
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
                      <TableHead>Type</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell>
                          <div className="flex items-center">
                            {getFileIcon(file.fileType)}
                            <Badge variant="outline" className="ml-2">
                              {file.fileType}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{file.originalName}</TableCell>
                        <TableCell>{formatFileSize(file.size)}</TableCell>
                        <TableCell>{formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
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
                    ))}
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
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Preview ${file.originalName}`}>
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>{file.originalName}</DialogTitle>
          <DialogDescription>
            {file.fileType} - {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {file.fileType === 'image' ? (
            <div className="flex justify-center">
              <Image 
                src={fileService.getFileUrl(file.id)}
                alt={file.originalName}
                width={800}
                height={400}
                className="max-h-[400px] object-contain"
                unoptimized
              />
            </div>
          ) : file.fileType === 'audio' ? (
            <audio controls className="w-full">
              <source src={fileService.getFileUrl(file.id)} />
              Your browser does not support the audio element.
            </audio>
          ) : file.fileType === 'video' ? (
            <video controls className="w-full max-h-[400px]">
              <source src={fileService.getFileUrl(file.id)} />
              Your browser does not support the video element.
            </video>
          ) : (
            <div className="border rounded p-4 text-center">
              <File className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p>Preview not available for this file type</p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button asChild>
            <a href={fileService.getFileUrl(file.id)} download={file.originalName} target="_blank" rel="noopener noreferrer">
              Download
            </a>
          </Button>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 