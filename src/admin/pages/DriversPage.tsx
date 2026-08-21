import React, { useState } from 'react';
import { Car, CheckCircle, XCircle, AlertTriangle, Shield, FileText } from 'lucide-react';
import type { Driver, Terminal, VerificationStatus } from '../types';
import { PDFExportButton } from '../components/ui/PDFExportButton';
import { FileUploader } from '../components/ui/FileUploader';

interface DriversPageProps {
  drivers: Driver[];
  terminals: Terminal[];
  onUpdateStatus: (profileId: string, status: VerificationStatus) => void;
}

export const DriversPage: React.FC<DriversPageProps> = ({ 
  drivers, terminals, onUpdateStatus 
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  const filteredDrivers = drivers.filter(d => {
    const matchesStatus = filterStatus === 'all' || d.verification_status === filterStatus;
    const name = d.profile?.full_name?.toLowerCase() || '';
    const plate = d.plate_number?.toLowerCase() || '';
    const matchesSearch = name.includes(search.toLowerCase()) || plate.includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'approved': return <span className="badge badge-success"><CheckCircle size={12} /> Approved</span>;
      case 'pending': return <span className="badge badge-warning"><AlertTriangle size={12} /> Pending LGU Review</span>;
      case 'rejected': return <span className="badge badge-danger"><XCircle size={12} /> Rejected</span>;
      case 'suspended': return <span className="badge badge-danger"><Shield size={12} /> Suspended</span>;
    }
  };

  return (
    <div className="page-container" id="driver-roster-report">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <Car size={28} /> Driver Verification & TODA Management
          </h2>
          <p className="page-subtitle">
            Review driver franchise applications, verify plate numbers, assign terminals, & audit status.
          </p>
        </div>

        <PDFExportButton
          elementId="driver-roster-report"
          filename="PasadaGuide_LGU_Driver_Franchise_Roster"
          title="LGU Registered Driver Franchise Roster"
          data={drivers}
          headers={['Driver Name', 'Plate Number', 'Tricycle Model', 'Status']}
          keys={['profile.full_name', 'plate_number', 'tricycle_model', 'verification_status']}
        />
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="glass-card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'pending', 'approved', 'suspended', 'rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`btn ${filterStatus === st ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              style={{ textTransform: 'capitalize' }}
            >
              {st} {st === 'pending' && drivers.filter(d => d.verification_status === 'pending').length > 0 && `(${drivers.filter(d => d.verification_status === 'pending').length})`}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search driver name or plate..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
          style={{ maxWidth: 280 }}
        />
      </div>

      {/* Drivers Roster Table */}
      <div className="table-container glass-card">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Driver / Operator</th>
              <th>Plate & Model</th>
              <th>Assigned Terminal</th>
              <th>Trips / Rating</th>
              <th>Franchise Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDrivers.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                  No drivers found matching criteria.
                </td>
              </tr>
            ) : (
              filteredDrivers.map((d) => (
                <tr key={d.profile_id || d.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                      {d.profile?.full_name || 'Registered Driver'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      ID: {d.profile_id || d.id} • {d.profile?.phone_number || d.profile?.phone || 'No phone'}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 800, fontFamily: 'monospace', color: 'var(--color-pasada-navy)' }}>
                      {d.plate_number} {d.body_number ? `(#${d.body_number})` : ''}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.tricycle_model}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem' }}>
                      {d.terminal?.name || terminals.find(t => t.id === d.terminal_id)?.name || 'Unassigned'}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--warning)', fontSize: '0.85rem' }}>
                      ★ {d.rating || d.rating_avg || 5.0}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {d.total_trips || 0} rides completed
                    </div>
                  </td>
                  <td>{getStatusBadge(d.verification_status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {d.verification_status === 'pending' && (
                        <>
                          <button
                            onClick={() => onUpdateStatus(d.profile_id || d.id || '', 'approved')}
                            className="btn btn-primary btn-sm"
                            style={{ background: 'var(--success)', padding: '6px 10px' }}
                            title="Approve Franchise"
                          >
                            <CheckCircle size={14} /> Approve
                          </button>
                          <button
                            onClick={() => onUpdateStatus(d.profile_id || d.id || '', 'rejected')}
                            className="btn btn-danger btn-sm"
                            style={{ padding: '6px 10px' }}
                            title="Reject Application"
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </>
                      )}

                      {d.verification_status === 'approved' && (
                        <button
                          onClick={() => onUpdateStatus(d.profile_id || d.id || '', 'suspended')}
                          className="btn btn-danger btn-sm"
                          style={{ padding: '6px 10px' }}
                          title="Suspend Franchise"
                        >
                          <Shield size={14} /> Suspend
                        </button>
                      )}

                      {d.verification_status === 'suspended' && (
                        <button
                          onClick={() => onUpdateStatus(d.profile_id || d.id || '', 'approved')}
                          className="btn btn-primary btn-sm"
                          style={{ background: 'var(--success)', padding: '6px 10px' }}
                        >
                          <CheckCircle size={14} /> Re-activate
                        </button>
                      )}

                      <button
                        onClick={() => { setSelectedDriver(d); setIsDocModalOpen(true); }}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 8px' }}
                        title="Upload/Inspect Documents"
                      >
                        <FileText size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Driver Documents Upload Modal */}
      {isDocModalOpen && selectedDriver && (
        <div className="modal-overlay" onClick={() => setIsDocModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                Franchise Documents: {selectedDriver.profile?.full_name}
              </h3>
              <button onClick={() => setIsDocModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            </div>

            <div className="modal-body">
              <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: 'var(--info-bg)', color: 'var(--info)', fontSize: '0.82rem' }}>
                Plate: <strong>{selectedDriver.plate_number}</strong> | Tricycle: <strong>{selectedDriver.tricycle_model}</strong>
              </div>

              <FileUploader
                bucketName="driver-documents"
                accept=".pdf,.png,.jpg,.jpeg"
                label="LTO Official Receipt & Certificate of Registration (OR/CR)"
                onUploadComplete={(url) => {
                  alert(`Document uploaded successfully: ${url}`);
                }}
              />

              <FileUploader
                bucketName="driver-documents"
                accept=".pdf,.png,.jpg,.jpeg"
                label="Barangay & Police Clearance"
                onUploadComplete={(url) => {
                  alert(`Clearance uploaded successfully: ${url}`);
                }}
              />
            </div>

            <div className="modal-footer">
              <button onClick={() => setIsDocModalOpen(false)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
