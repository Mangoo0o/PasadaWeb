import React, { useState } from 'react';
import { AlertTriangle, Clock, Check, User, Bike, X, Filter } from 'lucide-react';
import type { Complaint, ComplaintStatus } from '../types';
import { cn } from '../../lib/utils';

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

  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  return (
    <div className="page-container p-6 sm:p-8 space-y-6" id="complaints-audit-report">
      {/* Stitch Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle size={24} />
            </span>
            <span>Complaint Triage</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Manage, investigate, and resolve active commuter reports and tariff compliance issues.
          </p>
        </div>


      </div>

      {/* Unified Filter Row & View Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 ambient-shadow overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 bg-slate-50/50 dark:bg-slate-800/40 gap-3 py-1 sm:py-0">
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
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
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

          {/* Right: Category Dropdown & View Mode Toggle */}
          <div className="flex items-center gap-2.5 py-2 shrink-0">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="h-9 px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-200 outline-none focus:border-[#0052d1] shadow-xs"
            >
              <option value="all">All Categories</option>
              <option value="overcharging">Overcharging</option>
              <option value="refusal">Refusal of Service</option>
              <option value="refusal_of_service">Refusal of Service</option>
              <option value="reckless_driving">Reckless Driving</option>
              <option value="rude_behavior">Rude Behavior</option>
              <option value="lost_item">Lost Item</option>
            </select>

            <div className="h-9 flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('cards')}
                className={`h-full px-3 text-xs font-bold rounded-sm transition-colors cursor-pointer flex items-center justify-center ${
                  viewMode === 'cards' ? 'bg-white dark:bg-slate-900 text-[#0052d1] shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`h-full px-3 text-xs font-bold rounded-sm transition-colors cursor-pointer flex items-center justify-center ${
                  viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-[#0052d1] shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Table
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content: Stitch Card Feed or Table */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 font-medium bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 ambient-shadow">
              No active complaints matching criteria.
            </div>
          ) : (
            filtered.map(c => {
              const isOvercharging = c.category === 'overcharging';
              const isResolved = c.status === 'resolved';
              const isReviewing = c.status === 'reviewing';

              return (
                <div
                  key={c.id}
                  className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200/80 dark:border-slate-800 ambient-shadow hover:shadow-md transition-shadow duration-200 flex flex-col justify-between"
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
                          <h3 className="font-extrabold text-sm text-slate-900 dark:text-white capitalize">
                            {c.category.replace(/_/g, ' ')}
                          </h3>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {new Date(c.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} • {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        isResolved
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200'
                          : isReviewing
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200'
                      }`}>
                        {c.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl mb-4 italic leading-relaxed border border-slate-100 dark:border-slate-800">
                      "{c.description}"
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 text-[11px]">
                      <span className="inline-flex items-center gap-1.5">
                        <User size={13} className="text-slate-400" />
                        <span>{c.passenger_name || c.passenger?.full_name || 'Passenger'}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Bike size={13} className="text-slate-400" />
                        <span>#{c.driver_body_number || c.driver?.plate_number || 'Tricycle'}</span>
                      </span>
                    </div>

                    <button
                      onClick={() => handleOpenTriage(c)}
                      className="h-8 px-3 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0052d1] dark:text-sky-400 font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-xs flex items-center justify-center"
                    >
                      Review Detail
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 ambient-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800">
                  <th className="py-3 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Date Filed</th>
                  <th className="py-3 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="py-3 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Complainant</th>
                  <th className="py-3 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Reported Driver</th>
                  <th className="py-3 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="py-3 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
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
                      <td className="py-3 px-6 text-slate-500 font-mono text-[11px]">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-6">
                        <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                          {c.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-6 font-bold text-slate-900 dark:text-white">
                        {c.passenger_name || c.passenger?.full_name || 'Passenger'}
                      </td>
                      <td className="py-3 px-6">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{c.driver_name || 'Driver'}</div>
                        <div className="text-[10px] text-slate-400">Body #{c.driver_body_number || 'N/A'}</div>
                      </td>
                      <td className="py-3 px-6">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                          c.status === 'resolved' 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200' 
                            : c.status === 'reviewing'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-right">
                        <button
                          onClick={() => handleOpenTriage(c)}
                          className="h-8 px-3 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-[#0052d1] dark:text-sky-400 font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-xs inline-flex items-center justify-center"
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
        </div>
      )}

      {/* Stitch Triage & Resolution Modal */}
      {isModalOpen && selectedComplaint && (
        <div className="modal-overlay fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-2xl w-full max-w-lg overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Complaint Triage: Case #{selectedComplaint.id.slice(0, 8)}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Complainant:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedComplaint.passenger_name || 'Passenger'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Driver:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedComplaint.driver_name || 'Reported Driver'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Category:</span>
                  <span className="font-bold text-rose-600 capitalize">{selectedComplaint.category.replace(/_/g, ' ')}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">Passenger Incident Statement</label>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-md text-xs text-slate-700 dark:text-slate-300 italic border border-slate-200/80 dark:border-slate-700">
                  "{selectedComplaint.description}"
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300">LGU Official Resolution Notes & Sanctions</label>
                <textarea
                  rows={4}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Mediation conducted at Bauang TODA desk. Driver warned and refunded excess fare."
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs outline-none focus:ring-2 focus:ring-[#0052d1]/20 resize-y"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-end gap-2.5">
              <button
                onClick={() => handleSaveResolution('reviewing')}
                className="h-9 px-4 rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
              >
                <Clock size={14} /> Mark In-Review
              </button>
              <button
                onClick={() => handleSaveResolution('resolved')}
                className="h-9 px-4 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Check size={14} /> Resolve & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
