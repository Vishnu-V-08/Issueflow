import React from 'react';
import { cn } from '../../utils/cn';
import { TicketPriority, TicketStatus } from '../../types';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
  dot = false,
}) => {
  const variants = {
    default:
      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    success:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    warning:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    danger:
      'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    info:
      'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    purple:
      'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  };

  const dotColors = {
    default: 'bg-slate-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    info: 'bg-sky-500',
    purple: 'bg-indigo-500',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dotColors[variant])} />}
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: TicketStatus; className?: string }> = ({
  status,
  className,
}) => {
  switch (status) {
    case 'Open':
      return (
        <Badge variant="warning" dot className={className}>
          Open
        </Badge>
      );
    case 'In Progress':
      return (
        <Badge variant="info" dot className={className}>
          In Progress
        </Badge>
      );
    case 'Resolved':
      return (
        <Badge variant="success" dot className={className}>
          Resolved
        </Badge>
      );
    case 'Closed':
      return (
        <Badge variant="default" dot className={className}>
          Closed
        </Badge>
      );
    default:
      return <Badge className={className}>{status}</Badge>;
  }
};

export const PriorityBadge: React.FC<{ priority: TicketPriority; className?: string }> = ({
  priority,
  className,
}) => {
  switch (priority) {
    case 'Critical':
      return (
        <Badge variant="danger" dot className={className}>
          Critical
        </Badge>
      );
    case 'High':
      return (
        <Badge variant="warning" dot className={className}>
          High
        </Badge>
      );
    case 'Medium':
      return (
        <Badge variant="info" dot className={className}>
          Medium
        </Badge>
      );
    case 'Low':
      return (
        <Badge variant="success" dot className={className}>
          Low
        </Badge>
      );
    default:
      return <Badge className={className}>{priority}</Badge>;
  }
};

