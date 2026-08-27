import React, { useState } from 'react';
import { Car, CheckCircle, XCircle, AlertTriangle, Shield, FileText } from 'lucide-react';
import type { Driver, Terminal, VerificationStatus } from '../types';
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

  const activeDriversCount = drivers.filter(d => d.verification_status === 'approved').length;
  const pendingCount = drivers.filter(d => d.verification_status === 'pending').length;
  const utilizationRate = drivers.length > 0 ? Math.round((activeDriversCount / drivers.length) * 100) : 85;

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'approved': 
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle size={12} /> Approved
          </span>
        );
      case 'pending': 
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertTriangle size={12} /> Pending Review
          </span>
        );
      case 'rejected': 
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle size={12} /> Rejected
          </span>
        );
      case 'suspended': 
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-300 dark:border-rose-800">
            <Shield size={12} /> Suspended
          </span>
        );
    }
  };

  return (
    <div className="page-container p-6 sm:p-8 space-y-6" id="driver-roster-report">
      {/* Stitch Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400">
              <Car size={24} />
            </span>
            <span>Driver Verification</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Manage operator applications, terminal assignments, and TODA compliance.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => alert("To register a new driver franchise, submit documents or provide driver license to Bauang MTFRB.")}
            className="px-4 py-2.5 rounded-xl bg-[#0052d1] hover:bg-[#0044b3] text-white font-bold text-xs shadow-md shadow-[#0052d1]/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <span>+ New Application</span>
          </button>
        </div>
      </div>


      {/* Stitch Content Container: Tabs, Filters, Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200/80 dark:border-slate-800 ambient-shadow overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200/80 dark:border-slate-800 px-6 pt-3 bg-slate-50/50 dark:bg-slate-800/40 overflow-x-auto gap-2">
          {[
            { id: 'all', label: 'All Applications', count: drivers.length },
            { id: 'pending', label: 'Pending Review', count: pendingCount },
            { id: 'approved', label: 'Approved', count: activeDriversCount },
            { id: 'suspended', label: 'Suspended', count: drivers.filter(d => d.verification_status === 'suspended').length },
            { id: 'rejected', label: 'Rejected', count: drivers.filter(d => d.verification_status === 'rejected').length },
          ].map((tab) => {
            const isTabActive = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isTabActive
                    ? 'border-[#0052d1] text-[#0052d1] dark:text-sky-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    tab.id === 'pending' && tab.count > 0 
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="p-4 px-6 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4 bg-slate-50/20 dark:bg-slate-800/20">
          <div className="flex items-center gap-3 flex-wrap">
            <select
              aria-label="Filter by terminal"
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold px-3 py-2 text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#0052d1]/20"
            >
              <option>All TODA Terminals</option>
              {terminals.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <span className="text-xs text-slate-400">
              Showing {filteredDrivers.length} matching drivers
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search driver name or plate..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 h-9 pl-4 pr-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium outline-none focus:border-[#0052d1] focus:ring-2 focus:ring-[#0052d1]/20 transition-all"
            />
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800">
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Driver / ID</th>
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Vehicle Details</th>
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">TODA / Terminal</th>
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Performance</th>
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400 font-medium">
                    No drivers found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((d) => {
                  const driverName = d.profile?.full_name || 'Registered Driver';
                  const initials = driverName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'DR';
                  const terminalName = d.terminal?.name || terminals.find(t => t.id === d.terminal_id)?.name || 'Central TODA';

                  return (
                    <tr key={d.profile_id || d.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400 font-extrabold flex items-center justify-center text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-xs">{driverName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              ID: {d.profile_id ? d.profile_id.substring(0, 8) : (d.id ? d.id.substring(0, 8) : 'N/A')}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-6">
                        <div className="inline-block px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-mono font-bold text-[11px] rounded border border-slate-200 dark:border-slate-700">
                          {d.plate_number} {d.body_number ? `(#${d.body_number})` : ''}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{d.tricycle_model}</div>
                      </td>

                      <td className="py-3.5 px-6">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{terminalName}</div>
                        <div className="text-[10px] text-slate-400">Main Route</div>
                      </td>

                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-1 font-bold text-amber-500">
                          <span>★ {d.rating || d.rating_avg || 5.0}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({d.total_trips || 0} trips)</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-6">
                        {getStatusBadge(d.verification_status)}
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {d.verification_status === 'pending' && (
                            <>
                              <button
                                onClick={() => onUpdateStatus(d.profile_id || d.id || '', 'approved')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                                title="Approve Franchise"
                              >
                                <CheckCircle size={12} /> Approve
                              </button>
                              <button
                                onClick={() => onUpdateStatus(d.profile_id || d.id || '', 'rejected')}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] transition-colors border border-rose-200 cursor-pointer"
                                title="Reject Application"
                              >
                                <XCircle size={12} /> Reject
                              </button>
                            </>
                          )}

                          {d.verification_status === 'approved' && (
                            <button
                              onClick={() => onUpdateStatus(d.profile_id || d.id || '', 'suspended')}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] transition-colors border border-rose-200 cursor-pointer"
                              title="Suspend Franchise"
                            >
                              <Shield size={12} /> Suspend
                            </button>
                          )}

                          {d.verification_status === 'suspended' && (
                            <button
                              onClick={() => onUpdateStatus(d.profile_id || d.id || '', 'approved')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors shadow-xs cursor-pointer"
                            >
                              <CheckCircle size={12} /> Re-activate
                            </button>
                          )}

                          <button
                            onClick={() => { setSelectedDriver(d); setIsDocModalOpen(true); }}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300 transition-colors cursor-pointer"
                            title="Upload/Inspect Documents"
                          >
                            <FileText size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Driver Documents Upload Modal */}
      {isDocModalOpen && selectedDriver && (
        <div className="modal-overlay fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setIsDocModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Franchise Documents: {selectedDriver.profile?.full_name}
              </h3>
              <button onClick={() => setIsDocModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">×</button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 text-xs font-semibold">
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

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end">
              <button onClick={() => setIsDocModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
