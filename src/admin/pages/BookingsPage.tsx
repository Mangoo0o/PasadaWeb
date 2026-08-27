import React, { useState } from 'react';
import { History, Receipt } from 'lucide-react';
import type { Booking } from '../types';

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
      case 'completed': 
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
            Completed
          </span>
        );
      case 'ongoing':
      case 'in_transit': 
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200">
            In Transit
          </span>
        );
      case 'accepted':
      case 'driver_assigned': 
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200">
            Driver Assigned
          </span>
        );
      case 'requested':
      case 'searching': 
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200">
            Searching
          </span>
        );
      case 'cancelled': 
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200">
            Cancelled
          </span>
        );
      default: 
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="page-container p-6 sm:p-8 space-y-6" id="bookings-audit-report">
      {/* Stitch Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400">
              <History size={24} />
            </span>
            <span>Ride Monitor &amp; Fare Receipt Audit</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Track real-time trip lifecycles, inspect computed fare receipts, and audit completed rides.
          </p>
        </div>
      </div>

      {/* Stitch Filter Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-[24px] p-4 border border-slate-200/80 dark:border-slate-800 ambient-shadow flex items-center gap-2 overflow-x-auto">
        {['all', 'searching', 'driver_assigned', 'in_transit', 'completed', 'cancelled'].map(status => {
          const isActive = filterStatus === status;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap capitalize ${
                isActive
                  ? 'bg-[#0052d1] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          );
        })}
      </div>

      {/* Bookings Data Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/80 dark:border-slate-800 ambient-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800">
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Trip ID</th>
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Route Itinerary</th>
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Passenger</th>
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Assigned Driver</th>
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Computed Fare</th>
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-medium">
                    No rides found.
                  </td>
                </tr>
              ) : (
                filtered.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-6 font-mono text-[11px] text-slate-500">
                      {b.id.slice(0, 8)}...
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {b.origin_name || b.pickup_name || 'Pickup Point'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        ➔ {b.destination_name || b.dropoff_name || 'Dropoff Point'}
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-slate-800 dark:text-slate-200 font-medium">
                      {b.passenger?.full_name || 'Passenger'}
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {b.driver?.profile?.full_name || 'Assigned Driver'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {b.driver?.plate_number || 'Tricycle'}
                      </div>
                    </td>
                    <td className="py-3.5 px-6 font-black text-emerald-600 dark:text-emerald-400">
                      ₱{Number(b.final_fare || b.computed_fare || b.estimated_fare || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-6">
                      {getStatusBadge(b.status)}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => { setSelectedBooking(b); setIsModalOpen(true); }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[#0052d1] dark:text-sky-400 font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Receipt size={13} /> Receipt
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Digital Fare Receipt Modal */}
      {isModalOpen && selectedBooking && (
        <div className="modal-overlay fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Official Digital Fare Receipt</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">×</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="text-center pb-4 border-b border-dashed border-slate-300 dark:border-slate-700">
                <div className="font-black text-sm text-[#0052d1] dark:text-sky-400">MUNICIPALITY OF BAUANG</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Tricycle Regulatory Board Fare Breakdown</div>
                <div className="text-[10px] text-slate-400 font-mono mt-1">Trip Ref: {selectedBooking.id}</div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Passenger:</span>
                  <strong className="text-slate-900 dark:text-white">{selectedBooking.passenger?.full_name || 'Passenger'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Driver:</span>
                  <strong className="text-slate-900 dark:text-white">{selectedBooking.driver?.profile?.full_name || 'Driver'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Route:</span>
                  <span className="text-right text-slate-900 dark:text-white max-w-[200px] truncate">
                    {selectedBooking.origin_name || selectedBooking.pickup_name} ➔ {selectedBooking.destination_name || selectedBooking.dropoff_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Distance:</span>
                  <strong className="text-slate-900 dark:text-white">{selectedBooking.estimated_distance_km || selectedBooking.distance_km || 2.0} km</strong>
                </div>
              </div>

              <div className="border-t-2 border-[#0052d1] pt-3 flex justify-between items-center">
                <span className="font-extrabold text-sm text-slate-900 dark:text-white">Total Regulated Fare:</span>
                <span className="text-2xl font-black text-[#0052d1] dark:text-sky-400">
                  ₱{Number(selectedBooking.final_fare || selectedBooking.computed_fare || selectedBooking.estimated_fare || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end gap-2">
              <button onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer">
                Print
              </button>
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl bg-[#0052d1] text-white font-bold text-xs cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
