import {
  TicketCategory,
  TicketPriority,
  TicketStatus,
  User,
  Ticket,
  Comment,
  Activity,
} from '../types';

// Category mappings
export const categoryToBackend = (cat: string): string => {
  switch (cat) {
    case 'Technical Issue':
      return 'TECHNICAL_ISSUE';
    case 'Billing':
      return 'BILLING';
    case 'Account':
      return 'ACCOUNT';
    case 'Bug Report':
      return 'BUG_REPORT';
    case 'Feature Request':
      return 'FEATURE_REQUEST';
    case 'General Inquiry':
      return 'GENERAL_INQUIRY';
    default:
      return 'TECHNICAL_ISSUE';
  }
};

export const categoryToFrontend = (cat: string): TicketCategory => {
  switch (cat) {
    case 'TECHNICAL_ISSUE':
      return 'Technical Issue';
    case 'BILLING':
      return 'Billing';
    case 'ACCOUNT':
      return 'Account';
    case 'BUG_REPORT':
      return 'Bug Report';
    case 'FEATURE_REQUEST':
      return 'Feature Request';
    case 'GENERAL_INQUIRY':
      return 'General Inquiry';
    default:
      return (cat as TicketCategory) || 'Technical Issue';
  }
};

// Priority mappings
export const priorityToBackend = (priority: string): string => {
  return priority.toUpperCase();
};

export const priorityToFrontend = (priority: string): TicketPriority => {
  switch (priority?.toUpperCase()) {
    case 'LOW':
      return 'Low';
    case 'MEDIUM':
      return 'Medium';
    case 'HIGH':
      return 'High';
    case 'CRITICAL':
      return 'Critical';
    default:
      return 'Medium';
  }
};

// Status mappings
export const statusToBackend = (status: string): string => {
  switch (status) {
    case 'Open':
      return 'OPEN';
    case 'In Progress':
      return 'IN_PROGRESS';
    case 'Pending':
      return 'PENDING';
    case 'Resolved':
      return 'RESOLVED';
    case 'Closed':
      return 'CLOSED';
    default:
      return 'OPEN';
  }
};

export const statusToFrontend = (status: string): TicketStatus => {
  switch (status) {
    case 'OPEN':
      return 'Open';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'PENDING':
      return 'Pending';
    case 'RESOLVED':
      return 'Resolved';
    case 'CLOSED':
      return 'Closed';
    default:
      return 'Open';
  }
};

// Role mappings
export const roleToFrontend = (role: string): string => {
  switch (role) {
    case 'ADMIN':
      return 'Admin';
    case 'AGENT':
      return 'Senior Support Agent';
    case 'CUSTOMER':
      return 'Customer';
    default:
      return 'Customer';
  }
};

export const roleToBackend = (role: string): 'ADMIN' | 'AGENT' | 'CUSTOMER' => {
  switch (role) {
    case 'Admin':
      return 'ADMIN';
    case 'Customer':
      return 'CUSTOMER';
    default:
      return 'AGENT';
  }
};

// User / Team Member mapping
export interface BackendUser {
  id: number;
  full_name: string;
  email: string;
  role: 'ADMIN' | 'AGENT' | 'CUSTOMER';
  is_active: boolean;
  created_at: string;
}

export const mapBackendUserToFrontend = (u: BackendUser): User => {
  const roleDisplay =
    u.role === 'ADMIN'
      ? 'Admin'
      : u.role === 'AGENT'
      ? 'Senior Support Agent'
      : 'Customer';

  return {
    id: String(u.id),
    name: u.full_name,
    email: u.email,
    role: roleDisplay,
    backendRole: u.role,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.full_name)}`,
    department: u.role === 'ADMIN' ? 'Leadership' : u.role === 'AGENT' ? 'Technical Support' : 'Customer',
    status: u.is_active ? 'Available' : 'Offline',
    isActive: u.is_active,
    assignedTickets: 0,
    resolvedTickets: 0,
    joinedDate: new Date(u.created_at).toLocaleDateString(),
  };
};

// Ticket Mapping
export interface BackendTicket {
  id: number;
  ticket_number: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_by: number;
  assigned_to?: number | null;
  ai_summary?: string | null;
  created_at: string;
  updated_at: string;
  creator?: BackendUser | null;
  assignee?: BackendUser | null;
  comments?: Array<{
    id: number;
    ticket_id: number;
    user_id: number;
    content: string;
    created_at: string;
    author?: BackendUser | null;
  }>;
  history?: Array<{
    id: number;
    ticket_id: number;
    changed_by?: number | null;
    old_status?: string | null;
    new_status: string;
    created_at: string;
  }>;
}

export const mapBackendTicketToFrontend = (t: BackendTicket): Ticket => {
  const creatorName = t.creator?.full_name || `User #${t.created_by}`;
  const creatorEmail = t.creator?.email || 'customer@issueflow.com';

  const comments: Comment[] = (t.comments || []).map((c) => ({
    id: String(c.id),
    ticketId: String(t.id),
    author: {
      id: String(c.user_id),
      name: c.author?.full_name || `User #${c.user_id}`,
      email: c.author?.email || '',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(c.author?.full_name || String(c.user_id))}`,
      role: c.author?.role || 'Customer',
    },
    content: c.content,
    createdAt: c.created_at,
    isInternal: false,
  }));

  const activities: Activity[] = (t.history || []).map((h) => ({
    id: String(h.id),
    ticketId: String(t.id),
    actor: h.changed_by ? `User #${h.changed_by}` : 'System',
    action: `changed status from ${statusToFrontend(h.old_status || 'OPEN')} to ${statusToFrontend(h.new_status)}`,
    timestamp: h.created_at,
    type: 'status_change',
  }));

  return {
    id: String(t.id),
    ticketNumber: t.ticket_number,
    title: t.title,
    description: t.description,
    category: categoryToFrontend(t.category),
    priority: priorityToFrontend(t.priority),
    status: statusToFrontend(t.status),
    customer: {
      id: String(t.created_by),
      name: creatorName,
      email: creatorEmail,
      company: 'Client Organization',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(creatorName)}`,
    },
    assignedTo: t.assignee ? mapBackendUserToFrontend(t.assignee) : null,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    comments,
    activities,
    aiInsights: {
      suggestedCategory: categoryToFrontend(t.category),
      suggestedPriority: priorityToFrontend(t.priority),
      summary: t.ai_summary || 'Incident filed in support queue. Click "Run AI Copilot" to generate a live Gemini analysis.',
      sentiment: 'Neutral',
      sentimentScore: 50,
      suggestedResolution: 'Diagnose application error logs and verify infrastructure connectivity.',
      confidenceScore: 92,
      keyEntities: [t.category, t.priority],
    },
  };
};

