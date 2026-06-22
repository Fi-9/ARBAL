import React, { useState } from 'react';
import { useLoginMutation } from '../hooks/useAuth';
import { getFriendlyErrorMessage } from '../lib/error';
import { AnimatePresence, motion } from 'motion/react';
import {
  ShieldCheck,
  School,
  Archive,
  Eye,
  EyeOff,
  ArrowLeft,
} from 'lucide-react';
import LandingPage from './LandingPage';

export default function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const loginMutation = useLoginMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    loginMutation.mutate({ email: email.trim(), password });
  };

  const errorMessage = loginMutation.error
    ? getFriendlyErrorMessage(loginMutation.error)
    : null;

  // If not showing login, render the Landing Page
  if (!showLogin) {
    return <LandingPage onNavigateToLogin={() => setShowLogin(true)} />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="login-form"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex items-center justify-center p-4 relative overflow-hidden"
      >
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-1/4 left-1/4 w-[350px] h-[350px] bg-teal-500/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 w-full max-w-md">
          {/* Back to Landing Page */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            onClick={() => setShowLogin(false)}
            className="flex items-center space-x-2 text-slate-400 hover:text-white text-sm font-medium mb-8 transition-colors group"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
            <span>Kembali ke Beranda</span>
          </motion.button>

          {/* Logo / Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 mb-4">
              <Archive className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">ARBAL</h1>
            <p className="text-sm text-slate-400 mt-1">
              Arsip Mustaqbal — Portal Arsip Siswa
            </p>
          </motion.div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-200"
          >
            <div className="flex items-center space-x-2 mb-6">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-800">Masuk ke Portal</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
                >
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@domainsekolah.sch.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 placeholder:text-slate-400"
                  disabled={loginMutation.isPending}
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
                >
                  Kata Sandi
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg px-3.5 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 placeholder:text-slate-400"
                    disabled={loginMutation.isPending}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-lg px-3.5 py-2.5">
                  {errorMessage}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold py-2.5 rounded-lg transition shadow-sm hover:shadow-emerald-600/10 flex items-center justify-center space-x-2"
              >
                {loginMutation.isPending ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <span>Masuk ke Portal</span>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-center space-x-1.5 text-xs text-slate-400">
                <School size={12} />
                <span>PKBM Teknologi Mustaqbal</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
