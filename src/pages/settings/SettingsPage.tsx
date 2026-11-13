import React, { useState } from 'react';
import {
  User as UserIcon,
  Bell,
  Palette,
  Shield,
  Building,
  RotateCcw,
  Sun,
  Moon,
  Save,
  KeyRound,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTickets } from '../../context/TicketContext';
import { Button } from '../../components/common/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/common/Card';
import { Input } from '../../components/common/Input';
import { toast } from 'sonner';

import { authService } from '../../services/authService';
import { getApiErrorMessage } from '../../services/apiClient';

export const SettingsPage: React.FC = () => {
  const { user, updateCurrentUserProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { resetToSampleData } = useTickets();

  const [activeTab, setActiveTab] = useState<
    'profile' | 'account' | 'notifications' | 'appearance' | 'security'
  >('profile');

  // Profile form state
  const [name, setName] = useState(user?.name || 'Sarah Jenkins');
  const [email, setEmail] = useState(user?.email || 'admin@issueflow.com');
  const role = user?.role || 'Admin';
  const [department, setDepartment] = useState(user?.department || 'Customer Operations');
  const [avatar, setAvatar] = useState(
    user?.avatar ||
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  );

  // Account settings state
  const [companyName, setCompanyName] = useState('IssueFlow Global Inc.');
  const [timezone, setTimezone] = useState('UTC (GMT+00:00)');
  const [language, setLanguage] = useState('English (United States)');

  // Notification toggles
  const [notifyOnAssign, setNotifyOnAssign] = useState(true);
  const [notifyOnReply, setNotifyOnReply] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [smsAlerts, setSmsAlerts] = useState(true);

  // Security form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateCurrentUserProfile({
      name,
      email,
      department,
      avatar,
    });
    toast.success('Profile details updated successfully');
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Workspace account preferences updated');
  };

  const handleSaveNotifications = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Notification preferences saved');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Please enter both current and new passwords');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    try {
      await authService.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Security password successfully changed');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to change password. Verify your current password.'));
    }
  };

  const handleResetData = () => {
    if (window.confirm('Are you sure you want to restore the default sample tickets and team data?')) {
      resetToSampleData();
      toast.success('IssueFlow sample tickets and data restored to original state');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile Settings', icon: UserIcon },
    { id: 'account', label: 'Account & Workspace', icon: Building },
    { id: 'notifications', label: 'Notification Preferences', icon: Bell },
    { id: 'appearance', label: 'Appearance & Theme', icon: Palette },
    { id: 'security', label: 'Security & Access', icon: Shield },
  ] as const;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Platform Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage your personal account, notifications, and workspace environment
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Tabs on Left */}
        <div className="md:col-span-1 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-400'
                  }`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content on Right (3 cols) */}
        <div className="md:col-span-3">
          {/* TAB 1: Profile Settings */}
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Profile Details</CardTitle>
                  <CardDescription>Your public profile visible to your team and customers</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="flex items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <img
                      src={avatar}
                      alt={name}
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-brand-500/20"
                    />
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                        Profile Avatar
                      </span>
                      <Input
                        value={avatar}
                        onChange={(e) => setAvatar(e.target.value)}
                        placeholder="Image URL"
                        className="text-xs py-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      required
                    />
                    <Input
                      label="Platform Role"
                      value={role}
                      disabled
                      helperText="Contact your organization administrator to modify roles"
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button type="submit" size="sm" leftIcon={<Save className="w-4 h-4" />}>
                      Save Profile
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: Account Settings */}
          {activeTab === 'account' && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Account & Organization</CardTitle>
                  <CardDescription>Workspace regional preferences and company metadata</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveAccount} className="space-y-4">
                  <Input
                    label="Company / Workspace Name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                        Workspace Timezone
                      </label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs p-2 text-slate-800 dark:text-slate-200"
                      >
                        <option value="UTC (GMT+00:00)">UTC (GMT+00:00)</option>
                        <option value="America/New_York (GMT-05:00)">America/New York (GMT-05:00)</option>
                        <option value="Europe/London (GMT+00:00)">Europe/London (GMT+00:00)</option>
                        <option value="Asia/Tokyo (GMT+09:00)">Asia/Tokyo (GMT+09:00)</option>
                        <option value="Asia/Kolkata (GMT+05:30)">Asia/Kolkata (GMT+05:30)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                        Display Language
                      </label>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs p-2 text-slate-800 dark:text-slate-200"
                      >
                        <option value="English (United States)">English (United States)</option>
                        <option value="English (United Kingdom)">English (United Kingdom)</option>
                        <option value="French">Français</option>
                        <option value="German">Deutsch</option>
                        <option value="Japanese">日本語</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button type="submit" size="sm" leftIcon={<Save className="w-4 h-4" />}>
                      Save Account Settings
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 3: Notification Preferences */}
          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Choose how and when IssueFlow alerts you of ticket activities</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveNotifications} className="space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="pt-2 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        Ticket Assignment Alerts
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Receive instant notifications when a ticket is delegated to you
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyOnAssign}
                      onChange={(e) => setNotifyOnAssign(e.target.checked)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        Customer Response Notifications
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Trigger desktop & in-app alerts whenever a customer leaves a reply
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyOnReply}
                      onChange={(e) => setNotifyOnReply(e.target.checked)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        Weekly Analytics Digest
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Send a weekly summary report of resolution velocity to email
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={weeklyDigest}
                      onChange={(e) => setWeeklyDigest(e.target.checked)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        Critical Incident Escalation SMS
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Emergency SMS alerts for Critical severity tickets
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={smsAlerts}
                      onChange={(e) => setSmsAlerts(e.target.checked)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button type="submit" size="sm" leftIcon={<Save className="w-4 h-4" />}>
                      Save Preferences
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 4: Appearance Settings */}
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Interface Appearance</CardTitle>
                    <CardDescription>Select your preferred color theme for IssueFlow</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Theme Mode Selection Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      onClick={() => setTheme('light')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center text-center ${
                        theme === 'light'
                          ? 'border-brand-500 bg-brand-50/40 text-brand-700'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="p-3 rounded-full bg-amber-100 text-amber-600 mb-2">
                        <Sun className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Light Mode
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5">
                        Clean white and light gray
                      </span>
                    </div>

                    <div
                      onClick={() => setTheme('dark')}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col items-center justify-center text-center ${
                        theme === 'dark'
                          ? 'border-brand-500 bg-brand-950/40 text-brand-300'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                      }`}
                    >
                      <div className="p-3 rounded-full bg-indigo-900/60 text-indigo-400 mb-2">
                        <Moon className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Dark Mode
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5">
                        Sleek slate and midnight
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Reset Demo Data Card */}
              <Card className="border-amber-200 dark:border-amber-900/50">
                <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Demo Data Management
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Reset all tickets, comments, and team members back to default sample state.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetData}
                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  >
                    Restore Sample Data
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 5: Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>Update your secret credentials for login authentication</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <Input
                      label="Current Password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      leftIcon={<KeyRound className="w-4 h-4" />}
                      required
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="New Password"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        leftIcon={<KeyRound className="w-4 h-4" />}
                        required
                      />
                      <Input
                        label="Confirm New Password"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        leftIcon={<KeyRound className="w-4 h-4" />}
                        required
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button type="submit" size="sm">
                        Update Password
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Two-Factor Authentication */}
              <Card>
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        Two-Factor Authentication (2FA)
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Protect your account with an extra verification layer via Authenticator app
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={twoFactorEnabled ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => {
                      setTwoFactorEnabled(!twoFactorEnabled);
                      toast.success(
                        twoFactorEnabled ? '2FA disabled' : '2FA enabled successfully'
                      );
                    }}
                  >
                    {twoFactorEnabled ? 'Enabled' : 'Enable 2FA'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
