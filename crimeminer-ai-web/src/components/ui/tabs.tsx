import React, { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs component');
  }
  return context;
}

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ className = '', defaultValue, value, onValueChange, children, ...props }, ref) => {
    const [tabValue, setTabValue] = useState(value || defaultValue || '');
    
    const handleValueChange = (newValue: string) => {
      if (onValueChange) {
        onValueChange(newValue);
      } else {
        setTabValue(newValue);
      }
    };
    
    const contextValue: TabsContextValue = {
      value: value !== undefined ? value : tabValue,
      onValueChange: handleValueChange,
    };
    
    return (
      <TabsContext.Provider value={contextValue}>
        <div
          className={cn('flex flex-col', className)}
          ref={ref}
          {...props}
        >
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);

Tabs.displayName = 'Tabs';

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        className={cn(
          'inline-flex h-10 items-center justify-center rounded-md bg-secondary p-1',
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TabsList.displayName = 'TabsList';

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  value: string;
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className = '', children, value, ...props }, ref) => {
    const { value: selectedValue, onValueChange } = useTabsContext();
    const isSelected = selectedValue === value;
    
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          isSelected 
            ? 'bg-background text-foreground shadow-sm' 
            : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground',
          className
        )}
        ref={ref}
        {...props}
        data-state={isSelected ? 'active' : 'inactive'}
        data-value={value}
        onClick={() => onValueChange(value)}
      >
        {children}
      </button>
    );
  }
);

TabsTrigger.displayName = 'TabsTrigger';

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  value: string;
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className = '', children, value, ...props }, ref) => {
    const { value: selectedValue } = useTabsContext();
    const isSelected = selectedValue === value;
    
    if (!isSelected) return null;
    
    return (
      <div
        className={cn(
          'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className
        )}
        ref={ref}
        {...props}
        data-state={isSelected ? 'active' : 'inactive'}
        data-value={value}
      >
        {children}
      </div>
    );
  }
);

TabsContent.displayName = 'TabsContent'; 