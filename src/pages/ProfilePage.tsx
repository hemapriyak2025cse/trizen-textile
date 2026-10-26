import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getStoredToken } from '../api/client';
import {
  User,
  Shield,
  Building2,
  UserCheck,
  Key,
  Calendar,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  Lock,
  Sparkles
} from 'lucide-react';

interface ProfilePageProps {
  setCurrentView: (view: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ setCurrentView }) => {
  const { user, tenant } = useAuth();
  const token = getStoredToken();
  const [copied, setCopied] = useState(false);

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-sm">Please sign in to view your profile credentials.</p>
        <button
          onClick={() => setCurrentView('login')}
          className="mt-4 px-4 py-2 rounded-xl bg-[#D4AF37] text-[#0A0D16] font-bold text-xs"
        >
          Sign In
        </button>
      </div>
    );
  }

  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl border border-[#D4AF37]/40 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-gray-100">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#64152F] via-[#0D1224] to-[#0A0D16] border-2 border-[#D4AF37] flex items-center justify-center font-serif font-black text-2xl text-[#D4AF37] shadow-lg">
            {user.full_name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#0D1224]">
                {user.full_name}
              </h1>
              <span className="font-mono text-xs text-gray-400">(@{user.username})</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  user.role === 'ADMIN'
                    ? 'bg-[#64152F]/15 text-[#64152F] border border-[#64152F]/30'
                    : user.role === 'OWNER'
                    ? 'bg-[#D4AF37]/20 text-[#8C6D1F] border border-[#D4AF37]/40'
                    : 'bg-[#008080]/15 text-[#006666] border border-[#008080]/30'
                }`}
              >
                {user.role}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Registered Account &bull; Status: <span className="text-emerald-600 font-semibold">{user.status}</span>
            </p>
          </div>
        </div>

        {/* Credentials Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6">
          <div className="p-3.5 rounded-2xl bg-[#F7F3EA] border border-[#D4AF37]/20">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 flex items-center gap-1.5 mb-1">
              <Mail className="w-3.5 h-3.5 text-[#D4AF37]" />
              Official Email
            </span>
            <div className="text-xs font-semibold text-gray-900">{user.email}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F7F3EA] border border-[#D4AF37]/20">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 flex items-center gap-1.5 mb-1">
              <Phone className="w-3.5 h-3.5 text-[#D4AF37]" />
              Direct Phone Line
            </span>
            <div className="text-xs font-semibold text-gray-900">{user.phone}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F7F3EA] border border-[#D4AF37]/20">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
              Textile Cluster &bull; Location
            </span>
            <div className="text-xs font-semibold text-gray-900">{user.location}</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F7F3EA] border border-[#D4AF37]/20">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 flex items-center gap-1.5 mb-1">
              <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
              Registration Date
            </span>
            <div className="text-xs font-semibold text-gray-900">{user.created_at?.slice(0, 10)}</div>
          </div>
        </div>

        {/* Associated Tenant Details for Owner */}
        {user.role === 'OWNER' && tenant && (
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#8C6D1F] flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#D4AF37]" />
              Associated Business Tenant
            </h3>
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 text-xs text-amber-950 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#0D1224]">{tenant.business_name}</span>
                <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded border border-amber-200 font-semibold">
                  {tenant.id}
                </span>
              </div>
              <p><strong>Craft Specialty:</strong> {tenant.textile_specialization}</p>
              <p><strong>Looms Capacity:</strong> {tenant.loom_count} Active Looms &bull; {tenant.location}</p>
              <p className="text-[11px] text-gray-500">
                Tenant status: <span className="font-semibold text-emerald-600">{tenant.subscription_status}</span>
              </p>
            </div>
          </div>
        )}

        {/* Skills Details for Worker */}
        {user.role === 'WORKER' && user.skills && (
          <div className="pt-4 border-t border-gray-100 space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#006666] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#008080]" />
              Certified Artisan Skills
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {user.skills.map((s, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded-lg bg-[#E6F4F1] text-[#006666] text-xs font-medium border border-[#008080]/20">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Session Security Details */}
        <div className="pt-6 border-t border-gray-100">
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-700 flex items-center gap-1.5 mb-2">
            <Lock className="w-4 h-4 text-gray-400" />
            Active Session Security
          </h3>
          <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between text-xs font-mono">
            <div className="overflow-hidden mr-2">
              <span className="text-gray-400 block text-[10px] uppercase">Session Bearer Token:</span>
              <span className="text-gray-800 text-[11px] truncate block">
                {token ? `${token.slice(0, 24)}...${token.slice(-12)}` : 'No active token'}
              </span>
            </div>
            {token && (
              <button
                type="button"
                onClick={copyToken}
                className="px-2.5 py-1 rounded bg-white border border-gray-300 hover:bg-gray-100 text-[11px] text-gray-700 shrink-0 font-sans"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
