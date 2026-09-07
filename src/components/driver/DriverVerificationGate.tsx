import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Clock, 
  FileText, 
  ExternalLink, 
  RefreshCw, 
  LogOut, 
  AlertTriangle, 
  CheckCircle2, 
  UploadCloud, 
  Bike,
  Info
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { 
  DriverDocument, 
  DriverDocumentType, 
  REQUIRED_DRIVER_DOCUMENTS, 
  fetchDriverDocuments, 
  uploadDriverDocument,
  hasDriverSubmittedAllDocuments
} from '../../services/driverDocumentService';
import { DriverDocumentStepper } from './DriverDocumentStepper';

export const DriverVerificationGate: React.FC = () => {
  const { user, driverProfile, signOut } = useAuth();
  const [documents, setDocuments] = useState<DriverDocument[]>(() => {
    if (user?.id) {
      try {
        const raw = localStorage.getItem('pasada_driver_documents');
        if (raw) {
          const parsed = JSON.parse(raw);
          return parsed[user.id] || [];
        }
      } catch {}
    }
    return [];
  });
  const [loadingDocs, setLoadingDocs] = useState(() => documents.length === 0);
  const [reuploadingType, setReuploadingType] = useState<DriverDocumentType | null>(null);
  const [reuploadSuccess, setReuploadSuccess] = useState<string | null>(null);
  const [reuploadError, setReuploadError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const status = driverProfile?.verification_status || 'pending';
  const isRejected = status === 'rejected';
  const isSuspended = status === 'suspended';

  const loadDocuments = async () => {
    if (user?.id) {
      const docs = await fetchDriverDocuments(user.id);
      setDocuments(docs);
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [user?.id]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDocuments();
    // Reload page or force auth sync
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  const handleReupload = async (type: DriverDocumentType, file: File) => {
    if (!user?.id) return;
    setReuploadingType(type);
    setReuploadError(null);
    setReuploadSuccess(null);

    const res = await uploadDriverDocument(user.id, type, file);
    if (res.error) {
      setReuploadError(res.error);
    } else {
      setReuploadSuccess(`Matagumpay na na-upload ang bagong PDF para sa ${type.toUpperCase()}.`);
      await loadDocuments();
    }
    setReuploadingType(null);
  };

  // Critical requirement: The modal stepper MUST NEVER be removed or bypassed until all 5 documents are submitted
  const isSubmitted = hasDriverSubmittedAllDocuments(documents);

  // Loading indicator on initial fetch if no cached docs yet
  if (loadingDocs && !isRejected && documents.length === 0) {
    return (
      <div className="w-full max-w-md mx-auto py-16 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-[#0052d1] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-500">
          Kinakarga ang compliance status...
        </p>
      </div>
    );
  }

  // Persistent Onboarding Stepper: Driver cannot leave until all 5 documents are submitted
  if (!isSubmitted && !isRejected && !isSuspended) {
    return (
      <DriverDocumentStepper
        existingDocs={documents}
        onStepUploaded={loadDocuments}
        onComplete={() => {
          loadDocuments();
        }}
      />
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto font-sans pb-16 sm:pb-20">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden flex flex-col">
        
        {/* 1. Integrated Header Section */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
          
          {/* Top Metadata Row: Vehicle Tag, Refresh, Sign Out */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-50 dark:bg-slate-800 border border-sky-100 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
              <div className="w-5 h-5 rounded-full bg-[#0052d1] text-white flex items-center justify-center shrink-0">
                <Bike className="w-3 h-3 text-[#fcd400]" />
              </div>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                {user?.full_name || 'Driver'}
              </span>
              <span className="text-slate-400 font-normal">•</span>
              <span className="font-mono text-[11px]">
                {driverProfile?.plate_number || 'Tricycle'} (#{driverProfile?.body_number || '0142'})
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold shadow-2xs active:scale-95"
                title="I-refresh ang compliance status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0052d1]' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={signOut}
                className="p-1.5 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold active:scale-95"
                title="Mag-sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Status Hero Card */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isRejected
              ? 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60'
              : isSuspended
              ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700'
              : 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-900/50'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs mt-0.5 ${
                isRejected
                  ? 'bg-rose-600 text-white'
                  : isSuspended
                  ? 'bg-slate-700 text-white'
                  : 'bg-amber-500 text-white'
              }`}>
                {isRejected ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : isSuspended ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : (
                  <Clock className="w-5 h-5 animate-pulse" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isRejected
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                      : isSuspended
                      ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                  }`}>
                    {isRejected ? 'Kailangan ng Pagwawasto' : isSuspended ? 'Suspended' : 'Nasa Pagsusuri Pa'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    Bauang
                  </span>
                </div>

                <h1 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-1 leading-snug">
                  {isRejected 
                    ? 'Kailangan ng Pagwawasto ang Dokumento' 
                    : isSuspended
                    ? 'Kasalukuyang Nakasuspinde ang Account'
                    : 'Sinusuri ang Iyong Documents'}
                </h1>

                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed font-medium">
                  {isRejected
                    ? 'Suriin ang puna ng Admin sa ibaba. Palitan ang tinukoy na PDF document bago muling suriin.'
                    : isSuspended
                    ? 'Makipag-ugnayan sa Admin para sa re-activation ng iyong account.'
                    : 'Kasalukuyang sinusuri ng Admin ang iyong LTO License, OR/CR, MTOP, Barangay at Police Clearance. Awtomatikong mabubuksan ang online dispatch kapag naaprubahan.'}
                </p>
              </div>
            </div>

            {/* Rejection Details */}
            {isRejected && driverProfile?.rejection_reason && (
              <div className="mt-3 p-3 rounded-xl bg-white/90 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs space-y-1">
                <div className="font-black flex items-center gap-1.5 text-xs text-rose-700 dark:text-rose-300">
                  <Info className="w-3.5 h-3.5 text-rose-600" />
                  <span>Puna mula sa LGU Admin:</span>
                </div>
                <p className="font-medium whitespace-pre-wrap pl-5 text-[11px] leading-relaxed">
                  "{driverProfile.rejection_reason}"
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 2. Uploaded Documents List */}
        <div className="p-4 sm:p-5 space-y-3 flex-1">
          {/* Header Row: Title & Count Badge */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#0052d1]" />
                <span>Naisumiteng mga Dokumento (PDF)</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                5 opisyal na dokumento para sa verification
              </p>
            </div>
            
            <span className="text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full bg-sky-50 dark:bg-slate-800 text-[#0052d1] dark:text-sky-300 border border-sky-100 dark:border-slate-700 shrink-0 whitespace-nowrap">
              {documents.length}/5 Kumpleto ✓
            </span>
          </div>

          {/* Reupload alerts */}
          {reuploadSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="text-[11px]">{reuploadSuccess}</span>
            </div>
          )}
          {reuploadError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="text-[11px]">{reuploadError}</span>
            </div>
          )}

          {/* Documents Items */}
          {loadingDocs ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Kinukuha ang listahan ng mga dokumento...
            </div>
          ) : (
            <div className="space-y-2">
              {REQUIRED_DRIVER_DOCUMENTS.map((reqDoc) => {
                const doc = documents.find(d => d.document_type === reqDoc.type);
                const isUploadingThis = reuploadingType === reqDoc.type;

                return (
                  <div
                    key={reqDoc.type}
                    className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col gap-2.5 transition-all hover:border-slate-300"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 text-[#0052d1] dark:text-sky-400 shadow-2xs flex items-center justify-center mt-0.5 shrink-0 border border-slate-100 dark:border-slate-700">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {reqDoc.title}
                          </span>
                          <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                            PDF
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {reqDoc.tagalogTitle}
                        </div>

                        {doc ? (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-1 truncate">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{doc.file_name}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 mt-1">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>Kulang pa / Hindi pa na-upload</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions: Balanced 2-Column Button Bar */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      {doc?.file_url && (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-[#0052d1] text-[#0052d1] dark:text-sky-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs hover:bg-sky-50/50 active:scale-95 text-center"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Tingnan PDF</span>
                        </a>
                      )}

                      <label className={`w-full py-2 px-3 rounded-xl bg-[#0052d1] hover:bg-[#003f87] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95 text-center ${
                        !doc?.file_url ? 'col-span-2' : ''
                      } ${isUploadingThis ? 'opacity-50 pointer-events-none' : ''}`}>
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>{isUploadingThis ? 'Nag-a-upload...' : 'Palitan PDF'}</span>
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              handleReupload(reqDoc.type, e.target.files[0]);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
