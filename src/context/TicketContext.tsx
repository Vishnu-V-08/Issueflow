import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
  User,
  NotificationItem,
} from '../types';
import {
  mapBackendTicketToFrontend,
  mapBackendUserToFrontend,
  categoryToBackend,
  priorityToBackend,
  statusToBackend,
  BackendTicket,
  BackendUser,
} from '../utils/mappers';
import { ticketService } from '../services/ticketService';
import { commentService } from '../services/commentService';
import { userService } from '../services/userService';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../services/apiClient';

interface CreateTicketInput {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  assignedToId?: string;
  customerName?: string;
  customerEmail?: string;
  customerCompany?: string;
}

interface TicketContextType {
  tickets: Ticket[];
  teamMembers: User[];
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  isLoading: boolean;
  getTicketById: (id: string) => Ticket | undefined;
  fetchTicketById: (id: string) => Promise<Ticket | null>;
  createTicket: (data: CreateTicketInput) => Promise<Ticket>;
  updateTicket: (id: string, updates: Partial<Ticket>) => Promise<void>;
  updateTicketStatus: (id: string, status: TicketStatus) => Promise<void>;
  updateTicketPriority: (id: string, priority: TicketPriority) => Promise<void>;
  assignTicket: (id: string, agentId: string | null) => Promise<void>;
  addComment: (ticketId: string, content: string, isInternal: boolean) => Promise<void>;
  deleteTicket: (id: string) => Promise<void>;
  addTeamMember: (data: {
    name: string;
    email: string;
    role: User['role'];
    department: string;
    status: User['status'];
    password?: string;
  }) => Promise<void>;
  updateTeamMember: (id: string, data: Partial<User>) => Promise<void>;
  deleteTeamMember: (id: string) => Promise<void>;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  resetToSampleData: () => Promise<void>;
  refreshTickets: () => Promise<void>;
  refreshTeamMembers: () => Promise<void>;
}

const TicketContext = createContext<TicketContextType | undefined>(undefined);

export const TicketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load tickets from real backend API
  const refreshTickets = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const res = await ticketService.getTickets({ limit: 100 });
      const mapped = res.items.map(mapBackendTicketToFrontend);
      setTickets(mapped);
    } catch (err) {
      console.error('Failed to fetch tickets from backend:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Load team members / users from backend API
  const refreshTeamMembers = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const users = await userService.getUsers();
      const mapped = users.map(mapBackendUserToFrontend);
      setTeamMembers(mapped);
    } catch {
      // Non-admin users cannot call GET /api/users/ (returns 403)
      // Provide current user as baseline agent
      if (user) {
        setTeamMembers([user]);
      }
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshTickets();
      refreshTeamMembers();
    } else {
      setTickets([]);
      setTeamMembers([]);
    }
  }, [isAuthenticated, refreshTickets, refreshTeamMembers]);

  const getTicketById = (id: string): Ticket | undefined => {
    return tickets.find((t) => t.id === id || t.ticketNumber === id);
  };

  const fetchTicketById = async (id: string): Promise<Ticket | null> => {
    try {
      const backendTicket = await ticketService.getTicketById(id);
      const mapped = mapBackendTicketToFrontend(backendTicket);
      // Update in local state
      setTickets((prev) => {
        const index = prev.findIndex((t) => t.id === mapped.id);
        if (index >= 0) {
          const next = [...prev];
          next[index] = mapped;
          return next;
        }
        return [mapped, ...prev];
      });
      return mapped;
    } catch (err) {
      console.error(`Failed to fetch ticket #${id}:`, err);
      return null;
    }
  };

  const createTicket = async (data: CreateTicketInput): Promise<Ticket> => {
    try {
      const payload = {
        title: data.title.trim(),
        description: data.description.trim(),
        category: categoryToBackend(data.category),
        priority: priorityToBackend(data.priority),
        assigned_to: data.assignedToId && !isNaN(Number(data.assignedToId)) ? Number(data.assignedToId) : null,
      };

      const backendTicket = await ticketService.createTicket(payload);
      const mapped = mapBackendTicketToFrontend(backendTicket);

      setTickets((prev) => [mapped, ...prev]);

      // Add local notification
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          title: 'Ticket Created',
          message: `Ticket ${mapped.ticketNumber} was successfully registered in the queue.`,
          time: 'Just now',
          read: false,
          type: 'ticket_created',
          ticketId: mapped.id,
        },
        ...prev,
      ]);

      return mapped;
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Failed to create ticket on server');
      throw new Error(msg);
    }
  };

  const updateTicket = async (id: string, updates: Partial<Ticket>): Promise<void> => {
    try {
      const payload: {
        title?: string;
        description?: string;
        category?: string;
        priority?: string;
        status?: string;
        assigned_to?: number | null;
      } = {};

      if (updates.title) payload.title = updates.title;
      if (updates.description) payload.description = updates.description;
      if (updates.category) payload.category = categoryToBackend(updates.category);
      if (updates.priority) payload.priority = priorityToBackend(updates.priority);
      if (updates.status) payload.status = statusToBackend(updates.status);
      if (updates.assignedTo !== undefined) {
        payload.assigned_to = updates.assignedTo?.id ? Number(updates.assignedTo.id) : null;
      }

      const updated = await ticketService.updateTicket(id, payload);
      const mapped = mapBackendTicketToFrontend(updated);

      setTickets((prev) => prev.map((t) => (t.id === id ? mapped : t)));
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Failed to update ticket');
      toast.error(msg);
      throw new Error(msg);
    }
  };

  const updateTicketStatus = async (id: string, status: TicketStatus): Promise<void> => {
    try {
      const backendStatus = statusToBackend(status);
      const updated = await ticketService.updateStatus(id, backendStatus);
      const mapped = mapBackendTicketToFrontend(updated);
      setTickets((prev) => prev.map((t) => (t.id === id ? mapped : t)));
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Failed to update status');
      toast.error(msg);
      throw new Error(msg);
    }
  };

  const updateTicketPriority = async (id: string, priority: TicketPriority): Promise<void> => {
    try {
      const backendPriority = priorityToBackend(priority);
      const updated = await ticketService.updateTicket(id, { priority: backendPriority });
      const mapped = mapBackendTicketToFrontend(updated);
      setTickets((prev) => prev.map((t) => (t.id === id ? mapped : t)));
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Failed to update priority');
      toast.error(msg);
      throw new Error(msg);
    }
  };

  const assignTicket = async (id: string, agentId: string | null): Promise<void> => {
    try {
      const parsedAgentId = agentId && !isNaN(Number(agentId)) ? Number(agentId) : null;
      const updated = await ticketService.assignTicket(id, parsedAgentId);
      const mapped = mapBackendTicketToFrontend(updated);
      setTickets((prev) => prev.map((t) => (t.id === id ? mapped : t)));
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Failed to assign agent');
      toast.error(msg);
      throw new Error(msg);
    }
  };

  const deleteTicket = async (id: string): Promise<void> => {
    try {
      await ticketService.deleteTicket(id);
      setTickets((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Failed to delete ticket. Administrator permissions required.');
      toast.error(msg);
      throw new Error(msg);
    }
  };

  const addComment = async (ticketId: string, content: string, _isInternal: boolean): Promise<void> => {
    try {
      const newComment = await commentService.addComment(ticketId, content.trim());
      // Refresh the specific ticket to get updated discussion thread
      await fetchTicketById(ticketId);
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Failed to post comment');
      toast.error(msg);
      throw new Error(msg);
    }
  };

  const addTeamMember = async (data: {
    name: string;
    email: string;
    role: User['role'];
    department: string;
    status: User['status'];
    password?: string;
  }): Promise<void> => {
    try {
      let backendRole: 'ADMIN' | 'AGENT' | 'CUSTOMER' = 'AGENT';
      if (data.role === 'Admin') backendRole = 'ADMIN';

      const created = await userService.createUser({
        full_name: data.name,
        email: data.email,
        password: data.password || 'Agent@123',
        role: backendRole,
      });

      const mapped = mapBackendUserToFrontend(created);
      setTeamMembers((prev) => [...prev, mapped]);
      toast.success(`User ${mapped.name} added successfully!`);
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Failed to add user. Administrator rights required.');
      toast.error(msg);
      throw new Error(msg);
    }
  };

  const updateTeamMember = async (id: string, data: Partial<User>): Promise<void> => {
    try {
      let backendRole: 'ADMIN' | 'AGENT' | 'CUSTOMER' | undefined = undefined;
      if (data.role === 'Admin') backendRole = 'ADMIN';
      else if (data.role) backendRole = 'AGENT';

      const updated = await userService.updateUser(id, {
        full_name: data.name,
        role: backendRole,
        is_active: data.isActive !== undefined ? data.isActive : undefined,
      });

      const mapped = mapBackendUserToFrontend(updated);
      setTeamMembers((prev) => prev.map((m) => (m.id === id ? mapped : m)));
      toast.success('User updated successfully');
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Failed to update user');
      toast.error(msg);
      throw new Error(msg);
    }
  };

  const deleteTeamMember = async (id: string): Promise<void> => {
    try {
      await userService.deleteUser(id);
      setTeamMembers((prev) => prev.filter((m) => m.id !== id));
      toast.success('User deleted successfully');
    } catch (err) {
      const msg = getApiErrorMessage(err, 'Failed to delete user');
      toast.error(msg);
      throw new Error(msg);
    }
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  return (
    <TicketContext.Provider
      value={{
        tickets,
        teamMembers,
        notifications,
        unreadNotificationsCount,
        isLoading,
        getTicketById,
        fetchTicketById,
        createTicket,
        updateTicket,
        updateTicketStatus,
        updateTicketPriority,
        assignTicket,
        addComment,
        deleteTicket,
        addTeamMember,
        updateTeamMember,
        deleteTeamMember,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        refreshTickets,
        refreshTeamMembers,
        resetToSampleData: refreshTickets,
      }}
    >
      {children}
    </TicketContext.Provider>
  );
};

export const useTickets = () => {
  const context = useContext(TicketContext);
  if (!context) {
    throw new Error('useTickets must be used within a TicketProvider');
  }
  return context;
};
