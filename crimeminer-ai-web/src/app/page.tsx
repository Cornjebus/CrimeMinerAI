'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Folder, FileText, Brain, AlertCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart2, FileText as FileTextIcon, FolderOpen } from 'lucide-react';

export default function Home() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/cases/stats/summary');
        return response.data;
      } catch (error) {
        console.error('Error fetching stats:', error);
        return {
          totalFiles: 0,
          totalAnalyses: 0,
          recentActivity: []
        };
      }
    }
  });

  const features = [
    {
      title: 'Create New Case',
      description: 'Start a new investigation case and begin uploading evidence.',
      icon: FileTextIcon,
      href: '/cases',
      color: 'bg-blue-100',
    },
    {
      title: 'Case Management',
      description: 'View and manage all investigation cases, evidence, and notes.',
      icon: FolderOpen,
      href: '/cases',
      color: 'bg-amber-100',
    },
    {
      title: 'AI Analysis',
      description: 'Extract entities, summarize evidence, analyze sentiment, and identify patterns.',
      icon: Brain,
      href: '/analyze?tab=sentiment',
      color: 'bg-purple-100',
    },
    {
      title: 'Evidence Reports',
      description: 'Generate comprehensive reports from your evidence analysis.',
      icon: FileText,
      href: '/analyze?tab=summary',
      color: 'bg-green-100',
    },
  ];

  return (
    <div className="container mx-auto py-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">CrimeMiner AI Dashboard</h1>
        <p className="text-lg text-muted-foreground">
          Advanced AI-powered tools for law enforcement evidence analysis
        </p>
      </div>

      {/* Backend Status */}
      <Card className="mb-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Backend Status</CardTitle>
          <CardDescription>Connection to the CrimeMiner AI backend server</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin h-5 w-5 mr-3 border-2 border-primary border-t-transparent rounded-full"></div>
              <p>Checking connection...</p>
            </div>
          ) : (
            <div className="flex items-center text-green-500">
              <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
              <p>Connected to backend server</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features Grid */}
      <h2 className="text-2xl font-bold mb-4">Features</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {features.map((feature) => (
          <Card key={feature.title} className="overflow-hidden">
            <div className={`${feature.color} p-4`}>
              <feature.icon className="h-8 w-8" />
            </div>
            <CardHeader>
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild>
                <Link href={feature.href}>
                  Explore {feature.title}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
