import React, { useState, useEffect } from 'react';
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
  Sparkles,
  Maximize2,
  Minimize2,
  Download,
  ChevronLeft,
  ChevronRight
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
  'Expired or invalid MTOP permit',
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
  const [isExpandedPreview, setIsExpandedPreview] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Synchronize selectedDriver when drivers prop updates from parent / realtime
  useEffect(() => {
    if (selectedDriver) {
      const updated = drivers.find(d => (d.profile_id || d.id) === (selectedDriver.profile_id || selectedDriver.id));
      if (updated && updated.verification_status !== selectedDriver.verification_status) {
        setSelectedDriver(updated);
      }
    }
  }, [drivers, selectedDriver]);

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

  const handleApprove = async (driverId: string) => {
    setIsProcessingAction(true);
    try {
      await onUpdateStatus(driverId, 'approved');
      if (selectedDriver) {
        setSelectedDriver(prev => prev ? { ...prev, verification_status: 'approved' } : null);
      }
      setDriverDocs(prev => prev.map(d => ({ ...d, status: 'approved' as any })));
      setActionSuccessMessage('Matagumpay na naaprubahan ang driver franchise!');
      setTimeout(() => {
        setIsDocModalOpen(false);
        setActionSuccessMessage(null);
        setIsProcessingAction(false);
      }, 1000);
    } catch (err: any) {
      alert(`Error approving driver: ${err?.message || 'Failed'}`);
      setIsProcessingAction(false);
    }
  };

  const handleConfirmReject = async (driverId: string) => {
    if (!rejectionReason.trim()) {
      alert('Paki-lagay ang dahilan ng pag-reject upang malaman ng driver ang dapat ayusin.');
      return;
    }
    setIsProcessingAction(true);
    try {
      await onUpdateStatus(driverId, 'rejected', rejectionReason.trim());
      if (selectedDriver) {
        setSelectedDriver(prev => prev ? { ...prev, verification_status: 'rejected', rejection_reason: rejectionReason.trim() } : null);
      }
      setDriverDocs(prev => prev.map(d => ({ ...d, status: 'rejected' as any })));
      setActionSuccessMessage('Nai-record na ang rejection at feedback para sa driver.');
      setTimeout(() => {
        setIsDocModalOpen(false);
        setIsRejecting(false);
        setActionSuccessMessage(null);
        setIsProcessingAction(false);
      }, 1000);
    } catch (err: any) {
      alert(`Error rejecting driver: ${err?.message || 'Failed'}`);
      setIsProcessingAction(false);
    }
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

      {/* Driver 5-Document Review Modal */}
      {isDocModalOpen && selectedDriver && (() => {
        const currentDocIndex = REQUIRED_DRIVER_DOCUMENTS.findIndex(d => d.type === activeDocType);
        const currentDocConfig = REQUIRED_DRIVER_DOCUMENTS[currentDocIndex >= 0 ? currentDocIndex : 0];
        const currentActiveDoc = driverDocs.find(d => d.document_type === activeDocType);
        const hasPrevDoc = currentDocIndex > 0;
        const hasNextDoc = currentDocIndex < REQUIRED_DRIVER_DOCUMENTS.length - 1;
        const attachedCount = REQUIRED_DRIVER_DOCUMENTS.filter(r => driverDocs.some(d => d.document_type === r.type)).length;

        const formatFileSize = (bytes?: number) => {
          if (!bytes) return null;
          if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
          return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        };

        return (
          <div 
            className="modal-overlay fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in"
            onClick={() => setIsDocModalOpen(false)}
          >
            <div 
              className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl xl:max-w-6xl overflow-hidden flex flex-col transition-all ${
                isExpandedPreview ? 'h-[96vh]' : 'h-[92vh] max-h-[920px]'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/60 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#0052d1] text-white flex items-center justify-center font-black shadow-md shrink-0">
                    <Car className="w-5 h-5 text-[#fcd400]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white truncate">
                        {selectedDriver.profile?.full_name}
                      </h3>
                      {getStatusBadge(selectedDriver.verification_status)}
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-sky-50 dark:bg-slate-800 text-[#0052d1] dark:text-sky-300 border border-sky-200 dark:border-slate-700">
                        {attachedCount}/5 Naisumiteng PDF
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                      Plate: <strong className="text-slate-800 dark:text-slate-200">{selectedDriver.plate_number}</strong> | Body #{selectedDriver.body_number || '0142'} • {selectedDriver.tricycle_model}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsExpandedPreview(!isExpandedPreview)}
                    className="hidden sm:flex p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    title={isExpandedPreview ? "I-minimize ang preview" : "I-expand ang preview"}
                  >
                    {isExpandedPreview ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                    <span>{isExpandedPreview ? 'Standard View' : 'Expansive View'}</span>
                  </button>

                  <button 
                    onClick={() => setIsDocModalOpen(false)} 
                    className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer transition-colors shadow-xs"
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Success Notification Banner */}
              {actionSuccessMessage && (
                <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center gap-2 shrink-0 animate-in fade-in">
                  <CheckCircle size={15} className="text-emerald-600" />
                  <span>{actionSuccessMessage}</span>
                </div>
              )}

              {/* 5-Document Tabs Ribbon */}
              <div className="p-3 sm:px-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {REQUIRED_DRIVER_DOCUMENTS.map((config, idx) => {
                    const isSelected = activeDocType === config.type;
                    const doc = driverDocs.find(d => d.document_type === config.type);

                    return (
                      <button
                        key={config.type}
                        onClick={() => setActiveDocType(config.type)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[58px] ${
                          isSelected
                            ? 'bg-sky-50 dark:bg-sky-950/60 border-[#0052d1] ring-2 ring-[#0052d1]/20 shadow-xs'
                            : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-100/50'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] font-mono text-slate-400 shrink-0 font-bold">{idx + 1}.</span>
                          <span className={`text-[11px] font-black truncate block ${
                            isSelected ? 'text-[#0052d1] dark:text-sky-300' : 'text-slate-800 dark:text-slate-200'
                          }`}>
                            {config.title}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-1 mt-1.5 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                          <span className="text-[9px] font-mono font-bold text-slate-400">PDF</span>
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

              {/* Modal Body & High-Resolution Viewer */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col min-h-0 space-y-3">
                
                {/* Active Document Subheader / Toolbar */}
                <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FileBadge className="w-4 h-4 text-[#0052d1] shrink-0" />
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        {currentDocConfig.title}
                      </h4>
                      <span className="text-xs text-slate-400 font-medium">
                        ({currentDocConfig.tagalogTitle})
                      </span>
                    </div>

                    {currentActiveDoc ? (
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 dark:text-slate-300 flex-wrap">
                        <span className="font-mono text-[11px] bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 font-bold">
                          {currentActiveDoc.file_name}
                        </span>
                        {formatFileSize(currentActiveDoc.file_size) && (
                          <span className="text-[11px] text-slate-400 font-mono">
                            {formatFileSize(currentActiveDoc.file_size)}
                          </span>
                        )}
                        <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1">
                          <CheckCircle size={11} /> Verified PDF
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {currentDocConfig.description}
                      </p>
                    )}
                  </div>

                  {/* Actions for Document */}
                  {currentActiveDoc?.file_url && (
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={currentActiveDoc.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-[#0052d1] dark:text-sky-400 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        title="Buksan sa bagong tab para sa buong laki"
                      >
                        <ExternalLink size={13} />
                        <span>Open in New Tab</span>
                      </a>

                      <a
                        href={currentActiveDoc.file_url}
                        download={currentActiveDoc.file_name || 'document.pdf'}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-[#0052d1] hover:bg-[#003f87] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                        title="I-download ang orihinal na PDF"
                      >
                        <Download size={13} />
                        <span>Download PDF</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* PDF Viewer Frame */}
                {loadingDocs ? (
                  <div className="flex-1 min-h-[360px] flex flex-col items-center justify-center text-xs font-bold text-slate-400 gap-2 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="w-8 h-8 border-2 border-[#0052d1] border-t-transparent rounded-full animate-spin" />
                    <span>Kinukuha ang dokumento mula sa secure storage...</span>
                  </div>
                ) : currentActiveDoc?.file_url ? (
                  <div className="flex-1 min-h-[460px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900/5 dark:bg-slate-950 flex flex-col relative shadow-inner">
                    <iframe
                      src={`${currentActiveDoc.file_url}#view=FitH&toolbar=1`}
                      title={`PDF Preview - ${currentDocConfig.title}`}
                      className="w-full flex-1 min-h-[460px] border-0 bg-white"
                    />
                  </div>
                ) : (
                  <div className="flex-1 min-h-[300px] rounded-2xl border-2 border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col items-center justify-center gap-2 text-center p-6">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 flex items-center justify-center shadow-xs">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-black text-amber-900 dark:text-amber-200">
                      Walang Naka-attach na PDF sa Hakbang na Ito
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-400 max-w-md">
                      Hindi pa nai-upload ng driver ang <strong>{currentDocConfig.title}</strong>. Maaaring i-reject ang aplikasyon at hingin ang kopya ng PDF.
                    </p>
                  </div>
                )}

                {/* Rejection Feedback Box */}
                {isRejecting && (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 space-y-3 shrink-0 animate-in fade-in">
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
                )}
              </div>

              {/* Modal Bottom Footer */}
              <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 flex items-center justify-between flex-wrap gap-2.5 shrink-0">
                
                {/* Left: Close & Stepper Step Controls */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsDocModalOpen(false)} 
                    className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer hover:bg-slate-100 shadow-xs"
                  >
                    Close
                  </button>

                  <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-2">
                    <button
                      onClick={() => {
                        if (hasPrevDoc) setActiveDocType(REQUIRED_DRIVER_DOCUMENTS[currentDocIndex - 1].type);
                      }}
                      disabled={!hasPrevDoc}
                      className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Tingnan ang nakaraang dokumento"
                    >
                      <ChevronLeft size={14} />
                      <span className="hidden sm:inline">Previous Doc</span>
                    </button>

                    <button
                      onClick={() => {
                        if (hasNextDoc) setActiveDocType(REQUIRED_DRIVER_DOCUMENTS[currentDocIndex + 1].type);
                      }}
                      disabled={!hasNextDoc}
                      className="px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Tingnan ang susunod na dokumento"
                    >
                      <span className="hidden sm:inline">Next Doc</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Right: Approval & Rejection Actions */}
                {!isRejecting && (
                  <div className="flex items-center gap-2 ml-auto">
                    {selectedDriver.verification_status === 'approved' ? (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-black">
                        <CheckCircle size={14} /> Naaprubahan na (Approved)
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => setIsRejecting(true)}
                          disabled={isProcessingAction}
                          className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs cursor-pointer flex items-center gap-1.5 transition-colors active:scale-95 disabled:opacity-50"
                        >
                          <XCircle size={14} />
                          <span>Reject Application</span>
                        </button>

                        <button
                          onClick={() => handleApprove(selectedDriver.profile_id || selectedDriver.id || '')}
                          disabled={isProcessingAction}
                          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs cursor-pointer flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                          {isProcessingAction ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <CheckCircle size={14} />
                          )}
                          <span>{isProcessingAction ? 'Inaaprubahan...' : 'Approve Documents & Account'}</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}
    </div>
  );
};
