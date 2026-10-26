export type Role = 'ADMIN' | 'OWNER' | 'WORKER';

export type UserStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type AvailabilityStatus = 'AVAILABLE' | 'BUSY';

export interface User {
  id: string;
  tenant_id: string | null;
  role: Role;
  full_name: string;
  username: string;
  email: string;
  phone: string;
  address?: string | null;
  location: string;
  status: UserStatus;
  rejection_reason?: string | null;
  additional_info_requested?: string | null;
  skills?: string[];
  experience_years?: number;
  loom_type?: string | null;
  daily_capacity?: string | null;
  availability: AvailabilityStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  business_name: string;
  slug: string;
  owner_user_id?: string | null;
  location: string;
  registration_number?: string | null;
  textile_specialization: string;
  loom_count: number;
  loom_types: string[];
  subscription_status: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  tenant_id?: string | null;
  user_id: string;
  actor_username: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details: string;
  ip_address?: string;
  timestamp: string;
}

export interface PendingUser extends User {
  business_name?: string;
  textile_specialization?: string;
  registration_number?: string;
  loom_count?: number;
}
