import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { AdminAction } from '../types';

interface AuditLogsPageProps {
  auditLogs: AdminAction[];
}

export const AuditLogsPage: React.FC<AuditLogsPageProps> = ({ auditLogs }) => {
  const [search, setSearch] = useState('');

  const filtered = auditLogs.filter(a => {
    const type = a.action_type?.toLowerCase() || '';
    const adminName = a.admin?.full_name?.toLowerCase() || '';
    return type.includes(search.toLowerCase()) || adminName.includes(search.toLowerCase());
  });

  return (
    <div className="page-container p-6 sm:p-8 space-y-6" id="audit-logs-report">
      {/* Stitch Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400">
              <ShieldCheck size={24} />
            </span>
            <span>Audit Trail &amp; Compliance Log</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Immutable audit log of administrative actions, fare updates, driver approvals, &amp; system changes.
          </p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-[24px] p-4 border border-slate-200/80 dark:border-slate-800 ambient-shadow flex items-center justify-between gap-4 flex-wrap">
        <div className="relative">
          <input
            type="text"
            placeholder="Filter audit log by action or admin name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-80 h-9 pl-4 pr-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium outline-none focus:border-[#0052d1] focus:ring-2 focus:ring-[#0052d1]/20 transition-all"
          />
        </div>
        <span className="text-xs text-slate-400">
          {filtered.length} Recorded Operations
        </span>
      </div>

      {/* Audit Log Data Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/80 dark:border-slate-800 ambient-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800">
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Timestamp</th>
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Action Type</th>
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Admin Official</th>
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Target Component</th>
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Payload Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 font-medium">
                    No audit log records found.
                  </td>
                </tr>
              ) : (
                filtered.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-6 text-slate-500 font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400 font-mono text-[11px] font-bold">
                        {log.action_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 font-bold text-slate-900 dark:text-white">
                      {log.admin?.full_name || 'Admin User'}
                    </td>
                    <td className="py-3.5 px-6 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                      {log.target_table}
                    </td>
                    <td className="py-3.5 px-6">
                      <pre className="text-[10px] bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 max-w-[280px] overflow-x-auto text-slate-700 dark:text-slate-300">
                        {JSON.stringify(log.details_json, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
