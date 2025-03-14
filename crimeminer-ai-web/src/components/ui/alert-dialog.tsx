import React, { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils';

interface AlertDialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AlertDialogContext = createContext<AlertDialogContextValue | undefined>(undefined);

function useAlertDialogContext() {
  const context = useContext(AlertDialogContext);
  if (!context) {
    throw new Error('AlertDialog components must be used within an AlertDialog component');
  }
  return context;
}

interface AlertDialogProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AlertDialog({
  children,
  defaultOpen = false,
  open,
  onOpenChange,
}: AlertDialogProps) {
  const [internalOpen, setInternalOpen] = useState(open || defaultOpen);
  
  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };
  
  const contextValue: AlertDialogContextValue = {
    open: open !== undefined ? open : internalOpen,
    onOpenChange: handleOpenChange,
  };
  
  return (
    <AlertDialogContext.Provider value={contextValue}>
      {children}
    </AlertDialogContext.Provider>
  );
}

interface AlertDialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export function AlertDialogTrigger({ children, ...props }: AlertDialogTriggerProps) {
  const { onOpenChange } = useAlertDialogContext();
  
  return (
    <button
      type="button"
      onClick={() => onOpenChange(true)}
      {...props}
    >
      {children}
    </button>
  );
}

interface AlertDialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function AlertDialogContent({ children, className, ...props }: AlertDialogContentProps) {
  const { open } = useAlertDialogContext();
  
  if (!open) return null;
  
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      aria-modal="true"
      role="alertdialog"
      {...props}
    >
      <div
        className={cn(
          'relative bg-background rounded-lg shadow-lg p-6 w-full max-w-md max-h-[85vh] overflow-auto',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

interface AlertDialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function AlertDialogHeader({ children, className, ...props }: AlertDialogHeaderProps) {
  return (
    <div
      className={cn('flex flex-col space-y-2 text-center sm:text-left', className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface AlertDialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  className?: string;
}

export function AlertDialogTitle({ children, className, ...props }: AlertDialogTitleProps) {
  return (
    <h2
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    >
      {children}
    </h2>
  );
}

interface AlertDialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  className?: string;
}

export function AlertDialogDescription({ children, className, ...props }: AlertDialogDescriptionProps) {
  return (
    <p
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    >
      {children}
    </p>
  );
}

export function AlertDialogFooter({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-4', className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface AlertDialogActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export function AlertDialogAction({ children, className, ...props }: AlertDialogActionProps) {
  const { onOpenChange } = useAlertDialogContext();
  
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background h-10 py-2 px-4 bg-primary text-primary-foreground hover:bg-primary/90',
        className
      )}
      onClick={() => onOpenChange(false)}
      {...props}
    >
      {children}
    </button>
  );
}

interface AlertDialogCancelProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export function AlertDialogCancel({ children, className, ...props }: AlertDialogCancelProps) {
  const { onOpenChange } = useAlertDialogContext();
  
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 py-2 px-4 mt-2 sm:mt-0',
        className
      )}
      onClick={() => onOpenChange(false)}
      {...props}
    >
      {children}
    </button>
  );
} 