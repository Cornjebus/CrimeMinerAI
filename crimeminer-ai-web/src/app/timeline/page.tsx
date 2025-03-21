'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { referencesService, fileService, Reference } from '@/lib/api';
import TimelineVisualizer from '@/components/TimelineVisualizer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Clock, Search, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function TimelinePage() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [entityQuery, setEntityQuery] = useState<string>('');
  const [entityType, setEntityType] = useState<string>('PERSON');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [fileNamesMap, setFileNamesMap] = useState<Record<string, string>>({});

  // Query to get all files
  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: ['files'],
    queryFn: () => fileService.getFiles(),
    refetchOnWindowFocus: false
  });

  // Build a map of file IDs to file names
  useEffect(() => {
    if (files && files.length > 0) {
      const fileMap: Record<string, string> = {};
      files.forEach(file => {
        fileMap[file.id] = file.originalName;
      });
      setFileNamesMap(fileMap);
    }
  }, [files]);

  // Query to get references for selected file
  const {
    data: fileReferences = [],
    isLoading: fileReferencesLoading,
  } = useQuery({
    queryKey: ['timeline', 'file', selectedFileId],
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
    queryKey: ['timeline', 'entity', entityQuery, entityType],
    queryFn: () => entityQuery ? referencesService.getReferencesForEntity(entityQuery, entityType) : Promise.resolve([]),
    enabled: false, // Don't run automatically, only when search button is clicked
    refetchOnWindowFocus: false
  });

  // Handle entity search
  const handleEntitySearch = () => {
    if (entityQuery) {
      refetchEntityReferences();
      // Clear other filters
      setSelectedFileId('');
      setSelectedCaseId('');
    }
  };

  // Handle file selection
  const handleFileSelect = (fileId: string) => {
    setSelectedFileId(fileId === 'all' ? '' : fileId);
    // Clear other filters
    setEntityQuery('');
    setEntityType('PERSON');
    setSelectedCaseId('');
  };

  // Handle event click
  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setOpenDialog(true);
  };

  // Determine which references to show
  const getActiveReferences = (): Reference[] => {
    if (selectedFileId) {
      return fileReferences;
    } else if (entityQuery) {
      return entityReferences;
    }
    return [];
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <Clock className="mr-3" />
        Evidence Timeline Visualizer
      </h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Timeline Filters</CardTitle>
          <CardDescription>Select a file or search for an entity to visualize in the timeline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Select a file:</label>
              <Select
                value={selectedFileId}
                onValueChange={handleFileSelect}
                disabled={!!entityQuery}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a file" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All files</SelectItem>
                  {files.map((file) => (
                    <SelectItem key={file.id} value={file.id}>
                      {file.originalName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Entity Search */}
            <div>
              <label className="block text-sm font-medium mb-2">Search for an entity:</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Entity name (e.g., John Smith)"
                  value={entityQuery}
                  onChange={(e) => setEntityQuery(e.target.value)}
                  disabled={!!selectedFileId}
                  className="flex-1"
                />
                
                <Select
                  value={entityType}
                  onValueChange={setEntityType}
                  disabled={!!selectedFileId}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERSON">Person</SelectItem>
                    <SelectItem value="LOCATION">Location</SelectItem>
                    <SelectItem value="ORGANIZATION">Organization</SelectItem>
                    <SelectItem value="DATE">Date</SelectItem>
                    <SelectItem value="WEAPON">Weapon</SelectItem>
                    <SelectItem value="VEHICLE">Vehicle</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleEntitySearch}
                  disabled={!entityQuery || entityReferencesLoading || !!selectedFileId}
                >
                  {entityReferencesLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedFileId ? (
              <>Evidence Timeline: {fileNamesMap[selectedFileId] || 'Selected File'}</>
            ) : entityQuery ? (
              <>Entity Timeline: {entityQuery}</>
            ) : (
              <>Evidence Timeline</>
            )}
          </CardTitle>
          <CardDescription>
            Chronological visualization of evidence references
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fileReferencesLoading || entityReferencesLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <TimelineVisualizer
              references={getActiveReferences()}
              fileNames={fileNamesMap}
              onEventClick={handleEventClick}
            />
          )}
        </CardContent>
      </Card>

      {/* Event Detail Dialog */}
      {selectedEvent && (
        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Event Details</DialogTitle>
              <DialogDescription>
                {new Date(selectedEvent.timestamp).toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-semibold">{selectedEvent.entity}</h3>
                <span
                  className="text-xs px-2 py-0.5 rounded-full text-white"
                  style={{
                    backgroundColor: 
                      TYPE_COLORS[selectedEvent.entityType as keyof typeof TYPE_COLORS] || 
                      TYPE_COLORS.default
                  }}
                >
                  {selectedEvent.entityType}
                </span>
              </div>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-1">Context:</h4>
                <div className="p-4 bg-gray-50 rounded-md whitespace-pre-wrap">
                  {selectedEvent.context}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">File:</span> {selectedEvent.fileName}
                </div>
                {selectedEvent.location && (
                  <div>
                    <span className="font-medium">Location:</span> {selectedEvent.location}
                  </div>
                )}
                <div>
                  <span className="font-medium">Confidence:</span> {(selectedEvent.confidence * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Define TYPE_COLORS here as well to use in the dialog
const TYPE_COLORS = {
  'PERSON': '#ff6b6b',
  'LOCATION': '#4ecdc4',
  'ORGANIZATION': '#1a535c',
  'DATE': '#ffd166',
  'WEAPON': '#ef476f',
  'VEHICLE': '#118ab2',
  'default': '#073b4c'
}; 