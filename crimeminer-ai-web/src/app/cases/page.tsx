'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { caseService, Case } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Folder, 
  FolderOpen, 
  FilePlus, 
  AlertTriangle,
  Clock,
  CheckCircle,
  ArchiveIcon,
  Loader2
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CasesPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [isNewCaseDialogOpen, setIsNewCaseDialogOpen] = useState(false);
  const [newCase, setNewCase] = useState({
    title: '',
    description: '',
    status: 'OPEN',
    priority: 'MEDIUM',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  
  const { data, isLoading, error: fetchError } = useQuery({
    queryKey: ['cases', { status: statusFilter }],
    queryFn: () => caseService.getCases({ status: statusFilter })
  });
  
  const createCaseMutation = useMutation({
    mutationFn: (caseData: any) => {
      // Generate a case number automatically
      const caseNumber = `CASE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      return caseService.createCase({
        ...caseData,
        caseNumber
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      setIsNewCaseDialogOpen(false);
      resetNewCaseForm();
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to create case');
      setIsSubmitting(false);
    }
  });

  const handleStatusFilterChange = (status?: string) => {
    setStatusFilter(status);
  };
  
  const handleOpenNewCaseDialog = () => {
    setIsNewCaseDialogOpen(true);
  };
  
  const handleCloseNewCaseDialog = () => {
    setIsNewCaseDialogOpen(false);
    resetNewCaseForm();
  };
  
  const resetNewCaseForm = () => {
    setNewCase({
      title: '',
      description: '',
      status: 'OPEN',
      priority: 'MEDIUM',
    });
    setError(null);
    setIsSubmitting(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewCase(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setNewCase(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    if (!newCase.title.trim()) {
      setError('Title is required');
      setIsSubmitting(false);
      return;
    }
    
    try {
      // Temporarily hardcode the user ID since we don't have auth yet
      // In a real implementation, this would come from the auth system
      await createCaseMutation.mutateAsync({
        ...newCase,
        createdById: "00000000-0000-0000-0000-000000000000"
      });
    } catch (error) {
      // Error is handled in the mutation's onError callback
      console.error('Error creating case:', error);
    }
  };

  const getCaseStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'CLOSED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'ARCHIVED':
        return <ArchiveIcon className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getCaseStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Open</Badge>;
      case 'CLOSED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Closed</Badge>;
      case 'ARCHIVED':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Archived</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Cases</h1>
          <p className="text-muted-foreground">
            Manage your investigation cases and associated evidence
          </p>
        </div>
        <Button onClick={handleOpenNewCaseDialog}>
          <FilePlus className="mr-2 h-4 w-4" />
          New Case
        </Button>
      </div>

      <div className="mb-6">
        <div className="flex space-x-2">
          <Button 
            variant={statusFilter === undefined ? "default" : "outline"} 
            onClick={() => handleStatusFilterChange(undefined)}
          >
            All Cases
          </Button>
          <Button 
            variant={statusFilter === 'OPEN' ? "default" : "outline"} 
            onClick={() => handleStatusFilterChange('OPEN')}
          >
            Open
          </Button>
          <Button 
            variant={statusFilter === 'CLOSED' ? "default" : "outline"} 
            onClick={() => handleStatusFilterChange('CLOSED')}
          >
            Closed
          </Button>
          <Button 
            variant={statusFilter === 'ARCHIVED' ? "default" : "outline"} 
            onClick={() => handleStatusFilterChange('ARCHIVED')}
          >
            Archived
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Case List</CardTitle>
          <CardDescription>
            {isLoading ? 'Loading cases...' : 
              data?.total ? `${data.total} cases found` : 
              'No cases found'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : fetchError ? (
            <div className="flex justify-center items-center h-64 text-red-500">
              <AlertTriangle className="h-8 w-8 mr-2" />
              <p>Error loading cases. Please try again later.</p>
            </div>
          ) : !data?.cases.length ? (
            <div className="flex flex-col justify-center items-center h-64 text-muted-foreground">
              <FolderOpen className="h-16 w-16 mb-4" />
              <p className="text-xl">No cases found</p>
              <p className="mb-4">Start by creating your first investigation case</p>
              <Button onClick={handleOpenNewCaseDialog}>
                <FilePlus className="mr-2 h-4 w-4" />
                Create Case
              </Button>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Evidence</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.cases.map((caseItem: Case) => (
                    <TableRow key={caseItem.id}>
                      <TableCell className="font-medium">{caseItem.caseNumber}</TableCell>
                      <TableCell>{caseItem.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {getCaseStatusIcon(caseItem.status)}
                          <span className="ml-2">{getCaseStatusBadge(caseItem.status)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDistanceToNow(caseItem.createdAt)} ago</TableCell>
                      <TableCell>{formatDistanceToNow(caseItem.updatedAt)} ago</TableCell>
                      <TableCell>{caseItem._count?.evidence ?? 0} items</TableCell>
                      <TableCell>
                        <Button variant="outline" asChild>
                          <Link href={`/cases/${caseItem.id}`}>View Details</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Create New Case Dialog */}
      <Dialog open={isNewCaseDialogOpen} onOpenChange={setIsNewCaseDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Case</DialogTitle>
            <DialogDescription>
              Enter the details for the new investigation case.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreateCase} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded border border-red-200 text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input 
                id="title"
                name="title"
                placeholder="Case title"
                value={newCase.title}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description"
                name="description"
                placeholder="Add a description of the case..."
                value={newCase.description}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={newCase.status} 
                  onValueChange={(value) => handleSelectChange('status', value)}
                >
                  <SelectTrigger id="status" className="bg-white !bg-opacity-100 w-full border-input">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white !bg-opacity-100 border shadow-lg z-50">
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={newCase.priority} 
                  onValueChange={(value) => handleSelectChange('priority', value)}
                >
                  <SelectTrigger id="priority" className="bg-white !bg-opacity-100 w-full border-input">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-white !bg-opacity-100 border shadow-lg z-50">
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <DialogFooter className="pt-4">
              <Button variant="outline" type="button" onClick={handleCloseNewCaseDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : 'Create Case'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 