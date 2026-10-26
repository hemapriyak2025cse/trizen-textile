import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../api/client';
import { SareeProductionCycleAnimation } from '../components/animations/SareeProductionCycleAnimation';
import { Lock, User, KeyRound, ArrowRight, AlertTriangle } from 'lucide-react';

interface LoginPageProps {
  setCurrentView: (view: string) => void;
  redirectReason?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({ setCurrentView, redirectReason }) => {
  const { login } = useAuth();
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetStatus, setResetStatus] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await login(identifier, password);
      if (res.success) {
        setCurrentView('dashboard');
      } else {
        setErrorMessage(res.message || 'Login failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.forgotPassword(forgotEmail);
      if (res.resetToken) {
        setResetToken(res.resetToken);
        setResetStatus('Reset token issued! You can now set your new password below:');
      } else {
        setResetStatus(res.message);
      }
    } catch (err: any) {
      setResetStatus(err.message || 'Failed to request reset token');
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || !newPassword) return;
    try {
      const res = await api.resetPassword(resetToken, newPassword);
      setResetStatus(res.message);
      setTimeout(() => {
        setShowForgotModal(false);
        setResetToken(null);
        setResetStatus(null);
        setPassword(newPassword);
      }, 1500);
    } catch (err: any) {
      setResetStatus(err.message || 'Failed to reset password');
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 sm:py-10 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column (Desktop 7 cols / Mobile above): Animated Saree Production Cycle */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <SareeProductionCycleAnimation />
        </div>

        {/* Right Column (Desktop 5 cols): Login Form & Quick Credentials */}
        <div className="lg:col-span-5 flex flex-col justify-center">
          <div className="bg-white rounded-3xl border border-[#D4AF37]/40 shadow-xl overflow-hidden p-6 sm:p-8">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#64152F] via-[#0D1224] to-[#0A0D16] border border-[#D4AF37] flex items-center justify-center mx-auto mb-3 shadow-md">
                <span className="font-serif font-black text-xl text-[#D4AF37]">T</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#0D1224]">{t('auth.sign_in_title')}</h2>
              <p className="text-xs text-gray-500 mt-1">{t('common.slogan')}</p>
            </div>

            {/* Redirect notice if unauthenticated user tried to access protected console */}
            {redirectReason && !errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-900">{t('auth.auth_required')}</p>
                  <p className="mt-0.5">{redirectReason}</p>
                </div>
              </div>
            )}

            {/* Error notification */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-800">{t('auth.verification_notif')}</p>
                  <p className="mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                  {t('auth.username_email')}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. owner_kanchi or admin"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-sm text-gray-900 bg-gray-50/50"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    {t('auth.password')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs text-[#8C6D1F] hover:underline"
                  >
                    {t('auth.forgot_password')}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-sm text-gray-900 bg-gray-50/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#D4AF37] to-[#C6A15B] text-[#0A0D16] hover:brightness-110 shadow-md transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <span>{t('auth.authenticating')}</span>
                ) : (
                  <>
                    <span>{t('auth.sign_in_console')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center text-xs text-gray-500">
              {t('auth.new_to_trizen')}{' '}
              <button
                onClick={() => setCurrentView('register')}
                className="font-bold text-[#64152F] hover:underline"
              >
                {t('auth.create_account_link')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#D4AF37]">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-base text-[#0D1224] flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#D4AF37]" />
                {t('auth.reset_title')}
              </h3>
              <button
                onClick={() => {
                  setShowForgotModal(false);
                  setResetToken(null);
                  setResetStatus(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="py-4 space-y-4">
              {resetStatus && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
                  {resetStatus}
                </div>
              )}

              {!resetToken ? (
                <form onSubmit={handleForgotSubmit} className="space-y-3">
                  <p className="text-xs text-gray-600">
                    {t('auth.reset_desc')}
                  </p>
                  <input
                    type="text"
                    required
                    placeholder="e.g. owner.kanchi@trizen.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-[#D4AF37] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg bg-[#D4AF37] text-[#0A0D16] font-bold text-xs hover:brightness-110 transition-all"
                  >
                    {t('auth.generate_token')}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleResetSubmit} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">Generated Reset Token</label>
                    <input
                      type="text"
                      readOnly
                      value={resetToken}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-mono bg-gray-50 text-gray-600"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">{t('auth.new_password')}</label>
                    <input
                      type="password"
                      required
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg bg-[#64152F] text-white font-bold text-xs hover:brightness-110 transition-all"
                  >
                    {t('auth.save_password')}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
