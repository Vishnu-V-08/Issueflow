import { describe, it, expect } from 'vitest';
import {
  statusToFrontend,
  statusToBackend,
  priorityToFrontend,
  priorityToBackend,
  categoryToFrontend,
  categoryToBackend,
  roleToFrontend,
  roleToBackend,
  mapBackendTicketToFrontend,
  mapBackendUserToFrontend,
  BackendTicket,
  BackendUser,
} from '../utils/mappers';

describe('Data Mappers', () => {
  it('correctly maps ticket status bidirectionally', () => {
    expect(statusToFrontend('OPEN')).toBe('Open');
    expect(statusToFrontend('IN_PROGRESS')).toBe('In Progress');
    expect(statusToFrontend('PENDING')).toBe('Pending');
    expect(statusToFrontend('RESOLVED')).toBe('Resolved');
    expect(statusToFrontend('CLOSED')).toBe('Closed');

    expect(statusToBackend('Open')).toBe('OPEN');
    expect(statusToBackend('In Progress')).toBe('IN_PROGRESS');
    expect(statusToBackend('Pending')).toBe('PENDING');
    expect(statusToBackend('Resolved')).toBe('RESOLVED');
    expect(statusToBackend('Closed')).toBe('CLOSED');
  });

  it('correctly maps priority bidirectionally', () => {
    expect(priorityToFrontend('CRITICAL')).toBe('Critical');
    expect(priorityToFrontend('HIGH')).toBe('High');
    expect(priorityToFrontend('MEDIUM')).toBe('Medium');
    expect(priorityToFrontend('LOW')).toBe('Low');

    expect(priorityToBackend('Critical')).toBe('CRITICAL');
    expect(priorityToBackend('High')).toBe('HIGH');
    expect(priorityToBackend('Medium')).toBe('MEDIUM');
    expect(priorityToBackend('Low')).toBe('LOW');
  });

  it('correctly maps categories bidirectionally', () => {
    expect(categoryToFrontend('TECHNICAL_ISSUE')).toBe('Technical Issue');
    expect(categoryToFrontend('BILLING')).toBe('Billing');
    expect(categoryToFrontend('BUG_REPORT')).toBe('Bug Report');
    expect(categoryToFrontend('FEATURE_REQUEST')).toBe('Feature Request');

    expect(categoryToBackend('Technical Issue')).toBe('TECHNICAL_ISSUE');
    expect(categoryToBackend('Billing')).toBe('BILLING');
    expect(categoryToBackend('Bug Report')).toBe('BUG_REPORT');
  });

  it('correctly maps backend roles', () => {
    expect(roleToFrontend('ADMIN')).toBe('Admin');
    expect(roleToFrontend('AGENT')).toBe('Senior Support Agent');
    expect(roleToFrontend('CUSTOMER')).toBe('Customer');

    expect(roleToBackend('Admin')).toBe('ADMIN');
    expect(roleToBackend('Customer')).toBe('CUSTOMER');
  });

  it('transforms backend ticket into frontend ticket structure', () => {
    const raw: BackendTicket = {
      id: 42,
      ticket_number: 'ISS-1042',
      title: 'Database latency spike',
      description: 'Slow queries observed in checkout endpoint',
      category: 'TECHNICAL_ISSUE',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      created_by: 1,
      assigned_to: 2,
      ai_summary: 'Automated executive summary',
      created_at: '2026-11-13T10:00:00Z',
      updated_at: '2026-11-13T11:00:00Z',
      creator: {
        id: 1,
        full_name: 'Customer Alice',
        email: 'alice@example.com',
        role: 'CUSTOMER',
        is_active: true,
        created_at: '2026-11-01T00:00:00Z',
      },
      assignee: {
        id: 2,
        full_name: 'Agent Bob',
        email: 'bob@example.com',
        role: 'AGENT',
        is_active: true,
        created_at: '2026-11-01T00:00:00Z',
      },
    };

    const mapped = mapBackendTicketToFrontend(raw);
    expect(mapped.id).toBe('42');
    expect(mapped.ticketNumber).toBe('ISS-1042');
    expect(mapped.status).toBe('In Progress');
    expect(mapped.priority).toBe('High');
    expect(mapped.category).toBe('Technical Issue');
    expect(mapped.customer.name).toBe('Customer Alice');
    expect(mapped.assignedTo?.name).toBe('Agent Bob');
    expect(mapped.aiInsights?.summary).toBe('Automated executive summary');
  });
});
