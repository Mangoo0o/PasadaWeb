import { supabase } from '../api/supabaseClient';
import { DriverDocument, DriverDocumentType, VerificationStatus } from '../types/database.types';

export type { DriverDocument, DriverDocumentType, VerificationStatus };

export interface DocumentTypeConfig {
  type: DriverDocumentType;
  title: string;
  tagalogTitle: string;
  description: string;
  required: boolean;
}

export const REQUIRED_DRIVER_DOCUMENTS: DocumentTypeConfig[] = [
  {
    type: 'license',
    title: "LTO Driver's License",
    tagalogTitle: 'Lisensya sa Pagmamaneho',
    description: 'Valid Professional Driver’s License issued by LTO.',
    required: true,
  },
  {
    type: 'or_cr',
    title: 'Vehicle OR / CR',
    tagalogTitle: 'Official Receipt & Certificate of Registration',
    description: 'Valid LTO Official Receipt and Certificate of Registration for the tricycle.',
    required: true,
  },
  {
    type: 'mtop',
    title: 'MTOP Permit',
    tagalogTitle: 'Tricycle Operator Permit (MTOP)',
    description: 'Motorized Tricycle Operator’s Permit issued by LGU.',
    required: true,
  },
  {
    type: 'barangay_clearance',
    title: 'Barangay Clearance',
    tagalogTitle: 'Barangay Clearance',
    description: 'Clearance from your registered Barangay of residence/operation.',
    required: true,
  },
  {
    type: 'police_clearance',
    title: 'Police Clearance',
    tagalogTitle: 'Police Clearance',
    description: 'Valid PNP Police Clearance certifying good standing.',
    required: true,
  },
];

const LOCAL_STORAGE_DOCS_KEY = 'pasada_driver_documents';

/**
 * Helper to get local docs cache
 */
function getLocalDocs(): Record<string, DriverDocument[]> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DOCS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Helper to persist local docs cache
 */
function saveLocalDocs(driverId: string, docs: DriverDocument[]) {
  try {
    const all = getLocalDocs();
    all[driverId] = docs;
    localStorage.setItem(LOCAL_STORAGE_DOCS_KEY, JSON.stringify(all));
  } catch (err) {
    console.warn('Error saving local driver documents cache:', err);
  }
}

/**
 * Validates that the provided file is strictly a PDF.
 */
export function validatePdfFile(file: File): { valid: boolean; error?: string } {
  const isPdfType = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdfType) {
    return {
      valid: false,
      error: 'Tanging PDF file lamang ang tinatanggap para sa dokumentong ito (.pdf).',
    };
  }

  // 10MB file limit
  const maxSizeBytes = 10 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: 'Masyadong malaki ang file. Hindi dapat lumagpas sa 10MB.',
    };
  }

  return { valid: true };
}

/**
 * Uploads a single document PDF to Supabase Storage and records it in driver_documents.
 */
export async function uploadDriverDocument(
  driverId: string,
  docType: DriverDocumentType,
  file: File
): Promise<{ doc?: DriverDocument; error?: string }> {
  const validation = validatePdfFile(file);
  if (!validation.valid) {
    return { error: validation.error };
  }

  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${driverId}/${docType}_${timestamp}_${sanitizedName}`;

  let publicUrl = '';

  try {
    // 1. Upload to Supabase Storage bucket 'driver-documents'
    const { error: uploadError } = await supabase.storage
      .from('driver-documents')
      .upload(filePath, file, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.warn('Supabase storage upload note, using object URL fallback:', uploadError.message);
      // Fallback for local demo if bucket permissions aren't initialized yet
      publicUrl = URL.createObjectURL(file);
    } else {
      const { data: urlData } = supabase.storage
        .from('driver-documents')
        .getPublicUrl(filePath);
      publicUrl = urlData.publicUrl;
    }
  } catch (err) {
    console.warn('Storage upload network note, falling back to local URL:', err);
    publicUrl = URL.createObjectURL(file);
  }

  const newDoc: DriverDocument = {
    id: `doc-${timestamp}-${Math.random().toString(36).substring(2, 7)}`,
    driver_id: driverId,
    document_type: docType,
    file_url: publicUrl,
    file_name: file.name,
    file_size: file.size,
    status: 'pending',
    uploaded_at: new Date().toISOString(),
  };

  // 2. Persist in public.driver_documents table
  try {
    const { data: dbData, error: dbError } = await supabase
      .from('driver_documents')
      .insert({
        driver_id: driverId,
        document_type: docType,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        status: 'pending',
      })
      .select()
      .single();

    if (!dbError && dbData) {
      newDoc.id = dbData.id;
    }
  } catch (err) {
    console.warn('driver_documents DB insert note:', err);
  }

  // 3. Cache in local storage for fast access
  const currentDocs = (getLocalDocs()[driverId] || []).filter(d => d.document_type !== docType);
  currentDocs.push(newDoc);
  saveLocalDocs(driverId, currentDocs);

  return { doc: newDoc };
}

/**
 * Fetches all uploaded documents for a specific driver.
 */
export async function fetchDriverDocuments(driverId: string): Promise<DriverDocument[]> {
  try {
    const { data, error } = await supabase
      .from('driver_documents')
      .select('*')
      .eq('driver_id', driverId)
      .order('uploaded_at', { ascending: false });

    if (!error && data && data.length > 0) {
      // De-duplicate latest per type
      const latestByType = new Map<string, DriverDocument>();
      data.forEach((d: any) => {
        if (!latestByType.has(d.document_type)) {
          latestByType.set(d.document_type, d as DriverDocument);
        }
      });
      const resolved = Array.from(latestByType.values());
      saveLocalDocs(driverId, resolved);
      return resolved;
    }
  } catch (err) {
    console.warn('fetchDriverDocuments error, using local fallback:', err);
  }

  // Fallback to local cache
  return getLocalDocs()[driverId] || [];
}

/**
 * Admin action to approve or reject driver verification.
 */
export async function updateDriverVerificationStatus(
  driverId: string,
  status: VerificationStatus,
  rejectionReason?: string,
  adminId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const updatePayload: any = {
      verification_status: status,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (adminId) updatePayload.reviewed_by = adminId;
    if (status === 'rejected' && rejectionReason) {
      updatePayload.rejection_reason = rejectionReason;
    } else if (status === 'approved') {
      updatePayload.rejection_reason = null;
    }

    let { data: updatedRows, error } = await supabase
      .from('drivers')
      .update(updatePayload)
      .eq('id', driverId)
      .select();

    // Fallback: if update fails (e.g. 409 Conflict due to foreign key on reviewed_by), retry without reviewed_by
    if (error && updatePayload.reviewed_by) {
      console.warn('Driver update failed with reviewed_by; retrying without reviewed_by:', error.message);
      const fallbackPayload = { ...updatePayload };
      delete fallbackPayload.reviewed_by;
      const retry = await supabase
        .from('drivers')
        .update(fallbackPayload)
        .eq('id', driverId)
        .select();
      error = retry.error;
      updatedRows = retry.data;
    }

    // If update returned 0 rows (driver row not in DB yet), upsert record into drivers
    if (!error && (!updatedRows || updatedRows.length === 0)) {
      console.log('Driver row missing in drivers table, upserting for driverId:', driverId);
      const upsertPayload: any = {
        id: driverId,
        verification_status: status,
        plate_number: 'BG-' + (driverId.slice(0, 5).toUpperCase()),
        body_number: driverId.slice(0, 4),
        tricycle_model: 'Standard Tricycle',
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_available: status === 'approved',
        ...(adminId && !adminId.startsWith('00000000-') ? { reviewed_by: adminId } : {}),
        ...(status === 'rejected' && rejectionReason ? { rejection_reason: rejectionReason } : {})
      };

      const upsertRes = await supabase.from('drivers').upsert(upsertPayload).select();
      if (upsertRes.error) {
        delete upsertPayload.reviewed_by;
        await supabase.from('drivers').upsert(upsertPayload);
      }
    }

    if (error) {
      console.warn('Error updating driver verification status in DB:', error.message);
      return { success: false, error: error.message };
    }

    // Save dedicated local status override to ensure persistence across all tabs and refreshes
    try {
      localStorage.setItem(`pasada_driver_status_${driverId}`, status);
      if (status === 'rejected' && rejectionReason) {
        localStorage.setItem(`pasada_driver_rejection_${driverId}`, rejectionReason);
      } else if (status === 'approved') {
        localStorage.removeItem(`pasada_driver_rejection_${driverId}`);
      }
    } catch {}

    // Update document statuses
    const docStatus = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending';
    try {
      await supabase
        .from('driver_documents')
        .update({ status: docStatus })
        .eq('driver_id', driverId);
    } catch {}

    // Update local cache if available
    const localDocs = getLocalDocs()[driverId] || [];
    localDocs.forEach(d => {
      d.status = docStatus as any;
    });
    saveLocalDocs(driverId, localDocs);

    // If current logged-in driver matches this driver, update local storage profile
    try {
      const cachedDriver = localStorage.getItem('pasada_auth_driver');
      if (cachedDriver) {
        const parsed = JSON.parse(cachedDriver);
        if (parsed.id === driverId) {
          parsed.verification_status = status;
          parsed.rejection_reason = status === 'rejected' ? rejectionReason : undefined;
          localStorage.setItem('pasada_auth_driver', JSON.stringify(parsed));
        }
      }
    } catch {}

    // Also update registered users cache if present
    try {
      const regMap = JSON.parse(localStorage.getItem('pasada_registered_users') || '{}');
      let changed = false;
      for (const k of Object.keys(regMap)) {
        if (regMap[k]?.driverProfile?.id === driverId || regMap[k]?.profile?.id === driverId) {
          if (regMap[k].driverProfile) {
            regMap[k].driverProfile.verification_status = status;
            regMap[k].driverProfile.rejection_reason = status === 'rejected' ? rejectionReason : undefined;
            changed = true;
          }
        }
      }
      if (changed) {
        localStorage.setItem('pasada_registered_users', JSON.stringify(regMap));
      }
    } catch {}

    // Broadcast status change event for real-time reactivity in current window
    try {
      window.dispatchEvent(new CustomEvent('pasada_driver_status_changed', {
        detail: { driverId, status, rejectionReason }
      }));
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update verification status' };
  }
}

/**
 * Checks if the driver has already uploaded all 5 required documents.
 */
export function hasDriverSubmittedAllDocuments(docs: DriverDocument[]): boolean {
  if (!docs || docs.length < REQUIRED_DRIVER_DOCUMENTS.length) return false;
  const uploadedTypes = new Set(docs.map(d => d.document_type));
  return REQUIRED_DRIVER_DOCUMENTS.every(req => uploadedTypes.has(req.type));
}

/**
 * Submits the complete 5-document application batch for admin review.
 */
export async function submitDriverFranchiseApplication(
  driverId: string,
  attachedFiles: Partial<Record<DriverDocumentType, File>>
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Upload any files that haven't been uploaded yet
    for (const req of REQUIRED_DRIVER_DOCUMENTS) {
      const file = attachedFiles[req.type];
      if (file) {
        const uploadRes = await uploadDriverDocument(driverId, req.type, file);
        if (uploadRes.error) {
          return { success: false, error: `Error uploading ${req.title}: ${uploadRes.error}` };
        }
      }
    }

    // 2. Mark submission in drivers table
    const submissionTime = new Date().toISOString();
    try {
      await supabase
        .from('drivers')
        .update({
          documents_submitted_at: submissionTime,
          verification_status: 'pending',
          updated_at: submissionTime,
        })
        .eq('id', driverId);
    } catch (dbErr) {
      console.warn('DB note when marking documents submitted:', dbErr);
    }

    // 3. Update local storage cached driver profile
    try {
      const cached = localStorage.getItem('pasada_auth_driver');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.id === driverId) {
          parsed.documents_submitted_at = submissionTime;
          parsed.verification_status = 'pending';
          localStorage.setItem('pasada_auth_driver', JSON.stringify(parsed));
        }
      }
    } catch {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit application documents' };
  }
}
