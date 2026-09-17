import { createClient } from '@supabase/supabase-js';
import { supabase, isConfigured } from '../api/supabaseClient';
import { logAdminMovement } from './auditService';
import type { Profile, UserRole, AdminUserFormData } from '../admin/types';

const ADMIN_STORAGE_KEY = 'pasada_registered_admins';

// Environment credentials for creating secondary client (without clobbering active session)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

function getSecondaryClient() {
  return createClient(
    isConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
    isConfigured ? supabaseAnonKey : 'placeholder-anon-key',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );
}

export interface ProvisionAdminResult {
  success: boolean;
  profile?: Profile;
  error?: string;
}

/**
 * Provisions a new municipal Administrator or Super Administrator.
 * HARD RULE: ONLY a Super Admin can call this function.
 */
export async function provisionAdminUser(
  currentUser: Profile,
  formData: AdminUserFormData
): Promise<ProvisionAdminResult> {
  // Enforce Super Admin authorization
  if (currentUser.role !== 'super_admin') {
    const errorMsg = 'Access Denied: Only a Super Admin can create or promote administrators.';
    // Log unauthorized attempt in audit trail
    await logAdminMovement(
      currentUser,
      'UNAUTHORIZED_ADMIN_PROVISION_ATTEMPT',
      'profiles',
      null,
      { attempted_email: formData.email, attempted_role: formData.role, reason: 'Non-super-admin attempted to provision' }
    );
    return { success: false, error: errorMsg };
  }

  const normalizedEmail = formData.email.trim().toLowerCase();
  const normalizedName = formData.fullName.trim();
  let createdUserId: string | null = null;

  // 1. Create auth user in Supabase via secondary client if configured
  if (isConfigured) {
    try {
      const secondaryClient = getSecondaryClient();
      const { data: authData, error: authError } = await secondaryClient.auth.signUp({
        email: normalizedEmail,
        password: formData.password,
        options: {
          data: {
            full_name: normalizedName,
            role: formData.role,
            department: formData.department
          }
        }
      });

      if (authError && !authError.message.includes('already registered')) {
        console.warn('Supabase auth signup notice:', authError.message);
      }

      if (authData?.user?.id) {
        createdUserId = authData.user.id;
      }
    } catch (err: any) {
      console.warn('Secondary client signup fallback:', err);
    }
  }

  if (!createdUserId) {
    createdUserId = `adm-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  const newAdminProfile: Profile = {
    id: createdUserId,
    role: formData.role,
    full_name: normalizedName,
    email: normalizedEmail,
    department: formData.department,
    employee_id: formData.employeeId?.trim() || `LGU-BG-${Math.floor(1000 + Math.random() * 9000)}`,
    status: 'active',
    language_pref: 'fil',
    created_at: new Date().toISOString()
  };

  // 2. Persist in Supabase profiles table
  if (isConfigured) {
    try {
      await supabase.from('profiles').upsert(newAdminProfile);
    } catch (err) {
      console.warn('Supabase profile upsert notice:', err);
    }
  }

  // 3. Persist in local storage cache
  try {
    const existingList: Array<{ profile: Profile; password?: string }> = JSON.parse(
      localStorage.getItem(ADMIN_STORAGE_KEY) || '[]'
    );
    const updatedList = [
      { profile: newAdminProfile, password: formData.password },
      ...existingList.filter(item => item.profile.email?.toLowerCase() !== normalizedEmail)
    ];
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(updatedList));
  } catch (err) {
    console.error('Error caching registered admin:', err);
  }

  // 4. Log Administrative Movement in Audit Trail
  await logAdminMovement(
    currentUser,
    formData.role === 'super_admin' ? 'PROVISION_SUPER_ADMIN' : 'PROVISION_ADMIN',
    'profiles',
    newAdminProfile.id,
    {
      provisioned_officer: normalizedName,
      provisioned_email: normalizedEmail,
      assigned_role: formData.role,
      department: formData.department,
      employee_id: newAdminProfile.employee_id,
      provisioned_by: currentUser.full_name
    }
  );

  return { success: true, profile: newAdminProfile };
}

/**
 * Fetches all registered administrators and super administrators from Supabase database
 */
export async function fetchAdminUsers(): Promise<Profile[]> {
  const adminMap = new Map<string, Profile>();

  // 1. Read locally cached dynamically provisioned admin accounts
  try {
    const cachedAdmins: Array<{ profile: Profile }> = JSON.parse(
      localStorage.getItem(ADMIN_STORAGE_KEY) || '[]'
    );
    cachedAdmins.forEach(item => {
      if (item.profile?.id) {
        adminMap.set(item.profile.id, item.profile);
      }
    });
  } catch {}

  // 2. Fetch live profiles with admin roles from Supabase
  if (isConfigured) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'super_admin']);

      if (!error && data) {
        data.forEach((p: Profile) => {
          const existing = adminMap.get(p.id);
          adminMap.set(p.id, {
            ...p,
            department: p.department || existing?.department || 'Municipal Transport Board',
            employee_id: p.employee_id || existing?.employee_id || `BG-ADM-${p.id.substring(0, 4).toUpperCase()}`,
            status: p.status || 'active'
          });
        });
      }
    } catch (err) {
      console.warn('Error fetching profiles from Supabase:', err);
    }
  }

  return Array.from(adminMap.values()).sort((a, b) => {
    // Super admins first, then by name
    if (a.role === 'super_admin' && b.role !== 'super_admin') return -1;
    if (b.role === 'super_admin' && a.role !== 'super_admin') return 1;
    return a.full_name.localeCompare(b.full_name);
  });
}

/**
 * Changes an administrator's role (Promote to Super Admin or Demote to Admin).
 * ONLY Super Admins can alter roles.
 */
export async function updateAdminRole(
  currentUser: Profile,
  targetAdminId: string,
  targetAdminName: string,
  newRole: 'admin' | 'super_admin'
): Promise<{ success: boolean; error?: string }> {
  if (currentUser.role !== 'super_admin') {
    return { success: false, error: 'Unauthorized: Only Super Administrators can modify administrative roles.' };
  }

  try {
    await supabase.from('profiles').update({ role: newRole }).eq('id', targetAdminId);
  } catch (e) {
    console.warn('Database role update warning:', e);
  }

  // Update local cache
  try {
    const cachedAdmins: Array<{ profile: Profile; password?: string }> = JSON.parse(
      localStorage.getItem(ADMIN_STORAGE_KEY) || '[]'
    );
    const updated = cachedAdmins.map(item => {
      if (item.profile.id === targetAdminId) {
        return { ...item, profile: { ...item.profile, role: newRole } };
      }
      return item;
    });
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  // Log in Audit Trail
  await logAdminMovement(
    currentUser,
    newRole === 'super_admin' ? 'PROMOTE_SUPER_ADMIN' : 'DEMOTE_TO_ADMIN',
    'profiles',
    targetAdminId,
    {
      target_officer: targetAdminName,
      new_role: newRole,
      modified_by: currentUser.full_name
    }
  );

  return { success: true };
}

/**
 * Revokes or suspends an administrator's access.
 * ONLY Super Admins can revoke access. Super Admins cannot revoke their own account.
 */
export async function revokeAdminAccess(
  currentUser: Profile,
  targetAdminId: string,
  targetAdminName: string
): Promise<{ success: boolean; error?: string }> {
  if (currentUser.role !== 'super_admin') {
    return { success: false, error: 'Unauthorized: Only Super Administrators can revoke access.' };
  }

  if (currentUser.id === targetAdminId) {
    return { success: false, error: 'Security Violation: You cannot revoke your own Super Administrator access.' };
  }

  try {
    await supabase.from('profiles').update({ status: 'suspended', role: 'passenger' }).eq('id', targetAdminId);
  } catch (e) {
    console.warn('Database revocation warning:', e);
  }

  // Remove or mark suspended in local cache
  try {
    const cachedAdmins: Array<{ profile: Profile; password?: string }> = JSON.parse(
      localStorage.getItem(ADMIN_STORAGE_KEY) || '[]'
    );
    const updated = cachedAdmins.map(item => {
      if (item.profile.id === targetAdminId) {
        return { ...item, profile: { ...item.profile, status: 'suspended' as const } };
      }
      return item;
    });
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  // Log in Audit Trail
  await logAdminMovement(
    currentUser,
    'REVOKE_ADMIN_ACCESS',
    'profiles',
    targetAdminId,
    {
      revoked_officer: targetAdminName,
      action: 'Suspended administrative privileges',
      revoked_by: currentUser.full_name
    }
  );

  return { success: true };
}
