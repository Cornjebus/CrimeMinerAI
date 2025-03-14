'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { referencesService, fileService, Reference, FileMetadata } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, Search, Download, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function ReferencesPage() {
  const [activeTab, setActiveTab] = useState('files');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [entityText, setEntityText] = useState('');
  const [entityType, setEntityType] = useState('PERSON');
  const [caseId, setCaseId] = useState('');
  const queryClient = useQueryClient();

  // Query to get all files
  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: ['files'],
    queryFn: () => fileService.getFiles(),
    refetchOnWindowFocus: false
  });

  // Query to get references for a file
  const { 
    data: fileReferences = [], 
    isLoading: fileReferencesLoading,
    refetch: refetchFileReferences
  } = useQuery({
    queryKey: ['references', 'file', selectedFileId],
    queryFn: () => selectedFileId ? referencesService.getReferencesForFile(selectedFileId) : Promise.resolve([]),
    enabled: !!selectedFileId,
    refetchOnWindowFocus: false
  });

  // Query to get references for an entity
  const {
    data: entityReferences = [],
    isLoading: entityReferencesLoading,
    refetch: refetchEntityReferences
  } = useQuery({
    queryKey: ['references', 'entity', entityText, entityType],
    queryFn: () => entityText ? referencesService.getReferencesForEntity(entityText, entityType) : Promise.resolve([]),
    enabled: !!entityText,
    refetchOnWindowFocus: false
  });

  // Mutation to extract references for a file
  const extractMutation = useMutation({
    mutationFn: (fileId: string) => referencesService.extractReferences(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['references', 'file', selectedFileId] });
      refetchFileReferences();
    }
  });

  // Handle file selection
  const handleFileSelect = (fileId: string) => {
    setSelectedFileId(fileId);
  };

  // Handle entity search
  const handleEntitySearch = () => {
    if (entityText && entityType) {
      refetchEntityReferences();
    }
  };

  // Format location string
  const formatLocation = (reference: Reference) => {
    const { location, fileType } = reference;
    
    if (fileType === 'text' && location.lineNumber !== undefined) {
      return `Line ${location.lineNumber}, Char ${location.charPosition || 0}`;
    } else if (fileType === 'audio' && location.startTime !== undefined && location.endTime !== undefined) {
      return `${formatTime(location.startTime)} - ${formatTime(location.endTime)}`;
    } else if (fileType === 'image' && location.x !== undefined && location.y !== undefined) {
      return `Position (${location.x}, ${location.y})`;
    } else if (fileType === 'document' && location.page !== undefined) {
      return `Page ${location.page}`;
    }
    
    return 'Unknown location';
  };

  // Format time in seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Evidence References</h1>
      
      <Tabs defaultValue="files" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="files">File References</TabsTrigger>
          <TabsTrigger value="entities">Entity Search</TabsTrigger>
        </TabsList>
        
        <TabsContent value="files" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>File References</CardTitle>
              <CardDescription>
                View and extract references from evidence files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Select a file:</label>
                <div className="flex space-x-2">
                  <Select
                    value={selectedFileId || ''}
                    onValueChange={handleFileSelect}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a file" />
                    </SelectTrigger>
                    <SelectContent>
                      {files.map((file) => (
                        <SelectItem key={file.id} value={file.id}>
                          {file.originalName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedFileId && (
                    <Button
                      variant="outline"
                      onClick={() => extractMutation.mutate(selectedFileId)}
                      disabled={extractMutation.isPending}
                    >
                      {extractMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Extract References
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
              
              {fileReferencesLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : fileReferences.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entity</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Context</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fileReferences.map((reference) => (
                        <TableRow key={reference.id}>
                          <TableCell className="font-medium">{reference.context.entity}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {reference.context.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatLocation(reference)}</TableCell>
                          <TableCell>{(reference.confidence * 100).toFixed(1)}%</TableCell>
                          <TableCell className="max-w-md truncate">
                            <ReferenceContextDialog reference={reference} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : selectedFileId ? (
                <div className="text-center text-muted-foreground h-64 flex items-center justify-center">
                  <p>No references found for this file. Click "Extract References" to analyze the file.</p>
                </div>
              ) : (
                <div className="text-center text-muted-foreground h-64 flex items-center justify-center">
                  <p>Select a file to view its references.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="entities" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Entity Search</CardTitle>
              <CardDescription>
                Search for references to specific entities across all evidence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="flex space-x-2 mb-4">
                  <Input
                    placeholder="Entity name (e.g., John Smith)"
                    value={entityText}
                    onChange={(e) => setEntityText(e.target.value)}
                    className="flex-1"
                  />
                  
                  <Select
                    value={entityType}
                    onValueChange={setEntityType}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Entity type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERSON">Person</SelectItem>
                      <SelectItem value="LOCATION">Location</SelectItem>
                      <SelectItem value="ORGANIZATION">Organization</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    onClick={handleEntitySearch}
                    disabled={!entityText || entityReferencesLoading}
                  >
                    {entityReferencesLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Search
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Generate Report:</label>
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Case ID (e.g., 2025-0611)"
                      value={caseId}
                      onChange={(e) => setCaseId(e.target.value)}
                      className="flex-1"
                    />
                    
                    <Button
                      variant="outline"
                      onClick={() => window.open(referencesService.getReportUrl(caseId), '_blank')}
                      disabled={!caseId}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Report
                    </Button>
                  </div>
                </div>
              </div>
              
              {entityReferencesLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : entityReferences.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>File</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Context</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entityReferences.map((reference) => (
                        <TableRow key={reference.id}>
                          <TableCell className="font-medium">
                            {files.find(f => f.id === reference.fileId)?.originalName || reference.fileId}
                          </TableCell>
                          <TableCell>{formatLocation(reference)}</TableCell>
                          <TableCell>{(reference.confidence * 100).toFixed(1)}%</TableCell>
                          <TableCell className="max-w-md truncate">
                            <ReferenceContextDialog reference={reference} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : entityText ? (
                <div className="text-center text-muted-foreground h-64 flex items-center justify-center">
                  <p>No references found for this entity.</p>
                </div>
              ) : (
                <div className="text-center text-muted-foreground h-64 flex items-center justify-center">
                  <p>Enter an entity name and type to search for references.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Dialog to display reference context
function ReferenceContextDialog({ reference }: { reference: Reference }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="p-0 h-auto">
          {reference.context.text.substring(0, 50)}...
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Reference Context</DialogTitle>
          <DialogDescription>
            Entity: <strong>{reference.context.entity}</strong> ({reference.context.type})
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 p-4 bg-muted rounded-md whitespace-pre-wrap">
          {reference.context.text}
        </div>
      </DialogContent>
    </Dialog>
  );
} 