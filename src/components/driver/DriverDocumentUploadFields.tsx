import React, { useState } from 'react';
import { 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  X, 
  AlertCircle,
  FileCheck,
  ShieldCheck,
  Car,
  FileBadge
} from 'lucide-react';
import { 
  DriverDocumentType, 
  REQUIRED_DRIVER_DOCUMENTS, 
  validatePdfFile 
} from '../../services/driverDocumentService';

interface DriverDocumentUploadFieldsProps {
  documents: Partial<Record<DriverDocumentType, File>>;
  onDocumentChange: (type: DriverDocumentType, file: File | null) => void;
  disabled?: boolean;
}

export const DriverDocumentUploadFields: React.FC<DriverDocumentUploadFieldsProps> = ({
  documents,
  onDocumentChange,
  disabled = false,
}) => {
  const [errorMessages, setErrorMessages] = useState<Partial<Record<DriverDocumentType, string>>>({});
  const [dragOverType, setDragOverType] = useState<DriverDocumentType | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = (type: DriverDocumentType, file: File | null) => {
    if (!file) {
      onDocumentChange(type, null);
      setErrorMessages(prev => ({ ...prev, [type]: undefined }));
      return;
    }

    const validation = validatePdfFile(file);
    if (!validation.valid) {
      setErrorMessages(prev => ({ ...prev, [type]: validation.error }));
      return;
    }

    setErrorMessages(prev => ({ ...prev, [type]: undefined }));
    onDocumentChange(type, file);
  };

  const attachedCount = Object.keys(documents).filter(k => !!documents[k as DriverDocumentType]).length;
  const totalRequired = REQUIRED_DRIVER_DOCUMENTS.length;
  const isAllUploaded = attachedCount === totalRequired;

  const getDocIcon = (type: DriverDocumentType) => {
    switch (type) {
      case 'license':
        return <FileBadge className="w-4 h-4 text-[#003f87] dark:text-[#00C1FD]" />;
      case 'or_cr':
        return <Car className="w-4 h-4 text-[#003f87] dark:text-[#00C1FD]" />;
      case 'mtop':
        return <ShieldCheck className="w-4 h-4 text-[#003f87] dark:text-[#00C1FD]" />;
      case 'barangay_clearance':
      case 'police_clearance':
      default:
        return <FileCheck className="w-4 h-4 text-[#003f87] dark:text-[#00C1FD]" />;
    }
  };

  return (
    <div className="space-y-3.5 pt-2">
      {/* Progress Header */}
      <div className="p-3.5 rounded-xl bg-sky-50/80 dark:bg-slate-800/90 border border-sky-200/70 dark:border-slate-700">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div>
            <h3 className="text-xs font-black text-[#003f87] dark:text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Franchise Compliance Documents (PDF)</span>
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Kinakailangang i-upload ang 5 opisyal na dokumento bago maaprubahan.
            </p>
          </div>
          <span className={`text-[11px] font-black px-2.5 py-1 rounded-full shrink-0 ${
            isAllUploaded 
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
          }`}>
            {attachedCount}/{totalRequired} PDF Attached
          </span>
        </div>

        {/* Mini progress bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-[#0052d1] h-full transition-all duration-300 rounded-full"
            style={{ width: `${(attachedCount / totalRequired) * 100}%` }}
          />
        </div>
      </div>

      {/* Upload slots */}
      <div className="space-y-2.5">
        {REQUIRED_DRIVER_DOCUMENTS.map((docConfig) => {
          const file = documents[docConfig.type];
          const error = errorMessages[docConfig.type];
          const isDragging = dragOverType === docConfig.type;
          const inputId = `doc-input-${docConfig.type}`;

          return (
            <div 
              key={docConfig.type}
              className={`p-3 rounded-xl border transition-all ${
                file
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                  : error
                  ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/60'
                  : isDragging
                  ? 'bg-sky-50 dark:bg-sky-950/30 border-[#0052d1]'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverType(docConfig.type);
              }}
              onDragLeave={() => setDragOverType(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverType(null);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleFileSelect(docConfig.type, e.dataTransfer.files[0]);
                }
              }}
            >
              {/* Slot Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-start gap-2">
                  <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-slate-800 mt-0.5 shrink-0">
                    {getDocIcon(docConfig.type)}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block leading-tight">
                      {docConfig.title}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">
                      {docConfig.tagalogTitle}
                    </span>
                  </div>
                </div>

                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                  PDF Required
                </span>
              </div>

              {/* Upload Dropzone / Attached View */}
              {file ? (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-800/90 border border-emerald-200 dark:border-emerald-800/80">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {file.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatFileSize(file.size)} • PDF Ready
                      </div>
                    </div>
                  </div>

                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => handleFileSelect(docConfig.type, null)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                      title="Tanggalin at magpalit ng file"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    id={inputId}
                    accept="application/pdf,.pdf"
                    disabled={disabled}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileSelect(docConfig.type, e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor={inputId}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 border-dashed text-xs font-bold transition-all cursor-pointer ${
                      disabled ? 'opacity-60 cursor-not-allowed' : ''
                    } ${
                      error
                        ? 'border-rose-300 text-rose-600 bg-rose-50/50 dark:bg-rose-950/30'
                        : 'border-slate-200 dark:border-slate-700 text-[#003f87] dark:text-[#00C1FD] hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-[#003f87]'
                    }`}
                  >
                    <UploadCloud className="w-4 h-4 shrink-0 text-[#0052d1] dark:text-[#00C1FD]" />
                    <span>Pumili ng PDF file o i-drag dito</span>
                  </label>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mt-1.5 text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
