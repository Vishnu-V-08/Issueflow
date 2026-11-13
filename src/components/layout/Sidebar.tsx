import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Inbox,
  Ticket as TicketIcon,
  PlusCircle,
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  X,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTickets } from '../../context/TicketContext';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean | ((prev: boolean) => boolean)) => void;
  mobileOpen: boolean;
  setMobileOpen: (value: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  setIsCollapsed,
  mobileOpen,
  setMobileOpen,
}) => {
  const location = useLocation();
  const { tickets } = useTickets();
  const { user } = useAuth();

  const myTicketsCount = tickets.filter(
    (t) => t.assignedTo?.email === user?.email && t.status !== 'Resolved' && t.status !== 'Closed'
  ).length;

  const openTicketsCount = tickets.filter(
    (t) => t.status === 'Open' || t.status === 'In Progress'
  ).length;

  const navItems = [
    {
      title: 'Overview',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'My Tickets',
      path: '/my-tickets',
      icon: Inbox,
      badge: myTicketsCount > 0 ? myTicketsCount : undefined,
    },
    {
      title: 'All Tickets',
      path: '/tickets',
      icon: TicketIcon,
      badge: openTicketsCount > 0 ? openTicketsCount : undefined,
    },
    {
      title: 'Create Ticket',
      path: '/tickets/create',
      icon: PlusCircle,
      highlight: true,
    },
    {
      title: 'Team Management',
      path: '/team',
      icon: Users,
    },
    {
      title: 'Analytics',
      path: '/analytics',
      icon: BarChart3,
    },
    {
      title: 'Settings',
      path: '/settings',
      icon: Settings,
    },
    {
      title: 'Help & Support',
      path: '/help',
      icon: HelpCircle,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-20' : 'w-64',
          // Mobile state: slide in/out
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header / Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800">
          <NavLink
            to="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 overflow-hidden group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform shrink-0">
              <Layers className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                  Issue<span className="text-brand-600 dark:text-brand-400">Flow</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider text-brand-600 dark:text-brand-400 uppercase -mt-1 flex items-center gap-1">
                  AI Platform <Sparkles className="w-2.5 h-2.5 inline" />
                </span>
              </div>
            )}
          </NavLink>

          {/* Close button on mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === '/dashboard'
                ? location.pathname === '/' || location.pathname === '/dashboard'
                : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                title={isCollapsed ? item.title : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative',
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60',
                  item.highlight &&
                    !isActive &&
                    'border border-dashed border-brand-300 dark:border-brand-800 text-brand-600 dark:text-brand-400 hover:border-brand-500'
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 shrink-0 transition-colors',
                    isActive
                      ? 'text-brand-600 dark:text-brand-400'
                      : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                  )}
                />
                {!isCollapsed && <span className="truncate">{item.title}</span>}

                {/* Badge if present */}
                {item.badge !== undefined && (
                  <span
                    className={cn(
                      'ml-auto px-2 py-0.5 rounded-full text-[11px] font-semibold',
                      isActive
                        ? 'bg-brand-600 text-white dark:bg-brand-500'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                      isCollapsed && 'absolute top-1.5 right-1.5 text-[9px] px-1 py-0'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* AI Assistant Callout Box (when expanded) */}
        {!isCollapsed && (
          <div className="p-3 mx-3 mb-3 rounded-xl bg-gradient-to-br from-brand-50 via-indigo-50 to-purple-50 dark:from-slate-800/80 dark:to-brand-950/40 border border-brand-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="p-1 rounded-md bg-brand-600 text-white">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                AI Auto-Triage Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
              Tickets are automatically summarized and categorized with sentiment detection.
            </p>
          </div>
        )}

        {/* Footer / Collapse Toggle */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 hidden lg:flex items-center justify-between">
          {!isCollapsed && (
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              Collapse Sidebar
            </span>
          )}
          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
              isCollapsed && 'mx-auto'
            )}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </aside>
    </>
  );
};

