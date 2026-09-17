import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  Check, 
  User, 
  Bike, 
  X, 
  Filter, 
  Search, 
  LayoutGrid, 
  Table as TableIcon,
  Layers,
  CircleDollarSign,
  Ban,
  UserX,
  Package
} from 'lucide-react';
import type { Complaint, ComplaintStatus } from '../types';
import { cn } from '../../lib/utils';
import { ContinuousTabs } from '../../components/ui/continuous-tabs';
import { FilterDisclosure } from '../../components/ui/filter-disclosure';

const COMPLAINT_CATEGORY_ITEMS = [
  { id: 'all', label: 'All Categories', icon: Layers },
  { id: 'overcharging', label: 'Overcharging', icon: CircleDollarSign },
  { id: 'refusal', label: 'Refusal of Service', icon: Ban },
  { id: 'reckless_driving', label: 'Reckless Driving', icon: AlertTriangle },
  { id: 'rude_behavior', label: 'Rude Behavior', icon: UserX },
  { id: 'lost_item', label: 'Lost Item', icon: Package },
];

interface ComplaintsPageProps {
  complaints: Complaint[];
  onUpdateComplaint: (id: string, status: ComplaintStatus, resolutionNotes?: string) => void;
}

export const ComplaintsPage: React.FC<ComplaintsPageProps> = ({ 
  complaints, onUpdateComplaint 
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

  const filtered = complaints.filter(c => {
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || c.category === filterCategory || (filterCategory === 'refusal' && c.category === 'refusal_of_service');
    if (!matchesStatus || !matchesCategory) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const passName = (c.passenger_name || c.passenger?.full_name || '').toLowerCase();
    const driverName = (c.driver_name || '').toLowerCase();
    const bodyNum = (c.driver_body_number || '').toLowerCase();
    const desc = (c.description || '').toLowerCase();
    return passName.includes(q) || driverName.includes(q) || bodyNum.includes(q) || desc.includes(q);
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
    <div className="page-container p-6 sm:p-8 space-y-6" id="complaints-audit-report">
      {/* Stitch Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="p-1.5 sm:p-2 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle size={20} />
            </span>
            <span>Complaint Triage</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-normal">
            Manage, investigate, and resolve active commuter reports and tariff compliance issues.
          </p>
        </div>
      </div>

      {/* Content Container: Unified Filter Row & Table/Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 ambient-shadow">
        {/* Unified Top Filter Row */}
        <div className="relative z-30 flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 bg-slate-50/50 dark:bg-slate-800/40 gap-3 py-1 sm:py-0 rounded-t-lg">
          {/* Tabs */}
          <div className="flex items-center overflow-x-auto gap-1 sm:gap-2">
            {[
              { id: 'all', label: 'All Complaints', count: complaints.length },
              { id: 'open', label: 'Open', count: complaints.filter(c => c.status === 'open').length },
              { id: 'reviewing', label: 'Reviewing', count: complaints.filter(c => c.status === 'reviewing').length },
              { id: 'resolved', label: 'Resolved', count: complaints.filter(c => c.status === 'resolved').length },
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
                      tab.id === 'open' && tab.count > 0 
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

          {/* Right: Controls & Search */}
          <div className="flex items-center gap-2.5 py-2 shrink-0 flex-wrap sm:flex-nowrap">
            <span className="hidden md:inline text-xs text-slate-400 font-medium">
              Showing {filtered.length} {filtered.length === 1 ? 'case' : 'cases'}
            </span>

            <FilterDisclosure
              items={COMPLAINT_CATEGORY_ITEMS}
              activeId={filterCategory}
              onChange={setFilterCategory}
              label="Filter by Category"
            />

            <div className="relative w-52 max-w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search complaint, driver..."
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

            <ContinuousTabs
              tabs={[
                { id: 'cards', label: 'Cards', icon: <LayoutGrid size={13} /> },
                { id: 'table', label: 'Table', icon: <TableIcon size={13} /> },
              ]}
              activeId={viewMode}
              onChange={(id) => setViewMode(id as 'cards' | 'table')}
              layoutId="complaints-view-mode"
            />
          </div>
        </div>

        {/* Content: Card Feed or Table */}
        {viewMode === 'cards' ? (
          <div className="p-6 bg-slate-50/40 dark:bg-slate-900/30">
            {filtered.length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-medium">
                No active complaints matching criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map(c => {
                  const isOvercharging = c.category === 'overcharging';
                  const isResolved = c.status === 'resolved';
                  const isReviewing = c.status === 'reviewing';

                  return (
                    <div
                      key={c.id}
                      className="bg-white dark:bg-slate-900 rounded-lg p-6 border border-slate-200/80 dark:border-slate-800 ambient-shadow hover:shadow-md transition-shadow duration-200 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                              isOvercharging 
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' 
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                            }`}>
                              <AlertTriangle size={18} />
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white text-sm capitalize">
                                {c.category.replace(/_/g, ' ')}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                                Case #{c.id.slice(0, 8)} • {new Date(c.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isResolved 
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200' 
                              : isReviewing
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200'
                          }`}>
                            {c.status}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 bg-slate-50 dark:bg-slate-800/60 p-3 rounded border border-slate-100 dark:border-slate-800 line-clamp-3">
                          "{c.description}"
                        </p>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Complainant</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200 truncate block">
                              {c.passenger_name || c.passenger?.full_name || 'Passenger'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Driver / Body #</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200 truncate block">
                              {c.driver_name || 'Driver'} {c.driver_body_number ? `(#${c.driver_body_number})` : ''}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <span className="text-[10px] text-slate-400">
                            {c.resolution_notes ? 'Has triage logs' : 'No notes logged yet'}
                          </span>
                          <button
                            onClick={() => handleOpenTriage(c)}
                            className="h-7 px-2.5 rounded-md bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs transition-colors cursor-pointer shadow-2xs flex items-center justify-center"
                          >
                            Review Detail
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800">
                  <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date Filed</th>
                  <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Complainant</th>
                  <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reported Driver</th>
                  <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="py-3.5 px-6 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">
                      No complaints found.
                    </td>
                  </tr>
                ) : (
                  filtered.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300 font-mono text-[11px] tabular-nums">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                          {c.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-bold text-slate-900 dark:text-white">
                        {c.passenger_name || c.passenger?.full_name || 'Passenger'}
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{c.driver_name || 'Driver'}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">Body #{c.driver_body_number || 'N/A'}</div>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          c.status === 'resolved' 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200' 
                            : c.status === 'reviewing'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => handleOpenTriage(c)}
                          className="h-7 px-2.5 rounded-md bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs transition-colors cursor-pointer shadow-2xs inline-flex items-center justify-center"
                        >
                          Review Case
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Executive Complaint Triage & Resolution Modal */}
      {isModalOpen && selectedComplaint && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div 
            className="modal-content max-w-xl" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Complaint Triage &amp; Sanction
                    </h3>
                    <span className="font-mono text-xs text-slate-400">
                      #{selectedComplaint.id.slice(0, 8)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-rose-600 dark:text-rose-400 font-bold capitalize">
                      {selectedComplaint.category.replace(/_/g, ' ')}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-xs text-slate-400">
                      Filed: {new Date(selectedComplaint.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
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

            {/* Modal Body */}
            <div className="modal-body space-y-4">
              {/* Complainant vs Driver Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">
                    <User size={14} className="text-[#0052d1] dark:text-sky-400" />
                    <span>Complainant Passenger</span>
                  </div>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {selectedComplaint.passenger_name || selectedComplaint.passenger?.full_name || 'Passenger'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Verified commuter account
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">
                    <Bike size={14} className="text-amber-600 dark:text-amber-400" />
                    <span>Reported Tricycle / Driver</span>
                  </div>
                  <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {selectedComplaint.driver_name || selectedComplaint.driver?.profile?.full_name || 'Reported Driver'}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Body #{selectedComplaint.driver_body_number || selectedComplaint.driver?.plate_number || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Passenger Incident Statement */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Passenger Incident Statement
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">Direct Citizen Report</span>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-lg text-xs text-slate-800 dark:text-slate-200 italic border border-slate-200 dark:border-slate-700/80 leading-relaxed shadow-inner">
                  "{selectedComplaint.description}"
                </div>
              </div>

              {/* LGU Official Resolution Notes & Sanctions */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    LGU Official Resolution Notes &amp; Action
                  </label>
                  <span className="text-[10px] text-[#0052d1] dark:text-sky-400 font-bold">Recorded on Audit Trail</span>
                </div>
                <textarea
                  rows={4}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Mediation held at Bauang TODA desk. Driver refunded excess ₱20 fare and received first written warning."
                  className="w-full p-3.5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-[#0052d1] focus:ring-3 focus:ring-[#0052d1]/15 transition-all resize-y"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-9 px-3.5 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-medium text-xs cursor-pointer transition-colors shadow-2xs"
              >
                Dismiss
              </button>

              <button
                type="button"
                onClick={() => handleSaveResolution('reviewing')}
                className="h-9 px-3.5 rounded-md bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs cursor-pointer inline-flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Clock size={14} /> Mark In-Review
              </button>

              <button
                type="button"
                onClick={() => handleSaveResolution('resolved')}
                className="h-9 px-4 rounded-md bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs cursor-pointer inline-flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Check size={14} /> Resolve &amp; Close Case
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
