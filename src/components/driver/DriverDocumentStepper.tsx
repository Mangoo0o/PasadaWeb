import React, { useState } from 'react';
import { 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  X, 
  AlertCircle, 
  ChevronRight, 
  ChevronLeft, 
  ShieldCheck, 
  FileBadge, 
  Car, 
  FileCheck, 
  LogOut, 
  Bike,
  Sparkles,
  Loader2,
  Info
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { 
  DriverDocumentType, 
  REQUIRED_DRIVER_DOCUMENTS, 
  validatePdfFile,
  uploadDriverDocument,
  submitDriverFranchiseApplication,
  DriverDocument
} from '../../services/driverDocumentService';

interface DriverDocumentStepperProps {
  existingDocs?: DriverDocument[];
  onComplete: () => void;
  onStepUploaded?: () => void;
}

export const DriverDocumentStepper: React.FC<DriverDocumentStepperProps> = ({ 
  existingDocs = [], 
  onComplete,
  onStepUploaded
}) => {
  const { user, driverProfile, signOut } = useAuth();
  
  // Find first uncompleted step based on existingDocs
  const getInitialStep = () => {
    for (let i = 0; i < REQUIRED_DRIVER_DOCUMENTS.length; i++) {
      const type = REQUIRED_DRIVER_DOCUMENTS[i].type;
      const alreadyExists = existingDocs.some(d => d.document_type === type);
      if (!alreadyExists) return i;
    }
    return REQUIRED_DRIVER_DOCUMENTS.length; // Review step if all 5 are uploaded
  };

  // Active step: 0 to 5 (0 = License, 1 = OR/CR, 2 = MTOP, 3 = Brgy, 4 = Police, 5 = Review & Submit)
  const [activeStep, setActiveStep] = useState<number>(getInitialStep);
  
  // Attached files state (staged for upload or currently selected)
  const [attachedFiles, setAttachedFiles] = useState<Partial<Record<DriverDocumentType, File>>>({});

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingStep, setIsUploadingStep] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [agreementChecked, setAgreementChecked] = useState(true);

  const totalRequirementSteps = REQUIRED_DRIVER_DOCUMENTS.length; // 5
  const isReviewStep = activeStep === totalRequirementSteps; // 5
  const currentReqConfig = !isReviewStep ? REQUIRED_DRIVER_DOCUMENTS[activeStep] : null;

  const getExistingDoc = (type: DriverDocumentType) => {
    return existingDocs.find(d => d.document_type === type);
  };

  const hasDocument = (type: DriverDocumentType) => {
    return !!attachedFiles[type] || !!getExistingDoc(type);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = (file: File | null) => {
    if (!currentReqConfig) return;
    setErrorMsg(null);

    if (!file) {
      setAttachedFiles(prev => {
        const copy = { ...prev };
        delete copy[currentReqConfig.type];
        return copy;
      });
      return;
    }

    const validation = validatePdfFile(file);
    if (!validation.valid) {
      setErrorMsg(validation.error || 'Hindi wastong file.');
      return;
    }

    setAttachedFiles(prev => ({ ...prev, [currentReqConfig.type]: file }));
  };

  const handleNext = async () => {
    if (!isReviewStep && currentReqConfig) {
      const newFile = attachedFiles[currentReqConfig.type];
      const existing = getExistingDoc(currentReqConfig.type);

      if (!newFile && !existing) {
        setErrorMsg('Paki-attach ang kinakailangang PDF file bago magpatuloy sa susunod na hakbang.');
        return;
      }

      // If a new file is attached, upload it immediately to secure it against browser refresh
      if (newFile && user?.id) {
        setIsUploadingStep(true);
        setErrorMsg(null);
        const res = await uploadDriverDocument(user.id, currentReqConfig.type, newFile);
        setIsUploadingStep(false);

        if (res.error) {
          setErrorMsg(res.error);
          return;
        }

        // Clean up from staged local state since it's now officially uploaded
        setAttachedFiles(prev => {
          const copy = { ...prev };
          delete copy[currentReqConfig.type];
          return copy;
        });

        if (onStepUploaded) {
          onStepUploaded();
        }
      }

      setErrorMsg(null);
      setActiveStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setErrorMsg(null);
      setActiveStep(prev => prev - 1);
    }
  };

  const handleSubmitAll = async () => {
    if (!user?.id) return;
    if (!agreementChecked) {
      setErrorMsg('Paki-tsek ang pahayag ng pagsunod bago isumite.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await submitDriverFranchiseApplication(user.id, attachedFiles);
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMsg(res.error || 'May naganap na error sa pagsumite. Pakisubukang muli.');
    } else {
      onComplete();
    }
  };

  const getStepIcon = (type: DriverDocumentType) => {
    switch (type) {
      case 'license':
        return <FileBadge className="w-5 h-5 text-[#0052d1] dark:text-sky-400" />;
      case 'or_cr':
        return <Car className="w-5 h-5 text-[#0052d1] dark:text-sky-400" />;
      case 'mtop':
        return <ShieldCheck className="w-5 h-5 text-[#0052d1] dark:text-sky-400" />;
      case 'barangay_clearance':
      case 'police_clearance':
      default:
        return <FileCheck className="w-5 h-5 text-[#0052d1] dark:text-sky-400" />;
    }
  };

  const countAttached = REQUIRED_DRIVER_DOCUMENTS.filter(r => hasDocument(r.type)).length;

  return (
    <div className="w-full max-w-lg mx-auto font-sans pb-16 sm:pb-20">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden flex flex-col">
        
        {/* 1. Header Section */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
          {/* Top metadata row: Driver Plate Pill, Status Badge, Sign Out */}
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
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                Action Required
              </span>
              <button
                type="button"
                onClick={signOut}
                className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                title="Sign Out to continue later"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>

          {/* Title and description */}
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
              Compliance Documents
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Kinakailangang i-upload ang 5 opisyal na PDF bago maaprubahan ang account.
            </p>
          </div>

          {/* Stepper Progress Bar & Pills */}
          <div className="pt-1 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
              <span className="text-[11px] font-extrabold text-[#0052d1] dark:text-sky-400">
                Hakbang {activeStep + 1} ng 6: <span className="text-slate-800 dark:text-slate-200">{isReviewStep ? 'Pagsusuri' : currentReqConfig?.title}</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-100/70 dark:bg-slate-800 text-[#0052d1] dark:text-sky-300">
                {countAttached}/5 PDF Attached
              </span>
            </div>

            {/* Stepper Dots / Pills */}
            <div className="grid grid-cols-6 gap-1 sm:gap-1.5">
              {REQUIRED_DRIVER_DOCUMENTS.map((req, idx) => {
                const isCompleted = hasDocument(req.type);
                const isCurrent = activeStep === idx;

                return (
                  <button
                    key={req.type}
                    type="button"
                    onClick={() => setActiveStep(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-[#0052d1] ring-2 ring-[#0052d1]/30'
                        : isCompleted
                        ? 'bg-emerald-500'
                        : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'
                    }`}
                    title={`Step ${idx + 1}: ${req.title} ${isCompleted ? '(Kumpleto)' : ''}`}
                  />
                );
              })}
              {/* Step 6: Review & Submit Pill */}
              <button
                type="button"
                onClick={() => setActiveStep(5)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  activeStep === 5
                    ? 'bg-[#0052d1] ring-2 ring-[#0052d1]/30'
                    : countAttached === 5
                    ? 'bg-emerald-400'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
                title="Step 6: Review & Submit"
              />
            </div>
          </div>
        </div>

        {/* 2. Main Step Content Body */}
        <div className="p-4 sm:p-5 space-y-4 flex-1">
          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1 to 5: Individual Document Upload */}
          {!isReviewStep && currentReqConfig && (
            <div className="space-y-3.5 animate-in fade-in duration-200">
              {/* Header info for this step */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-slate-800 text-[#0052d1] dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-100 dark:border-slate-700 shadow-xs">
                  {getStepIcon(currentReqConfig.type)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-100 dark:bg-slate-800 text-[#0052d1] dark:text-sky-300">
                      Step {activeStep + 1} of 5
                    </span>
                    <span className="text-[9px] font-mono uppercase text-slate-400">
                      PDF Only
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {currentReqConfig.title}
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {currentReqConfig.tagalogTitle} — {currentReqConfig.description}
                  </p>
                </div>
              </div>

              {/* Compact Compliance guidance card */}
              <div className="p-3 rounded-xl bg-sky-50/70 dark:bg-slate-800/60 border border-sky-100 dark:border-slate-700 flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <Info className="w-4 h-4 text-[#0052d1] shrink-0" />
                <span className="text-[11px] leading-snug">
                  Tiyaking malinaw at buo ang lahat ng pahina ng iyong <strong>{currentReqConfig.title}</strong> (.pdf).
                </span>
              </div>

              {/* Staged file card OR already uploaded file card OR dropzone */}
              {attachedFiles[currentReqConfig.type] ? (
                <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {attachedFiles[currentReqConfig.type]?.name}
                      </div>
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                        {formatFileSize(attachedFiles[currentReqConfig.type]?.size || 0)} • Bagong PDF Naka-attach ✓
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleFileSelect(null)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                  >
                    <X size={13} />
                    <span>Alisin</span>
                  </button>
                </div>
              ) : getExistingDoc(currentReqConfig.type) ? (
                <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border-2 border-emerald-400 dark:border-emerald-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {getExistingDoc(currentReqConfig.type)?.file_name}
                      </div>
                      <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                        <span>Naka-save at Na-upload na sa Database ✓</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {getExistingDoc(currentReqConfig.type)?.file_url && (
                      <a
                        href={getExistingDoc(currentReqConfig.type)!.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#0052d1] dark:text-sky-400 text-xs font-bold transition-colors shadow-xs"
                      >
                        Tingnan PDF
                      </a>
                    )}

                    <label className="px-2.5 py-1 rounded-lg bg-[#0052d1] hover:bg-[#003f87] text-white text-xs font-bold transition-all shadow-xs cursor-pointer">
                      <span>Palitan PDF</span>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleFileSelect(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleFileSelect(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-5 sm:p-6 text-center transition-all cursor-pointer ${
                    isDragOver
                      ? 'border-[#0052d1] bg-sky-50 dark:bg-sky-950/40'
                      : 'border-slate-300 dark:border-slate-700 hover:border-[#0052d1] hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <input
                    type="file"
                    id={`file-step-${currentReqConfig.type}`}
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />
                  <label htmlFor={`file-step-${currentReqConfig.type}`} className="cursor-pointer space-y-2 block">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-slate-800 text-[#0052d1] dark:text-sky-400 flex items-center justify-center mx-auto">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-200">
                        Pindutin o i-drag ang iyong PDF dito
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Tanging <strong>.pdf</strong> format lamang ang tinatanggap (Hanggang 10MB)
                      </div>
                    </div>
                    <span className="inline-block px-3.5 py-1.5 rounded-lg bg-[#0052d1] text-white text-xs font-bold shadow-xs hover:bg-[#0044b3] transition-colors">
                      Pumili ng PDF Document
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}

          {/* STEP 6: Final Review & Submit to MTFRB */}
          {isReviewStep && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  Step 6 of 6 • Huling Hakbang
                </span>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
                  Pagsusuri ng mga Dokumento Bago Isumite
                </h2>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Mangyaring suriin kung kumpleto ang 5 kinakailangang PDF bago isumite sa Admin.
                </p>
              </div>

              {/* 5-Item Checklist Overview */}
              <div className="space-y-1.5">
                {REQUIRED_DRIVER_DOCUMENTS.map((req, idx) => {
                  const file = attachedFiles[req.type];
                  const existing = getExistingDoc(req.type);
                  const isAttached = !!file || !!existing;

                  return (
                    <div 
                      key={req.type}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 ${
                        isAttached
                          ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                          : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isAttached ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {isAttached ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {idx + 1}. {req.title}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {file 
                              ? `${file.name} (${formatFileSize(file.size)}) • Naka-attach` 
                              : existing 
                              ? `${existing.file_name} • Na-upload na ✓` 
                              : 'Kulang pa / Hindi pa na-upload'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setActiveStep(idx)}
                        className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#0052d1] dark:text-sky-400 font-bold text-[10px] hover:bg-slate-50 cursor-pointer shrink-0"
                      >
                        {isAttached ? 'Palitan' : 'I-upload'}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Compliance Agreement Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-sky-50/50 dark:bg-slate-800/40 border border-sky-100 dark:border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreementChecked}
                  onChange={(e) => setAgreementChecked(e.target.checked)}
                  className="mt-0.5 rounded text-[#0052d1] focus:ring-[#0052d1]"
                />
                <span className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  Pinatutunayan ko na ang lahat ng na-upload na PDF documents ay totoo, opisyal, at alinsunod sa mga patakaran ng LTO at lokal na pamahalaan.
                </span>
              </label>
            </div>
          )}
        </div>

        {/* 3. Stepper Navigation Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={activeStep === 0 || isSubmitting || isUploadingStep}
            className={`px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors ${
              activeStep === 0 || isSubmitting || isUploadingStep ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
            }`}
          >
            <ChevronLeft size={15} />
            <span>Bumalik</span>
          </button>

          {!isReviewStep ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={isUploadingStep}
              className="px-5 py-2.5 rounded-xl bg-[#0052d1] hover:bg-[#0044b3] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-[#0052d1]/20 cursor-pointer active:scale-95 disabled:opacity-70"
            >
              {isUploadingStep ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Sine-save ang PDF...</span>
                </>
              ) : (
                <>
                  <span>Susunod na Hakbang</span>
                  <ChevronRight size={15} />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmitAll}
              disabled={isSubmitting || countAttached < 5}
              className={`px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 active:scale-95 ${
                isSubmitting || countAttached < 5 ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Isinusumite sa Admin...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={15} />
                  <span>Isumite sa Admin</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
