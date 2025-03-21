import React, { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Reference } from '@/lib/api';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  id: string;
  entity: string;
  entityType: string;
  timestamp: Date;
  context: string;
  fileId: string;
  fileName?: string;
  confidence: number;
  location: string;
}

interface TimelineVisualizerProps {
  references: Reference[];
  fileNames?: Record<string, string>;
  className?: string;
  onEventClick?: (event: TimelineEvent) => void;
}

const TYPE_COLORS = {
  'PERSON': '#ff6b6b',
  'LOCATION': '#4ecdc4',
  'ORGANIZATION': '#1a535c',
  'DATE': '#ffd166',
  'WEAPON': '#ef476f',
  'VEHICLE': '#118ab2',
  'default': '#073b4c'
};

const TimelineVisualizer: React.FC<TimelineVisualizerProps> = ({
  references,
  fileNames = {},
  className = '',
  onEventClick
}) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [sortedEvents, setSortedEvents] = useState<TimelineEvent[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Process references into timeline events
  useEffect(() => {
    if (!references || references.length === 0) return;

    const timelineEvents = references
      .filter(ref => ref.timestamp) // Only include references with timestamps
      .map(ref => {
        // Format location string for different file types
        let locationStr = '';
        const { location, fileType } = ref;
        
        if (fileType === 'text' && location.lineNumber !== undefined) {
          locationStr = `Line ${location.lineNumber}`;
        } else if (fileType === 'audio' && location.startTime !== undefined) {
          locationStr = `${formatTime(location.startTime)}`;
        } else if (fileType === 'image' && location.x !== undefined && location.y !== undefined) {
          locationStr = `Position (${location.x}, ${location.y})`;
        } else if (fileType === 'document' && location.page !== undefined) {
          locationStr = `Page ${location.page}`;
        }

        return {
          id: ref.id,
          entity: ref.context.entity,
          entityType: ref.context.type,
          timestamp: new Date(ref.timestamp),
          context: ref.context.text,
          fileId: ref.fileId,
          fileName: fileNames[ref.fileId] || ref.fileId,
          confidence: ref.confidence,
          location: locationStr
        };
      });

    setEvents(timelineEvents);
  }, [references, fileNames]);

  // Sort events by timestamp
  useEffect(() => {
    if (!events.length) return;
    
    const sorted = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    setSortedEvents(sorted);
  }, [events]);

  // Format time in seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle event click
  const handleEventClick = (event: TimelineEvent) => {
    if (onEventClick) onEventClick(event);
  };

  return (
    <div className={cn("timeline-visualizer", className)}>
      <div className="timeline-legend flex flex-wrap mb-4 gap-3">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          type !== 'default' && (
            <div key={type} className="flex items-center">
              <div className="w-4 h-4 mr-2 rounded-full" style={{ backgroundColor: color }}></div>
              <span className="text-sm capitalize">{type.toLowerCase()}</span>
            </div>
          )
        ))}
      </div>

      <div 
        ref={containerRef}
        className="timeline-container border rounded-md p-4 bg-white overflow-y-auto h-[600px]"
      >
        {sortedEvents.length > 0 ? (
          <div className="timeline-events relative">
            <div className="timeline-line absolute left-[100px] top-0 bottom-0 w-0.5 bg-gray-300"></div>
            
            {sortedEvents.map((event, index) => (
              <div 
                key={event.id} 
                className="timeline-event flex mb-6 relative cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                onClick={() => handleEventClick(event)}
              >
                {/* Timeline node */}
                <div 
                  className="timeline-node w-3 h-3 rounded-full absolute left-[98px] z-10"
                  style={{ 
                    backgroundColor: TYPE_COLORS[event.entityType as keyof typeof TYPE_COLORS] || TYPE_COLORS.default,
                    top: '12px'
                  }}
                ></div>
                
                {/* Date/time */}
                <div className="timeline-date w-24 text-right mr-16 text-sm text-gray-500 pt-0.5">
                  {format(event.timestamp, 'MM/dd/yy HH:mm')}
                </div>
                
                {/* Event content */}
                <div className="timeline-content flex-1">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{event.entity}</h4>
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full" 
                        style={{ 
                          backgroundColor: TYPE_COLORS[event.entityType as keyof typeof TYPE_COLORS] || TYPE_COLORS.default,
                          color: 'white'
                        }}
                      >
                        {event.entityType}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {(event.confidence * 100).toFixed(0)}% confidence
                    </div>
                  </div>
                  
                  <div className="text-gray-700 text-sm bg-gray-50 p-2 rounded my-1 line-clamp-3">
                    {event.context}
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>File: {event.fileName}</span>
                    {event.location && <span>{event.location}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <svg 
                className="w-16 h-16 mx-auto mb-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1} 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <p>No timeline data available.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineVisualizer; 