import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  MessageSquare,
  Clock,
  Send,
  Lock,
  Globe,
  Trash2,
  Edit2,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useTickets } from '../../context/TicketContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/Card';
import { StatusBadge, PriorityBadge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { TicketStatus, TicketPriority } from '../../types';
import { toast } from 'sonner';
import { aiService } from '../../services/aiService';
import { commentService } from '../../services/commentService';
import { priorityToFrontend } from '../../utils/mappers';

export const TicketDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    getTicketById,
    fetchTicketById,
    updateTicket,
    updateTicketStatus,
    updateTicketPriority,
    assignTicket,
    addComment,
    deleteTicket,
    teamMembers,
  } = useTickets();

  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [ticketState, setTicketState] = useState(getTicketById(id || ''));

  // Local state for comments
  const [commentText, setCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);

  // Edit ticket modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Delete confirm modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // AI Generation state
  const [isRefreshingAI, setIsRefreshingAI] = useState(false);

  // Active tab for comments vs activity
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');

  const loadTicket = useCallback(async () => {
    if (!id) return;
    setIsLoadingDetails(true);
    const live = await fetchTicketById(id);
    if (live) {
      setTicketState(live);
      setEditTitle(live.title);
      setEditDescription(live.description);
    }
    setIsLoadingDetails(false);
  }, [id, fetchTicketById]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  const ticket = ticketState || getTicketById(id || '');

  const isAdmin = user?.role === 'Admin' || user?.backendRole === 'ADMIN';

  if (isLoadingDetails && !ticket) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 mx-auto text-brand-600 animate-spin mb-3" />
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-200">Loading Ticket Details...</h2>
        <p className="text-xs text-slate-400 mt-1">Retrieving record from Supabase PostgreSQL</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Ticket Not Found</h2>
        <p className="text-xs text-slate-500 mt-2 mb-6">The requested ticket does not exist, or you lack access permissions.</p>
        <Button onClick={() => navigate('/tickets')} variant="primary" size="sm">
          Return to All Tickets
        </Button>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: TicketStatus) => {
    await updateTicketStatus(ticket.id, newStatus);
    toast.success(`Ticket status changed to ${newStatus}`);
    await loadTicket();
  };

  const handlePriorityChange = async (newPriority: TicketPriority) => {
    await updateTicketPriority(ticket.id, newPriority);
    toast.success(`Priority updated to ${newPriority}`);
    await loadTicket();
  };

  const handleAgentChange = async (newAgentId: string) => {
    await assignTicket(ticket.id, newAgentId === '' ? null : newAgentId);
    toast.success(newAgentId === '' ? 'Ticket unassigned' : 'Agent assigned');
    await loadTicket();
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsPostingComment(true);
    try {
      await addComment(ticket.id, commentText, isInternalComment);
      setCommentText('');
      toast.success('Comment posted successfully');
      await loadTicket();
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await commentService.deleteComment(commentId);
      toast.success('Comment removed');
      await loadTicket();
    } catch {
      toast.error('Could not delete comment. You can only delete comments you authored, or must be an Admin.');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim() || !editDescription.trim()) {
      toast.error('Title and description cannot be empty');
      return;
    }
    await updateTicket(ticket.id, {
      title: editTitle,
      description: editDescription,
    });
    setIsEditModalOpen(false);
    toast.success('Ticket updated successfully');
    await loadTicket();
  };

  const handleDelete = async () => {
    try {
      await deleteTicket(ticket.id);
      toast.success(`Ticket ${ticket.ticketNumber} deleted`);
      navigate('/tickets');
    } catch {
      toast.error('Failed to delete ticket. Administrator rights required.');
    }
  };

  const handleRefreshGeminiAI = async () => {
    setIsRefreshingAI(true);
    try {
      const ticketIdNum = Number(ticket.id);
      const [sumRes, resRes, sentRes] = await Promise.all([
        aiService.summarize({ ticket_id: ticketIdNum, max_words: 60 }),
        aiService.suggestResolution({ ticket_id: ticketIdNum }),
        aiService.sentiment({ ticket_id: ticketIdNum }),
      ]);

      const sentimentDisplay =
        sentRes.sentiment === 'POSITIVE'
          ? 'Positive'
          : sentRes.sentiment === 'FRUSTRATED'
          ? 'Frustrated'
          : sentRes.sentiment === 'NEGATIVE'
          ? 'Critical'
          : 'Neutral';

      const updatedInsights = {
        suggestedCategory: ticket.category,
        suggestedPriority: ticket.priority,
        summary: sumRes.summary,
        sentiment: sentimentDisplay as 'Positive' | 'Neutral' | 'Frustrated' | 'Critical',
        sentimentScore: Math.round(((sentRes.score + 1) / 2) * 100),
        suggestedResolution: `${resRes.possible_root_cause}\n\nTroubleshooting:\n${resRes.troubleshooting_steps.map((s) => `• ${s}`).join('\n')}\n\nRecommended Fix:\n${resRes.recommended_resolution}`,
        confidenceScore: 95,
        keyEntities: sumRes.key_points || [],
      };

      setTicketState((prev) => (prev ? { ...prev, aiInsights: updatedInsights } : prev));
      toast.success('AI Copilot refreshed live insights using Gemini 3.5 Flash!');
    } catch {
      toast.error('Failed to refresh Gemini AI insights. Verify GEMINI_API_KEY in backend/.env.');
    } finally {
      setIsRefreshingAI(false);
    }
  };

  const insertAISuggestedResolution = () => {
    if (ticket.aiInsights?.suggestedResolution) {
      setCommentText(
        (prev) =>
          prev +
          (prev ? '\n\n' : '') +
          `AI Troubleshooting Recommendation:\n${ticket.aiInsights.suggestedResolution}`
      );
      toast.info('AI resolution inserted into comment box');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/tickets')}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950 px-2 py-0.5 rounded">
                {ticket.ticketNumber}
              </span>
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              {ticket.title}
            </h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setEditTitle(ticket.title);
              setEditDescription(ticket.description);
              setIsEditModalOpen(true);
            }}
            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
          >
            Edit
          </Button>

          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              className="text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Left (2 cols) = Info + Comments, Right (1 col) = Meta + AI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Description Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Problem Description</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Reported by {ticket.customer.name} on {new Date(ticket.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {ticket.category}
              </span>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                {ticket.description}
              </div>
            </CardContent>
          </Card>

          {/* Discussion & Activity Tabs */}
          <Card>
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setActiveTab('comments')}
                  className={`text-xs font-bold pb-2 transition-colors flex items-center gap-1.5 border-b-2 ${
                    activeTab === 'comments'
                      ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Discussion ({ticket.comments.length})
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`text-xs font-bold pb-2 transition-colors flex items-center gap-1.5 border-b-2 ${
                    activeTab === 'activity'
                      ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" /> Audit Trail ({ticket.activities.length})
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {activeTab === 'comments' ? (
                <div className="space-y-6">
                  {/* Comments Thread */}
                  <div className="space-y-4">
                    {ticket.comments.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">
                        No replies posted yet. Add a message below to communicate with the customer.
                      </p>
                    ) : (
                      ticket.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="p-4 rounded-xl border bg-slate-50/50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <img
                                src={comment.author.avatar}
                                alt={comment.author.name}
                                className="w-6 h-6 rounded-full"
                              />
                              <div>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {comment.author.name}
                                </span>
                                <span className="text-[10px] text-slate-400 ml-2">
                                  {new Date(comment.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}{' '}
                                  • {new Date(comment.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            {(isAdmin || comment.author.email === user?.email) && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                title="Delete comment"
                                className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line pl-8">
                            {comment.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Comment Input */}
                  <form onSubmit={handleAddComment} className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <textarea
                      rows={3}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={`Type a response to ${ticket.customer.name}...`}
                      className="block w-full rounded-xl border text-xs sm:text-sm p-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 border-slate-300 dark:border-slate-700 focus:ring-brand-500"
                    />

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        isLoading={isPostingComment}
                        leftIcon={<Send className="w-3.5 h-3.5" />}
                        disabled={!commentText.trim()}
                      >
                        Send Reply
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Activity Log Timeline */
                <div className="relative pl-6 space-y-6 before:absolute before:inset-y-0 before:left-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {ticket.activities.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4">No audit history recorded yet.</p>
                  ) : (
                    ticket.activities.map((act) => (
                      <div key={act.id} className="relative">
                        <div className="absolute -left-6 top-0.5 w-3.5 h-3.5 rounded-full bg-brand-600 ring-4 ring-white dark:ring-slate-900" />
                        <div>
                          <p className="text-xs text-slate-800 dark:text-slate-200">
                            <span className="font-semibold">{act.actor}</span> {act.action}
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {new Date(act.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 Col): Metadata Controls & AI Insights */}
        <div className="space-y-6">
          {/* Metadata Controls Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Ticket Properties</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {/* Status Selector */}
              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={ticket.status}
                  onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Pending">Pending</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              {/* Priority Selector */}
              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5">
                  Priority
                </label>
                <select
                  value={ticket.priority}
                  onChange={(e) => handlePriorityChange(e.target.value as TicketPriority)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              {/* Assigned Agent Selector */}
              <div>
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-1.5">
                  Assigned Agent
                </label>
                <select
                  value={ticket.assignedTo?.id || ''}
                  onChange={(e) => handleAgentChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Unassigned (Queue)</option>
                  {teamMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Details Box */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-slate-500 font-semibold uppercase tracking-wider mb-2">
                  Customer
                </label>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {ticket.customer.name}
                  </p>
                  <p className="text-slate-500">{ticket.customer.email}</p>
                  <p className="text-slate-400 text-[11px] font-medium">{ticket.customer.company}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Insights Panel (Live Google Gemini Integration) */}
          <Card className="bg-gradient-to-br from-brand-50/70 via-indigo-50/40 to-purple-50/60 dark:from-slate-900 dark:via-brand-950/20 dark:to-slate-900 border-brand-200/80 dark:border-brand-900/50 shadow-card">
            <CardHeader className="border-b border-brand-100 dark:border-brand-900/40 pb-3">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-gradient-to-tr from-brand-600 to-violet-600 text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <CardTitle className="text-sm">AI Copilot Insights</CardTitle>
                </div>
                <button
                  onClick={handleRefreshGeminiAI}
                  disabled={isRefreshingAI}
                  className="p-1.5 rounded-lg bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-brand-600 transition-colors"
                  title="Refresh with Gemini AI"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingAI ? 'animate-spin text-brand-600' : ''}`} />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-xs">
              {/* AI Summary */}
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  AI Incident Summary
                </span>
                <p className="mt-1 text-slate-800 dark:text-slate-200 leading-relaxed bg-white/70 dark:bg-slate-800/70 p-3 rounded-lg border border-brand-100/60 dark:border-slate-800">
                  {ticket.aiInsights?.summary || 'No summary generated yet.'}
                </p>
              </div>

              {/* Customer Sentiment */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                    Customer Sentiment
                  </span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                      ticket.aiInsights?.sentiment === 'Critical' ||
                      ticket.aiInsights?.sentiment === 'Frustrated'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {ticket.aiInsights?.sentiment || 'Neutral'}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      (ticket.aiInsights?.sentimentScore || 50) > 70
                        ? 'bg-rose-500'
                        : (ticket.aiInsights?.sentimentScore || 50) > 40
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${ticket.aiInsights?.sentimentScore || 50}%` }}
                  />
                </div>
              </div>

              {/* Suggested Resolution */}
              <div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  Recommended Action Plan
                </span>
                <p className="mt-1 text-slate-800 dark:text-slate-200 leading-relaxed bg-white/70 dark:bg-slate-800/70 p-3 rounded-lg border border-brand-100/60 dark:border-slate-800 whitespace-pre-line">
                  {ticket.aiInsights?.suggestedResolution}
                </p>
                <Button
                  variant="brand"
                  size="sm"
                  onClick={insertAISuggestedResolution}
                  className="w-full mt-2.5"
                  leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                >
                  Insert Solution into Reply
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Ticket Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Ticket Details"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <Input
            label="Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={5}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 p-2.5 text-xs bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Ticket"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Are you sure you want to permanently delete ticket <strong>{ticket.ticketNumber}</strong>? This action will remove it from Supabase PostgreSQL and cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="outline" className="bg-rose-600 text-white hover:bg-rose-700 border-transparent" onClick={handleDelete}>
              Permanently Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
