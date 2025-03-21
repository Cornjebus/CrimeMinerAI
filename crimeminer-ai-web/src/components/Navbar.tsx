'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { FileText, BarChart2, FolderOpen, BookOpen, Clock } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  
  const navItems = [
    { href: '/', label: 'Dashboard', icon: <BarChart2 className="h-5 w-5" /> },
    { href: '/files', label: 'Files', icon: <FolderOpen className="h-5 w-5" /> },
    { href: '/analyze', label: 'Analyze', icon: <FileText className="h-5 w-5" /> },
    { href: '/references', label: 'References', icon: <BookOpen className="h-5 w-5" /> },
    { href: '/timeline', label: 'Timeline', icon: <Clock className="h-5 w-5" /> },
  ];
  
  return (
    <nav className="flex items-center space-x-4 lg:space-x-6 px-6 py-4 border-b">
      <div className="font-bold text-xl mr-8">CrimeMiner AI</div>
      
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center text-sm font-medium transition-colors hover:text-primary",
            pathname === item.href
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          <span className="mr-2">{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );
} 