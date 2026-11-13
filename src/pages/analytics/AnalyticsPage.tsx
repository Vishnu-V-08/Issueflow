import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  Download,
  AlertCircle,
  Users,
  ShieldAlert,
  Loader2,
  Calendar,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import {
  analyticsService,
  AnalyticsOverview,
  StatusDistributionItem,
  PriorityDistributionItem,
  TicketTrendItem,
  AgentPerformanceItem,
  TeamPerformanceItem,
  AnalyticsFilterParams,
} from '../../services/analyticsService';
import { getApiErrorMessage } from '../../services/apiClient';
import { toast } from 'sonner';

export const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const isCustomer = user?.role === 'Customer' || user?.backendRole === 'CUSTOMER';

  const [period, setPeriod] = useState<'today' | '7d' | '30d' | '90d' | 'custom'>('30d');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [appliedCustomDates, setAppliedCustomDates] = useState<{ start?: string; end?: string }>({});

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [overview, setOverview] = useState<AnalyticsOverview>({
    total_tickets: 0,
    open_tickets: 0,
    in_progress_tickets: 0,
    pending_tickets: 0,
    resolved_tickets: 0,
    closed_tickets: 0,
    resolution_rate: 0,
  });
  const [statusDistribution, setStatusDistribution] = useState<StatusDistributionItem[]>([]);
  const [priorityDistribution, setPriorityDistribution] = useState<PriorityDistributionItem[]>([]);
  const [trends, setTrends] = useState<TicketTrendItem[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformanceItem[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformanceItem[]>([]);

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    const params: AnalyticsFilterParams = {
      period: period === 'custom' ? 'custom' : period,
    };

    if (period === 'custom') {
      if (appliedCustomDates.start) params.start_date = appliedCustomDates.start;
      if (appliedCustomDates.end) params.end_date = appliedCustomDates.end;
    }

    try {
      const [overviewData, statusData, priorityData, trendsData] = await Promise.all([
        analyticsService.getOverview(params),
        analyticsService.getTicketsByStatus(params),
        analyticsService.getTicketsByPriority(params),
        analyticsService.getTicketTrends(params),
      ]);

      setOverview(overviewData);
      setStatusDistribution(statusData);
      setPriorityDistribution(priorityData);
      setTrends(trendsData);

      // Fetch agent & team performance if user is staff/admin
      if (!isCustomer) {
        try {
          const [agentsData, teamsData] = await Promise.all([
            analyticsService.getAgentPerformance(params),
            analyticsService.getTeamPerformance(params),
          ]);
          setAgentPerformance(agentsData);
          setTeamPerformance(teamsData);
        } catch {
          // Non-admin fallback
        }
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to fetch analytics metrics'));
    } finally {
      setIsLoading(false);
    }
  }, [period, appliedCustomDates, isCustomer]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleApplyCustomDates = () => {
    if (!startDate && !endDate) {
      toast.error('Please select at least a start date or end date');
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      toast.error('Start date cannot be after end date');
      return;
    }
    setAppliedCustomDates({ start: startDate, end: endDate });
  };

  const handleExportReport = () => {
    try {
      const rows = [
        ['Metric', 'Value'],
        ['Total Tickets', overview.total_tickets.toString()],
        ['Open Tickets', overview.open_tickets.toString()],
        ['In Progress', overview.in_progress_tickets.toString()],
        ['Pending', overview.pending_tickets.toString()],
        ['Resolved', overview.resolved_tickets.toString()],
        ['Closed', overview.closed_tickets.toString()],
        ['Resolution Rate', `${overview.resolution_rate}%`],
        [],
        ['Priority', 'Count', 'Percentage'],
        ...priorityDistribution.map((p) => [p.label, p.count.toString(), `${p.percentage}%`]),
        [],
        ['Status', 'Count', 'Percentage'],
        ...statusDistribution.map((s) => [s.label, s.count.toString(), `${s.percentage}%`]),
      ];

      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `IssueFlow_Analytics_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Analytics CSV report downloaded successfully');
    } catch {
      toast.error('Failed to export CSV report');
    }
  };

  const metrics = [
    {
      title: 'Total Tickets Processed',
      value: overview.total_tickets.toLocaleString(),
      change: period === 'today' ? 'Today' : `Last ${period.toUpperCase()}`,
      icon: BarChart3,
      color: 'text-brand-600 dark:text-brand-400',
      bg: 'bg-brand-50 dark:bg-brand-950/60',
    },
    {
      title: 'Resolution Rate',
      value: `${overview.resolution_rate}%`,
      change: 'Resolved & Closed fixes',
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/60',
    },
    {
      title: 'Active Workload',
      value: (overview.open_tickets + overview.in_progress_tickets).toLocaleString(),
      change: `${overview.open_tickets} Open · ${overview.in_progress_tickets} In Progress`,
      icon: Clock,
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-50 dark:bg-sky-950/60',
    },
    {
      title: 'Pending Verification',
      value: overview.pending_tickets.toLocaleString(),
      change: 'Awaiting customer response',
      icon: AlertCircle,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/60',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            Support Analytics & Performance Scorecard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time PostgreSQL aggregated KPIs, volume velocity, and resolution efficiency
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time range pills */}
          <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <button
              onClick={() => setPeriod('today')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                period === 'today'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setPeriod('7d')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                period === '7d'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setPeriod('30d')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                period === '30d'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setPeriod('90d')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                period === '90d'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              Quarter
            </button>
            <button
              onClick={() => setPeriod('custom')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
                period === 'custom'
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              <Calendar className="w-3 h-3" /> Custom
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportReport}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Custom Date Filter Sub-Bar */}
      {period === 'custom' && (
        <Card className="bg-slate-50 dark:bg-slate-900/40 border-dashed">
          <CardContent className="p-4 flex flex-wrap items-center gap-4 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-brand-600" /> Date Range Filter:
            </span>
            <div className="flex items-center gap-2">
              <label className="text-slate-500">From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-500">To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>
            <Button size="sm" variant="primary" onClick={handleApplyCustomDates}>
              Apply Filter
            </Button>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.title} hover>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {metric.title}
                  </span>
                  <div className={`p-2.5 rounded-xl ${metric.bg} ${metric.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : metric.value}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{metric.change}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Row 1: Primary Trends Chart (Area Chart) */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Inbound Ticket Velocity & Resolution Trends</CardTitle>
            <CardDescription>
              Chronological comparison of new customer requests vs resolved tickets
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4 pb-2">
          {isLoading ? (
            <div className="h-72 w-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
          ) : trends.length === 0 ? (
            <div className="h-72 w-full flex flex-col items-center justify-center text-slate-400 text-sm">
              <Clock className="w-8 h-8 mb-2 opacity-50" />
              No ticket trends recorded for this selected time window.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
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
                  <Area
                    type="monotone"
                    name="Inbound Tickets"
                    dataKey="created_count"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorCreated)"
                  />
                  <Area
                    type="monotone"
                    name="Resolved Tickets"
                    dataKey="resolved_count"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorResolved)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Row 2: Status Breakdown Donut + Priority Severity Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown (Pie / Donut) */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Ticket Status Distribution</CardTitle>
              <CardDescription>Live breakdown across Open, In Progress, Pending, and Closed</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-2 pb-4">
            <div className="h-64 w-full flex items-center justify-center">
              {isLoading ? (
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
              ) : overview.total_tickets === 0 ? (
                <div className="text-center text-slate-400 text-sm">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No tickets found in the selected range.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="count"
                      nameKey="label"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`status-cell-${index}`} fill={entry.color} />
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
              )}
            </div>
          </CardContent>
        </Card>

        {/* Priority Severity Bar Chart */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Priority Distribution</CardTitle>
              <CardDescription>Severity triage breakdown across Critical, High, Medium, and Low</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4 pb-2">
            <div className="h-64 w-full">
              {isLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    <Bar dataKey="count" name="Tickets" radius={[6, 6, 0, 0]}>
                      {priorityDistribution.map((entry, idx) => (
                        <Cell key={`priority-bar-${idx}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Agent Performance Scorecard (Admin / Agent Only) */}
      {!isCustomer && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-600" /> Agent Performance Scorecard
              </CardTitle>
              <CardDescription>Individual support workload, resolved count, and resolution rate</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4 pb-4">
            {isLoading ? (
              <div className="h-48 w-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
              </div>
            ) : agentPerformance.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No active agent assignments in this period.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Agent Name</th>
                      <th className="py-3 px-4">Assigned Tickets</th>
                      <th className="py-3 px-4">Resolved Tickets</th>
                      <th className="py-3 px-4">Pending Tickets</th>
                      <th className="py-3 px-4 text-right">Resolution Performance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {agentPerformance.map((agent) => (
                      <tr key={agent.agent_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                          {agent.agent_name}
                          <span className="block text-[11px] text-slate-400 font-normal">{agent.email}</span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                          {agent.assigned_tickets}
                        </td>
                        <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold">
                          {agent.resolved_tickets}
                        </td>
                        <td className="py-3.5 px-4 text-amber-600 dark:text-amber-400 font-semibold">
                          {agent.pending_tickets}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400">
                            {agent.resolution_rate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Row 4: Team Performance Overview (Admin / Agent Only) */}
      {!isCustomer && (
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-600" /> Team & Departmental Performance
              </CardTitle>
              <CardDescription>Departmental ticket counts, open backlog, and resolution rates</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4 pb-4">
            {isLoading ? (
              <div className="h-48 w-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
              </div>
            ) : teamPerformance.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No departmental tickets registered in this period.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamPerformance.map((team, idx) => (
                  <div
                    key={team.team_id || idx}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {team.team_name}
                      </h4>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                        {team.resolution_rate}% Rate
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">TOTAL</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{team.total_tickets}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">OPEN</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{team.open_tickets}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">RESOLVED</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{team.resolved_tickets}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
