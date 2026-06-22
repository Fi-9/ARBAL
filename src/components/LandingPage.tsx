import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Archive,
  Shield,
  Users,
  FileText,
  BarChart3,
  Lock,
  ChevronRight,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Layers,
  Database,
  Search,
  Download,
  Trash2,
  UserCog,
  Clock,
  HardDrive,
  ChevronLeft,
  School,
  Zap,
} from 'lucide-react';

interface LandingPageProps {
  onNavigateToLogin: () => void;
}

const features = [
  {
    icon: BarChart3,
    title: 'Dashboard Analitik',
    description: 'Pantau rasio kelengkapan dokumen, status keaktifan siswa, dan statistik arsip secara real-time dalam satu tampilan.',
    color: 'from-emerald-500 to-teal-600',
    bgGlow: 'bg-emerald-500/10',
  },
  {
    icon: FileText,
    title: 'Arsip Digital Terpusat',
    description: 'Simpan dan kelola seluruh dokumen kependudukan siswa (Ijazah, KK, Akta, Rapor, dll) dalam format digital yang terstruktur.',
    color: 'from-blue-500 to-indigo-600',
    bgGlow: 'bg-blue-500/10',
  },
  {
    icon: Users,
    title: 'Registrasi Multi-Step',
    description: 'Formulir pendaftaran siswa baru yang terstruktur dalam 5 langkah: Biodata, Akademik, Keluarga, Dokumen, dan Review.',
    color: 'from-violet-500 to-purple-600',
    bgGlow: 'bg-violet-500/10',
  },
  {
    icon: Shield,
    title: 'Keamanan & Hak Akses',
    description: 'Sistem role-based access control dengan level Super Admin dan Guru/Wali Kelas untuk menjaga privasi data siswa.',
    color: 'from-amber-500 to-orange-600',
    bgGlow: 'bg-amber-500/10',
  },
  {
    icon: Search,
    title: 'Pencarian & Filter Cerdas',
    description: 'Temukan data siswa secara instan dengan filter berdasarkan nama, NISN, kelas, status verifikasi, dan kelengkapan arsip.',
    color: 'from-cyan-500 to-blue-600',
    bgGlow: 'bg-cyan-500/10',
  },
  {
    icon: HardDrive,
    title: 'Backup & Restore',
    description: 'Cadangkan seluruh data arsip secara berkala dan pulihkan kapan saja. Data siswa terhapus tersimpan 30 hari di Trash Bin.',
    color: 'from-rose-500 to-pink-600',
    bgGlow: 'bg-rose-500/10',
  },
];

const screenshots = [
  {
    src: '/screenshots/dashboard.png',
    title: 'Dashboard Analitik',
    description: 'Ringkasan visual lengkap tentang status arsip dan data siswa',
  },
  {
    src: '/screenshots/directory.png',
    title: 'Direktori Arsip Siswa',
    description: 'Kelola dan filter seluruh data siswa dengan mudah',
  },
  {
    src: '/screenshots/form.png',
    title: 'Formulir Registrasi',
    description: 'Input data siswa baru dengan formulir multi-step yang intuitif',
  },
];
const stats = [
  { value: '100%', label: 'Digital & Paperless', icon: Zap },
  { value: '6+', label: 'Jenis Dokumen', icon: FileText },
  { value: '5', label: 'Langkah Registrasi', icon: Layers },
  { value: '24/7', label: 'Akses Kapan Saja', icon: Clock },
];

const IntroScreen = ({ onComplete }: { onComplete: () => void }) => {
  const text = "WELCOME TO ARBAL, THE ARCHIVER OF MUSTAQBAL";
  const words = text.split(" ");

  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2800); // 2.8 seconds intro duration
    return () => clearTimeout(timer);
  }, [onComplete]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
      },
    },
  };

  const wordVariants = {
    hidden: { opacity: 0, y: 15, filter: 'blur(8px)', scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      scale: 1,
      transition: {
        type: 'spring',
        damping: 12,
        stiffness: 90,
      } as any,
    },
  };

  const logoVariants = {
    hidden: { scale: 0.7, opacity: 0, filter: 'blur(10px)' },
    visible: {
      scale: 1,
      opacity: 1,
      filter: 'blur(0px)',
      transition: {
        duration: 0.8,
        ease: 'easeOut',
      } as any,
    },
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(20px)' }}
      transition={{ duration: 0.7, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 overflow-hidden"
    >
      {/* Background glow */}
      <div className="absolute w-[450px] h-[450px] bg-emerald-500/5 rounded-full blur-[120px] animate-pulse pointer-events-none" />

      {/* Glowing Logo */}
      <motion.div
        variants={logoVariants}
        initial="hidden"
        animate="visible"
        className="relative mb-8"
      >
        <div className="absolute -inset-3 bg-emerald-500/20 rounded-3xl blur-xl animate-pulse" />
        <div className="relative w-24 h-24 bg-slate-900 border border-emerald-500/30 rounded-3xl flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.15)]">
          <Archive className="w-12 h-12 text-emerald-400" />
        </div>
      </motion.div>

      {/* Staggered Text - emerging from shadow & blur */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-wrap justify-center gap-x-3 gap-y-2 max-w-2xl px-6 text-center select-none"
      >
        {words.map((word, i) => (
          <motion.span
            key={i}
            variants={wordVariants}
            className="font-mono text-xl sm:text-2xl md:text-3xl text-emerald-400 font-extrabold uppercase tracking-wider drop-shadow-[0_0_12px_rgba(16,185,129,0.25)]"
          >
            {word}
          </motion.span>
        ))}
      </motion.div>
    </motion.div>
  );
};

export default function LandingPage({ onNavigateToLogin }: LandingPageProps) {
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isIntro, setIsIntro] = useState(true);

  // Auto-rotate screenshots
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveScreenshot((prev) => (prev + 1) % screenshots.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Track scroll for navbar effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = document.getElementById('landing-scroll-container');
      if (scrollContainer) {
        setIsScrolled(scrollContainer.scrollTop > 50);
      }
    };
    const container = document.getElementById('landing-scroll-container');
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* Splash Screen Intro */}
      <AnimatePresence>
        {isIntro && <IntroScreen onComplete={() => setIsIntro(false)} />}
      </AnimatePresence>

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[128px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-500/3 rounded-full blur-[150px]" />
      </div>

      {/* Scrollable container */}
      <div id="landing-scroll-container" className="relative z-10 h-screen overflow-y-auto scroll-smooth">

        {/* Sticky Navigation */}
        <nav className={`sticky top-0 z-50 transition-all duration-500 ${isScrolled ? 'bg-slate-950/80 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'} ${isIntro ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-emerald-500/15 rounded-xl border border-emerald-500/20 flex items-center justify-center">
                <Archive className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <span className="text-base font-bold text-white tracking-tight">ARBAL</span>
                <span className="hidden sm:inline text-xs text-slate-500 ml-2">Arsip Mustaqbal</span>
              </div>
            </div>
            <button
              onClick={onNavigateToLogin}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-5 py-2 rounded-xl transition-all duration-200 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Masuk ke Portal</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </nav>

        {/* ═══ HERO SECTION ═══ */}
        <section className="relative pt-16 sm:pt-24 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto text-center">
            {/* Header Welcome Badge */}
            <div className="relative mb-8 flex items-center justify-center z-10">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: isIntro ? 0 : 1, scale: isIntro ? 0.95 : 1 }}
                transition={{ duration: 0.6, delay: isIntro ? 0 : 0.2 }}
                className="font-mono text-[9px] sm:text-xs text-emerald-400 font-bold uppercase tracking-[0.2em] bg-emerald-500/5 border border-emerald-500/10 rounded-lg px-4 py-1.5 backdrop-blur-xs shadow-xs inline-flex items-center space-x-2.5 select-none"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>WELCOME TO ARBAL, THE ARCHIVER OF MUSTAQBAL</span>
              </motion.div>
            </div>

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isIntro ? 0 : 1, y: isIntro ? 20 : 0 }}
              transition={{ duration: 0.6, delay: isIntro ? 0 : 0.35 }}
              className="inline-flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-8"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-300 tracking-wide">Portal Arsip Siswa PKBM Teknologi Mustaqbal</span>
            </motion.div>

            {/* Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: isIntro ? 0 : 1, y: isIntro ? 30 : 0 }}
              transition={{ duration: 0.7, delay: isIntro ? 0 : 0.45 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight"
            >
              <span className="text-white">Kelola Arsip Siswa</span>
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Secara Digital & Terpusat
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isIntro ? 0 : 1, y: isIntro ? 20 : 0 }}
              transition={{ duration: 0.7, delay: isIntro ? 0 : 0.5 }}
              className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed"
            >
              <strong className="text-slate-300">ARBAL</strong> adalah sistem manajemen arsip digital yang dirancang khusus untuk
              menyimpan, mengelola, dan memantau kelengkapan dokumen kependudukan siswa secara{' '}
              <span className="text-emerald-400 font-medium">aman</span>,{' '}
              <span className="text-emerald-400 font-medium">terstruktur</span>, dan{' '}
              <span className="text-emerald-400 font-medium">efisien</span>.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isIntro ? 0 : 1, y: isIntro ? 20 : 0 }}
              transition={{ duration: 0.7, delay: isIntro ? 0 : 0.6 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <button
                onClick={onNavigateToLogin}
                className="group flex items-center space-x-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold px-8 py-3.5 rounded-xl transition-all duration-300 shadow-xl shadow-emerald-600/25 hover:shadow-emerald-500/40 hover:scale-[1.03] active:scale-[0.98]"
              >
                <span>Mulai Sekarang</span>
                <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
              </button>
              <a
                href="#features"
                className="flex items-center space-x-2 text-slate-400 hover:text-white text-sm font-medium transition-colors px-6 py-3.5 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5"
              >
                <span>Lihat Fitur</span>
                <ChevronRight size={14} />
              </a>
            </motion.div>

            {/* Hero Screenshot Preview */}
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: isIntro ? 0 : 1, y: isIntro ? 50 : 0, scale: isIntro ? 0.95 : 1 }}
              transition={{ duration: 0.9, delay: isIntro ? 0 : 0.7 }}
              className="mt-16 relative"
            >
              <div className="absolute -inset-4 bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent rounded-3xl blur-2xl" />
              <div className="relative bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-white/10 p-2 shadow-2xl shadow-black/50 overflow-hidden">
                <div className="flex items-center space-x-1.5 px-3 py-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                  <span className="ml-3 text-[10px] text-slate-500 font-mono">arbal.app — Dashboard Analitik</span>
                </div>
                <img
                  src="/screenshots/dashboard.png"
                  alt="ARBAL Dashboard Preview"
                  className="w-full rounded-lg"
                  loading="lazy"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* ═══ STATS BAR ═══ */}
        <section className="relative py-12 border-y border-white/5 bg-white/[0.02]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-emerald-500/10 rounded-xl mb-3">
                    <stat.icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ FEATURES GRID ═══ */}
        <section id="features" className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Section header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <span className="inline-block bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wider px-3 py-1 rounded-full mb-4 uppercase">
                Fitur Unggulan
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Semua yang Anda Butuhkan
              </h2>
              <p className="mt-4 text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
                ARBAL menyediakan fitur lengkap untuk digitalisasi dan pengelolaan arsip siswa secara profesional.
              </p>
            </motion.div>

            {/* Features grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-black/20"
                >
                  {/* Glow on hover */}
                  <div className={`absolute inset-0 rounded-2xl ${feature.bgGlow} opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl`} />
                  <div className="relative">
                    <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br ${feature.color} shadow-lg mb-4`}>
                      <feature.icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ SCREENSHOT SHOWCASE ═══ */}
        <section className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-transparent via-emerald-950/10 to-transparent">
          <div className="max-w-6xl mx-auto">
            {/* Section header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6 }}
              className="text-center mb-14"
            >
              <span className="inline-block bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold tracking-wider px-3 py-1 rounded-full mb-4 uppercase">
                Tampilan Aplikasi
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Lihat Langsung Tampilannya
              </h2>
              <p className="mt-4 text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
                Antarmuka modern dan intuitif yang dirancang untuk kemudahan penggunaan sehari-hari.
              </p>
            </motion.div>

            {/* Screenshot Carousel */}
            <div className="relative">
              {/* Main screenshot */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="relative"
              >
                <div className="absolute -inset-3 bg-gradient-to-br from-emerald-500/10 via-violet-500/5 to-blue-500/10 rounded-3xl blur-2xl" />
                <div className="relative bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-white/10 p-2 shadow-2xl overflow-hidden">
                  <div className="flex items-center space-x-1.5 px-3 py-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                    <span className="ml-3 text-[10px] text-slate-500 font-mono">
                      arbal.app — {screenshots[activeScreenshot].title}
                    </span>
                  </div>
                  <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-800">
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={activeScreenshot}
                        src={screenshots[activeScreenshot].src}
                        alt={screenshots[activeScreenshot].title}
                        className="w-full h-full object-cover object-top"
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.4 }}
                        loading="lazy"
                      />
                    </AnimatePresence>
                  </div>
                </div>

                {/* Navigation arrows */}
                <button
                  onClick={() => setActiveScreenshot((prev) => (prev - 1 + screenshots.length) % screenshots.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition z-10"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setActiveScreenshot((prev) => (prev + 1) % screenshots.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 backdrop-blur-sm rounded-full border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition z-10"
                >
                  <ChevronRight size={18} />
                </button>
              </motion.div>

              {/* Thumbnail tabs */}
              <div className="mt-6 flex items-center justify-center gap-4">
                {screenshots.map((ss, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveScreenshot(i)}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl border transition-all duration-300 text-left ${
                      i === activeScreenshot
                        ? 'bg-emerald-500/10 border-emerald-500/30 shadow-lg shadow-emerald-500/5'
                        : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full transition-colors ${i === activeScreenshot ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                    <div>
                      <div className={`text-xs font-semibold transition-colors ${i === activeScreenshot ? 'text-emerald-300' : 'text-slate-400'}`}>
                        {ss.title}
                      </div>
                      <div className="text-[10px] text-slate-500 hidden sm:block">{ss.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ HOW IT WORKS ═══ */}
        <section className="relative py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <span className="inline-block bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold tracking-wider px-3 py-1 rounded-full mb-4 uppercase">
                Cara Kerja
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Tiga Langkah Mudah
              </h2>
              <p className="mt-4 text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
                Mulai kelola arsip siswa dalam hitungan menit.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: '01',
                  title: 'Login ke Portal',
                  desc: 'Masuk menggunakan akun yang telah didaftarkan oleh administrator sekolah.',
                  icon: Lock,
                  color: 'from-emerald-400 to-teal-500',
                },
                {
                  step: '02',
                  title: 'Input Data Siswa',
                  desc: 'Isi formulir registrasi lengkap termasuk biodata, dokumen kependudukan, dan unggah berkas.',
                  icon: FileText,
                  color: 'from-blue-400 to-indigo-500',
                },
                {
                  step: '03',
                  title: 'Pantau & Kelola',
                  desc: 'Dashboard menampilkan semua statistik, kelengkapan dokumen, dan aksi cepat yang dibutuhkan.',
                  icon: BarChart3,
                  color: 'from-violet-400 to-purple-500',
                },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  className="relative text-center"
                >
                  {/* Connector line (between cards) */}
                  {i < 2 && (
                    <div className="hidden md:block absolute top-14 left-[60%] w-[80%] h-px bg-gradient-to-r from-white/10 to-transparent" />
                  )}
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} shadow-xl mb-5`}>
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Langkah {item.step}</div>
                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ CTA SECTION ═══ */}
        <section className="relative py-24 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative"
            >
              {/* Glow background */}
              <div className="absolute -inset-8 bg-gradient-to-r from-emerald-600/10 via-teal-600/10 to-cyan-600/10 rounded-3xl blur-3xl" />

              <div className="relative bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08] rounded-3xl p-10 sm:p-14">
                <div className="w-16 h-16 bg-emerald-500/15 rounded-2xl border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                  <Archive className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
                  Siap Mendigitalkan Arsip?
                </h2>
                <p className="text-slate-400 max-w-lg mx-auto mb-8 text-sm sm:text-base leading-relaxed">
                  Bergabunglah dengan PKBM Teknologi Mustaqbal dalam mengelola arsip siswa secara modern,
                  aman, dan efisien. Cukup login untuk memulai.
                </p>
                <button
                  onClick={onNavigateToLogin}
                  className="group inline-flex items-center space-x-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-base font-bold px-10 py-4 rounded-2xl transition-all duration-300 shadow-2xl shadow-emerald-600/30 hover:shadow-emerald-500/50 hover:scale-[1.03] active:scale-[0.98]"
                >
                  <span>Ayo Coba Sekarang! 🚀</span>
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ═══ FOOTER ═══ */}
        <footer className="relative py-8 px-4 sm:px-6 lg:px-8 border-t border-white/5">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2 text-slate-500 text-xs">
              <School size={14} />
              <span>© 2026 PKBM Teknologi Mustaqbal — Hak Cipta Dilindungi</span>
            </div>
            <div className="flex items-center space-x-1.5 text-slate-600 text-xs">
              <Lock size={12} />
              <span>Data terenkripsi & tersimpan secara lokal</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
