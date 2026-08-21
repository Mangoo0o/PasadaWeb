import React, { useState } from 'react';
import { AlertTriangle, Clock, Eye, Check } from 'lucide-react';
import type { Complaint, ComplaintStatus } from '../types';
import { PDFExportButton } from '../components/ui/PDFExportButton';

interface ComplaintsPageProps {
  complaints: Complaint[];
  onUpdateComplaint: (id: string, status: ComplaintStatus, resolutionNotes?: string) => void;
}

export const ComplaintsPage: React.FC<ComplaintsPageProps> = ({ 
  complaints, onUpdateComplaint 
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filtered = complaints.filter(c => {
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || c.category === filterCategory;
    return matchesStatus && matchesCategory;
  });

  const handleOpenTriage = (c: Complaint) => {
    setSelectedComplaint(c);
    setResolutionNotes(c.resolution_notes || '');
    setIsModalOpen(true);
  };

  const handleSaveResolution = (status: ComplaintStatus) => {
    if (!selectedComplaint) return;
    onUpdateComplaint(selectedComplaint.id, status, resolutionNotes);
    setIsModalOpen(false);
  };

  return (
    <div className="page-container" id="complaints-audit-report">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <AlertTriangle size={28} /> Passenger Complaints Triage & Resolution
          </h2>
          <p className="page-subtitle">
            Investigate overcharging incidents, refusal of service, and enforce LGU fare regulations.
          </p>
        </div>

        <PDFExportButton
          elementId="complaints-audit-report"
          filename="PasadaGuide_LGU_Complaints_Audit"
          title="LGU Passenger Complaints Audit Summary"
          data={complaints}
          headers={['Complaint ID', 'Category', 'Passenger', 'Driver', 'Status', 'Date']}
          keys={['id', 'category', 'passenger_name', 'driver_name', 'status', 'created_at']}
        />
      </div>

      {/* Filter Tabs */}
      <div className="glass-card" style={{ padding: 16, marginBottom: 24, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'open', 'reviewing', 'resolved'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`btn ${filterStatus === status ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              style={{ textTransform: 'capitalize' }}
            >
              {status} {status === 'open' && complaints.filter(c => c.status === 'open').length > 0 && `(${complaints.filter(c => c.status === 'open').length})`}
            </button>
          ))}
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="input-field"
          style={{ maxWidth: 220, padding: '6px 12px' }}
        >
          <option value="all">All Categories</option>
          <option value="overcharging">Overcharging</option>
          <option value="refusal">Refusal of Service</option>
          <option value="refusal_of_service">Refusal of Service</option>
          <option value="reckless_driving">Reckless Driving</option>
          <option value="rude_behavior">Rude Behavior</option>
          <option value="lost_item">Lost Item</option>
        </select>
      </div>

      {/* Complaints Table */}
      <div className="table-container glass-card">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Date Filed</th>
              <th>Category</th>
              <th>Complainant</th>
              <th>Reported Driver</th>
              <th>Description Snippet</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                  No complaints found.
                </td>
              </tr>
            ) : (
              filtered.map(c => (
                <tr key={c.id}>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    <span className={`badge ${c.category === 'overcharging' ? 'badge-danger' : 'badge-warning'}`}>
                      {c.category.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>
                    {c.passenger_name || c.passenger?.full_name || 'Passenger'}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>
                      {c.driver_name || c.driver?.profile?.full_name || 'Reported Driver'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Body: #{c.driver_body_number || c.driver?.plate_number || 'N/A'}
                    </div>
                  </td>
                  <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                    {c.description}
                  </td>
                  <td>
                    <span className={`badge ${c.status === 'resolved' ? 'badge-success' : c.status === 'reviewing' ? 'badge-warning' : 'badge-danger'}`}>
                      {c.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() => handleOpenTriage(c)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px 12px' }}
                    >
                      <Eye size={14} /> Review Case
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Triage & Resolution Modal */}
      {isModalOpen && selectedComplaint && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Complaint Triage: Case #{selectedComplaint.id.slice(0, 8)}</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            </div>

            <div className="modal-body">
              <div style={{ background: 'var(--bg-primary)', padding: 14, borderRadius: 12, border: '1px solid var(--border-color)', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Complainant:</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{selectedComplaint.passenger_name || selectedComplaint.passenger?.full_name || 'Passenger'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Driver:</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{selectedComplaint.driver_name || selectedComplaint.driver?.profile?.full_name || 'Kuya Driver'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Category:</span>
                  <span className="badge badge-danger" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
                    {selectedComplaint.category}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Passenger Incident Statement</label>
                <div style={{ padding: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: 10, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                  "{selectedComplaint.description}"
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">LGU Official Resolution Notes & Sanctions</label>
                <textarea
                  rows={4}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Mediation conducted at Bauang TODA desk. Driver refunded overcharged fare."
                  className="input-field"
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => handleSaveResolution('reviewing')}
                className="btn btn-secondary"
              >
                <Clock size={16} /> Mark In-Review
              </button>
              <button
                onClick={() => handleSaveResolution('resolved')}
                className="btn btn-primary"
                style={{ background: 'var(--success)' }}
              >
                <Check size={16} /> Resolve & Close Case
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
