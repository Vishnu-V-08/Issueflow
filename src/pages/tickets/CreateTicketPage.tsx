import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  PlusCircle,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  User,
  Mail,
  Building,
  Loader2,
} from 'lucide-react';
import { useTickets } from '../../context/TicketContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { TicketCategory, TicketPriority } from '../../types';
import { toast } from 'sonner';
import { aiService } from '../../services/aiService';
import { categoryToFrontend, priorityToFrontend } from '../../utils/mappers';

const createTicketSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(15, 'Please provide a detailed description (at least 15 characters)'),
  category: z.enum([
    'Technical Issue',
    'Billing',
    'Account',
    'Bug Report',
    'Feature Request',
    'General Inquiry',
  ]),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  assignedToId: z.string().optional(),
  customerName: z.string().min(2, 'Customer name is required'),
  customerEmail: z.string().email('Please enter a valid customer email'),
  customerCompany: z.string().min(2, 'Company name is required'),
});

type CreateTicketFormData = z.infer<typeof createTicketSchema>;

export const CreateTicketPage: React.FC = () => {
  const navigate = useNavigate();
  const { teamMembers, createTicket } = useTickets();
  const { user } = useAuth();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    category?: TicketCategory;
    priority?: TicketPriority;
    explanation?: string;
    confidence?: number;
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateTicketFormData>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'Technical Issue',
      priority: 'Medium',
      assignedToId: user?.id || '',
      customerName: user?.name || 'Customer User',
      customerEmail: user?.email || 'customer@company.io',
      customerCompany: 'Enterprise Client',
    },
  });

  const watchTitle = watch('title');
  const watchDescription = watch('description');
  const watchCategory = watch('category');
  const watchPriority = watch('priority');

  const handleAiTriage = async () => {
    if (!watchTitle || watchTitle.trim().length < 5 || !watchDescription || watchDescription.trim().length < 10) {
      toast.error('Please enter a descriptive title and problem description first.');
      return;
    }

    setIsAnalyzing(true);
    try {
      const [classRes, prioRes] = await Promise.all([
        aiService.classify({ title: watchTitle, description: watchDescription }),
        aiService.priority({ title: watchTitle, description: watchDescription }),
      ]);

      const detectedCat = categoryToFrontend(classRes.suggested_category);
      const detectedPrio = priorityToFrontend(prioRes.suggested_priority);

      setAiSuggestion({
        category: detectedCat,
        priority: detectedPrio,
        explanation: `${classRes.explanation} Priority rationale: ${prioRes.explanation}`,
        confidence: Math.round(classRes.confidence * 100),
      });

      // Auto-apply to form
      setValue('category', detectedCat);
      setValue('priority', detectedPrio);
      toast.success(`AI Copilot classified as ${detectedCat} (${detectedPrio} priority)!`);
    } catch {
      toast.error('AI Copilot is currently offline or unconfigured. You can select categories manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onSubmit = async (data: CreateTicketFormData) => {
    try {
      const newTicket = await createTicket({
        title: data.title,
        description: data.description,
        category: data.category as TicketCategory,
        priority: data.priority as TicketPriority,
        assignedToId: data.assignedToId || undefined,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerCompany: data.customerCompany,
      });

      toast.success(`Ticket ${newTicket.ticketNumber} created successfully!`);
      navigate(`/tickets/${newTicket.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create ticket. Please try again.';
      toast.error(msg);
    }
  };

  const agentOptions = [
    { value: '', label: 'Unassigned (Queue)' },
    ...teamMembers.map((m) => ({
      value: m.id,
      label: `${m.name} (${m.role})`,
    })),
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <PlusCircle className="w-6 h-6 text-brand-600 dark:text-brand-400" /> Create Support Ticket
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              File a new technical ticket or customer inquiry into the IssueFlow queue
            </p>
          </div>
        </div>

        {/* AI Auto-Triage Action Button */}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleAiTriage}
          disabled={isAnalyzing}
          leftIcon={isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-violet-500" />}
        >
          {isAnalyzing ? 'Analyzing with Gemini...' : 'AI Auto-Triage'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Ticket Information</CardTitle>
                <CardDescription>Specify the problem details, classification, and assignment</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <form id="create-ticket-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Title */}
                <Input
                  label="Ticket Title / Subject"
                  placeholder="e.g. Database connection timeout during peak hours"
                  error={errors.title?.message}
                  {...register('title')}
                />

                {/* Category & Priority Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Category"
                    options={[
                      { value: 'Technical Issue', label: 'Technical Issue' },
                      { value: 'Billing', label: 'Billing' },
                      { value: 'Account', label: 'Account' },
                      { value: 'Bug Report', label: 'Bug Report' },
                      { value: 'Feature Request', label: 'Feature Request' },
                      { value: 'General Inquiry', label: 'General Inquiry' },
                    ]}
                    error={errors.category?.message}
                    {...register('category')}
                  />

                  <Select
                    label="Priority Level"
                    options={[
                      { value: 'Low', label: 'Low - General guidance' },
                      { value: 'Medium', label: 'Medium - Normal workflow impact' },
                      { value: 'High', label: 'High - Serious blockage' },
                      { value: 'Critical', label: 'Critical - System outage / financial impact' },
                    ]}
                    error={errors.priority?.message}
                    {...register('priority')}
                  />
                </div>

                {/* Assigned Agent */}
                <Select
                  label="Assigned Support Agent"
                  options={agentOptions}
                  error={errors.assignedToId?.message}
                  {...register('assignedToId')}
                />

                {/* Detailed Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Detailed Problem Description
                    </label>
                    <button
                      type="button"
                      onClick={handleAiTriage}
                      className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> Analyze with AI
                    </button>
                  </div>
                  <textarea
                    rows={5}
                    placeholder="Describe the steps to reproduce, error codes, affected users, and urgency..."
                    className={`block w-full rounded-lg border text-sm transition-colors py-2.5 px-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                      errors.description
                        ? 'border-rose-400 focus:ring-rose-500'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                    {...register('description')}
                  />
                  {errors.description && (
                    <p className="mt-1 text-xs text-rose-500 font-medium">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                {/* Customer Information Section */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                    Customer / Requester Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      label="Customer Name"
                      placeholder="Jane Doe"
                      leftIcon={<User className="w-3.5 h-3.5" />}
                      error={errors.customerName?.message}
                      {...register('customerName')}
                    />
                    <Input
                      label="Customer Email"
                      placeholder="jane@company.com"
                      leftIcon={<Mail className="w-3.5 h-3.5" />}
                      error={errors.customerEmail?.message}
                      {...register('customerEmail')}
                    />
                    <Input
                      label="Company Name"
                      placeholder="Acme Corp"
                      leftIcon={<Building className="w-3.5 h-3.5" />}
                      error={errors.customerCompany?.message}
                      {...register('customerCompany')}
                    />
                  </div>
                </div>

                {/* Submit button bar */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => navigate(-1)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmitting}
                    leftIcon={<PlusCircle className="w-4 h-4" />}
                  >
                    Publish Ticket
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Live AI Triage Preview Sidebar */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-brand-50/50 via-indigo-50/30 to-purple-50/40 dark:from-slate-900 dark:via-brand-950/20 dark:to-slate-900 border-brand-200/70 dark:border-brand-900/40">
            <CardHeader className="border-b border-brand-100 dark:border-brand-900/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-brand-600 text-white">
                    <Sparkles className="w-4 h-4" />
                  </span>
                  <CardTitle className="text-sm">AI Copilot Analysis</CardTitle>
                </div>
                {aiSuggestion?.confidence && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    {aiSuggestion.confidence}% Match
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  Target Severity
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                      watchPriority === 'Critical'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : watchPriority === 'High'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {watchPriority || 'Medium'}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    {watchPriority === 'Critical' ? 'SLA: 1 hour' : 'SLA: 4 hours'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  Detected Category
                </span>
                <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
                  {watchCategory || 'Technical Issue'}
                </p>
              </div>

              {aiSuggestion?.explanation && (
                <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-brand-100 dark:border-brand-900/40">
                  <p className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] mb-1">
                    AI Rationale:
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {aiSuggestion.explanation}
                  </p>
                </div>
              )}

              <div className="p-3 bg-white/70 dark:bg-slate-800/60 rounded-xl border border-brand-100 dark:border-brand-900/40">
                <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Database Persistence
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Upon creation, this ticket is stored directly in Supabase PostgreSQL, assigned a sequence identifier, and processed through live FastAPI business logic.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
