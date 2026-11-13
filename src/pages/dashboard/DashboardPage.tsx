import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ticket as TicketIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Inbox,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { useTickets } from '../../context/TicketContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/common/Card';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import {
  analyticsService,
  TicketTrendItem,
  StatusDistributionItem,
  PriorityDistributionItem,
} from '../../services/analyticsService';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tickets } = useTickets();

  const [volumeRange, setVolumeRange] = useState<'7d' | '30d'>('7d');
  const [trends, setTrends] = useState<TicketTrendItem[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<StatusDistributionItem[]>([]);
  const [priorityDistribution, setPriorityDistribution] = useState<PriorityDistributionItem[]>([]);
  const [isChartsLoading, setIsChartsLoading] = useState<boolean>(true);

  // Fetch live chart analytics
  useEffect(() => {
    let isMounted = true;
    const fetchCharts = async () => {
      setIsChartsLoading(true);
      try {
        const [trendsData, statusData, priorityData] = await Promise.all([
          analyticsService.getTicketTrends({ period: volumeRange }),
          analyticsService.getTicketsByStatus(),
          analyticsService.getTicketsByPriority(),
        ]);
        if (isMounted) {
          setTrends(trendsData);
          setStatusDistribution(statusData);
          setPriorityDistribution(priorityData);
        }
      } catch {
        // Fallback gracefully without breaking dashboard
      } finally {
        if (isMounted) setIsChartsLoading(false);
      }
    };
    fetchCharts();
    return () => {
      isMounted = false;
    };
  }, [volumeRange, tickets.length]);

  // Top 5 recent tickets from state
  const recentTickets = tickets.slice(0, 5);

  // Dynamic stats calculated from real backend tickets
  const totalCount = tickets.length;
  const openCount = tickets.filter((t) => t.status === 'Open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'In Progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'Resolved' || t.status === 'Closed').length;

  const stats = [
    {
      title: 'Total Tickets',
      value: totalCount,
      change: 'Live database count',
      isPositive: true,
      icon: TicketIcon,
      color: 'text-brand-600 dark:text-brand-400',
      bgColor: 'bg-brand-50 dark:bg-brand-950/60',
    },
    {
      title: 'Open Tickets',
      value: openCount,
      change: 'Awaiting first triage',
      isPositive: true,
      icon: AlertCircle,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/60',
    },
    {
      title: 'In Progress',
      value: inProgressCount,
      change: 'Active agent investigation',
      isPositive: true,
      icon: Clock,
      color: 'text-sky-600 dark:text-sky-400',
      bgColor: 'bg-sky-50 dark:bg-sky-950/60',
    },
    {
      title: 'Resolved Tickets',
      value: resolvedCount,
      change: 'Closed & verified fixes',
      isPositive: true,
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/60',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome & Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Overview Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Welcome back, <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.name}</span>. Here is what is happening across your support workspace today.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/my-tickets')}
            leftIcon={<Inbox className="w-4 h-4" />}
          >
            My Assigned Queue
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/tickets/create')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Ticket
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} hover>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {stat.title}
                  </span>
                  <div className={`p-2.5 rounded-xl ${stat.bgColor} ${stat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    {stat.value}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center">
                      <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" />
                      {stat.change}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Ticket Volume - Line Chart (Span 2 cols on desktop) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Ticket Volume Trends</CardTitle>
              <CardDescription>Daily comparison of new inbound tickets vs resolved cases</CardDescription>
            </div>
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
              <button
                onClick={() => setVolumeRange('7d')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  volumeRange === '7d'
                    ? 'bg-white dark:bg-slate-700 shadow-xs text-brand-600 dark:text-brand-300'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setVolumeRange('30d')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  volumeRange === '30d'
                    ? 'bg-white dark:bg-slate-700 shadow-xs text-brand-600 dark:text-brand-300'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                30 Days
              </button>
            </div>
          </CardHeader>
          <CardContent className="pt-4 pb-2">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.92)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                      border: 'none',
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line
                    type="monotone"
                    name="Inbound Tickets"
                    dataKey="created_count"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#6366f1' }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    name="Resolved Tickets"
                    dataKey="resolved_count"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Chart 2: Ticket Status - Donut Chart */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Ticket Status Breakdown</CardTitle>
              <CardDescription>Current state of all tickets</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-2 pb-2">
            <div className="h-72 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="label"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.92)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                      border: 'none',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row: Priority Distribution Chart + AI Intelligence Highlight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 3: Priority Distribution Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Priority Distribution</CardTitle>
              <CardDescription>Active ticket severity classification across all departments</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4 pb-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={priorityDistribution}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.92)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                      border: 'none',
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {priorityDistribution.map((entry, idx) => (
                      <Cell key={`bar-${idx}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* AI Insight Box */}
        <Card className="bg-gradient-to-br from-brand-900 via-indigo-950 to-slate-900 text-white border-brand-800">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold mb-4 border border-brand-400/30">
                <Sparkles className="w-3.5 h-3.5" /> AI Workspace Copilot
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Automated Incident Triage
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                IssueFlow continuously reads customer sentiments, highlights critical payment failures, and formulates suggested resolutions before your agents even reply.
              </p>
              <div className="mt-4 p-3 rounded-lg bg-white/10 backdrop-blur-xs border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">Triage Accuracy</span>
                  <span className="font-bold text-emerald-400">96.8%</span>
                </div>
                <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: '96.8%' }} />
                </div>
                <p className="text-[11px] text-slate-300">
                  Avg First Response reduced from 4.2h to 18m.
                </p>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-slate-300">View detailed reports</span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/analytics')}
                rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
              >
                Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tickets Table */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Recent Support Tickets</CardTitle>
            <CardDescription>Latest issues registered in the system with real-time status</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/tickets')}
            rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
          >
            View All ({tickets.length})
          </Button>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned To</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {recentTickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  onClick={() => navigate(`/tickets/${ticket.id}`)}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                >
                  <td className="py-3.5 px-4 font-mono font-medium text-brand-600 dark:text-brand-400 shrink-0">
                    {ticket.ticketNumber}
                  </td>
                  <td className="py-3.5 px-4 max-w-xs">
                    <p className="font-medium text-slate-900 dark:text-slate-100 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400">
                      {ticket.title}
                    </p>
                    <span className="text-[11px] text-slate-400">{ticket.category}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <img
                        src={
                          ticket.customer.avatar ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${ticket.customer.name}`
                        }
                        alt={ticket.customer.name}
                        className="w-6 h-6 rounded-full object-cover"
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
                  <td className="py-3.5 px-4">
                    {ticket.assignedTo ? (
                      <div className="flex items-center gap-1.5">
                        <img
                          src={ticket.assignedTo.avatar}
                          alt={ticket.assignedTo.name}
                          className="w-5 h-5 rounded-full"
                        />
                        <span className="text-slate-700 dark:text-slate-300">
                          {ticket.assignedTo.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/tickets/${ticket.id}`);
                      }}
                      className="text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      Details →
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
