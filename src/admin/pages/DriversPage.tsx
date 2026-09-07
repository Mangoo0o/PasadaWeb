import React, { useState } from 'react';
import { 
  Car, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Shield, 
  FileText, 
  ExternalLink, 
  X, 
  FileCheck, 
  FileBadge, 
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import type { Driver, Terminal, VerificationStatus } from '../types';
import { DriverDocument, DriverDocumentType } from '../../types/database.types';
import { 
  fetchDriverDocuments, 
  REQUIRED_DRIVER_DOCUMENTS, 
  DocumentTypeConfig 
} from '../../services/driverDocumentService';

interface DriversPageProps {
  drivers: Driver[];
  terminals: Terminal[];
  onUpdateStatus: (profileId: string, status: VerificationStatus, reason?: string) => void;
}

const COMMON_REJECTION_REASONS = [
  'Expired or invalid MTOP franchise permit',
  'Blurry or unreadable PDF document copy',
  'Plate number / Body number mismatch with LTO OR/CR',
  'Non-Professional Driver License class submitted',
  'Barangay or Police clearance expired (more than 6 months old)',
  'Incomplete pages in OR/CR PDF document',
];

export const DriversPage: React.FC<DriversPageProps> = ({ 
  drivers, terminals, onUpdateStatus 
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  
  // Document Review Modal State
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [driverDocs, setDriverDocs] = useState<DriverDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [activeDocType, setActiveDocType] = useState<DriverDocumentType>('license');
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const filteredDrivers = drivers.filter(d => {
    const matchesStatus = filterStatus === 'all' || d.verification_status === filterStatus;
    const name = d.profile?.full_name?.toLowerCase() || '';
    const plate = d.plate_number?.toLowerCase() || '';
    const matchesSearch = name.includes(search.toLowerCase()) || plate.includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const activeDriversCount = drivers.filter(d => d.verification_status === 'approved' || d.verification_status === 'verified').length;
  const pendingCount = drivers.filter(d => d.verification_status === 'pending').length;

  const handleOpenDocModal = async (driver: Driver, startInRejectMode = false) => {
    setSelectedDriver(driver);
    setIsDocModalOpen(true);
    setIsRejecting(startInRejectMode);
    setRejectionReason(driver.rejection_reason || '');
    setActionSuccessMessage(null);
    setLoadingDocs(true);

    const docs = await fetchDriverDocuments(driver.profile_id || driver.id || '');
    setDriverDocs(docs);
    setLoadingDocs(false);
  };

  const handleApprove = (driverId: string) => {
    onUpdateStatus(driverId, 'approved');
    setActionSuccessMessage('Matagumpay na naaprubahan ang driver franchise!');
    setTimeout(() => {
      setIsDocModalOpen(false);
      setActionSuccessMessage(null);
    }, 1200);
  };

  const handleConfirmReject = (driverId: string) => {
    if (!rejectionReason.trim()) {
      alert('Paki-lagay ang dahilan ng pag-reject upang malaman ng driver ang dapat ayusin.');
      return;
    }
    onUpdateStatus(driverId, 'rejected', rejectionReason.trim());
    setActionSuccessMessage('Nai-record na ang rejection at feedback para sa driver.');
    setTimeout(() => {
      setIsDocModalOpen(false);
      setIsRejecting(false);
      setActionSuccessMessage(null);
    }, 1200);
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'approved': 
      case 'verified' as any:
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
      default:
        return null;
    }
  };

  const currentActiveDoc = driverDocs.find(d => d.document_type === activeDocType);
  const currentDocConfig = REQUIRED_DRIVER_DOCUMENTS.find(d => d.type === activeDocType) || REQUIRED_DRIVER_DOCUMENTS[0];

  return (
    <div className="page-container p-6 sm:p-8 space-y-6" id="driver-roster-report">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400">
              <Car size={24} />
            </span>
            <span>Driver Franchise & Document Verification</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Suriin ang 5 kinakailangang PDF documents (License, OR/CR, MTOP, Barangay & Police Clearances) bago aprubahan ang prangkisa.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
              {pendingCount}
            </div>
            <div>
              <div className="text-xs font-black text-amber-950 dark:text-amber-200">
                Pending Verification
              </div>
              <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                Nangangailangan ng pagsusuri ng MTFRB
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Container: Tabs, Filters, Table */}
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
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                <th className="py-3.5 px-6 text-[11px] font-black text-slate-400 uppercase tracking-wider text-right">Documents & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400 font-medium">
                    No drivers found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((d) => {
                  const driverName = d.profile?.full_name || 'Registered Driver';
                  const initials = driverName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'DR';
                  const terminalName = d.terminal?.name || terminals.find(t => t.id === d.terminal_id)?.name || 'Central TODA';
                  const driverId = d.profile_id || d.id || '';

                  return (
                    <tr key={driverId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#0052d1]/10 text-[#0052d1] dark:text-sky-400 font-extrabold flex items-center justify-center text-xs shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white text-xs">{driverName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              ID: {driverId.substring(0, 8)}
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
                        <div className="text-[10px] text-slate-400">Bauang Toda Route</div>
                      </td>

                      <td className="py-3.5 px-6">
                        {getStatusBadge(d.verification_status)}
                        {d.rejection_reason && (
                          <div className="text-[10px] text-rose-600 dark:text-rose-400 max-w-xs truncate mt-0.5" title={d.rejection_reason}>
                            Note: {d.rejection_reason}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Inspect Documents Modal Trigger */}
                          <button
                            onClick={() => handleOpenDocModal(d)}
                            className="px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/60 text-[#0052d1] dark:text-sky-300 font-bold text-[11px] transition-colors border border-sky-200 dark:border-sky-800 cursor-pointer flex items-center gap-1.5 shadow-xs"
                            title="Inspect 5 Submitted Franchise PDFs"
                          >
                            <FileText size={13} />
                            <span>Review Documents</span>
                          </button>

                          {d.verification_status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(driverId)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                                title="Approve Franchise"
                              >
                                <CheckCircle size={12} /> Approve
                              </button>
                              <button
                                onClick={() => handleOpenDocModal(d, true)}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] transition-colors border border-rose-200 cursor-pointer flex items-center gap-1"
                                title="Reject with Reason Note"
                              >
                                <XCircle size={12} /> Reject
                              </button>
                            </>
                          )}

                          {(d.verification_status === 'approved' || d.verification_status === ('verified' as any)) && (
                            <button
                              onClick={() => onUpdateStatus(driverId, 'suspended')}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] transition-colors border border-rose-200 cursor-pointer flex items-center gap-1"
                              title="Suspend Franchise"
                            >
                              <Shield size={12} /> Suspend
                            </button>
                          )}

                          {d.verification_status === 'suspended' && (
                            <button
                              onClick={() => onUpdateStatus(driverId, 'approved')}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors shadow-xs cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle size={12} /> Re-activate
                            </button>
                          )}
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

      {/* Driver Franchise & 5-Document Review Modal */}
      {isDocModalOpen && selectedDriver && (
        <div 
          className="modal-overlay fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5"
          onClick={() => setIsDocModalOpen(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0052d1] text-white flex items-center justify-center font-black shadow-md">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                      {selectedDriver.profile?.full_name}
                    </h3>
                    {getStatusBadge(selectedDriver.verification_status)}
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    Plate: <strong className="text-slate-800 dark:text-slate-200">{selectedDriver.plate_number}</strong> | Body #{selectedDriver.body_number || '0142'} • {selectedDriver.tricycle_model}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setIsDocModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Success Banner */}
            {actionSuccessMessage && (
              <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2">
                <CheckCircle size={14} className="text-emerald-600" />
                <span>{actionSuccessMessage}</span>
              </div>
            )}

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              
              {/* Document Tabs (5 Slots) */}
              <div>
                <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
                  Select Franchise Document to Inspect:
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {REQUIRED_DRIVER_DOCUMENTS.map((config) => {
                    const isSelected = activeDocType === config.type;
                    const doc = driverDocs.find(d => d.document_type === config.type);

                    return (
                      <button
                        key={config.type}
                        onClick={() => setActiveDocType(config.type)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[64px] ${
                          isSelected
                            ? 'bg-sky-50 dark:bg-sky-950/60 border-[#0052d1] ring-2 ring-[#0052d1]/15'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <span className={`text-[11px] font-bold truncate block ${
                          isSelected ? 'text-[#0052d1] dark:text-sky-300' : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {config.title}
                        </span>

                        <div className="flex items-center justify-between gap-1 mt-1">
                          <span className="text-[9px] font-mono text-slate-400">PDF</span>
                          {doc ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 dark:text-emerald-400">
                              <CheckCircle size={10} /> Attached
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-600 dark:text-amber-400">
                              <Clock size={10} /> Missing
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Document Viewer Container */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700 pb-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <FileBadge className="w-4 h-4 text-[#0052d1]" />
                      <span>{currentDocConfig.title} ({currentDocConfig.tagalogTitle})</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {currentDocConfig.description}
                    </p>
                  </div>

                  {currentActiveDoc?.file_url && (
                    <a
                      href={currentActiveDoc.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-[#0052d1] hover:bg-[#003f87] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
                    >
                      <ExternalLink size={13} />
                      <span>Open PDF Full Screen</span>
                    </a>
                  )}
                </div>

                {loadingDocs ? (
                  <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                    Kinukuha ang PDF...
                  </div>
                ) : currentActiveDoc?.file_url ? (
                  <div className="space-y-2">
                    <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
                      <span>File: <strong>{currentActiveDoc.file_name}</strong></span>
                      <span className="text-emerald-600 font-bold">✓ PDF Verified Format</span>
                    </div>

                    {/* PDF Embedded Frame */}
                    <div className="w-full h-80 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white">
                      <iframe
                        src={currentActiveDoc.file_url}
                        title={`PDF - ${currentDocConfig.title}`}
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-44 rounded-xl border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col items-center justify-center gap-2 text-center p-4">
                    <AlertTriangle className="w-8 h-8 text-amber-500" />
                    <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Walang Naka-attach na PDF
                    </div>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 max-w-sm">
                      Hindi pa nai-upload ng driver ang dokumentong ito o kailangan pa itong isumite.
                    </p>
                  </div>
                )}
              </div>

              {/* Rejection Feedback Section */}
              {isRejecting ? (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-black text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span>Dahilan ng Pag-Reject (Rejection Feedback)</span>
                    </div>
                    <button
                      onClick={() => setIsRejecting(false)}
                      className="text-[11px] text-slate-500 hover:text-slate-800 font-bold cursor-pointer"
                    >
                      Kanselahin
                    </button>
                  </div>

                  <p className="text-[11px] text-rose-700 dark:text-rose-300">
                    Pumili sa karaniwang dahilan o mag-type ng partikular na puna para maayos ng driver:
                  </p>

                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_REJECTION_REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRejectionReason(r)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-[10px] font-semibold text-rose-800 dark:text-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                      >
                        + {r}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Ilagay ang detalyadong dahilan ng rejection dito..."
                    className="w-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-xl p-3 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-rose-500/20"
                  />

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setIsRejecting(false)}
                      className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                    >
                      Bumalik
                    </button>
                    <button
                      onClick={() => handleConfirmReject(selectedDriver.profile_id || selectedDriver.id || '')}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <XCircle size={14} />
                      <span>Kumpirmahin ang Rejection</span>
                    </button>
                  </div>
                </div>
              ) : selectedDriver.rejection_reason && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  <strong>Nakaraang Rejection Note:</strong> "{selectedDriver.rejection_reason}"
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between flex-wrap gap-3">
              <button 
                onClick={() => setIsDocModalOpen(false)} 
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer hover:bg-slate-300"
              >
                Close
              </button>

              {!isRejecting && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsRejecting(true)}
                    className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <XCircle size={14} />
                    <span>Reject Application</span>
                  </button>

                  <button
                    onClick={() => handleApprove(selectedDriver.profile_id || selectedDriver.id || '')}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                  >
                    <CheckCircle size={14} />
                    <span>Approve Franchise & Documents</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
