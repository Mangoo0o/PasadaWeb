import React, { useState } from 'react';
import { UploadCloud, CheckCircle, FileAudio, FileText, AlertCircle, Volume2 } from 'lucide-react';
import { supabase } from '../../../api/supabaseClient';
import { formatAudioSource, uploadAudioFile } from '../../../utils/audioUtils';

interface FileUploaderProps {
  bucketName: string;
  accept: string;
  onUploadComplete: (url: string) => void;
  label?: string;
  currentUrl?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ 
  bucketName, accept, onUploadComplete, label = 'Upload File', currentUrl 
}) => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(
    currentUrl ? currentUrl.split('/').pop()?.slice(0, 30) || 'Existing File' : null
  );
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploading(true);
    setUploadError(null);
    setFileName(file.name);

    try {
      if (accept.includes('audio')) {
        // Use intelligent audio uploader with storage & DataURL fallback
        const res = await uploadAudioFile(file, bucketName);
        onUploadComplete(res.url);
      } else {
        const fileExt = file.name.split('.').pop();
        const filePath = `${Date.now()}.${fileExt}`;
        const { error: uploadErr } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, { upsert: true });

        if (uploadErr) {
          // If storage bucket missing, fallback to data url for preview
          const reader = new FileReader();
          reader.onload = () => {
            onUploadComplete(reader.result as string);
          };
          reader.readAsDataURL(file);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);
          onUploadComplete(publicUrl);
        }
      }
    } catch (err: any) {
      console.error('File upload error:', err);
      // Last-ditch DataURL fallback so user never loses file
      try {
        const reader = new FileReader();
        reader.onload = () => {
          onUploadComplete(reader.result as string);
        };
        reader.readAsDataURL(file);
      } catch (fallbackErr) {
        setUploadError(err.message || 'Failed to upload file.');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
        style={{
          border: `2px dashed ${dragActive ? 'var(--accent-primary)' : 'var(--border-color)'}`,
          background: dragActive ? 'var(--accent-glow)' : 'var(--bg-surface)',
          borderRadius: 12,
          padding: 16,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        <input
          type="file"
          accept={accept}
          id={`file-input-${bucketName}`}
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        
        <label htmlFor={`file-input-${bucketName}`} style={{ cursor: 'pointer', width: '100%', display: 'block' }}>
          {uploading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <UploadCloud size={28} className="animate-pulse" color="var(--accent-primary)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Processing & Uploading file...</span>
            </div>
          ) : fileName || currentUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              {accept.includes('audio') ? <FileAudio size={24} color="var(--info)" /> : <FileText size={24} color="var(--success)" />}
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {fileName || 'Audio Attached'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={12} /> Ready to Play & Save
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <UploadCloud size={28} color="var(--text-muted)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                Drag & Drop or Click to Upload
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Supports {accept}
              </span>
            </div>
          )}
        </label>
      </div>

      {/* Audio Playback Preview */}
      {currentUrl && accept.includes('audio') && (
        <div style={{ marginTop: 8, padding: 8, background: 'rgba(0, 82, 209, 0.05)', borderRadius: 8, border: '1px solid rgba(0, 82, 209, 0.15)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0052d1', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <Volume2 size={12} /> Preview Spoken Audio:
          </div>
          <audio controls src={formatAudioSource(currentUrl)} style={{ width: '100%', height: 32 }} preload="auto" />
        </div>
      )}

      {uploadError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 8,
          fontSize: '0.75rem',
          color: '#ef4444',
          background: 'rgba(239, 68, 68, 0.08)',
          padding: '6px 10px',
          borderRadius: 8
        }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{uploadError}</span>
        </div>
      )}
    </div>
  );
};
