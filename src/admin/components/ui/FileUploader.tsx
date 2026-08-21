import React, { useState } from 'react';
import { UploadCloud, CheckCircle, FileAudio, FileText } from 'lucide-react';
import { supabase } from '../../../api/supabaseClient';

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
  const [fileName, setFileName] = useState<string | null>(currentUrl ? currentUrl.split('/').pop() || 'Existing File' : null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setUploading(true);
    setFileName(file.name);

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      onUploadComplete(publicUrl);
    } catch (err) {
      console.error('File upload error:', err);
      alert('Failed to upload file. Check storage bucket permissions.');
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
          padding: 20,
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
              <UploadCloud size={28} className="animate-bounce" color="var(--accent-primary)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Uploading to Supabase Storage ({bucketName})...</span>
            </div>
          ) : fileName ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              {accept.includes('audio') ? <FileAudio size={24} color="var(--info)" /> : <FileText size={24} color="var(--success)" />}
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>{fileName}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle size={12} /> File Ready / Uploaded
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
                Supports {accept} (Supabase Storage Bucket: {bucketName})
              </span>
            </div>
          )}
        </label>
      </div>
    </div>
  );
};
