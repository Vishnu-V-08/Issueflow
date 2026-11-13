export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type TicketStatus = 'Open' | 'In Progress' | 'Pending' | 'Resolved' | 'Closed';

export type TicketCategory =
  | 'Technical Issue'
  | 'Billing'
  | 'Account'
  | 'Bug Report'
  | 'Feature Request'
  | 'General Inquiry';

export type UserRole =
  | 'Admin'
  | 'Support Lead'
  | 'Senior Support Agent'
  | 'Support Specialist'
  | 'QA Engineer'
  | 'Technical Account Manager'
  | 'Customer'
  | 'ADMIN'
  | 'AGENT'
  | 'CUSTOMER';

export type UserStatus = 'Available' | 'In a Meeting' | 'Away' | 'Offline';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  backendRole?: 'ADMIN' | 'AGENT' | 'CUSTOMER';
  avatar: string;
  department: string;
  status: UserStatus;
  isActive?: boolean;
  assignedTickets: number;
  resolvedTickets: number;
  joinedDate: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  avatar?: string;
}

export interface Comment {
  id: string;
  ticketId: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: string;
  };
  content: string;
  createdAt: string;
  isInternal: boolean;
}

export interface Activity {
  id: string;
  ticketId: string;
  actor: string;
  action: string;
  timestamp: string;
  type: 'status_change' | 'priority_change' | 'assignment' | 'comment' | 'created';
}

export interface AIInsights {
  suggestedCategory: TicketCategory;
  suggestedPriority: TicketPriority;
  summary: string;
  sentiment: 'Positive' | 'Neutral' | 'Frustrated' | 'Critical';
  sentimentScore: number; // 0 to 100
  suggestedResolution: string;
  confidenceScore: number; // 0 to 100
  keyEntities: string[];
}

export interface Ticket {
  id: string;
  ticketNumber: string; // e.g. "ISS-1042"
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  customer: Customer;
  assignedTo?: User | null;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  comments: Comment[];
  activities: Activity[];
  aiInsights: AIInsights;
  tags?: string[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'ticket' | 'system' | 'mention' | 'ticket_created';
  ticketId?: string;
}

