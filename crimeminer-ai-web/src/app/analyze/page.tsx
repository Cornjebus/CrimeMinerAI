'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, aiService } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

// Define proper types for our analysis results
interface EntityPerson {
  name: string;
  importance: string;
  confidence: number;
  timestamp?: string;
}

interface EntityLocation {
  name: string;
  type: string;
  confidence: number;
  timestamp?: string;
}

interface EntityOrganization {
  name: string;
  type: string;
  confidence: number;
  timestamp?: string;
}

interface EntityDate {
  date: string;
  context: string;
  confidence: number;
  timestamp?: string;
}

interface EntityWeapon {
  type: string;
  description: string;
  confidence: number;
  timestamp?: string;
}

interface EntityVehicle {
  description: string;
  identifiers: string[];
  confidence: number;
  timestamp?: string;
}

interface EntityResult {
  people: EntityPerson[];
  locations: EntityLocation[];
  organizations: EntityOrganization[];
  dates: EntityDate[];
  weapons: EntityWeapon[];
  vehicles: EntityVehicle[];
}

interface SummaryResult {
  summary: string;
  keyFindings: string[];
  relevanceScore: number;
  reliabilityAssessment: string;
}

interface SentimentResult {
  overallSentiment: string;
  sentimentScore: number;
  emotionalTone: {
    emotion: string;
    confidence: number;
  }[];
  possibleIntents: {
    intent: string;
    description: string;
    confidence: number;
    textEvidence?: string;
    location?: {
      approximatePosition?: number;
      exactPosition?: number;
      lineNumber?: number;
      charPosition?: number;
      context?: string;
    };
  }[];
  threatAssessment: {
    threatLevel: string;
    explanation: string;
    uncertaintyFactors?: string[];
  };
}

interface Pattern {
  type: string;
  description: string;
  examples: string[];
  significance: string;
}

interface PatternResult {
  identifiedPatterns: {
    patternType: string;
    description: string;
    relevantExcerpts: string[];
    confidence: number;
  }[];
  modusOperandi?: {
    description: string;
    confidence: number;
  };
  suggestedLeads: {
    description: string;
    priority: string;
    rationale: string;
  }[];
  similarCaseIndicators: any[]; // This can be more specific if needed
}

type AnalysisTab = 'entities' | 'summary' | 'sentiment' | 'patterns';

export default function AnalyzePage() {
  const searchParams = useSearchParams();
  const [text, setText] = useState('');
  const [activeTab, setActiveTab] = useState<AnalysisTab>('entities');
  const [results, setResults] = useState<Record<AnalysisTab, unknown>>({
    entities: null,
    summary: null,
    sentiment: null,
    patterns: null,
  });

  // Read tab parameter from URL when component mounts
  useEffect(() => {
    const tabParam = searchParams.get('tab') as AnalysisTab;
    if (tabParam && ['entities', 'summary', 'sentiment', 'patterns'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Entity extraction mutation
  const entityMutation = useMutation({
    mutationFn: (text: string) => aiService.extractEntities(text),
    onSuccess: (data) => {
      console.log('Entity extraction success:', data);
      setResults((prev) => ({ ...prev, entities: data }));
    },
    onError: (error: any) => {
      console.error('Entity extraction error:', error);
      alert(`Error analyzing entities: ${error.message}`);
    }
  });

  // Summarization mutation
  const summaryMutation = useMutation({
    mutationFn: (text: string) => aiService.summarizeEvidence(text),
    onSuccess: (data) => {
      console.log('Summarization success:', data);
      setResults((prev) => ({ ...prev, summary: data }));
    },
    onError: (error: any) => {
      console.error('Summarization error:', error);
      alert(`Error generating summary: ${error.message}`);
    }
  });

  // Sentiment analysis mutation
  const sentimentMutation = useMutation({
    mutationFn: (text: string) => aiService.analyzeSentimentAndIntent(text),
    onSuccess: (data) => {
      console.log('Sentiment analysis success:', data);
      setResults((prev) => ({ ...prev, sentiment: data }));
    },
    onError: (error: any) => {
      console.error('Sentiment analysis error:', error);
      alert(`Error analyzing sentiment: ${error.message}`);
    }
  });

  // Pattern identification mutation
  const patternMutation = useMutation({
    mutationFn: (text: string) => aiService.identifyPatterns(text),
    onSuccess: (data) => {
      console.log('Pattern identification success:', data);
      setResults((prev) => ({ ...prev, patterns: data }));
    },
    onError: (error: any) => {
      console.error('Pattern identification error:', error);
      alert(`Error identifying patterns: ${error.message}`);
    }
  });

  const handleAnalyze = async () => {
    if (!text.trim()) return;

    // Clear previous results
    setResults({
      entities: null,
      summary: null,
      sentiment: null,
      patterns: null,
    });

    try {
      // Run all analyses simultaneously
      entityMutation.mutate(text);
      summaryMutation.mutate(text);
      sentimentMutation.mutate(text);
      patternMutation.mutate(text);
    } catch (error: any) {
      console.error(`Error in handleAnalyze:`, error);
      alert(`Error analyzing text: ${error.message}`);
    }
  };

  const handleClear = () => {
    setText('');
    setResults({
      entities: null,
      summary: null,
      sentiment: null,
      patterns: null,
    });
  };

  const isLoading = 
    entityMutation.isPending ||
    summaryMutation.isPending ||
    sentimentMutation.isPending ||
    patternMutation.isPending;

  const hasError = 
    entityMutation.error ||
    summaryMutation.error ||
    sentimentMutation.error ||
    patternMutation.error;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">AI Evidence Analysis</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Evidence Text</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Enter evidence text to analyze..."
              className="min-h-[300px]"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex justify-between mt-4">
              <Button variant="outline" onClick={handleClear}>
                Clear
              </Button>
              <Button 
                onClick={handleAnalyze} 
                disabled={!text.trim() || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : 'Analyze'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <Tabs 
              defaultValue="entities" 
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as AnalysisTab)}
            >
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="entities">Entities</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
                <TabsTrigger value="patterns">Patterns</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-[300px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p>Analyzing evidence...</p>
              </div>
            ) : hasError ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-red-500">
                <AlertCircle className="h-8 w-8 mb-4" />
                <p>Error analyzing evidence. Please try again.</p>
              </div>
            ) : (
              <div className="min-h-[300px]">
                {activeTab === 'entities' && (
                  <EntityResults entities={results.entities as EntityResult | null} />
                )}
                {activeTab === 'summary' && (
                  <SummaryResults summary={results.summary as SummaryResult | null} />
                )}
                {activeTab === 'sentiment' && (
                  <SentimentResults sentiment={results.sentiment as SentimentResult | null} />
                )}
                {activeTab === 'patterns' && (
                  <PatternResults patterns={results.patterns as PatternResult | null} />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EntityResults({ entities }: { entities: EntityResult | null }) {
  if (!entities) {
    return (
      <div className="text-center text-muted-foreground h-full flex items-center justify-center">
        <p>No entities analyzed yet. Enter text and click Analyze.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entities.people.length > 0 && (
        <div className="border rounded p-3">
          <h3 className="font-medium text-lg mb-2">People</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {entities.people.map((person, index) => (
              <div key={index} className="border rounded p-2">
                <div className="flex justify-between">
                  <span className="font-medium">{person.name}</span>
                  <span className="text-sm text-muted-foreground">{Math.round(person.confidence * 100)}% confidence</span>
                </div>
                <div className="text-sm text-muted-foreground">{person.importance}</div>
                {person.timestamp && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Timestamp: {person.timestamp}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {entities.locations.length > 0 && (
        <div className="border rounded p-3">
          <h3 className="font-medium text-lg mb-2">Locations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {entities.locations.map((location, index) => (
              <div key={index} className="border rounded p-2">
                <div className="flex justify-between">
                  <span className="font-medium">{location.name}</span>
                  <span className="text-sm text-muted-foreground">{Math.round(location.confidence * 100)}% confidence</span>
                </div>
                <div className="text-sm text-muted-foreground">{location.type}</div>
                {location.timestamp && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Timestamp: {location.timestamp}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {entities.organizations.length > 0 && (
        <div className="border rounded p-3">
          <h3 className="font-medium text-lg mb-2">Organizations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {entities.organizations.map((org, index) => (
              <div key={index} className="border rounded p-2">
                <div className="flex justify-between">
                  <span className="font-medium">{org.name}</span>
                  <span className="text-sm text-muted-foreground">{Math.round(org.confidence * 100)}% confidence</span>
                </div>
                <div className="text-sm text-muted-foreground">{org.type}</div>
                {org.timestamp && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Timestamp: {org.timestamp}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {entities.dates.length > 0 && (
        <div className="border rounded p-3">
          <h3 className="font-medium text-lg mb-2">Dates</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {entities.dates.map((date, index) => (
              <div key={index} className="border rounded p-2">
                <div className="flex justify-between">
                  <span className="font-medium">{date.date}</span>
                  <span className="text-sm text-muted-foreground">{Math.round(date.confidence * 100)}% confidence</span>
                </div>
                <div className="text-sm text-muted-foreground">{date.context}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {entities.weapons.length > 0 && (
        <div className="border rounded p-3">
          <h3 className="font-medium text-lg mb-2">Weapons</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {entities.weapons.map((weapon, index) => (
              <div key={index} className="border rounded p-2">
                <div className="flex justify-between">
                  <span className="font-medium">{weapon.type}</span>
                  <span className="text-sm text-muted-foreground">{Math.round(weapon.confidence * 100)}% confidence</span>
                </div>
                <div className="text-sm text-muted-foreground">{weapon.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {entities.vehicles.length > 0 && (
        <div className="border rounded p-3">
          <h3 className="font-medium text-lg mb-2">Vehicles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {entities.vehicles.map((vehicle, index) => (
              <div key={index} className="border rounded p-2">
                <div className="flex justify-between">
                  <span className="font-medium">{vehicle.description}</span>
                  <span className="text-sm text-muted-foreground">{Math.round(vehicle.confidence * 100)}% confidence</span>
                </div>
                {vehicle.identifiers.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Identifiers: {vehicle.identifiers.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {entities.people.length === 0 && 
       entities.locations.length === 0 && 
       entities.organizations.length === 0 && 
       entities.dates.length === 0 && 
       entities.weapons.length === 0 && 
       entities.vehicles.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          <p>No entities were detected in the provided text.</p>
        </div>
      )}
    </div>
  );
}

function SummaryResults({ summary }: { summary: SummaryResult | null }) {
  if (!summary) {
    return (
      <div className="text-center text-muted-foreground h-full flex items-center justify-center">
        <p>No summary generated yet. Enter text and click Analyze.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded p-3">
        <h3 className="font-medium text-lg mb-2">Evidence Summary</h3>
        <p className="text-sm">{summary.summary}</p>
      </div>

      {summary.keyFindings.length > 0 && (
        <div className="border rounded p-3">
          <h3 className="font-medium text-lg mb-2">Key Findings</h3>
          <ul className="list-disc list-inside text-sm space-y-1">
            {summary.keyFindings.map((finding, index) => (
              <li key={index}>{finding}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="border rounded p-3">
          <h3 className="font-medium text-lg mb-2">Relevance Score</h3>
          <div className="flex items-center">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${(summary.relevanceScore / 10) * 100}%` }}
              ></div>
            </div>
            <span className="ml-2 text-sm font-medium">{summary.relevanceScore}/10</span>
          </div>
        </div>

        <div className="border rounded p-3">
          <h3 className="font-medium text-lg mb-2">Reliability</h3>
          <p className="text-sm">{summary.reliabilityAssessment}</p>
        </div>
      </div>
    </div>
  );
}

function SentimentResults({ sentiment }: { sentiment: SentimentResult | null }) {
  if (!sentiment) {
    return (
      <div className="text-center text-muted-foreground h-full flex items-center justify-center">
        <p>No sentiment analyzed yet. Enter text and click Analyze.</p>
      </div>
    );
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      case 'neutral':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500 text-white';
      case 'none':
        return 'bg-green-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded p-3">
        <h3 className="font-medium text-lg mb-2">Overall Sentiment</h3>
        <div className="flex items-center space-x-2">
          <span className={`text-xl font-bold ${getSentimentColor(sentiment.overallSentiment)}`}>
            {sentiment.overallSentiment}
          </span>
          <span className="text-sm text-muted-foreground">
            (Score: {sentiment.sentimentScore.toFixed(2)})
          </span>
        </div>
      </div>

      {sentiment.emotionalTone.length > 0 && (
        <div className="border rounded p-3">
          <h3 className="font-medium text-lg mb-2">Emotional Tones</h3>
          <div className="grid grid-cols-2 gap-2">
            {sentiment.emotionalTone.map((emotion, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="font-medium">{emotion.emotion}</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(emotion.confidence * 100)}% confidence
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {sentiment.possibleIntents.length > 0 && (
        <div className="border rounded p-3">
          <h3 className="font-medium text-lg mb-2">Possible Intents</h3>
          <div className="space-y-2">
            {sentiment.possibleIntents.map((intent, index) => (
              <div key={index} className="border rounded p-2">
                <div className="flex justify-between">
                  <span className="font-medium">{intent.intent}</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(intent.confidence * 100)}% confidence
                  </span>
                </div>
                <p className="text-sm mt-1">{intent.description}</p>
                
                {intent.textEvidence && (
                  <div className="mt-2 border-t pt-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <span className="font-medium mr-1">Evidence:</span>
                      <span className="italic">"{intent.textEvidence}"</span>
                    </div>
                    
                    {intent.location && intent.location.lineNumber && (
                      <div className="text-xs text-muted-foreground mt-1">
                        <span className="font-medium">Location:</span> Line {intent.location.lineNumber}, Position {intent.location.charPosition}
                      </div>
                    )}
                    
                    {intent.location && intent.location.context && (
                      <div className="mt-1 p-2 bg-muted rounded text-xs overflow-auto max-h-24">
                        <pre className="whitespace-pre-wrap">{intent.location.context}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border rounded p-3">
        <h3 className="font-medium text-lg mb-2">Threat Assessment</h3>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded text-sm font-medium ${getThreatLevelColor(sentiment.threatAssessment.threatLevel)}`}>
              {sentiment.threatAssessment.threatLevel}
            </span>
          </div>
          <p className="text-sm">{sentiment.threatAssessment.explanation}</p>
          
          {sentiment.threatAssessment.uncertaintyFactors && sentiment.threatAssessment.uncertaintyFactors.length > 0 && (
            <div className="mt-2">
              <h4 className="text-sm font-medium">Uncertainty Factors:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground">
                {sentiment.threatAssessment.uncertaintyFactors.map((factor, index) => (
                  <li key={index}>{factor}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PatternResults({ patterns }: { patterns: PatternResult | null }) {
  const [showAllPatterns, setShowAllPatterns] = useState(false);
  const [showAllLeads, setShowAllLeads] = useState(false);
  
  if (!patterns) {
    return (
      <div className="text-center text-muted-foreground h-full flex items-center justify-center">
        <p>No patterns analyzed yet. Enter text and click Analyze.</p>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const visiblePatterns = showAllPatterns 
    ? patterns.identifiedPatterns 
    : patterns.identifiedPatterns.slice(0, 5);
    
  const visibleLeads = showAllLeads 
    ? patterns.suggestedLeads 
    : patterns.suggestedLeads.slice(0, 5);

  return (
    <div className="space-y-4">
      {patterns.identifiedPatterns.length > 0 && (
        <div className="border rounded p-3">
          <h3 className="font-medium text-lg mb-2">Identified Patterns</h3>
          <div className="space-y-3">
            {visiblePatterns.map((pattern, index) => (
              <div key={index} className="border rounded p-2">
                <div className="flex justify-between">
                  <span className="font-medium">{pattern.patternType}</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(pattern.confidence * 100)}% confidence
                  </span>
                </div>
                <p className="text-sm mt-1">{pattern.description}</p>
                
                {pattern.relevantExcerpts.length > 0 && (
                  <div className="mt-2">
                    <h4 className="text-sm font-medium">Relevant Excerpts:</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {pattern.relevantExcerpts.map((excerpt, i) => (
                        <li key={i}>{excerpt}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {patterns.identifiedPatterns.length > 5 && (
            <div className="mt-3 text-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAllPatterns(!showAllPatterns)}
              >
                {showAllPatterns ? 'Show Less' : `Show ${patterns.identifiedPatterns.length - 5} More Patterns`}
              </Button>
            </div>
          )}
        </div>
      )}

      {patterns.modusOperandi && (
        <div className="border rounded p-3">
          <h3 className="font-medium text-lg mb-2">Modus Operandi</h3>
          <div className="flex justify-between">
            <p className="text-sm">{patterns.modusOperandi.description}</p>
            <span className="text-sm text-muted-foreground">
              {Math.round(patterns.modusOperandi.confidence * 100)}% confidence
            </span>
          </div>
        </div>
      )}

      {patterns.suggestedLeads.length > 0 && (
        <div className="border rounded p-3">
          <h3 className="font-medium text-lg mb-2">Suggested Leads</h3>
          <div className="space-y-3">
            {visibleLeads.map((lead, index) => (
              <div key={index} className="border rounded p-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Lead #{index + 1}</span>
                  <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(lead.priority)}`}>
                    {lead.priority} Priority
                  </span>
                </div>
                <p className="text-sm mt-1">{lead.description}</p>
                <p className="text-xs text-muted-foreground mt-1">Rationale: {lead.rationale}</p>
              </div>
            ))}
          </div>
          
          {patterns.suggestedLeads.length > 5 && (
            <div className="mt-3 text-center">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAllLeads(!showAllLeads)}
              >
                {showAllLeads ? 'Show Less' : `Show ${patterns.suggestedLeads.length - 5} More Leads`}
              </Button>
            </div>
          )}
        </div>
      )}

      {patterns.similarCaseIndicators.length > 0 && (
        <div className="border rounded p-3">
          <h3 className="font-medium text-lg mb-2">Similar Case Indicators</h3>
          <div className="space-y-2">
            {patterns.similarCaseIndicators.map((indicator, index) => (
              <div key={index} className="border rounded p-2">
                <p className="text-sm">{JSON.stringify(indicator)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {patterns.identifiedPatterns.length === 0 && 
       (!patterns.modusOperandi || patterns.modusOperandi.confidence === 0) && 
       patterns.suggestedLeads.length === 0 && 
       patterns.similarCaseIndicators.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          <p>No significant patterns were detected in the provided text.</p>
        </div>
      )}
    </div>
  );
} 