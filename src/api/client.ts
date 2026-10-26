import { User, Tenant, AuditLog, PendingUser } from '../types';

const TOKEN_KEY = 'trizen_token';

export function getStoredToken(): string | null {
  try {
    const t = localStorage.getItem(TOKEN_KEY);
    if (t && t !== 'null' && t !== 'undefined' && t.trim() !== '') return t.trim();
  } catch {}

  // Cookie fallback
  if (typeof document !== 'undefined' && document.cookie) {
    const match = document.cookie.match(/(?:^|;\s*)trizen_token=([^;]+)/);
    if (match && match[1] && match[1] !== 'null' && match[1] !== 'undefined') {
      const clean = match[1].trim();
      try { localStorage.setItem(TOKEN_KEY, clean); } catch {}
      return clean;
    }
  }

  return null;
}

export function setStoredToken(token: string | null) {
  try {
    if (token && token !== 'null' && token !== 'undefined' && token.trim() !== '') {
      const clean = token.trim();
      localStorage.setItem(TOKEN_KEY, clean);
      if (typeof document !== 'undefined') {
        document.cookie = `trizen_token=${clean}; path=/; max-age=2592000; SameSite=Lax`;
      }
    } else {
      localStorage.removeItem(TOKEN_KEY);
      if (typeof document !== 'undefined') {
        document.cookie = 'trizen_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
      }
    }
  } catch {}
}

export interface NetworkLogEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  payload?: any;
  status?: number;
  statusText?: string;
  durationMs: number;
  response?: any;
  error?: any;
  success: boolean;
}

declare global {
  interface Window {
    __TRIZEN_NETWORK_LOGS__?: NetworkLogEntry[];
  }
}

/**
 * Network Request Wrapper & Interceptor
 * Intercepts all outgoing API calls, logs headers (including auth tokens),
 * payload, response status codes, and latency to isolate failure causes.
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const token = getStoredToken();
  const reqId = 'req_' + Math.random().toString(36).substring(2, 9);
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-trizen-token'] = token;
  }

  // Parse and capture request payload
  let parsedPayload: any = undefined;
  if (options.body) {
    if (typeof options.body === 'string') {
      try {
        parsedPayload = JSON.parse(options.body);
      } catch {
        parsedPayload = options.body;
      }
    } else {
      parsedPayload = options.body;
    }
  }

  const logEntry: NetworkLogEntry = {
    id: reqId,
    timestamp: new Date().toISOString(),
    method,
    url: path,
    headers: { ...headers },
    payload: parsedPayload,
    durationMs: 0,
    success: false
  };

  try {
    const response = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      headers
    });

    const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const durationMs = Math.round(endTime - startTime);
    logEntry.durationMs = durationMs;
    logEntry.status = response.status;
    logEntry.statusText = response.statusText;

    const data = await response.json().catch(() => ({}));
    logEntry.response = data;
    logEntry.success = response.ok;

    // Buffer into window logs for dev inspection
    if (typeof window !== 'undefined') {
      window.__TRIZEN_NETWORK_LOGS__ = window.__TRIZEN_NETWORK_LOGS__ || [];
      window.__TRIZEN_NETWORK_LOGS__.unshift(logEntry);
      if (window.__TRIZEN_NETWORK_LOGS__.length > 100) {
        window.__TRIZEN_NETWORK_LOGS__.pop();
      }
    }

    // Detailed console output for debugging and failure isolation
    const statusColor = response.ok
      ? '#10B981'
      : response.status === 401 || response.status === 403
      ? '#F59E0B'
      : '#EF4444';

    console.groupCollapsed(
      `%c[TRIZEN NET]%c %c${method}%c ${path} %c${response.status} ${response.statusText || ''} (%c${durationMs}ms%c)`,
      'background: #0D1224; color: #D4AF37; font-weight: bold; padding: 2px 5px; border-radius: 4px; font-family: monospace;',
      '',
      'color: #38BDF8; font-weight: bold;',
      'color: inherit;',
      `color: ${statusColor}; font-weight: bold;`,
      'color: #9CA3AF;',
      `color: ${statusColor};`
    );
    console.log('🌐 Request Method & URL:', `${method} ${path}`);
    console.log('🔑 Headers (Auth Tokens & Content Type):', headers);
    if (parsedPayload !== undefined) {
      console.log('📦 Request Payload:', parsedPayload);
    }
    console.log(`📡 Response Status: [${response.status}] ${response.statusText}`);
    console.log('📥 Response Body:', data);
    console.log('⏱️ Latency:', `${durationMs}ms`);
    console.groupEnd();

    if (!response.ok) {
      if (response.status === 401 && (data.error === 'SESSION_INVALID' || data.error === 'SESSION_EXPIRED' || data.error === 'UNAUTHORIZED')) {
        setStoredToken(null);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('trizen:unauthorized', { detail: data }));
        }
      }

      console.warn(`[TRIZEN API FAILURE] ${method} ${path} failed with HTTP ${response.status}:`, data);

      const error: any = new Error(data.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = data;
      logEntry.error = data;
      throw error;
    }

    return data as T;
  } catch (err: any) {
    if (!logEntry.status) {
      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      logEntry.durationMs = Math.round(endTime - startTime);
      logEntry.error = err.message || 'Network Fetch Error';
      console.error(`[TRIZEN NET ERROR] ${method} ${path} connection error:`, err);
    }
    throw err;
  }
}

export const api = {
  // Authentication & Sessions
  async login(identifier: string, pass: string): Promise<{ token: string; user: User; tenant: Tenant | null }> {
    const res = await request<{ token: string; user: User; tenant: Tenant | null }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password: pass })
    });
    setStoredToken(res.token);
    return res;
  },

  async register(data: any): Promise<{ success: boolean; message: string; role: string; userId: string; tenantId?: string }> {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async logout(): Promise<void> {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },

  async getMe(): Promise<{ user: User; tenant: Tenant | null }> {
    return request('/api/auth/me');
  },

  async forgotPassword(identifier: string): Promise<{ success: boolean; resetToken: string; message: string }> {
    return request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier })
    });
  },

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return request('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword })
    });
  },

  async quickSwitch(username: string): Promise<{ token: string; user: User; tenant: Tenant | null }> {
    const res = await request<{ token: string; user: User; tenant: Tenant | null }>('/api/auth/quick-switch', {
      method: 'POST',
      body: JSON.stringify({ username })
    });
    setStoredToken(res.token);
    return res;
  },

  // Tenant / Owner Endpoints
  async getTenantProfile(): Promise<{ tenant: Tenant }> {
    return request('/api/tenant/profile');
  },

  async updateTenantProfile(data: Partial<Tenant>): Promise<{ success: boolean; tenant: Tenant }> {
    return request('/api/tenant/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async getTenantAuditLogs(): Promise<{ logs: AuditLog[] }> {
    return request('/api/tenant/audit-logs');
  },

  // Admin Endpoints
  async getAdminOverview(): Promise<{ metrics: any; platformStatus: string }> {
    return request('/api/admin/overview');
  },

  async getPendingRegistrations(): Promise<{ pendingUsers: PendingUser[] }> {
    return request('/api/admin/pending-registrations');
  },

  async getOwnerApprovals(): Promise<{ pendingOwners: any[] }> {
    return request('/api/admin/owner-approvals');
  },

  async getWorkerApprovals(): Promise<{ pendingWorkers: any[] }> {
    return request('/api/admin/worker-approvals');
  },

  async approveUser(userId: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/admin/approve-user/${userId}`, { method: 'POST' });
  },

  async rejectUser(userId: string, reason: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/admin/reject-user/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  async requestInfo(userId: string, infoMessage: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/admin/request-info/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ infoMessage })
    });
  },

  async changeUserStatus(userId: string, newStatus: string, reason?: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/admin/change-status/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ newStatus, reason })
    });
  },

  async getAllOwners(): Promise<{ owners: any[] }> {
    return request('/api/admin/all-owners');
  },

  async getAllWorkers(): Promise<{ workers: any[] }> {
    return request('/api/admin/all-workers');
  },

  async getAdminAuditLogs(): Promise<{ logs: AuditLog[] }> {
    return request('/api/admin/audit-logs');
  },

  // Worker Endpoints
  async getWorkerProfile(): Promise<{ worker: any }> {
    return request('/api/worker/profile');
  },

  async setWorkerAvailability(availability: 'AVAILABLE' | 'BUSY'): Promise<{ success: boolean; availability: string }> {
    return request('/api/worker/availability', {
      method: 'PUT',
      body: JSON.stringify({ availability })
    });
  },

  async updateWorkerProfile(data: any): Promise<{ success: boolean; message: string }> {
    return request('/api/worker/profile', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  async searchOwners(query?: string, location?: string): Promise<{ businesses: any[] }> {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (location) params.append('location', location);
    return request(`/api/worker/search-owners?${params.toString()}`);
  },

  // Workflow: Batches & 7-Stage Pipeline
  async getBatches(): Promise<{ batches: any[] }> {
    return request('/api/workflow/batches');
  },

  async createBatch(data: any): Promise<{ success: boolean; batch: any; stages: any[] }> {
    return request('/api/workflow/batches', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getBatchDetails(batchId: string): Promise<{ batch: any; stages: any[] }> {
    return request(`/api/workflow/batches/${batchId}`);
  },

  async getEligibleWorkers(stageName?: string): Promise<{ workers: any[] }> {
    const params = new URLSearchParams();
    if (stageName) params.append('stage_name', stageName);
    return request(`/api/workflow/workers/eligible?${params.toString()}`);
  },

  // Workflow: Work Offers (Owner -> Worker)
  async getWorkOffers(): Promise<{ offers: any[] }> {
    return request('/api/workflow/work-offers');
  },

  async createWorkOffer(data: any): Promise<{ success: boolean; offerId: string; offerNumber: string }> {
    return request('/api/workflow/work-offers', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async respondWorkOffer(offerId: string, action: 'ACCEPTED' | 'DECLINED' | 'CHANGES_REQUESTED', workerResponse?: string): Promise<{ success: boolean; message: string; jobId?: string; jobNumber?: string }> {
    return request(`/api/workflow/work-offers/${offerId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action, worker_response: workerResponse })
    });
  },

  // Workflow: Work Requests (Worker -> Owner)
  async getWorkRequests(): Promise<{ requests: any[] }> {
    return request('/api/workflow/work-requests');
  },

  async createWorkRequest(data: any): Promise<{ success: boolean; requestId: string; requestNumber: string; message?: string }> {
    return request('/api/workflow/work-requests', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async respondWorkRequest(requestId: string, action: 'ACCEPTED' | 'REJECTED' | 'INFO_REQUESTED', ownerResponse?: string): Promise<{ success: boolean; message: string; jobId?: string; jobNumber?: string }> {
    return request(`/api/workflow/work-requests/${requestId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action, owner_response: ownerResponse })
    });
  },

  async replyWorkRequest(requestId: string, replyMessage: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/workflow/work-requests/${requestId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ reply_message: replyMessage })
    });
  },

  // Workflow: Jobs & Progress Updates
  async getJobs(): Promise<{ jobs: any[] }> {
    return request('/api/workflow/jobs');
  },

  async getJobDetails(jobId: string): Promise<{ job: any; updates: any[] }> {
    return request(`/api/workflow/jobs/${jobId}`);
  },

  async startJob(jobId: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/workflow/jobs/${jobId}/start`, { method: 'POST' });
  },

  async logJobProgress(jobId: string, data: any): Promise<{ success: boolean; message: string; completedQuantity: number; remainingQuantity: number; percent: number }> {
    return request(`/api/workflow/jobs/${jobId}/progress`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async submitJob(jobId: string, data: any): Promise<{ success: boolean; message: string }> {
    return request(`/api/workflow/jobs/${jobId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Workflow: Owner Review (Approve or Rework)
  async reviewJob(jobId: string, data: { action: 'APPROVE' | 'REWORK'; approved_quantity?: number; rework_reason?: string; owner_notes?: string; payment_advance?: number }): Promise<any> {
    return request(`/api/workflow/jobs/${jobId}/review`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Workflow: Raw Material Inventory
  async getInventory(): Promise<{ items: any[] }> {
    return request('/api/workflow/inventory');
  },

  async addInventory(data: any): Promise<{ success: boolean; materialId: string }> {
    return request('/api/workflow/inventory', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async consumeInventory(data: any): Promise<{ success: boolean; remainingQuantity: number }> {
    return request('/api/workflow/inventory/consume', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Workflow: Worker Payments Ledger
  async getPayments(): Promise<{ payments: any[] }> {
    return request('/api/workflow/payments');
  },

  async payWorker(paymentId: string, data: { amount_paid?: number; payment_method?: string; transaction_ref?: string }): Promise<any> {
    return request(`/api/workflow/payments/${paymentId}/pay`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Workflow: Finished Stock & Sales
  async getStock(): Promise<{ sarees: any[] }> {
    return request('/api/workflow/stock');
  },

  async getSales(): Promise<{ sales: any[] }> {
    return request('/api/workflow/sales');
  },

  async createSale(data: any): Promise<any> {
    return request('/api/workflow/sales', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Notifications
  async getNotifications(): Promise<{ notifications: any[] }> {
    return request('/api/workflow/notifications');
  },

  async markNotificationRead(id: string): Promise<void> {
    return request(`/api/workflow/notifications/${id}/read`, { method: 'POST' });
  }
};
