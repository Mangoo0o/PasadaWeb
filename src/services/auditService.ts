import { supabase, isConfigured } from '../api/supabaseClient';
import type { AdminAction, Profile } from '../admin/types';

const AUDIT_CACHE_KEY = 'pasada_audit_actions';

/**
 * Validates if an ID is a valid Postgres UUID
 */
function isValidUuid(id?: string): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Logs every administrative movement into Supabase database
 * and synchronizes with local resilience cache.
 */
export async function logAdminMovement(
  admin: Profile,
  actionType: string,
  targetTable: string,
  targetId?: string | null,
  detailsJson: Record<string, any> = {}
): Promise<AdminAction> {
  const timestamp = new Date().toISOString();
  const logId = `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const enrichedDetails = {
    ...detailsJson,
    admin_name: admin.full_name || 'Municipal Administrator',
    admin_email: admin.email || 'N/A',
    admin_role: admin.role,
    department: admin.department || 'LGU Transport Authority'
  };

  const actionRecord: AdminAction = {
    id: logId,
    admin_id: admin.id,
    action_type: actionType,
    target_table: targetTable,
    target_id: targetId || undefined,
    details_json: enrichedDetails,
    created_at: timestamp,
    admin
  };

  // 1. Attempt persistent Supabase DB insert if configured
  if (isConfigured) {
    try {
      const payload = {
        admin_id: isValidUuid(admin.id) ? admin.id : null,
        action_type: actionType,
        target_table: targetTable,
        target_id: targetId || null,
        details_json: enrichedDetails
      };

      const { data, error } = await supabase
        .from('admin_actions')
        .insert(payload)
        .select('*, admin:profiles(*)')
        .maybeSingle();

      if (!error && data) {
        actionRecord.id = data.id;
        if (data.admin) {
          actionRecord.admin = data.admin as Profile;
        }
      }
    } catch (err) {
      console.warn('Supabase audit insert note:', err);
    }
  }

  // 2. Cache in localStorage for immediate offline & refresh resilience
  try {
    const cachedLogs: AdminAction[] = JSON.parse(localStorage.getItem(AUDIT_CACHE_KEY) || '[]');
    const deduplicated = [actionRecord, ...cachedLogs.filter(c => c.id !== actionRecord.id)].slice(0, 200);
    localStorage.setItem(AUDIT_CACHE_KEY, JSON.stringify(deduplicated));
  } catch (err) {
    console.error('Audit local storage cache error:', err);
  }

  // 3. Notify app components via browser event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pasada_audit_log_added', { detail: actionRecord }));
  }

  return actionRecord;
}

/**
 * Fetches all audit logs from Supabase and merges with local actions
 */
export async function fetchAuditLogs(): Promise<AdminAction[]> {
  const mergedMap = new Map<string, AdminAction>();

  // 1. Load local cache first
  try {
    const localLogs: AdminAction[] = JSON.parse(localStorage.getItem(AUDIT_CACHE_KEY) || '[]');
    localLogs.forEach(l => mergedMap.set(l.id, l));
  } catch {}

  // 2. Query live Supabase table if configured
  if (isConfigured) {
    try {
      const { data, error } = await supabase
        .from('admin_actions')
        .select('*, admin:profiles(*)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data) {
        data.forEach((row: any) => {
          mergedMap.set(row.id, {
            id: row.id,
            admin_id: row.admin_id,
            action_type: row.action_type,
            target_table: row.target_table,
            target_id: row.target_id || undefined,
            details_json: row.details_json || {},
            created_at: row.created_at,
            admin: row.admin || undefined
          });
        });
      }
    } catch (err) {
      console.warn('Error fetching live admin_actions from Supabase:', err);
    }
  }

  // Sort descending by created_at
  const list = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return list;
}

/**
 * Exports audit compliance logs to a downloadable CSV document
 */
export function exportAuditLogsToCsv(logs: AdminAction[]): void {
  const headers = ['Timestamp', 'Action Type', 'Administrator', 'Role', 'Target Table', 'Target ID', 'Details'];
  
  const escapeCsvField = (field: any) => {
    if (field === null || field === undefined) return '""';
    const str = typeof field === 'object' ? JSON.stringify(field) : String(field);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = logs.map(log => [
    escapeCsvField(new Date(log.created_at).toLocaleString()),
    escapeCsvField(log.action_type),
    escapeCsvField(log.admin?.full_name || log.details_json?.admin_name || 'Administrator'),
    escapeCsvField(log.admin?.role || log.details_json?.admin_role || 'admin'),
    escapeCsvField(log.target_table),
    escapeCsvField(log.target_id || 'N/A'),
    escapeCsvField(log.details_json)
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  const now = new Date().toISOString().split('T')[0];
  link.setAttribute('href', url);
  link.setAttribute('download', `PasadaGuide_Compliance_Audit_${now}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
