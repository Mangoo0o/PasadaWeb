import React, { useState } from 'react';
import { History, Receipt, Printer, X, Search } from 'lucide-react';
import type { Booking } from '../types';
import { cn } from '../../lib/utils';

interface BookingsPageProps {
  bookings: Booking[];
}

export const BookingsPage: React.FC<BookingsPageProps> = ({ bookings }) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filtered = bookings.filter(b => {
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
    if (!matchesStatus) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const idMatch = b.id.toLowerCase().includes(q);
    const passMatch = (b.passenger?.full_name || '').toLowerCase().includes(q);
    const driverMatch = (b.driver?.profile?.full_name || '').toLowerCase().includes(q);
    const originMatch = (b.origin_name || b.pickup_name || '').toLowerCase().includes(q);
    const destMatch = (b.destination_name || b.dropoff_name || '').toLowerCase().includes(q);
    return idMatch || passMatch || driverMatch || originMatch || destMatch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': 
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
            Completed
          </span>
        );
      case 'ongoing':
      case 'in_transit': 
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200">
            In Transit
          </span>
        );
      case 'accepted':
      case 'driver_assigned': 
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200">
            Driver Assigned
          </span>
        );
      case 'requested':
      case 'searching': 
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200">
            Searching
          </span>
        );
      case 'cancelled': 
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200">
            Cancelled
          </span>
        );
      default: 
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
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
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="p-1.5 sm:p-2 rounded-md bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400">
              <History size={20} />
            </span>
            <span>Ride Monitor &amp; Fare Receipt Audit</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-normal">
            Track real-time trip lifecycles, inspect computed fare receipts, and audit completed rides.
          </p>
        </div>


      </div>

      {/* Bookings Data Table Card with Unified Top Filter Row */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 ambient-shadow overflow-hidden">
        {/* Unified Top Filter Row: Tabs on Left */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 bg-slate-50/50 dark:bg-slate-800/40 gap-3 py-1 sm:py-0">
          <div className="flex items-center overflow-x-auto gap-1 sm:gap-2">
            {[
              { id: 'all', label: 'All Rides', count: bookings.length },
              { id: 'searching', label: 'Searching', count: bookings.filter(b => b.status === 'searching' || b.status === 'requested').length },
              { id: 'driver_assigned', label: 'Driver Assigned', count: bookings.filter(b => b.status === 'driver_assigned' || b.status === 'accepted').length },
              { id: 'in_transit', label: 'In Transit', count: bookings.filter(b => b.status === 'in_transit' || b.status === 'ongoing').length },
              { id: 'completed', label: 'Completed', count: bookings.filter(b => b.status === 'completed').length },
              { id: 'cancelled', label: 'Cancelled', count: bookings.filter(b => b.status === 'cancelled').length },
            ].map((tab) => {
              const isTabActive = filterStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  className={`px-3.5 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isTabActive
                      ? 'border-[#0052d1] text-[#0052d1] dark:text-sky-400'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                      tab.id === 'searching' && tab.count > 0
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Search Input & Match Counter */}
          <div className="flex items-center gap-3 py-2 shrink-0">
            <span className="hidden md:inline text-xs text-slate-400 font-medium">
              Showing {filtered.length} {filtered.length === 1 ? 'ride' : 'rides'}
            </span>
            <div className="relative w-64 max-w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search trip, passenger, driver..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-9 pr-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium outline-none focus:border-[#0052d1] focus:ring-1 focus:ring-[#0052d1]/20 transition-all text-slate-800 dark:text-slate-100 shadow-xs placeholder:text-slate-400"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800">
                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Trip ID</th>
                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Route Itinerary</th>
                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Passenger</th>
                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assigned Driver</th>
                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Computed Fare</th>
                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Receipt</th>
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
                    <td className="py-3.5 px-6 font-mono text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
                      {b.id.slice(0, 8)}...
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {b.origin_name || b.pickup_name || 'Pickup Point'}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
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
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {b.driver?.plate_number || 'Tricycle'}
                      </div>
                    </td>
                    <td className="py-3.5 px-6 font-black text-emerald-600 dark:text-emerald-400 tabular-nums text-sm">
                      ₱{Number(b.final_fare || b.computed_fare || b.estimated_fare || 0).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-6">
                      {getStatusBadge(b.status)}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => { setSelectedBooking(b); setIsModalOpen(true); }}
                        className="h-7 px-2.5 rounded-md bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
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

      {/* Executive Digital Fare Receipt Modal */}
      {isModalOpen && selectedBooking && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div 
            className="modal-content max-w-md" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400 flex items-center justify-center shrink-0">
                  <Receipt size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Official Fare Receipt
                  </h3>
                  <p className="font-mono text-xs text-slate-400 mt-0.5">
                    Ref: {selectedBooking.id.slice(0, 12)}...
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="modal-close-btn"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body - Official Receipt Aesthetic */}
            <div className="modal-body space-y-4">
              {/* Civic Municipal Header */}
              <div className="text-center pb-3.5 border-b border-dashed border-slate-300 dark:border-slate-700">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#0052d1] dark:text-sky-400 bg-[#0052d1]/10 px-2.5 py-0.5 rounded-md inline-block mb-1">
                  Municipality of Bauang, La Union
                </span>
                <div className="font-black text-sm text-slate-900 dark:text-white">
                  Tricycle Regulatory Board Fare Receipt
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Trip Timestamp: {new Date(selectedBooking.created_at).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>

              {/* Route Itinerary Flow */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 shrink-0 mt-1" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-slate-400 uppercase font-black block">Pickup</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                      {selectedBooking.origin_name || selectedBooking.pickup_name || 'Pickup Point'}
                    </span>
                  </div>
                </div>

                <div className="ml-1.25 border-l-2 border-dashed border-slate-300 dark:border-slate-700 h-3" />

                <div className="flex items-start gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#0052d1] ring-4 ring-[#0052d1]/20 shrink-0 mt-1" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-slate-400 uppercase font-black block">Dropoff</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                      {selectedBooking.destination_name || selectedBooking.dropoff_name || 'Dropoff Point'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ride Metadata Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Passenger</span>
                  <span className="font-extrabold text-slate-900 dark:text-white truncate block">
                    {selectedBooking.passenger?.full_name || 'Passenger'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Driver &amp; Plate</span>
                  <span className="font-extrabold text-slate-900 dark:text-white truncate block">
                    {selectedBooking.driver?.profile?.full_name || 'Driver'}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {selectedBooking.driver?.plate_number || 'Tricycle'}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Distance</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    {selectedBooking.estimated_distance_km || selectedBooking.distance_km || 2.0} km
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-0.5">Status</span>
                  <div>{getStatusBadge(selectedBooking.status)}</div>
                </div>
              </div>

              {/* Regulated Fare Total Banner */}
              <div className="p-4 rounded-lg bg-[#0052d1]/5 dark:bg-[#0052d1]/10 border border-[#0052d1]/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                    Regulated Municipal Fare
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Certified LGU Tariff Ordinance
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#0052d1] dark:text-sky-400 tabular-nums tracking-tight">
                  ₱{Number(selectedBooking.final_fare || selectedBooking.computed_fare || selectedBooking.estimated_fare || 0).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button 
                type="button"
                onClick={() => window.print()} 
                className="h-9 px-3.5 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs cursor-pointer inline-flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Printer size={14} /> Print Receipt
              </button>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="h-9 px-4 rounded-md bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs cursor-pointer inline-flex items-center transition-colors shadow-2xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
