import React, { useState, useEffect, useMemo } from 'react';
import { 
  Crown, 
  ShieldCheck, 
  UserPlus, 
  Search, 
  X, 
  Lock, 
  MoreVertical, 
  KeyRound, 
  UserMinus,
  Sparkles,
  Eye,
  EyeOff,
  AlertCircle,
  AlertTriangle,
  Building,
  Mail,
  User,
  ShieldAlert,
  Users
} from 'lucide-react';
import { 
  fetchAdminUsers, 
  provisionAdminUser, 
  updateAdminRole, 
  revokeAdminAccess 
} from '../../services/adminUserService';
import type { Profile, AdminUserFormData } from '../types';
import { cn } from '../../lib/utils';

interface AdminUsersPageProps {
  currentUser: Profile;
  onNavigateToAuditTrail?: (filterQuery?: string) => void;
}

const DEPARTMENTS = [
  'Traffic Management Office (TMO)',
  'Mayor’s Office - Public Transport Board',
  'Municipal Planning & Development Office (MPDO)',
  'ICT & Smart City Operations',
  'Treasury & Business Permits Licensing'
];

export const AdminUsersPage: React.FC<AdminUsersPageProps> = ({ 
  currentUser, 
  onNavigateToAuditTrail 
}) => {
  // Super Admin authorization check
  const isSuperAdmin = 
    currentUser.role === 'super_admin' ||
    currentUser.email?.toLowerCase() === 'admin@gmail.com' ||
    currentUser.email?.toLowerCase() === 'pasada.admin@gmail.com';

  const [admins, setAdmins] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'admin'>('all');
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState<AdminUserFormData>({
    fullName: '',
    email: '',
    password: '',
    role: 'admin',
    department: DEPARTMENTS[0],
    employeeId: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminUsers();
      setAdmins(data);
    } catch (err) {
      console.error('Failed to load administrators:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const superAdminCount = admins.filter(a => a.role === 'super_admin').length;
  const standardAdminCount = admins.filter(a => a.role === 'admin').length;

  const filteredAdmins = useMemo(() => {
    return admins.filter(admin => {
      const q = search.toLowerCase();
      const matchesSearch = 
        !search ||
        admin.full_name?.toLowerCase().includes(q) ||
        admin.email?.toLowerCase().includes(q) ||
        admin.department?.toLowerCase().includes(q) ||
        admin.employee_id?.toLowerCase().includes(q);

      const matchesRole = roleFilter === 'all' || admin.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [admins, search, roleFilter]);

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = '';
    for (let i = 0; i < 10; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setFormData(prev => ({ ...prev, password: pass }));
    setShowPassword(true);
  };

  // Role Elevation / Demotion / Revocation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'promote' | 'demote' | 'revoke';
    targetAdmin: Profile | null;
    isExecuting: boolean;
    errorMessage?: string | null;
  }>({
    isOpen: false,
    type: 'promote',
    targetAdmin: null,
    isExecuting: false,
    errorMessage: null
  });

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isSuperAdmin) {
      setFormError('Security Enforcement: Only Super Administrators can provision administrative accounts.');
      return;
    }

    if (!formData.fullName.trim() || !formData.email.trim() || formData.password.length < 6) {
      setFormError('Please fill in all required fields (password minimum 6 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await provisionAdminUser(currentUser, formData);
      if (!res.success) {
        setFormError(res.error || 'Failed to provision administrator.');
      } else {
        setShowAddModal(false);
        setFormData({
          fullName: '',
          email: '',
          password: '',
          role: 'admin',
          department: DEPARTMENTS[0],
          employeeId: ''
        });
        await loadAdmins();
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openConfirmModal = (type: 'promote' | 'demote' | 'revoke', targetAdmin: Profile) => {
    setActionMenuId(null);
    setConfirmModal({
      isOpen: true,
      type,
      targetAdmin,
      isExecuting: false,
      errorMessage: null
    });
  };

  const executeConfirmAction = async () => {
    if (!confirmModal.targetAdmin || !isSuperAdmin) return;
    const target = confirmModal.targetAdmin;

    setConfirmModal(prev => ({ ...prev, isExecuting: true, errorMessage: null }));
    try {
      if (confirmModal.type === 'promote' || confirmModal.type === 'demote') {
        const newRole = confirmModal.type === 'promote' ? 'super_admin' : 'admin';
        const res = await updateAdminRole(currentUser, target.id, target.full_name, newRole);
        if (res.success) {
          await loadAdmins();
          setConfirmModal({ isOpen: false, type: 'promote', targetAdmin: null, isExecuting: false, errorMessage: null });
        } else {
          setConfirmModal(prev => ({ ...prev, isExecuting: false, errorMessage: res.error || 'Update failed.' }));
        }
      } else if (confirmModal.type === 'revoke') {
        const res = await revokeAdminAccess(currentUser, target.id, target.full_name);
        if (res.success) {
          await loadAdmins();
          setConfirmModal({ isOpen: false, type: 'revoke', targetAdmin: null, isExecuting: false, errorMessage: null });
        } else {
          setConfirmModal(prev => ({ ...prev, isExecuting: false, errorMessage: res.error || 'Revocation failed.' }));
        }
      }
    } catch (err: any) {
      setConfirmModal(prev => ({ ...prev, isExecuting: false, errorMessage: err.message || 'Action failed.' }));
    }
  };

  const handleToggleRole = (targetAdmin: Profile) => {
    if (!isSuperAdmin) return;
    const isCurrentlySuper = targetAdmin.role === 'super_admin';
    openConfirmModal(isCurrentlySuper ? 'demote' : 'promote', targetAdmin);
  };

  const handleRevoke = (targetAdmin: Profile) => {
    if (!isSuperAdmin || targetAdmin.id === currentUser.id) return;
    openConfirmModal('revoke', targetAdmin);
  };

  return (
    <div className="page-container p-6 sm:p-8 space-y-6 w-full" id="administrators-management">
      {/* Stitch Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400">
              <ShieldCheck size={24} />
            </span>
            <span>Administrator &amp; Access Control</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Provision municipal transit officers, manage role permissions, and enforce administrative governance.
          </p>
        </div>

        {/* Permission Badge & Add Administrator Button */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {/* Active Authority Badge */}
          <div className={cn(
            "flex items-center gap-2 px-3.5 py-2 rounded-md border text-xs font-bold shadow-xs",
            isSuperAdmin 
              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200"
              : "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-[#0052d1] dark:text-sky-300"
          )}>
            {isSuperAdmin ? <Crown size={15} className="text-amber-600" /> : <Lock size={14} className="text-[#0052d1]" />}
            <span>
              {isSuperAdmin ? 'Super Admin Mode' : 'Admin Mode (View Only)'}
            </span>
          </div>

          {/* Primary Action Button */}
          {isSuperAdmin ? (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="h-11 px-5 rounded-lg bg-[#0052d1] hover:bg-[#206afa] text-white text-sm font-bold flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-md shadow-[#0052d1]/20"
            >
              <UserPlus size={18} />
              <span>Add Administrator</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-medium border border-slate-200 dark:border-slate-700">
              <Lock size={14} />
              <span>Super Admin authorization required to provision</span>
            </div>
          )}
        </div>
      </div>

      {/* Non-Super Admin Guidance Banner */}
      {!isSuperAdmin && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-start gap-3">
          <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Role Access Restricted:</span> You are currently signed in as an <strong>Operational Administrator</strong>. Under municipal transit compliance regulations, only <strong>Super Administrators</strong> can provision, promote, or alter administrative accounts.
          </div>
        </div>
      )}

      {/* Executive Metric Cards Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Admins */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-slate-200/80 dark:border-slate-800 ambient-shadow flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#0052d1] flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Administrators</p>
            <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight my-0.5 tabular-nums">
              {admins.length}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Registered municipal personnel</p>
          </div>
        </div>

        {/* Super Admins */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-slate-200/80 dark:border-slate-800 ambient-shadow flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
            <Crown size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Super Administrators</p>
            <h3 className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400 tracking-tight my-0.5 tabular-nums">
              {superAdminCount}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Full municipal governance</p>
          </div>
        </div>

        {/* Operational Admins */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-5 border border-slate-200/80 dark:border-slate-800 ambient-shadow flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Operational Admins</p>
            <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight my-0.5 tabular-nums">
              {standardAdminCount}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Dispatch, fares &amp; complaints</p>
          </div>
        </div>
      </div>

      {/* Filter and Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 ambient-shadow overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 bg-slate-50/50 dark:bg-slate-800/40">
          {/* Role Segment Tabs */}
          <div className="inline-flex items-center p-1 rounded-md bg-slate-200/70 dark:bg-slate-800 text-xs sm:text-sm font-semibold self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setRoleFilter('all')}
              className={cn(
                "px-4 py-2 rounded-lg transition-all cursor-pointer font-bold",
                roleFilter === 'all'
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              All Officials ({admins.length})
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('super_admin')}
              className={cn(
                "px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 font-bold",
                roleFilter === 'super_admin'
                  ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Crown size={14} />
              <span>Super Admins ({superAdminCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setRoleFilter('admin')}
              className={cn(
                "px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 font-bold",
                roleFilter === 'admin'
                  ? "bg-white dark:bg-slate-900 text-[#0052d1] dark:text-sky-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <ShieldCheck size={14} />
              <span>Admins ({standardAdminCount})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email, department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-medium outline-none focus:border-[#0052d1] focus:ring-1 focus:ring-[#0052d1]/20 text-slate-900 dark:text-white placeholder:text-slate-400 shadow-xs transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50/70 dark:bg-slate-800/60">
                <th className="py-4 px-6">Administrative Officer</th>
                <th className="py-4 px-6">Role Authority</th>
                <th className="py-4 px-6">Department / Office</th>
                <th className="py-4 px-6">Employee ID</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-slate-400 font-medium">
                    Loading municipal administrators...
                  </td>
                </tr>
              ) : filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-slate-400 font-medium">
                    No administrators found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => {
                  const isAdminSuper = admin.role === 'super_admin';
                  const isCurrent = admin.id === currentUser.id;
                  const initials = admin.full_name
                    ?.split(' ')
                    .map(n => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase() || 'AD';

                  return (
                    <tr 
                      key={admin.id} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* Officer Name & Email */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3.5">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm shrink-0 shadow-xs",
                            isAdminSuper 
                              ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700" 
                              : "bg-blue-100 dark:bg-blue-950/60 text-[#0052d1] dark:text-sky-300 border border-blue-200 dark:border-blue-800"
                          )}>
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <span>{admin.full_name}</span>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 dark:bg-blue-900/60 text-[#0052d1] dark:text-sky-200">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {admin.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        {isAdminSuper ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold text-xs">
                            <Crown size={13} className="text-amber-600" />
                            <span>Super Admin</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-[#0052d1] dark:text-sky-300 font-bold text-xs">
                            <ShieldCheck size={13} />
                            <span>Admin</span>
                          </span>
                        )}
                      </td>

                      {/* Department */}
                      <td className="py-4 px-6 text-slate-700 dark:text-slate-300 font-medium">
                        <div className="flex items-center gap-2">
                          <Building size={14} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-xs">{admin.department || 'LGU Transport Authority'}</span>
                        </div>
                      </td>

                      {/* Badge ID */}
                      <td className="py-4 px-6 font-mono text-xs font-bold text-slate-600 dark:text-slate-400">
                        {admin.employee_id || '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onNavigateToAuditTrail?.(admin.full_name)}
                            className="h-8 px-3.5 rounded-lg bg-slate-100 hover:bg-[#0052d1] hover:text-white dark:bg-slate-800 dark:hover:bg-[#0052d1] text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-xs"
                            title="Inspect all movements by this admin in Audit Trail"
                          >
                            Movements
                          </button>

                          {isSuperAdmin && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setActionMenuId(actionMenuId === admin.id ? null : admin.id)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              >
                                <MoreVertical size={16} />
                              </button>

                              {actionMenuId === admin.id && (
                                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md shadow-xl p-1.5 z-30 text-left text-xs animate-in fade-in zoom-in-95">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleRole(admin)}
                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-200"
                                  >
                                    <KeyRound size={14} className="text-[#0052d1]" />
                                    <span>{isAdminSuper ? 'Demote to Admin' : 'Promote to Super Admin'}</span>
                                  </button>

                                  {!isCurrent && (
                                    <button
                                      type="button"
                                      onClick={() => handleRevoke(admin)}
                                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-2 cursor-pointer border-t border-slate-100 dark:border-slate-800"
                                    >
                                      <UserMinus size={14} />
                                      <span>Revoke Admin Access</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Governance & Confirmation Modal (Replaces browser window.confirm) */}
      {confirmModal.isOpen && confirmModal.targetAdmin && (
        <div 
          className="modal-overlay animate-in fade-in"
          onClick={() => !confirmModal.isExecuting && setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        >
          <div 
            className="modal-content animate-in zoom-in-95 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-11 h-11 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                  confirmModal.type === 'promote' && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  confirmModal.type === 'demote' && "bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400",
                  confirmModal.type === 'revoke' && "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                )}>
                  {confirmModal.type === 'promote' && <Crown size={22} />}
                  {confirmModal.type === 'demote' && <ShieldCheck size={22} />}
                  {confirmModal.type === 'revoke' && <AlertTriangle size={22} />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {confirmModal.type === 'promote' && 'Promote to Super Administrator'}
                    {confirmModal.type === 'demote' && 'Demote to Administrator'}
                    {confirmModal.type === 'revoke' && 'Revoke Administrator Access'}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Security Governance Action
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={confirmModal.isExecuting}
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            {confirmModal.errorMessage && (
              <div className="mx-6 mt-4 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2.5 font-medium">
                <AlertCircle size={18} className="shrink-0 text-rose-600" />
                <span>{confirmModal.errorMessage}</span>
              </div>
            )}

            <div className="modal-body space-y-4">
              {/* Officer Card */}
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Target Officer</span>
                  <span className={cn(
                    "px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase",
                    confirmModal.targetAdmin.role === 'super_admin'
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                      : "bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400 border border-[#0052d1]/30"
                  )}>
                    {confirmModal.targetAdmin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  </span>
                </div>
                <p className="text-base font-black text-slate-900 dark:text-white">
                  {confirmModal.targetAdmin.full_name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {confirmModal.targetAdmin.email || 'No email specified'} • {confirmModal.targetAdmin.employee_id || 'ID Pending'}
                </p>
              </div>

              {/* Warning Context */}
              <div className={cn(
                "p-3.5 rounded-lg text-xs leading-relaxed font-medium border",
                confirmModal.type === 'promote' && "bg-amber-500/10 text-amber-900 dark:text-amber-200 border-amber-500/30",
                confirmModal.type === 'demote' && "bg-blue-500/10 text-blue-900 dark:text-blue-200 border-blue-500/30",
                confirmModal.type === 'revoke' && "bg-rose-500/10 text-rose-900 dark:text-rose-200 border-rose-500/30"
              )}>
                {confirmModal.type === 'promote' && (
                  <p>
                    <strong>High-Privilege Authorization:</strong> Promoting this user will grant them full Super Administrator permissions, allowing them to provision other admins, modify system tariff matrices, and access full audit logs.
                  </p>
                )}
                {confirmModal.type === 'demote' && (
                  <p>
                    <strong>Privilege Reduction:</strong> This officer will lose access to administrative account management and system-wide security controls, but will retain everyday transit operations capabilities.
                  </p>
                )}
                {confirmModal.type === 'revoke' && (
                  <p>
                    <strong>Access Suspension:</strong> This officer will be immediately deactivated and locked out of the PasadaWeb administrative suite. Their audit log history will be permanently preserved.
                  </p>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                disabled={confirmModal.isExecuting}
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="h-10 px-4 rounded-lg text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmModal.isExecuting}
                onClick={executeConfirmAction}
                className={cn(
                  "h-10 px-5 rounded-lg font-black text-xs text-white shadow-md flex items-center gap-2 cursor-pointer active:scale-95 transition-all disabled:opacity-50",
                  confirmModal.type === 'promote' && "bg-amber-600 hover:bg-amber-700 shadow-amber-600/25",
                  confirmModal.type === 'demote' && "bg-[#0052d1] hover:bg-[#206afa] shadow-[#0052d1]/25",
                  confirmModal.type === 'revoke' && "bg-rose-600 hover:bg-rose-700 shadow-rose-600/25"
                )}
              >
                {confirmModal.isExecuting && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>
                  {confirmModal.type === 'promote' && 'Confirm Promotion'}
                  {confirmModal.type === 'demote' && 'Confirm Demotion'}
                  {confirmModal.type === 'revoke' && 'Revoke Access'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provision Administrator Modal */}
      {showAddModal && (
        <div 
          className="modal-overlay animate-in fade-in"
          onClick={() => !isSubmitting && setShowAddModal(false)}
        >
          <div 
            className="modal-content animate-in zoom-in-95 max-w-xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400 flex items-center justify-center shrink-0 shadow-sm">
                  <UserPlus size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Provision Municipal Administrator
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    Municipality of Bauang Transit Management Suite
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowAddModal(false)}
                className="modal-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2.5 font-medium">
                <AlertCircle size={18} className="shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="flex flex-col flex-1 min-h-0">
              <div className="modal-body space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Officer Full Name &amp; Title *
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g., Engr. Roberto Santos"
                      value={formData.fullName}
                      onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full h-11 pl-10 pr-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#0052d1] focus:ring-2 focus:ring-[#0052d1]/20 text-slate-900 dark:text-white font-medium transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Official Email Address *
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="r.santos@bauang.gov.ph"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full h-11 pl-10 pr-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#0052d1] focus:ring-2 focus:ring-[#0052d1]/20 text-slate-900 dark:text-white font-medium transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block font-bold text-slate-700 dark:text-slate-300">
                      Initial Temporary Password *
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-xs font-bold text-[#0052d1] dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles size={12} />
                      <span>Auto-Generate Secure Password</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Minimum 6 characters"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full h-11 pl-3.5 pr-10 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#0052d1] focus:ring-2 focus:ring-[#0052d1]/20 text-slate-900 dark:text-white font-mono text-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Role Privilege Selection Cards */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Administrative Privilege Level *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => setFormData(prev => ({ ...prev, role: 'admin' }))}
                      className={cn(
                        "p-4 rounded-lg border cursor-pointer transition-all",
                        formData.role === 'admin'
                          ? "bg-blue-50/90 dark:bg-blue-950/50 border-[#0052d1] shadow-xs ring-2 ring-[#0052d1]/20"
                          : "bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center gap-1.5 text-[#0052d1] font-bold mb-1">
                        <ShieldCheck size={18} />
                        <span className="text-sm font-black">Admin</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Driver approvals, tariff matrix, complaint resolution &amp; fleet monitoring.
                      </p>
                    </div>

                    <div
                      onClick={() => setFormData(prev => ({ ...prev, role: 'super_admin' }))}
                      className={cn(
                        "p-4 rounded-lg border cursor-pointer transition-all",
                        formData.role === 'super_admin'
                          ? "bg-amber-50/90 dark:bg-amber-950/50 border-amber-500 shadow-xs ring-2 ring-amber-500/20"
                          : "bg-slate-50/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-center gap-1.5 text-amber-600 font-bold mb-1">
                        <Crown size={18} />
                        <span className="text-sm font-black">Super Admin</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Full authority: provision admins, alter roles, compliance log audit &amp; security.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Department / Municipal Office *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#0052d1] focus:ring-2 focus:ring-[#0052d1]/20 text-slate-900 dark:text-white cursor-pointer font-medium transition-all"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Badge / Employee ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., LGU-BG-2026-088"
                    value={formData.employeeId || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, employeeId: e.target.value }))}
                    className="w-full h-11 px-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#0052d1] focus:ring-2 focus:ring-[#0052d1]/20 text-slate-900 dark:text-white font-mono transition-all"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowAddModal(false)}
                  className="h-10 px-4 rounded-lg text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 px-5 rounded-lg bg-[#0052d1] hover:bg-[#206afa] text-white font-black text-xs shadow-md shadow-[#0052d1]/25 disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  {isSubmitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : null}
                  <span>{isSubmitting ? 'Provisioning...' : `Provision ${formData.role === 'super_admin' ? 'Super Admin' : 'Admin'}`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminUsersPage;
