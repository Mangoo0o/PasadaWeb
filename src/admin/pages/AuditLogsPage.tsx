import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import type { AdminAction } from '../types';
import { PDFExportButton } from '../components/ui/PDFExportButton';

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
    <div className="page-container" id="audit-logs-report">
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <ShieldCheck size={28} /> Data Privacy & LGU Compliance Audit Trail
          </h2>
          <p className="page-subtitle">
            Immutable log of all administrative actions, fare updates, driver approvals, & system modifications.
          </p>
        </div>

        <PDFExportButton
          elementId="audit-logs-report"
          filename="PasadaGuide_LGU_Audit_Trail"
          title="LGU Administrative Audit Trail Log"
          data={auditLogs}
          headers={['Log ID', 'Action Type', 'Admin Official', 'Target Table', 'Timestamp']}
          keys={['id', 'action_type', 'admin.full_name', 'target_table', 'created_at']}
        />
      </div>

      <div className="glass-card" style={{ padding: 16, marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Filter audit log by action type or official name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
          style={{ maxWidth: 380 }}
        />
      </div>

      <div className="table-container glass-card">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action Type</th>
              <th>Admin Official</th>
              <th>Target Component</th>
              <th>Payload Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                  No audit log records found.
                </td>
              </tr>
            ) : (
              filtered.map(log => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td>
                    <span className="badge badge-info" style={{ fontFamily: 'monospace' }}>
                      {log.action_type}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>{log.admin?.full_name || 'Admin User'}</td>
                  <td style={{ fontSize: '0.85rem' }}>{log.target_table}</td>
                  <td>
                    <pre style={{
                      fontSize: '0.72rem',
                      background: 'var(--bg-surface)',
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      maxWidth: 320,
                      overflowX: 'auto'
                    }}>
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
  );
};
