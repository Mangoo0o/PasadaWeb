import React, { useState, useMemo } from 'react';
import { 
  Search, 
  X, 
  Download, 
  Crown, 
  ShieldCheck, 
  FileText, 
  Copy, 
  Check, 
  ExternalLink 
} from 'lucide-react';
import type { AdminAction } from '../types';
import { exportAuditLogsToCsv } from '../../services/auditService';
import { cn } from '../../lib/utils';

interface AuditLogsPageProps {
  auditLogs: AdminAction[];
  initialSearchQuery?: string;
}

export const AuditLogsPage: React.FC<AuditLogsPageProps> = ({ 
  auditLogs, 
  initialSearchQuery = '' 
}) => {
  const [search, setSearch] = useState(initialSearchQuery);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  
  const [selectedLog, setSelectedLog] = useState<AdminAction | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  const getActionCategory = (actionType: string): string => {
    const t = actionType.toUpperCase();
    if (t.includes('PROVISION') || t.includes('ROLE') || t.includes('REVOKE')) return 'admin_provisioning';
    if (t.includes('DRIVER') || t.includes('APPROVE') || t.includes('SUSPEND') || t.includes('REJECT')) return 'driver_approvals';
    if (t.includes('FARE') || t.includes('TARIFF') || t.includes('RATE')) return 'tariff_fares';
    if (t.includes('TERMINAL') || t.includes('SPOT')) return 'infrastructure';
    if (t.includes('COMPLAINT')) return 'complaints';
    if (t.includes('LOGIN') || t.includes('AUTH')) return 'auth';
    return 'general';
  };

  const filtered = useMemo(() => {
    const now = Date.now();
    return auditLogs.filter(log => {
      const q = search.toLowerCase();
      const type = log.action_type?.toLowerCase() || '';
      const adminName = (log.admin?.full_name || log.details_json?.admin_name || '').toLowerCase();
      const targetTable = (log.target_table || '').toLowerCase();
      const detailsStr = JSON.stringify(log.details_json || {}).toLowerCase();

      const searchMatch = !search || type.includes(q) || adminName.includes(q) || targetTable.includes(q) || detailsStr.includes(q);
      const categoryMatch = categoryFilter === 'all' || getActionCategory(log.action_type) === categoryFilter;

      let dateMatch = true;
      if (dateFilter !== 'all') {
        const logTime = new Date(log.created_at).getTime();
        const diffMs = now - logTime;
        if (dateFilter === 'today') dateMatch = diffMs <= 24 * 60 * 60 * 1000;
        else if (dateFilter === '7days') dateMatch = diffMs <= 7 * 24 * 60 * 60 * 1000;
        else if (dateFilter === '30days') dateMatch = diffMs <= 30 * 24 * 60 * 60 * 1000;
      }

      return searchMatch && categoryMatch && dateMatch;
    });
  }, [auditLogs, search, categoryFilter, dateFilter]);

  const handleCopyJson = () => {
    if (!selectedLog) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const getActionBadgeColor = (actionType: string) => {
    const cat = getActionCategory(actionType);
    switch (cat) {
      case 'admin_provisioning':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60';
      case 'driver_approvals':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60';
      case 'tariff_fares':
        return 'bg-blue-50 dark:bg-blue-950/40 text-[#0052d1] dark:text-sky-300 border-blue-200/60 dark:border-blue-800/60';
      case 'complaints':
        return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="page-container p-6 sm:p-8 space-y-6 w-full" id="audit-logs-report">
      {/* Stitch Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400">
              <ShieldCheck size={24} />
            </span>
            <span>Audit Trail &amp; Compliance Log</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Immutable official log of all administrative movements, driver approvals, rate matrix adjustments, and system security actions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => exportAuditLogsToCsv(filtered)}
          className="h-9 px-4 rounded-md bg-[#0052d1] hover:bg-[#206afa] text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto shadow-md shadow-[#0052d1]/20 active:scale-95 shrink-0"
        >
          <Download size={15} />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Unified Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200/80 dark:border-slate-800 ambient-shadow">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search action, official name, target, or payload..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-8 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-medium outline-none focus:border-[#0052d1] text-slate-900 dark:text-white placeholder:text-slate-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-10 px-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="all">All Operations</option>
            <option value="admin_provisioning">Admin Provisioning</option>
            <option value="driver_approvals">Driver Approvals</option>
            <option value="tariff_fares">Tariff &amp; Rates</option>
            <option value="infrastructure">Terminals &amp; Spots</option>
            <option value="complaints">Complaints Triage</option>
            <option value="auth">Security &amp; Auth</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="h-10 px-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
          >
            <option value="all">All Time</option>
            <option value="today">Today (24h)</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>

          <span className="text-xs sm:text-sm font-bold text-slate-400 pl-1 whitespace-nowrap">
            {filtered.length} records
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 ambient-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50/70 dark:bg-slate-800/60">
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">Movement Event</th>
                <th className="py-4 px-6">Official Actor</th>
                <th className="py-4 px-6">Target Component</th>
                <th className="py-4 px-6">Payload Details</th>
                <th className="py-4 px-6 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-400 font-medium">
                    <FileText size={28} className="mx-auto mb-2 opacity-40" />
                    No audit movements match current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const adminName = log.admin?.full_name || log.details_json?.admin_name || 'System';
                  const isSuper = (log.admin?.role || log.details_json?.admin_role) === 'super_admin';

                  return (
                    <tr 
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-6 font-mono text-xs text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>

                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={cn(
                          "px-2.5 py-1 rounded-md text-xs font-mono font-bold border shadow-xs tabular-nums",
                          getActionBadgeColor(log.action_type)
                        )}>
                          {log.action_type}
                        </span>
                      </td>

                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{adminName}</span>
                          {isSuper ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-0.5">
                              <Crown size={10} />
                              <span>Super</span>
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-[#0052d1] dark:text-sky-300 border border-blue-200 dark:border-blue-800 flex items-center gap-0.5">
                              <ShieldCheck size={10} />
                              <span>Admin</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-6 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {log.target_table}
                      </td>

                      <td className="py-4 px-6 text-slate-600 dark:text-slate-300 max-w-sm truncate">
                        {log.details_json && Object.keys(log.details_json).length > 0 ? (
                          <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 inline-block max-w-full truncate">
                            {Object.entries(log.details_json)
                              .filter(([k]) => !['admin_name', 'admin_email', 'admin_role'].includes(k))
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(', ') || 'Recorded'}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="h-8 px-3 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-[#0052d1] hover:text-white dark:bg-slate-800 dark:hover:bg-[#0052d1] transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Inspect</span>
                          <ExternalLink size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Inspector Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div 
            className="modal-content max-w-2xl" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400 flex items-center justify-center shrink-0">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      Audit Record Inspection
                    </h3>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold border",
                      getActionBadgeColor(selectedLog.action_type)
                    )}>
                      {selectedLog.action_type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Logged: {new Date(selectedLog.created_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="modal-close-btn"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body space-y-4">
              {/* Structured Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-0.5">
                    Official Actor
                  </span>
                  <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate block">
                    {selectedLog.admin?.full_name || selectedLog.details_json?.admin_name || 'System'}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-0.5">
                    Role Tier
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    {(selectedLog.admin?.role || selectedLog.details_json?.admin_role) === 'super_admin' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 inline-flex items-center gap-1">
                        <Crown size={10} /> Super Admin
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-[#0052d1] dark:text-sky-300 border border-blue-200 dark:border-blue-800 inline-flex items-center gap-1">
                        <ShieldCheck size={10} /> Admin
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-0.5">
                    Target Table
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 truncate block">
                    {selectedLog.target_table}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-0.5">
                    Target Record ID
                  </span>
                  <span className="font-mono text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate block" title={selectedLog.target_id}>
                    {selectedLog.target_id || '—'}
                  </span>
                </div>
              </div>

              {/* JSON Payload Inspector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                      Event Payload &amp; State Diff
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      ({Object.keys(selectedLog.details_json || {}).length} keys)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#0052d1] dark:text-sky-400 bg-[#0052d1]/10 hover:bg-[#0052d1]/20 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedJson ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                    <span>{copiedJson ? 'Copied to Clipboard' : 'Copy JSON'}</span>
                  </button>
                </div>

                <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
                  <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                      <span className="ml-2 font-mono text-[11px] text-slate-400">payload.json</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500">JSON</span>
                  </div>
                  <pre className="p-4 text-emerald-400 font-mono text-xs overflow-x-auto max-h-64 leading-relaxed select-all">
                    {JSON.stringify(selectedLog.details_json, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="h-9 px-5 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer transition-colors"
              >
                Dismiss Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AuditLogsPage;
