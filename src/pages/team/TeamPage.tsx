import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Search,
  Edit2,
  Trash2,
  Shield,
  Loader2,
} from 'lucide-react';
import { useTickets } from '../../context/TicketContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Card, CardContent } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { User, UserRole, UserStatus } from '../../types';
import { toast } from 'sonner';

export const TeamPage: React.FC = () => {
  const { teamMembers, addTeamMember, updateTeamMember, deleteTeamMember, refreshTeamMembers } = useTickets();
  const { user: currentUser } = useAuth();

  const isAdmin = currentUser?.role === 'Admin' || currentUser?.backendRole === 'ADMIN';

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Support Specialist');
  const [department, setDepartment] = useState('Technical Support');
  const [status, setStatus] = useState<UserStatus>('Available');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredMembers = useMemo(() => {
    return teamMembers.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase()) ||
        m.role.toLowerCase().includes(search.toLowerCase());

      const matchesDept =
        departmentFilter === 'ALL' || m.department === departmentFilter;

      return matchesSearch && matchesDept;
    });
  }, [teamMembers, search, departmentFilter]);

  const departments = useMemo(() => {
    const list = new Set(teamMembers.map((m) => m.department || 'Technical Support'));
    return Array.from(list);
  }, [teamMembers]);

  const handleOpenAddModal = () => {
    setName('');
    setEmail('');
    setPassword('Agent@123');
    setRole('Support Specialist');
    setDepartment('Technical Support');
    setStatus('Available');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (member: User) => {
    setEditingMember(member);
    setName(member.name);
    setEmail(member.email);
    setRole(member.role);
    setDepartment(member.department || 'Technical Support');
    setStatus(member.status || 'Available');
    setIsEditModalOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Please fill in name and email');
      return;
    }

    setIsSubmitting(true);
    try {
      await addTeamMember({
        name: name.trim(),
        email: email.trim(),
        password: password.trim() || 'Agent@123',
        role,
        department,
        status,
      });
      setIsAddModalOpen(false);
      await refreshTeamMembers();
    } catch {
      // Error handled in TicketContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    setIsSubmitting(true);
    try {
      await updateTeamMember(editingMember.id, {
        name,
        role,
        department,
        status,
      });
      setIsEditModalOpen(false);
      await refreshTeamMembers();
    } catch {
      // Error handled in TicketContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this user from the system?')) {
      await deleteTeamMember(id);
      await refreshTeamMembers();
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-600 dark:text-brand-400" /> Support Team & User Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage agents, monitor workloads, and configure roster assignments in Supabase PostgreSQL
          </p>
        </div>

        {isAdmin ? (
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenAddModal}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Add Team Member
          </Button>
        ) : (
          <div className="text-xs px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" /> Read-Only Directory (Admin rights required to edit)
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, role, email..."
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500">Department:</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Team Member Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member) => (
          <Card key={member.id} hover className="flex flex-col justify-between">
            <CardContent className="p-6">
              {/* Member Top Info */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                    />
                    <span
                      className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                        member.status === 'Available'
                          ? 'bg-emerald-500'
                          : member.status === 'In a Meeting'
                          ? 'bg-amber-500'
                          : member.status === 'Away'
                          ? 'bg-sky-500'
                          : 'bg-slate-400'
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {member.name}
                    </h3>
                    <p className="text-xs text-brand-600 dark:text-brand-400 font-medium">
                      {member.role}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{member.department}</p>
                  </div>
                </div>

                {/* Edit / Delete actions (Admins only) */}
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(member)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Edit Member"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {member.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDelete(member.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Delete Member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Contact and Status */}
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{member.email}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Joined: {member.joinedDate}</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    Status: {member.status}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New User to Platform"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
          <Input
            label="Full Name"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="john@issueflow.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Initial Password"
            type="password"
            placeholder="Min 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Select
            label="Role Permission"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            options={[
              { value: 'Support Specialist', label: 'Support Agent (AGENT)' },
              { value: 'Admin', label: 'Administrator (ADMIN)' },
            ]}
          />
          <Input
            label="Department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Add User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit User Profile"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Email Address"
            type="email"
            value={email}
            disabled
          />
          <Select
            label="Role Permission"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            options={[
              { value: 'Support Specialist', label: 'Support Agent (AGENT)' },
              { value: 'Admin', label: 'Administrator (ADMIN)' },
            ]}
          />
          <Input
            label="Department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
