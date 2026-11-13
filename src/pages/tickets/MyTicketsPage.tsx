import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Inbox,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
} from 'lucide-react';
import { useTickets } from '../../context/TicketContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Card, CardContent } from '../../components/common/Card';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import { EmptyState } from '../../components/common/EmptyState';
import { TicketStatus, TicketPriority } from '../../types';

export const MyTicketsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tickets } = useTickets();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'priority'>('date-desc');

  // Filter tickets assigned to current user, or created by customer
  const myAssignedTickets = useMemo(() => {
    const isCustomer = user?.role === 'Customer' || user?.backendRole === 'CUSTOMER';
    if (isCustomer) {
      return tickets;
    }
    return tickets.filter((ticket) => {
      if (!ticket.assignedTo) return false;
      return (
        ticket.assignedTo.id === user?.id ||
        ticket.assignedTo.email.toLowerCase() === user?.email.toLowerCase()
      );
    });
  }, [tickets, user]);

  // Apply search and filter criteria
  const filteredTickets = useMemo(() => {
    return myAssignedTickets
      .filter((ticket) => {
        const matchesSearch =
          search === '' ||
          ticket.title.toLowerCase().includes(search.toLowerCase()) ||
          ticket.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
          ticket.customer.name.toLowerCase().includes(search.toLowerCase()) ||
          ticket.category.toLowerCase().includes(search.toLowerCase());

        const matchesStatus =
          statusFilter === 'ALL' || ticket.status === statusFilter;

        const matchesPriority =
          priorityFilter === 'ALL' || ticket.priority === priorityFilter;

        return matchesSearch && matchesStatus && matchesPriority;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'date-asc') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'priority') {
          const weight: Record<TicketPriority, number> = {
            Critical: 4,
            High: 3,
            Medium: 2,
            Low: 1,
          };
          return weight[b.priority] - weight[a.priority];
        }
        return 0;
      });
  }, [myAssignedTickets, search, statusFilter, priorityFilter, sortBy]);

  const openCount = myAssignedTickets.filter((t) => t.status === 'Open').length;
  const inProgressCount = myAssignedTickets.filter((t) => t.status === 'In Progress').length;
  const resolvedCount = myAssignedTickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Inbox className="w-6 h-6 text-brand-600 dark:text-brand-400" /> My Assigned Tickets
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Issues actively delegated to you (<span className="font-semibold text-slate-700 dark:text-slate-300">{user?.name}</span>)
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate('/tickets/create')}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create New Ticket
        </Button>
      </div>

      {/* Quick Status Stats Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'ALL'
              ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 ring-1 ring-brand-500'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
          }`}
        >
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">All My Queue</span>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{myAssignedTickets.length}</p>
        </button>

        <button
          onClick={() => setStatusFilter('Open')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'Open'
              ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/40 ring-1 ring-amber-500'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
          }`}
        >
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Open</span>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{openCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter('In Progress')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'In Progress'
              ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/40 ring-1 ring-sky-500'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
          }`}
        >
          <span className="text-xs text-sky-600 dark:text-sky-400 font-medium">In Progress</span>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{inProgressCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter('Resolved')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'Resolved'
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 ring-1 ring-emerald-500'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
          }`}
        >
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Resolved</span>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">{resolvedCount}</p>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by subject, number, client..."
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Dropdown filters */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span>Priority:</span>
            </div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Sort:</span>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="priority">Highest Severity</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      {filteredTickets.length > 0 ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Issue Description</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-mono font-medium text-brand-600 dark:text-brand-400">
                      {ticket.ticketNumber}
                    </td>
                    <td className="py-3.5 px-4 max-w-sm">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors truncate">
                        {ticket.title}
                      </p>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {ticket.description}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <img
                          src={
                            ticket.customer.avatar ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${ticket.customer.name}`
                          }
                          alt={ticket.customer.name}
                          className="w-6 h-6 rounded-full"
                        />
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            {ticket.customer.name}
                          </p>
                          <p className="text-[10px] text-slate-400">{ticket.customer.company}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <PriorityBadge priority={ticket.priority} />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(ticket.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tickets/${ticket.id}`);
                        }}
                        className="text-brand-600 dark:text-brand-400 font-medium"
                      >
                        Open
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState
          icon={Inbox}
          title="No tickets found"
          description={
            search || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
              ? 'No assigned tickets match your selected filters. Try clearing filters to see all tickets.'
              : 'You do not have any tickets assigned to you right now.'
          }
          actionLabel="Browse All Tickets"
          onAction={() => navigate('/tickets')}
        />
      )}
    </div>
  );
};
