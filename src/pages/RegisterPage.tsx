import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Building2, UserCheck, ShieldAlert, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';

interface RegisterPageProps {
  setCurrentView: (view: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ setCurrentView }) => {
  const { register } = useAuth();
  const { t } = useLanguage();
  const [selectedRole, setSelectedRole] = useState<'OWNER' | 'WORKER'>('OWNER');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Common fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('Kanchipuram, Tamil Nadu');
  const [address, setAddress] = useState('');

  // Owner fields
  const [businessName, setBusinessName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [sareeSpecialization, setSareeSpecialization] = useState('Kanchipuram Pure Silk & Zari');
  const [loomCount, setLoomCount] = useState<number>(6);

  // Worker fields
  const [skills, setSkills] = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState<number>(10);
  const [loomType, setLoomType] = useState('Pit Handloom');
  const [dailyCapacity, setDailyCapacity] = useState('1 saree / 4 days');
  const [availability, setAvailability] = useState<'AVAILABLE' | 'BUSY'>('AVAILABLE');

  const availableSkillOptions = [
    { key: 'korvai', label: t('skills.korvai') },
    { key: 'jacquard', label: t('skills.jacquard') },
    { key: 'warping', label: t('skills.warping') },
    { key: 'dyeing', label: t('skills.dyeing') },
    { key: 'zari', label: t('skills.zari') },
    { key: 'finishing', label: t('skills.finishing') },
    { key: 'inspection', label: t('skills.inspection') }
  ];

  const toggleSkill = (skillLabel: string) => {
    if (skills.includes(skillLabel)) {
      setSkills(skills.filter(s => s !== skillLabel));
    } else {
      setSkills([...skills, skillLabel]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setLoading(true);

    try {
      const payload: any = {
        role: selectedRole,
        fullName,
        username,
        email,
        phone,
        password,
        location,
        address
      };

      if (selectedRole === 'OWNER') {
        payload.businessName = businessName;
        payload.registrationNumber = registrationNumber;
        payload.sareeSpecialization = sareeSpecialization;
        payload.loomCount = Number(loomCount);
      } else {
        payload.skills = skills;
        payload.experienceYears = Number(experienceYears);
        payload.loomType = loomType;
        payload.dailyCapacity = dailyCapacity;
        payload.availability = availability;
      }

      const res = await register(payload);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: res.message || t('auth.awaiting_verification')
        });
      } else {
        setStatusMessage({ type: 'error', text: res.message || 'Registration failed' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Network error during registration' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-6">
      <div className="bg-white rounded-3xl border border-[#D4AF37]/40 shadow-xl p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/15 text-[#8C6D1F] text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            {t('auth.new_account_registration')}
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#0D1224]">{t('auth.registration_title')}</h2>
          <p className="text-xs text-gray-500 mt-1">
            {t('auth.registration_subtitle')}
          </p>
        </div>

        {/* Role Selector Tabs (Admin is explicitly prohibited from public registration) */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-gray-100 rounded-2xl mb-6">
          <button
            type="button"
            onClick={() => setSelectedRole('OWNER')}
            className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              selectedRole === 'OWNER'
                ? 'bg-white text-[#0D1224] shadow-sm border border-[#D4AF37]/40'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-[#D4AF37]" />
            <span>{t('auth.business_owner')}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole('WORKER')}
            className={`py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              selectedRole === 'WORKER'
                ? 'bg-white text-[#0D1224] shadow-sm border border-[#008080]/40'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserCheck className="w-4 h-4 text-[#008080]" />
            <span>{t('auth.weaver_artisan')}</span>
          </button>
        </div>

        {/* Security Rule Banner */}
        <div className="mb-6 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            {t('auth.security_notice')}
          </div>
        </div>

        {statusMessage && (
          <div
            className={`mb-6 p-4 rounded-2xl text-xs flex items-start gap-3 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                : 'bg-red-50 border border-red-300 text-red-900'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <div>
              <p className="font-bold text-sm">
                {statusMessage.type === 'success' ? t('auth.awaiting_verification') : t('auth.registration_alert')}
              </p>
              <p className="mt-1 leading-relaxed">{statusMessage.text}</p>
              {statusMessage.type === 'success' && (
                <button
                  type="button"
                  onClick={() => setCurrentView('login')}
                  className="mt-3 px-4 py-1.5 rounded-lg bg-emerald-700 text-white font-semibold text-xs hover:bg-emerald-800 transition-colors"
                >
                  {t('auth.return_sign_in')}
                </button>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Owner specific section */}
          {selectedRole === 'OWNER' && (
            <div className="p-4 rounded-2xl bg-[#F7F3EA] border border-[#D4AF37]/30 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C6D1F]">
                {t('auth.business_dossier')}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    {t('auth.business_name_label')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sri Venkateswara Handlooms"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:border-[#D4AF37] focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    {t('auth.reg_number_label')}
                  </label>
                  <input
                    type="text"
                    placeholder="Optional for small units"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:border-[#D4AF37] focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    {t('auth.specialization_label')}
                  </label>
                  <select
                    value={sareeSpecialization}
                    onChange={(e) => setSareeSpecialization(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:border-[#D4AF37] focus:outline-none bg-white"
                  >
                    <option value="Kanchipuram Pure Silk & Zari">Kanchipuram Pure Silk &amp; Zari (Korvai Weaves)</option>
                    <option value="Arani Silk & Cotton Handlooms">Arani Silk &amp; Cotton Handlooms</option>
                    <option value="Banarasi Brocade & Katan Silk">Banarasi Brocade &amp; Katan Silk</option>
                    <option value="Salem Cotton & Soft Silk Sarees">Salem Cotton &amp; Soft Silk Sarees</option>
                    <option value="Chanderi Silk & Zari Weaves">Chanderi Silk &amp; Zari Weaves</option>
                    <option value="Tussar & Natural Dye Sarees">Tussar &amp; Natural Dye Sarees</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    {t('auth.loom_count_label')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={loomCount}
                    onChange={(e) => setLoomCount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:border-[#D4AF37] focus:outline-none bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Worker specific section */}
          {selectedRole === 'WORKER' && (
            <div className="p-4 rounded-2xl bg-[#E6F4F1] border border-[#008080]/30 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#006666]">
                {t('auth.craft_profile')}
              </h3>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1.5">
                  {t('auth.skills_label')}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {availableSkillOptions.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => toggleSkill(opt.label)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                        skills.includes(opt.label)
                          ? 'bg-[#008080] text-white border-[#008080]'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    {t('auth.experience_label')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:border-[#008080] focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    {t('auth.loom_setup_label')}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Traditional Pit Loom"
                    value={loomType}
                    onChange={(e) => setLoomType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:border-[#008080] focus:outline-none bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                    {t('auth.availability_label')}
                  </label>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value as 'AVAILABLE' | 'BUSY')}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:border-[#008080] focus:outline-none bg-white"
                  >
                    <option value="AVAILABLE">{t('auth.available_work')}</option>
                    <option value="BUSY">{t('auth.busy_loom')}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* User Account Details Section */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              {t('auth.contact_credentials')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  {t('auth.full_legal_name')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. S. Narayanan"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:border-[#D4AF37] focus:outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  {t('auth.username_label')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. narayana_kanchi"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:border-[#D4AF37] focus:outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  {t('auth.email_label')}
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. narayana@sareeunit.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:border-[#D4AF37] focus:outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  {t('auth.phone_label')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="+91 94432 00000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:border-[#D4AF37] focus:outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  {t('auth.location_label')}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kanchipuram, Tamil Nadu"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:border-[#D4AF37] focus:outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  {t('auth.password_label')}
                </label>
                <input
                  type="password"
                  required
                  placeholder="Create strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:border-[#D4AF37] focus:outline-none bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                  {t('auth.address_label')}
                </label>
                <textarea
                  rows={2}
                  placeholder="Street, Colony, Weaver Nagar, Landmark..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs focus:border-[#D4AF37] focus:outline-none bg-white"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#D4AF37] to-[#C6A15B] text-[#0A0D16] hover:brightness-110 shadow-md transition-all flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <span>{t('auth.submitting_dossier')}</span>
            ) : (
              <>
                <span>{t('auth.submit_registration')}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-500">
          {t('auth.already_have_account')}{' '}
          <button
            onClick={() => setCurrentView('login')}
            className="font-bold text-[#64152F] hover:underline"
          >
            {t('auth.sign_in_link')}
          </button>
        </div>
      </div>
    </div>
  );
};
