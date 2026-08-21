import React, { useState } from 'react';
import { History, Receipt } from 'lucide-react';
import type { Booking } from '../types';
import { PDFExportButton } from '../components/ui/PDFExportButton';

interface BookingsPageProps {
  bookings: Booking[];
}

export const BookingsPage: React.FC<BookingsPageProps> = ({ bookings }) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filtered = bookings.filter(b => filterStatus === 'all' || b.status === filterStatus);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <span className="badge badge-success">Completed</span>;
      case 'ongoing':
      case 'in_transit': return <span className="badge badge-info">In Transit</span>;
      case 'accepted':
      case 'driver_assigned': return <span className="badge badge-warning">Driver Assigned</span>;
      case 'requested':
      case 'searching': return <span className="badge badge-warning">Searching</span>;
      case 'cancelled': return <span className="badge badge-danger">Cancelled</span>;
      default: return <span className="badge badge-info">{status}</span>;
    }
  };

  return (
    <div className="page-container" id="bookings-audit-report">
      <div className="page-header">
        <div>
          <h2 className="page-title">
            <History size={28} /> Ride Monitor & Fare Receipt Audit
          </h2>
          <p className="page-subtitle">
            Track real-time trip lifecycles, inspect computed fare receipts, and audit completed rides.
          </p>
        </div>

        <PDFExportButton
          elementId="bookings-audit-report"
          filename="PasadaGuide_LGU_Booking_Log"
          title="LGU Tricycle Booking Audit Log"
          data={bookings}
          headers={['Booking ID', 'Origin', 'Destination', 'Status', 'Fare (₱)', 'Date']}
          keys={['id', 'origin_name', 'destination_name', 'status', 'estimated_fare', 'created_at']}
        />
      </div>

      {/* Filter Tabs */}
      <div className="glass-card" style={{ padding: 16, marginBottom: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['all', 'searching', 'driver_assigned', 'in_transit', 'completed', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`btn ${filterStatus === status ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            style={{ textTransform: 'capitalize' }}
          >
            {status.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Bookings Table */}
      <div className="table-container glass-card">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Trip ID</th>
              <th>Route Itinerary</th>
              <th>Passenger</th>
              <th>Assigned Driver</th>
              <th>Computed Fare</th>
              <th>Status</th>
              <th>Receipt</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                  No bookings found.
                </td>
              </tr>
            ) : (
              filtered.map(b => (
                <tr key={b.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                    {b.id.slice(0, 8)}...
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--color-pasada-navy)' }}>
                      {b.origin_name || b.pickup_name || 'Pickup Point'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ➔ {b.destination_name || b.dropoff_name || 'Dropoff Point'}
                    </div>
                  </td>
                  <td>{b.passenger?.full_name || 'Passenger'}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>
                      {b.driver?.profile?.full_name || 'Assigned Driver'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {b.driver?.plate_number || 'Tricycle'}
                    </div>
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--success)' }}>
                    ₱{Number(b.final_fare || b.computed_fare || b.estimated_fare || 0).toFixed(2)}
                  </td>
                  <td>{getStatusBadge(b.status)}</td>
                  <td>
                    <button
                      onClick={() => { setSelectedBooking(b); setIsModalOpen(true); }}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px 10px' }}
                    >
                      <Receipt size={14} /> Receipt
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Digital Fare Receipt Modal */}
      {isModalOpen && selectedBooking && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Official Digital Fare Receipt</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            </div>

            <div className="modal-body" style={{ background: '#fff', color: '#191c1e' }}>
              <div style={{ textAlign: 'center', paddingBottom: 16, borderBottom: '2px dashed #e0e3e5' }}>
                <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#00346F' }}>MUNICIPALITY OF BAUANG</div>
                <div style={{ fontSize: '0.75rem', color: '#666' }}>Tricycle Regulatory Board Fare Breakdown</div>
                <div style={{ fontSize: '0.7rem', color: '#888', marginTop: 4 }}>Trip Ref: {selectedBooking.id}</div>
              </div>

              <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Passenger:</span>
                  <strong>{selectedBooking.passenger?.full_name || 'Passenger'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Driver:</span>
                  <strong>{selectedBooking.driver?.profile?.full_name || 'Driver'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Route:</span>
                  <span style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                    {selectedBooking.origin_name || selectedBooking.pickup_name} ➔ {selectedBooking.destination_name || selectedBooking.dropoff_name}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Distance:</span>
                  <strong>{selectedBooking.estimated_distance_km || selectedBooking.distance_km || 2.0} km</strong>
                </div>
              </div>

              <div style={{ borderTop: '2px solid #00346F', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 800, fontSize: '1rem' }}>Total Regulated Fare:</span>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#00346F' }}>
                  ₱{Number(selectedBooking.final_fare || selectedBooking.computed_fare || selectedBooking.estimated_fare || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => window.print()} className="btn btn-secondary btn-sm">Print</button>
              <button onClick={() => setIsModalOpen(false)} className="btn btn-primary btn-sm">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
