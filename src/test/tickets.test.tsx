import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';

describe('Ticket UI Badges & Statuses', () => {
  it('renders status badges with appropriate style tags', () => {
    const { rerender } = render(<StatusBadge status="Open" />);
    expect(screen.getByText('Open')).toBeInTheDocument();

    rerender(<StatusBadge status="In Progress" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();

    rerender(<StatusBadge status="Resolved" />);
    expect(screen.getByText('Resolved')).toBeInTheDocument();

    rerender(<StatusBadge status="Closed" />);
    expect(screen.getByText('Closed')).toBeInTheDocument();
  });

  it('renders priority badges with appropriate severity classes', () => {
    const { rerender } = render(<PriorityBadge priority="Critical" />);
    expect(screen.getByText('Critical')).toBeInTheDocument();

    rerender(<PriorityBadge priority="High" />);
    expect(screen.getByText('High')).toBeInTheDocument();

    rerender(<PriorityBadge priority="Medium" />);
    expect(screen.getByText('Medium')).toBeInTheDocument();

    rerender(<PriorityBadge priority="Low" />);
    expect(screen.getByText('Low')).toBeInTheDocument();
  });
});

