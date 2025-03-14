import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', asChild = false, children, ...props }, ref) => {
    const getVariantClasses = () => {
      switch (variant) {
        case 'outline':
          return 'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground';
        case 'secondary':
          return 'bg-secondary text-secondary-foreground hover:bg-secondary/80';
        case 'destructive':
          return 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
        case 'ghost':
          return 'hover:bg-accent hover:text-accent-foreground';
        default:
          return 'bg-primary text-primary-foreground hover:bg-primary/90';
      }
    };
    
    const getSizeClasses = () => {
      switch (size) {
        case 'sm':
          return 'h-9 px-3 rounded-md text-xs';
        case 'lg':
          return 'h-11 px-8 rounded-md';
        case 'icon':
          return 'h-10 w-10 rounded-md p-0';
        default:
          return 'h-10 px-4 py-2 rounded-md text-sm';
      }
    };
    
    if (asChild) {
      return React.cloneElement(React.Children.only(children) as React.ReactElement, {
        className: cn(
          'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
          getVariantClasses(),
          getSizeClasses(),
          className
        ),
        ...props,
      });
    }
    
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
          getVariantClasses(),
          getSizeClasses(),
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button'; 