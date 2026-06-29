import React, { useState, useEffect } from 'react';
import { studentService } from '../services/student.service';
import { useStudentFormStore, DocsUploadedState } from '../stores/studentForm.store';
import { useToastStore } from '../stores/toast.store';
import { useAuthStore } from '../stores/auth.store';
import { getFriendlyErrorMessage } from '../lib/error';
import { 
  ArrowLeft, 
  Save, 
  X, 
  Plus, 
  AlertCircle, 
  Trash2,
  RefreshCw,
  Edit2
} from 'lucide-react';
import { Student, StudentStatus, RoleType } from '../types';

interface StudentFormViewProps {
  editingStudent: Student | null;
  onSaveStudent: (student: Student) => void;
  onCancel: () => void;
  selectedRole: RoleType;
  onAddNotification: (title: string, message: string, type: 'info' | 'success' | 'warning') => void;
  isSaving?: boolean;
}

export default function StudentFormView({
  editingStudent,
  onSaveStudent,
  onCancel,
  selectedRole,
  onAddNotification,
  isSaving = false
}: StudentFormViewProps) {
  const addToast = useToastStore((state) => state.addToast);
  const permissions = useAuthStore((state) => state.permissions);
  const isReadOnly = !permissions.includes('student.write');

  // Read all states and actions from the Zustand store
  const {
    nama,
    namaPanggilan,
    nik,
    nomorKK,
    nisn,
    jenisKelamin,
    tempatLahir,
    tanggalLahir,
    email,
    telepon,
    alamat,

    academicYearId,
    angkatan,
    status,
    kelas,
    jurusan,
    asalSekolah,
    tahunLulusSebelumnya,
    anakKe,
    jumlahSaudara,
    photoUrl,
    catatan,
    nisSekolah,
    registrationNumber,
    graduationYear,
    certificateNumber,

    namaAyah,
    pekerjaanAyah,
    ktpAyah,
    teleponAyah,
    pendidikanAyah,
    statusAyah,
    namaIbu,
    pekerjaanIbu,
    ktpIbu,
    teleponIbu,
    pendidikanIbu,
    statusIbu,
    namaWali,
    hubunganWali,
    teleponWali,
    alamatWali,
    teleponOrangTua,
    alamatOrangTua,

    activeTab,
    loadedStudentId,
    docsUploaded,
    pendingFiles,
    uploadProgress,
    uploadErrors,

    setField,
    loadStudent,
    clearForm,
    addPendingFile,
    removePendingFile,
    setDocsUploaded,
  } = useStudentFormStore();

  const [step1Errors, setStep1Errors] = useState<string[]>([]);
  const [step2Errors, setStep2Errors] = useState<string[]>([]);
  const [step3Errors, setStep3Errors] = useState<string[]>([]);

  const formatSize = (bytes: number) => {
    if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  const handleFileChange = (key: string, file: File | null) => {
    if (file) {
      addPendingFile(key, file);
      setDocsUploaded((prev) => ({
        ...prev,
        [key]: {
          name: file.name,
          size: formatSize(file.size),
          status: 'Verifikasi',
        },
      }));
    } else {
      removePendingFile(key);
      if (editingStudent) {
        const docTypeMap: Record<string, string> = {
          'kk': 'Kartu Keluarga',
          'akta': 'Akta Kelahiran',
          'ijazah': 'Ijazah Terakhir',
          'rapor': 'Rapor',
          'pasFoto': 'Pas Foto',
          'skl': 'Surat Keterangan Lulus',
        };
        const origType = docTypeMap[key];
        const originalDoc = editingStudent.documents.find((d) => d.type === origType);
        if (originalDoc) {
          setDocsUploaded((prev) => ({
            ...prev,
            [key]: {
              name: originalDoc.name,
              size: originalDoc.size,
              status: originalDoc.status === 'Terarsip' ? 'Terarsip' : 'Verifikasi',
            },
          }));
        } else {
          setDocsUploaded((prev) => ({ ...prev, [key]: null }));
        }
      } else {
        setDocsUploaded((prev) => ({ ...prev, [key]: null }));
      }
    }
  };

  // Error border styling helper
  const errClsStep1 = (key: string) =>
    step1Errors.some(e => e.startsWith(key))
      ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500 ring-1 ring-rose-200'
      : 'border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200';

  const errClsStep2 = (key: string) =>
    step2Errors.some(e => e.startsWith(key))
      ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500 ring-1 ring-rose-200'
      : 'border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200';

  const errClsStep3 = (key: string) =>
    step3Errors.some(e => e.startsWith(key))
      ? 'border-rose-400 bg-rose-50/50 focus:border-rose-500 ring-1 ring-rose-200'
      : 'border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200';

  const clearErrStep1 = (key: string) =>
    setStep1Errors(prev => prev.filter(k => !k.startsWith(key)));

  const clearErrStep2 = (key: string) =>
    setStep2Errors(prev => prev.filter(k => !k.startsWith(key)));

  const clearErrStep3 = (key: string) =>
    setStep3Errors(prev => prev.filter(k => !k.startsWith(key)));

  const validateStep1 = (): boolean => {
    const errors: string[] = [];
    if (!nama.trim()) errors.push('nama');
    if (!jenisKelamin) errors.push('jenisKelamin');
    if (!tempatLahir.trim()) errors.push('tempatLahir');
    if (!tanggalLahir) errors.push('tanggalLahir');
    if (!alamat.trim()) errors.push('alamat');

    // NIK & KK 16 digit checks if filled
    if (nik.trim() && !/^\d{16}$/.test(nik.trim())) errors.push('nik_length');
    if (nomorKK.trim() && !/^\d{16}$/.test(nomorKK.trim())) errors.push('nomorKK_length');
    
    // NISN 10 digit check if filled
    if (nisn.trim() && !/^\d{10}$/.test(nisn.trim())) errors.push('nisn_length');
    
    // Email format validation
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.push('email_format');

    setStep1Errors(errors);
    return errors.length === 0;
  };

  const validateStep2 = (): boolean => {
    const errors: string[] = [];
    if (!academicYearId) errors.push('academicYearId');
    if (!angkatan) errors.push('angkatan');
    if (!status) errors.push('status');
    if (!kelas) errors.push('kelas');
    if (!asalSekolah.trim()) errors.push('asalSekolah');
    
    if (tahunLulusSebelumnya !== '' && isNaN(Number(tahunLulusSebelumnya))) {
      errors.push('tahunLulusSebelumnya_number');
    }

    setStep2Errors(errors);
    return errors.length === 0;
  };

  const validateStep3 = (): boolean => {
    const errors: string[] = [];
    
    if (ktpAyah.trim() && !/^\d{16}$/.test(ktpAyah.trim())) errors.push('ktpAyah_length');
    if (ktpIbu.trim() && !/^\d{16}$/.test(ktpIbu.trim())) errors.push('ktpIbu_length');

    if (anakKe === undefined || anakKe === '' || anakKe === null) {
      errors.push('anakKe');
    } else {
      const val = Number(anakKe);
      if (isNaN(val) || val < 1 || val > 20) {
        errors.push('anakKe_range');
      }
    }

    if (jumlahSaudara === undefined || jumlahSaudara === '' || jumlahSaudara === null) {
      errors.push('jumlahSaudara');
    } else {
      const val = Number(jumlahSaudara);
      if (isNaN(val) || val < 0 || val > 20) {
        errors.push('jumlahSaudara_range');
      }
    }

    setStep3Errors(errors);
    return errors.length === 0;
  };

  const handleGoToStep = (targetStep: 'biodata' | 'akademik' | 'keluarga' | 'dokumen' | 'review') => {
    const stepsList: Array<'biodata' | 'akademik' | 'keluarga' | 'dokumen' | 'review'> = [
      'biodata',
      'akademik',
      'keluarga',
      'dokumen',
      'review'
    ];
    const currentIndex = stepsList.indexOf(activeTab);
    const targetIndex = stepsList.indexOf(targetStep);

    if (targetIndex > currentIndex) {
      if (currentIndex >= 0 && !validateStep1()) {
        addToast('Lengkapi data diri siswa dengan benar sebelum melanjutkan.', 'warning');
        return;
      }
      if (currentIndex >= 1 && !validateStep2()) {
        addToast('Lengkapi data akademik siswa dengan benar sebelum melanjutkan.', 'warning');
        return;
      }
      if (currentIndex >= 2 && !validateStep3()) {
        addToast('Lengkapi data keluarga/orang tua dengan benar sebelum melanjutkan.', 'warning');
        return;
      }
    }
    setField('activeTab', targetStep);
  };

  // Academic Years & Classes states
  const [academicYears, setAcademicYears] = useState<{ id: string; name: string; isActive: boolean }[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string; isActive: boolean; description?: string }[]>([]);
  const [showManageAyModal, setShowManageAyModal] = useState(false);
  const [showManageClassesModal, setShowManageClassesModal] = useState(false);
  
  const [newAyName, setNewAyName] = useState('');
  const [isAddingAy, setIsAddingAy] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [isSavingClass, setIsSavingClass] = useState(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editingClassName, setEditingClassName] = useState('');
  const [editingClassDesc, setEditingClassDesc] = useState('');

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const loadPendingFilesFromIndexedDB = useStudentFormStore((state) => state.loadPendingFilesFromIndexedDB);

  // Fetch initial data on mount
  useEffect(() => {
    studentService.getAcademicYears().then(years => {
      setAcademicYears(years);
    });
    studentService.getClasses().then(cls => {
      setClasses(cls);
    });
    loadPendingFilesFromIndexedDB();
  }, []);

  // Auto-derive angkatan when academicYearId is selected
  useEffect(() => {
    if (academicYearId && academicYears.length > 0) {
      const selected = academicYears.find(y => y.id === academicYearId);
      if (selected) {
        const startYear = parseInt(selected.name.split('/')[0]);
        if (!isNaN(startYear)) {
          setField('angkatan', startYear);
        }
      }
    }
  }, [academicYearId, academicYears, setField]);

  // Sync editing student or clear form
  useEffect(() => {
    if (editingStudent) {
      if (loadedStudentId !== editingStudent.id) {
        loadStudent(editingStudent);
      }
    } else {
      if (loadedStudentId !== 'new') {
        clearForm();
        setField('loadedStudentId', 'new');
      }
    }
  }, [editingStudent, loadedStudentId, loadStudent, clearForm, setField]);

  const handleAddAcademicYear = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newAyName.trim();
    if (!trimmed) {
      addToast('Nama Tahun Ajaran tidak boleh kosong!', 'warning');
      return;
    }
    if (!/^\d{4}\/\d{4}$/.test(trimmed)) {
      addToast('Format Tahun Ajaran harus YYYY/YYYY (contoh: 2025/2026)!', 'warning');
      return;
    }

    setIsAddingAy(true);
    try {
      const created = await studentService.createAcademicYear(trimmed);
      const updatedList = [created, ...academicYears].sort((a, b) => b.name.localeCompare(a.name));
      setAcademicYears(updatedList);
      setField('academicYearId', created.id);
      setShowManageAyModal(false);
      setNewAyName('');

      onAddNotification(
        'Tahun Ajaran Baru',
        `Tahun Ajaran ${trimmed} berhasil dibuat.`,
        'success'
      );
    } catch (err: any) {
      addToast(`Gagal menyimpan: ${getFriendlyErrorMessage(err)}`, 'error');
    } finally {
      setIsAddingAy(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    if (!validateStep1()) {
      setField('activeTab', 'biodata');
      addToast('Terdapat kesalahan di data diri siswa.', 'warning');
      return;
    }
    if (!validateStep2()) {
      setField('activeTab', 'akademik');
      addToast('Terdapat kesalahan di data akademik siswa.', 'warning');
      return;
    }
    if (!validateStep3()) {
      setField('activeTab', 'keluarga');
      addToast('Terdapat kesalahan di data keluarga/orang tua.', 'warning');
      return;
    }

    const studentData: Student = {
      id: editingStudent ? editingStudent.id : `S00${Math.floor(Math.random() * 900) + 100}`,
      nama,
      nisn: nisn || undefined,
      nisSekolah: nisSekolah || undefined,
      registrationNumber: registrationNumber || undefined,
      angkatan: angkatan || undefined,
      kelas,
      jurusan,
      email,
      telepon,
      alamat,
      tanggalLahir,
      status: status || undefined,
      catatan,
      createdAt: editingStudent?.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 16),
      documents: editingStudent?.documents || [],
      academicYearId: academicYearId || undefined,
      graduationYear: graduationYear ? parseInt(graduationYear) : undefined,
      certificateNumber: certificateNumber || undefined,

      // Biodata baru
      namaPanggilan: namaPanggilan || undefined,
      nik: nik || undefined,
      nomorKK: nomorKK || undefined,
      jenisKelamin: jenisKelamin || undefined,
      tempatLahir: tempatLahir || undefined,
      asalSekolah: asalSekolah || undefined,
      tahunLulusSebelumnya: tahunLulusSebelumnya !== '' ? Number(tahunLulusSebelumnya) : undefined,
      anakKe: anakKe !== '' ? Number(anakKe) : undefined,
      jumlahSaudara: jumlahSaudara !== '' ? Number(jumlahSaudara) : undefined,
      photoUrl: photoUrl || undefined,

      // Parents details
      namaAyah: namaAyah || undefined,
      pekerjaanAyah: pekerjaanAyah || undefined,
      ktpAyah: ktpAyah || undefined,
      teleponAyah: teleponAyah || undefined,
      namaIbu: namaIbu || undefined,
      pekerjaanIbu: pekerjaanIbu || undefined,
      ktpIbu: ktpIbu || undefined,
      teleponIbu: teleponIbu || undefined,
      teleponOrangTua: teleponOrangTua || undefined,
      alamatOrangTua: alamatOrangTua || undefined,

      // New family details
      pendidikanAyah: pendidikanAyah || undefined,
      statusAyah: statusAyah || undefined,
      pendidikanIbu: pendidikanIbu || undefined,
      statusIbu: statusIbu || undefined,
      namaWali: namaWali || undefined,
      hubunganWali: hubunganWali || undefined,
      teleponWali: teleponWali || undefined,
      alamatWali: alamatWali || undefined,
    };

    onSaveStudent(studentData);
  };

  return (
    <div id="student-form-view" className="space-y-6">
      
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onCancel}
            className="flex items-center justify-center p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition text-slate-600 shadow-xs"
            title="Kembali ke Daftar Murid"
            disabled={isSaving}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h3 className="text-base font-extrabold text-slate-800 tracking-tight">
              {editingStudent ? `Sunting Profil: ${nama}` : 'Registrasi Siswa Baru'}
            </h3>
            <p className="text-xs text-slate-500">
              {editingStudent ? 'Sunting identitas kependudukan, akademik, dan walimurid.' : 'Formulir pendaftaran digital siswa PKBM Teknologi Mustaqbal.'}
            </p>
          </div>
        </div>
      </div>

      {/* Guru Read-Only Mode Banner */}
      {isReadOnly && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} className="text-amber-600 shrink-0" />
          <span className="font-semibold text-xs">Mode Peninjauan (Guru): Data bersifat baca-saja dan tidak dapat disunting.</span>
        </div>
      )}

      {/* STEP PROGRESS CONTROLS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between overflow-x-auto">
        <div className="flex items-center space-x-6 mx-auto py-1">
          {/* Step 1 */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); handleGoToStep('biodata'); }}
            className="flex items-center space-x-2 text-left focus:outline-none"
            disabled={isSaving}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition ${
              activeTab === 'biodata'
                ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                : 'bg-slate-100 text-slate-500'
            }`}>
              1
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-slate-800 leading-none">Biodata</p>
              <p className="text-[8px] text-slate-400 mt-0.5">Identitas</p>
            </div>
          </button>

          <div className="w-8 h-px bg-slate-200"></div>

          {/* Step 2 */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); handleGoToStep('akademik'); }}
            className="flex items-center space-x-2 text-left focus:outline-none"
            disabled={isSaving}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition ${
              activeTab === 'akademik'
                ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                : 'bg-slate-100 text-slate-500'
            }`}>
              2
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-slate-800 leading-none">Akademik</p>
              <p className="text-[8px] text-slate-400 mt-0.5">Sekolah</p>
            </div>
          </button>

          <div className="w-8 h-px bg-slate-200"></div>

          {/* Step 3 */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); handleGoToStep('keluarga'); }}
            className="flex items-center space-x-2 text-left focus:outline-none"
            disabled={isSaving}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition ${
              activeTab === 'keluarga'
                ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                : 'bg-slate-100 text-slate-500'
            }`}>
              3
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-slate-800 leading-none">Keluarga</p>
              <p className="text-[8px] text-slate-400 mt-0.5">Orang Tua</p>
            </div>
          </button>

          <div className="w-8 h-px bg-slate-200"></div>

          {/* Step 4 */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); handleGoToStep('dokumen'); }}
            className="flex items-center space-x-2 text-left focus:outline-none"
            disabled={isSaving}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition ${
              activeTab === 'dokumen'
                ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                : 'bg-slate-100 text-slate-500'
            }`}>
              4
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-slate-800 leading-none">Dokumen</p>
              <p className="text-[8px] text-slate-400 mt-0.5">Unggah Berkas</p>
            </div>
          </button>

          <div className="w-8 h-px bg-slate-200"></div>

          {/* Step 5 */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); handleGoToStep('review'); }}
            className="flex items-center space-x-2 text-left focus:outline-none"
            disabled={isSaving}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition ${
              activeTab === 'review'
                ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                : 'bg-slate-100 text-slate-500'
            }`}>
              5
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-slate-800 leading-none">Review</p>
              <p className="text-[8px] text-slate-400 mt-0.5">Simpan Data</p>
            </div>
          </button>
        </div>
      </div>

      {/* FORM CONTENT CONTAINER */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <form 
          onSubmit={handleSubmit} 
          onKeyDown={(e) => {
            if (e.key === 'Enter' && activeTab !== 'review') {
              const target = e.target as HTMLElement;
              if (target.tagName.toLowerCase() !== 'textarea') {
                e.preventDefault();
              }
            }
          }}
          className="p-6 space-y-6 text-xs"
        >
          
          {/* STEP 1: BIODATA SISWA */}
          {activeTab === 'biodata' && (
            <div className="space-y-6">
              
              {/* Group 1.1: Identitas Utama */}
              <div className="p-5 bg-slate-50/30 rounded-xl border border-slate-150 space-y-4">
                <h5 className="font-extrabold text-slate-700 tracking-tight flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="w-1.5 h-3 bg-emerald-500 rounded-sm"></span>
                  IDENTITAS UTAMA SISWA
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Nama Lengkap */}
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">
                      Nama Lengkap <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Masukkan nama lengkap sesuai ijazah/akta..."
                      value={nama}
                      onChange={(e) => {
                        setField('nama', e.target.value);
                        if (e.target.value.trim()) clearErrStep1('nama');
                      }}
                      className={`w-full bg-white text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border focus:outline-none transition ${errClsStep1('nama')}`}
                      required
                      disabled={isReadOnly || isSaving}
                    />
                    {step1Errors.includes('nama') && (
                      <p className="text-[10px] text-rose-500 mt-1 font-semibold">Nama Lengkap wajib diisi.</p>
                    )}
                  </div>

                  {/* Nama Panggilan */}
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Nama Panggilan</label>
                    <input
                      type="text"
                      placeholder="Masukkan nama panggilan..."
                      value={namaPanggilan}
                      onChange={(e) => setField('namaPanggilan', e.target.value)}
                      className="w-full bg-white text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                      disabled={isReadOnly || isSaving}
                    />
                  </div>

                  {/* Jenis Kelamin */}
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">
                      Jenis Kelamin <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={jenisKelamin}
                      onChange={(e) => {
                        setField('jenisKelamin', e.target.value as 'LAKI_LAKI' | 'PEREMPUAN' | '');
                        if (e.target.value) clearErrStep1('jenisKelamin');
                      }}
                      className={`w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border focus:outline-none appearance-none transition-colors font-medium ${errClsStep1('jenisKelamin')}`}
                      disabled={isReadOnly || isSaving}
                      required
                    >
                      <option value="">Pilih Jenis Kelamin...</option>
                      <option value="LAKI_LAKI">Laki-laki</option>
                      <option value="PEREMPUAN">Perempuan</option>
                    </select>
                    {step1Errors.includes('jenisKelamin') && (
                      <p className="text-[10px] text-rose-500 mt-1 font-semibold">Jenis Kelamin wajib dipilih.</p>
                    )}
                  </div>

                  {/* Tempat Lahir */}
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">
                      Tempat Lahir <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Masukkan tempat lahir..."
                      value={tempatLahir}
                      onChange={(e) => {
                        setField('tempatLahir', e.target.value);
                        if (e.target.value.trim()) clearErrStep1('tempatLahir');
                      }}
                      className={`w-full bg-white text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border focus:outline-none transition ${errClsStep1('tempatLahir')}`}
                      disabled={isReadOnly || isSaving}
                      required
                    />
                    {step1Errors.includes('tempatLahir') && (
                      <p className="text-[10px] text-rose-500 mt-1 font-semibold">Tempat Lahir wajib diisi.</p>
                    )}
                  </div>

                  {/* Tanggal Lahir */}
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-semibold">
                      Tanggal Lahir <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={tanggalLahir}
                      onChange={(e) => {
                        setField('tanggalLahir', e.target.value);
                        if (e.target.value) clearErrStep1('tanggalLahir');
                      }}
                      className={`w-full bg-white text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border focus:outline-none transition ${errClsStep1('tanggalLahir')}`}
                      required
                      disabled={isReadOnly || isSaving}
                    />
                    {step1Errors.includes('tanggalLahir') && (
                      <p className="text-[10px] text-rose-500 mt-1 font-semibold">Tanggal Lahir wajib diisi.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Group 1.2: Dokumen Kependudukan */}
              <div className="p-5 bg-slate-50/30 rounded-xl border border-slate-150 space-y-4">
                <h5 className="font-extrabold text-slate-700 tracking-tight flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="w-1.5 h-3 bg-blue-500 rounded-sm"></span>
                  DOKUMEN KEPENDUDUKAN
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* NIK */}
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">NIK (16 Digit)</label>
                    <input
                      type="text"
                      placeholder="Masukkan NIK 16 digit..."
                      maxLength={16}
                      value={nik}
                      onChange={(e) => {
                        setField('nik', e.target.value.replace(/\D/g, ''));
                        clearErrStep1('nik');
                      }}
                      className={`w-full bg-white text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border focus:outline-none transition ${errClsStep1('nik')}`}
                      disabled={isReadOnly || isSaving}
                    />
                    {step1Errors.includes('nik_length') && (
                      <p className="text-[10px] text-rose-500 mt-1 font-semibold">NIK harus terdiri dari 16 digit angka.</p>
                    )}
                  </div>

                  {/* Nomor KK */}
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Nomor Kartu Keluarga (16 Digit)</label>
                    <input
                      type="text"
                      placeholder="Masukkan nomor KK 16 digit..."
                      maxLength={16}
                      value={nomorKK}
                      onChange={(e) => {
                        setField('nomorKK', e.target.value.replace(/\D/g, ''));
                        clearErrStep1('nomorKK');
                      }}
                      className={`w-full bg-white text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border focus:outline-none transition ${errClsStep1('nomorKK')}`}
                      disabled={isReadOnly || isSaving}
                    />
                    {step1Errors.includes('nomorKK_length') && (
                      <p className="text-[10px] text-rose-500 mt-1 font-semibold">Nomor KK harus terdiri dari 16 digit angka.</p>
                    )}
                  </div>

                  {/* NISN */}
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">NISN (10 Digit)</label>
                    <input
                      type="text"
                      placeholder="Masukkan NISN 10 digit..."
                      maxLength={10}
                      value={nisn}
                      onChange={(e) => {
                        setField('nisn', e.target.value.replace(/\D/g, ''));
                        clearErrStep1('nisn');
                      }}
                      className={`w-full bg-white text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border focus:outline-none transition ${errClsStep1('nisn')}`}
                      disabled={isReadOnly || isSaving}
                    />
                    {step1Errors.includes('nisn_length') && (
                      <p className="text-[10px] text-rose-500 mt-1 font-semibold">NISN harus terdiri dari 10 digit angka.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Group 1.3: Kontak & Alamat */}
              <div className="p-5 bg-slate-50/30 rounded-xl border border-slate-150 space-y-4">
                <h5 className="font-extrabold text-slate-700 tracking-tight flex items-center gap-2 border-b border-slate-200 pb-2">
                  <span className="w-1.5 h-3 bg-purple-500 rounded-sm"></span>
                  KONTAK SISWA & ALAMAT
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* No HP */}
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Nomor HP / WhatsApp</label>
                    <input
                      type="tel"
                      placeholder="Masukkan nomor telepon seluler..."
                      value={telepon}
                      onChange={(e) => setField('telepon', e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-white text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                      disabled={isReadOnly || isSaving}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Email</label>
                    <input
                      type="email"
                      placeholder="nama.murid@email.com..."
                      value={email}
                      onChange={(e) => {
                        setField('email', e.target.value);
                        clearErrStep1('email');
                      }}
                      className={`w-full bg-white text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border focus:outline-none transition ${errClsStep1('email')}`}
                      disabled={isReadOnly || isSaving}
                    />
                    {step1Errors.includes('email_format') && (
                      <p className="text-[10px] text-rose-500 mt-1 font-semibold">Format email tidak valid.</p>
                    )}
                  </div>
                </div>

                {/* Alamat textarea */}
                <div className="pt-2">
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">
                    Alamat Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Masukkan alamat tinggal lengkap: Jalan, RT/RW, Dusun, Kelurahan/Desa, Kecamatan, Kabupaten/Kota, Provinsi..."
                    value={alamat}
                    onChange={(e) => {
                      setField('alamat', e.target.value);
                      if (e.target.value.trim()) clearErrStep1('alamat');
                    }}
                    className={`w-full bg-white text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border focus:outline-none transition ${errClsStep1('alamat')}`}
                    required
                    disabled={isReadOnly || isSaving}
                  />
                  {step1Errors.includes('alamat') && (
                    <p className="text-[10px] text-rose-500 mt-1 font-semibold">Alamat Lengkap wajib diisi.</p>
                  )}
                </div>
              </div>


            </div>
          )}

          {/* STEP 2: AKADEMIK SISWA */}
          {activeTab === 'akademik' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-slate-800 font-extrabold text-xs uppercase tracking-wide">Langkah 2 — Informasi Akademik & Kesiswaan</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Lengkapi riwayat sekolah dan tahun ajaran registrasi aktif siswa.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Tahun Ajaran */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">
                    Tahun Ajaran <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <select
                        value={academicYearId}
                        onChange={(e) => {
                          setField('academicYearId', e.target.value);
                          if (e.target.value) clearErrStep2('academicYearId');
                        }}
                        className={`w-full bg-slate-50 text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border focus:outline-none appearance-none transition-colors font-medium ${errClsStep2('academicYearId')}`}
                        disabled={isReadOnly || isSaving}
                        required
                      >
                        <option value="">Pilih Tahun Ajaran...</option>
                        {academicYears.map((ay) => (
                          <option key={ay.id} value={ay.id}>
                            {ay.name} {ay.isActive ? '(Aktif)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => setShowManageAyModal(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-2.5 rounded-lg transition shrink-0 shadow-sm cursor-pointer"
                        title="Kelola Tahun Ajaran"
                        disabled={isSaving}
                      >
                        <Plus size={15} />
                      </button>
                    )}
                  </div>
                  {step2Errors.includes('academicYearId') && (
                    <p className="text-[10px] text-rose-500 mt-1 font-semibold">Tahun ajaran wajib dipilih.</p>
                  )}
                </div>

                {/* Angkatan */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">
                    Angkatan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="Contoh: 2026"
                    value={angkatan}
                    onChange={(e) => {
                      setField('angkatan', e.target.value === '' ? '' : parseInt(e.target.value, 10));
                      if (e.target.value) clearErrStep2('angkatan');
                    }}
                    className={`w-full bg-slate-50 text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border focus:outline-none transition font-medium ${errClsStep2('angkatan')}`}
                    disabled={isReadOnly || isSaving}
                    required
                  />
                  {step2Errors.includes('angkatan') && (
                    <p className="text-[10px] text-rose-500 mt-1 font-semibold">Angkatan wajib diisi.</p>
                  )}
                </div>

                {/* Status Siswa */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">
                    Status Siswa <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={status}
                    onChange={(e) => {
                      setField('status', e.target.value as StudentStatus | '');
                      if (e.target.value) clearErrStep2('status');
                    }}
                    className={`w-full bg-slate-50 text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border focus:outline-none appearance-none transition-colors font-medium ${errClsStep2('status')}`}
                    disabled={isReadOnly || isSaving}
                    required
                  >
                    <option value="">Pilih Status...</option>
                    <option value="Pendaftar">Pendaftar</option>
                    <option value="Aktif">Aktif</option>
                    <option value="Cuti">Cuti</option>
                    <option value="Lulus">Lulus</option>
                    <option value="Keluar">Keluar</option>
                    <option value="Alumni">Alumni</option>
                  </select>
                  {step2Errors.includes('status') && (
                    <p className="text-[10px] text-rose-500 mt-1 font-semibold">Status siswa wajib dipilih.</p>
                  )}
                </div>

                {/* Kelas */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">
                    Kelas <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <select
                        value={kelas}
                        onChange={(e) => {
                          setField('kelas', e.target.value);
                          if (e.target.value) clearErrStep2('kelas');
                        }}
                        className={`w-full bg-slate-50 text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border focus:outline-none appearance-none transition-colors font-medium ${errClsStep2('kelas')}`}
                        disabled={isReadOnly || isSaving}
                        required
                      >
                        <option value="">Pilih Kelas...</option>
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.name} disabled={!cls.isActive}>
                            {cls.name} {!cls.isActive ? '(Nonaktif)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => setShowManageClassesModal(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold p-2.5 rounded-lg transition shrink-0 shadow-sm cursor-pointer"
                        title="Kelola Kelas"
                        disabled={isSaving}
                      >
                        <Plus size={15} />
                      </button>
                    )}
                  </div>
                  {step2Errors.includes('kelas') && (
                    <p className="text-[10px] text-rose-500 mt-1 font-semibold">Kelas penempatan wajib dipilih.</p>
                  )}
                </div>

                {/* Jurusan */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">
                    Jurusan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Rekayasa Perangkat Lunak, IPS..."
                    value={jurusan}
                    onChange={(e) => setField('jurusan', e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                    disabled={isReadOnly || isSaving}
                  />
                </div>

                {/* Asal Sekolah */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">
                    Asal Sekolah Sebelumnya <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Masukkan nama SMP / MTs asal..."
                    value={asalSekolah}
                    onChange={(e) => {
                      setField('asalSekolah', e.target.value);
                      if (e.target.value.trim()) clearErrStep2('asalSekolah');
                    }}
                    className={`w-full bg-slate-50 text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border focus:outline-none transition ${errClsStep2('asalSekolah')}`}
                    disabled={isReadOnly || isSaving}
                    required
                  />
                  {step2Errors.includes('asalSekolah') && (
                    <p className="text-[10px] text-rose-500 mt-1 font-semibold">Asal sekolah wajib diisi.</p>
                  )}
                </div>

                {/* Tahun Lulus Sebelumnya */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Tahun Lulus Jenjang Sebelumnya</label>
                  <input
                    type="number"
                    placeholder="Contoh: 2025"
                    value={tahunLulusSebelumnya}
                    onChange={(e) => {
                      setField('tahunLulusSebelumnya', e.target.value === '' ? '' : parseInt(e.target.value, 10));
                      clearErrStep2('tahunLulusSebelumnya');
                    }}
                    className={`w-full bg-slate-50 text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border focus:outline-none transition ${errClsStep2('tahunLulusSebelumnya')}`}
                    disabled={isReadOnly || isSaving}
                  />
                  {step2Errors.includes('tahunLulusSebelumnya_number') && (
                    <p className="text-[10px] text-rose-500 mt-1 font-semibold">Tahun lulus harus berupa angka.</p>
                  )}
                </div>

                {/* NIS Sekolah */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">NIS Sekolah</label>
                  <input
                    type="text"
                    placeholder="Dihasilkan otomatis jika kosong..."
                    value={nisSekolah}
                    onChange={(e) => setField('nisSekolah', e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition font-medium"
                    disabled={isReadOnly || isSaving}
                  />
                </div>

                {/* No Registrasi PPDB */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">No. PPDB / Registrasi</label>
                  <input
                    type="text"
                    placeholder="Dihasilkan otomatis jika kosong..."
                    value={registrationNumber}
                    onChange={(e) => setField('registrationNumber', e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition font-medium"
                    disabled={isReadOnly || isSaving}
                  />
                </div>

                {/* Conditional Alumni Fields */}
                {status === 'Alumni' && (
                  <>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Tahun Kelulusan *</label>
                      <input
                        type="number"
                        placeholder="Contoh: 2028"
                        value={graduationYear}
                        onChange={(e) => setField('graduationYear', e.target.value)}
                        className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                        required
                        disabled={isReadOnly || isSaving}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">No. Seri Ijazah *</label>
                      <input
                        type="text"
                        placeholder="Contoh: DN-01/D-Ijazah/28/0001"
                        value={certificateNumber}
                        onChange={(e) => setField('certificateNumber', e.target.value)}
                        className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                        required
                        disabled={isReadOnly || isSaving}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Catatan khusus */}
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Catatan Khusus / Bimbingan</label>
                <textarea
                  rows={3}
                  placeholder="Masukkan riwayat khusus, mutasi siswa, atau catatan administrasi bimbingan..."
                  value={catatan}
                  onChange={(e) => setField('catatan', e.target.value)}
                  className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                  disabled={isReadOnly || isSaving}
                />
              </div>


            </div>
          )}

          {/* STEP 3: DATA KELUARGA / ORANG TUA / WALI */}
          {activeTab === 'keluarga' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-slate-800 font-extrabold text-xs uppercase tracking-wide">Langkah 3 — Data Wali & Orang Tua Kandung</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Lengkapi identitas lengkap orang tua/wali penanggungjawab utama siswa.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. DATA AYAH */}
                <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200 space-y-4">
                  <h5 className="font-extrabold text-slate-700 tracking-tight flex items-center gap-2 border-b border-slate-200 pb-2.5">
                    <span className="w-1.5 h-3 bg-blue-500 rounded-sm"></span>
                    DATA AYAH KANDUNG
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-mono">Nama Lengkap</label>
                      <input
                        type="text"
                        placeholder="Nama Ayah..."
                        value={namaAyah}
                        onChange={(e) => setField('namaAyah', e.target.value)}
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                        disabled={isReadOnly || isSaving}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-mono">NIK Ayah (16 Digit)</label>
                      <input
                        type="text"
                        placeholder="NIK Ayah..."
                        maxLength={16}
                        value={ktpAyah}
                        onChange={(e) => {
                          setField('ktpAyah', e.target.value.replace(/\D/g, ''));
                          clearErrStep3('ktpAyah');
                        }}
                        className={`w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border focus:outline-none transition ${errClsStep3('ktpAyah')}`}
                        disabled={isReadOnly || isSaving}
                      />
                      {step3Errors.includes('ktpAyah_length') && (
                        <p className="text-[10px] text-rose-500 mt-1 font-semibold">NIK Ayah harus 16 digit.</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-mono">Pendidikan Terakhir</label>
                      <select
                        value={pendidikanAyah}
                        onChange={(e) => setField('pendidikanAyah', e.target.value)}
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                        disabled={isReadOnly || isSaving}
                      >
                        <option value="">Pilih Pendidikan...</option>
                        <option value="SD">SD / MI</option>
                        <option value="SMP">SMP / MTs</option>
                        <option value="SMA">SMA / SMK / MA</option>
                        <option value="Diploma">Diploma (D1-D4)</option>
                        <option value="Sarjana S1">Sarjana (S1)</option>
                        <option value="Magister S2">Magister (S2)</option>
                        <option value="Doktor S3">Doktor (S3)</option>
                        <option value="Tidak Sekolah">Tidak Sekolah</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-mono">Pekerjaan</label>
                      <input
                        type="text"
                        placeholder="Pekerjaan Ayah..."
                        value={pekerjaanAyah}
                        onChange={(e) => setField('pekerjaanAyah', e.target.value)}
                        list="indonesian-professions"
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                        disabled={isReadOnly || isSaving}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-mono">Nomor HP / WA</label>
                      <input
                        type="tel"
                        placeholder="Contoh: 0812XXXXXXXX..."
                        value={teleponAyah}
                        onChange={(e) => setField('teleponAyah', e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                        disabled={isReadOnly || isSaving}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-mono">Status Keberadaan</label>
                      <select
                        value={statusAyah}
                        onChange={(e) => setField('statusAyah', e.target.value as 'MASIH_HIDUP' | 'MENINGGAL' | '')}
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                        disabled={isReadOnly || isSaving}
                      >
                        <option value="">Pilih Status...</option>
                        <option value="MASIH_HIDUP">Masih Hidup</option>
                        <option value="MENINGGAL">Wafat / Meninggal Dunia</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. DATA IBU */}
                <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200 space-y-4">
                  <h5 className="font-extrabold text-slate-700 tracking-tight flex items-center gap-2 border-b border-slate-200 pb-2.5">
                    <span className="w-1.5 h-3 bg-pink-500 rounded-sm"></span>
                    DATA IBU KANDUNG
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-mono">Nama Lengkap</label>
                      <input
                        type="text"
                        placeholder="Nama Ibu..."
                        value={namaIbu}
                        onChange={(e) => setField('namaIbu', e.target.value)}
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                        disabled={isReadOnly || isSaving}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-mono">NIK Ibu (16 Digit)</label>
                      <input
                        type="text"
                        placeholder="NIK Ibu..."
                        maxLength={16}
                        value={ktpIbu}
                        onChange={(e) => {
                          setField('ktpIbu', e.target.value.replace(/\D/g, ''));
                          clearErrStep3('ktpIbu');
                        }}
                        className={`w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border focus:outline-none transition ${errClsStep3('ktpIbu')}`}
                        disabled={isReadOnly || isSaving}
                      />
                      {step3Errors.includes('ktpIbu_length') && (
                        <p className="text-[10px] text-rose-500 mt-1 font-semibold">NIK Ibu harus 16 digit.</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-mono">Pendidikan Terakhir</label>
                      <select
                        value={pendidikanIbu}
                        onChange={(e) => setField('pendidikanIbu', e.target.value)}
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                        disabled={isReadOnly || isSaving}
                      >
                        <option value="">Pilih Pendidikan...</option>
                        <option value="SD">SD / MI</option>
                        <option value="SMP">SMP / MTs</option>
                        <option value="SMA">SMA / SMK / MA</option>
                        <option value="Diploma">Diploma (D1-D4)</option>
                        <option value="Sarjana S1">Sarjana (S1)</option>
                        <option value="Magister S2">Magister (S2)</option>
                        <option value="Doktor S3">Doktor (S3)</option>
                        <option value="Tidak Sekolah">Tidak Sekolah</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-mono">Pekerjaan</label>
                      <input
                        type="text"
                        placeholder="Pekerjaan Ibu..."
                        value={pekerjaanIbu}
                        onChange={(e) => setField('pekerjaanIbu', e.target.value)}
                        list="indonesian-professions"
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                        disabled={isReadOnly || isSaving}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-mono">Nomor HP / WA</label>
                      <input
                        type="tel"
                        placeholder="Contoh: 0812XXXXXXXX..."
                        value={teleponIbu}
                        onChange={(e) => setField('teleponIbu', e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                        disabled={isReadOnly || isSaving}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-mono">Status Keberadaan</label>
                      <select
                        value={statusIbu}
                        onChange={(e) => setField('statusIbu', e.target.value as 'MASIH_HIDUP' | 'MENINGGAL' | '')}
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                        disabled={isReadOnly || isSaving}
                      >
                        <option value="">Pilih Status...</option>
                        <option value="MASIH_HIDUP">Masih Hidup</option>
                        <option value="MENINGGAL">Wafat / Meninggal Dunia</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. DATA WALI (OPSIONAL) */}
                <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200 space-y-4 lg:col-span-2">
                  <h5 className="font-extrabold text-slate-700 tracking-tight flex items-center gap-2 border-b border-slate-200 pb-2.5">
                    <span className="w-1.5 h-3 bg-emerald-500 rounded-sm"></span>
                    DATA WALI (OPSIONAL — Diisi apabila siswa tinggal bersama wali)
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Nama Lengkap Wali</label>
                      <input
                        type="text"
                        placeholder="Nama Wali..."
                        value={namaWali}
                        onChange={(e) => setField('namaWali', e.target.value)}
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                        disabled={isReadOnly || isSaving}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Hubungan Kekeluargaan</label>
                      <input
                        type="text"
                        placeholder="Misal: Paman, Kakek, Kakak..."
                        value={hubunganWali}
                        onChange={(e) => setField('hubunganWali', e.target.value)}
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                        disabled={isReadOnly || isSaving}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Nomor HP Wali</label>
                      <input
                        type="tel"
                        placeholder="Masukkan HP Wali..."
                        value={teleponWali}
                        onChange={(e) => setField('teleponWali', e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                        disabled={isReadOnly || isSaving}
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Alamat Lengkap Wali</label>
                    <textarea
                      rows={2}
                      placeholder="Masukkan alamat tinggal lengkap wali..."
                      value={alamatWali}
                      onChange={(e) => setField('alamatWali', e.target.value)}
                      className="w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                      disabled={isReadOnly || isSaving}
                    />
                  </div>
                </div>

                {/* 4. INFORMASI URUTAN ANAK & JUMLAH SAUDARA */}
                <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200 space-y-4 lg:col-span-2">
                  <h5 className="font-extrabold text-slate-700 tracking-tight flex items-center gap-2 border-b border-slate-200 pb-2.5">
                    <span className="w-1.5 h-3 bg-teal-500 rounded-sm"></span>
                    INFORMASI URUTAN ANAK & JUMLAH SAUDARA
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-mono">
                        Anak Ke- <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        placeholder="Masukkan urutan anak..."
                        value={anakKe}
                        onChange={(e) => {
                          setField('anakKe', e.target.value === '' ? '' : parseInt(e.target.value, 10));
                          clearErrStep3('anakKe');
                        }}
                        className={`w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border focus:outline-none transition font-medium ${errClsStep3('anakKe')}`}
                        disabled={isReadOnly || isSaving}
                        required
                      />
                      {step3Errors.includes('anakKe') && (
                        <p className="text-[10px] text-rose-500 mt-1 font-semibold">Anak ke wajib diisi.</p>
                      )}
                      {step3Errors.includes('anakKe_range') && (
                        <p className="text-[10px] text-rose-500 mt-1 font-semibold">Anak ke harus antara 1 dan 20.</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-mono">
                        Jumlah Saudara Kandung <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        placeholder="Masukkan jumlah saudara..."
                        value={jumlahSaudara}
                        onChange={(e) => {
                          setField('jumlahSaudara', e.target.value === '' ? '' : parseInt(e.target.value, 10));
                          clearErrStep3('jumlahSaudara');
                        }}
                        className={`w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border focus:outline-none transition font-medium ${errClsStep3('jumlahSaudara')}`}
                        disabled={isReadOnly || isSaving}
                        required
                      />
                      {step3Errors.includes('jumlahSaudara') && (
                        <p className="text-[10px] text-rose-500 mt-1 font-semibold">Jumlah saudara kandung wajib diisi.</p>
                      )}
                      {step3Errors.includes('jumlahSaudara_range') && (
                        <p className="text-[10px] text-rose-500 mt-1 font-semibold">Jumlah saudara harus antara 0 dan 20.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 5. PENANGGUNGJAWAB UTAMA */}
                <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200 space-y-4 lg:col-span-2">
                  <h5 className="font-extrabold text-slate-700 tracking-tight flex items-center gap-2 border-b border-slate-200 pb-2.5">
                    <span className="w-1.5 h-3 bg-purple-500 rounded-sm"></span>
                    KONTAK UTAMA & DOMISILI ORANG TUA
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-mono">No HP Orang Tua / Kontak Utama</label>
                      <input
                        type="tel"
                        placeholder="Nomor HP utama hubungi wali..."
                        value={teleponOrangTua}
                        onChange={(e) => setField('teleponOrangTua', e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                        disabled={isReadOnly || isSaving}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-mono">Alamat Domisili Orang Tua (Kosongkan jika sama dengan anak)</label>
                      <input
                        type="text"
                        placeholder="Domisili orang tua..."
                        value={alamatOrangTua}
                        onChange={(e) => setField('alamatOrangTua', e.target.value)}
                        className="w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                        disabled={isReadOnly || isSaving}
                      />
                    </div>
                  </div>
                </div>

              </div>


            </div>
          )}

          {/* STEP 4: UNGGAH DOKUMEN SISWA */}
          {activeTab === 'dokumen' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-slate-800 font-extrabold text-xs uppercase tracking-wide">Langkah 4 — Unggah Dokumen Kelengkapan Siswa</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Unggah berkas kependudukan, akademik, dan foto profil siswa (Maksimal 5MB per berkas, format PDF/JPG/PNG).</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { key: 'kk', label: 'Kartu Keluarga (KK)', req: true, desc: 'Scan KK asli format PDF/Gambar.' },
                  { key: 'akta', label: 'Akta Kelahiran', req: true, desc: 'Scan Akta Kelahiran asli format PDF/Gambar.' },
                  { key: 'ijazah', label: 'Ijazah Terakhir', req: true, desc: 'Ijazah jenjang sebelumnya format PDF/Gambar.' },
                  { key: 'skl', label: 'Surat Keterangan Lulus (SKL)', req: false, desc: 'Diperlukan jika Ijazah belum terbit.' },
                  { key: 'pasFoto', label: 'Pas Foto Siswa', req: true, desc: 'Foto formal background merah/biru format JPG/PNG.' },
                  { key: 'rapor', label: 'Rapor Terakhir', req: false, desc: 'Scan rapor halaman identitas & nilai terakhir.' }
                ].map((docItem) => {
                  const uploaded = docsUploaded[docItem.key as keyof DocsUploadedState];
                  const pending = pendingFiles[docItem.key];

                  return (
                    <div key={docItem.key} className="p-4 rounded-xl border border-slate-200 bg-slate-50/30 space-y-3 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                            {docItem.label}
                            {docItem.req && <span className="text-rose-500">*</span>}
                          </span>
                          
                          {/* Status Badge */}
                          {uploaded ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              uploaded.status === 'Terarsip' 
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {uploaded.status}
                            </span>
                          ) : pending ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 animate-pulse">
                              Siap Diunggah
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-400 border border-slate-200">
                              Belum Ada
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400">{docItem.desc}</p>
                      </div>

                      {/* File Display / Action Area */}
                      <div className="pt-2 border-t border-slate-100/50">
                        {uploaded || pending ? (
                          <div className={`bg-white border rounded-lg p-2.5 flex flex-col gap-2 shadow-2xs ${pending && uploadErrors[docItem.key] ? 'border-rose-300 bg-rose-50/10' : 'border-slate-200'}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-slate-700 text-xs truncate">
                                  {pending ? pending.name : uploaded.name}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {pending ? formatSize(pending.size) : uploaded.size}
                                </p>
                              </div>
                              
                              <div className="flex items-center space-x-1 shrink-0">
                                {pending && uploadErrors[docItem.key] && loadedStudentId && loadedStudentId !== 'new' && !isReadOnly && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        addToast(`Mengunggah ulang ${docItem.label}...`, 'info');
                                        const result = await useStudentFormStore.getState().flushPendingUploads(loadedStudentId, docItem.key);
                                        if (result.success) {
                                          addToast(`${docItem.label} berhasil diunggah!`, 'success');
                                        } else {
                                          addToast(`Gagal mengunggah ulang ${docItem.label}`, 'error');
                                        }
                                      } catch (err: any) {
                                        addToast(`Gagal mengunggah ulang: ${getFriendlyErrorMessage(err)}`, 'error');
                                      }
                                    }}
                                    className="bg-amber-600 hover:bg-amber-500 text-white px-2 py-1 rounded text-[10px] font-bold transition cursor-pointer"
                                    title="Unggah Ulang"
                                  >
                                    Coba Lagi
                                  </button>
                                )}
                                {!isReadOnly && (
                                  <button
                                    type="button"
                                    onClick={() => handleFileChange(docItem.key, null)}
                                    className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1.5 rounded-lg transition cursor-pointer"
                                    title="Hapus Berkas"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Progress bar */}
                            {pending && uploadProgress[docItem.key] > 0 && uploadProgress[docItem.key] < 100 && (
                              <div className="space-y-1">
                                <div className="flex justify-between text-[9px] text-slate-400 font-bold uppercase">
                                  <span>Mengunggah...</span>
                                  <span>{uploadProgress[docItem.key]}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1">
                                  <div 
                                    className="bg-emerald-500 h-1 rounded-full transition-all duration-300" 
                                    style={{ width: `${uploadProgress[docItem.key]}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}

                            {/* Error text */}
                            {pending && uploadErrors[docItem.key] && (
                              <p className="text-[10px] text-rose-600 font-medium">
                                Error: {uploadErrors[docItem.key]}
                              </p>
                            )}
                          </div>
                        ) : (
                          !isReadOnly ? (
                            <label className="border-2 border-dashed border-slate-200 hover:border-emerald-400 bg-white/50 hover:bg-emerald-50/20 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition text-center group">
                              <div className="p-2 rounded-full bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition">
                                <Plus size={16} />
                              </div>
                              <span className="font-bold text-slate-600 text-xs group-hover:text-emerald-700 transition">Pilih Berkas Dokumen</span>
                              <span className="text-[9px] text-slate-400">PDF, JPG, PNG (Max 5MB)</span>
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileChange(docItem.key, file);
                                }}
                                className="hidden"
                              />
                            </label>
                          ) : (
                            <div className="text-center py-3 text-[11px] text-slate-400 italic">
                              Dokumen belum diunggah oleh operator.
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>


            </div>
          )}

          {/* STEP 5: REVIEW & SUBMIT */}
          {activeTab === 'review' && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-slate-800 font-extrabold text-xs uppercase tracking-wide">Langkah 5 — Pratinjau & Simpan Pendaftaran</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Tinjau seluruh data kesiswaan sebelum menyimpannya secara permanen ke database.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. IDENTITAS UTAMA & BIODATA */}
                <div className="p-5 bg-slate-50/40 rounded-xl border border-slate-200 space-y-3">
                  <h5 className="font-extrabold text-slate-700 tracking-tight flex items-center gap-1.5 border-b border-slate-200 pb-2">
                    <span className="w-1.5 h-3 bg-emerald-500 rounded-sm"></span>
                    BIODATA & KONTAK SISWA
                  </h5>
                  <div className="space-y-2">
                    <div className="flex justify-between border-b border-slate-100/50 py-1">
                      <span className="text-slate-400">Nama Lengkap</span>
                      <span className="font-bold text-slate-700">{nama}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100/50 py-1">
                      <span className="text-slate-400">Nama Panggilan</span>
                      <span className="font-bold text-slate-700">{namaPanggilan || '-'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100/50 py-1">
                      <span className="text-slate-400">Jenis Kelamin</span>
                      <span className="font-bold text-slate-700">{jenisKelamin === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100/50 py-1">
                      <span className="text-slate-400">Tempat, Tanggal Lahir</span>
                      <span className="font-bold text-slate-700">{tempatLahir}, {tanggalLahir}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100/50 py-1">
                      <span className="text-slate-400">NIK / KK</span>
                      <span className="font-bold text-slate-700">{nik || '-'} / {nomorKK || '-'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100/50 py-1">
                      <span className="text-slate-400">NISN</span>
                      <span className="font-bold text-slate-700">{nisn || '-'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100/50 py-1">
                      <span className="text-slate-400">No. HP / Email</span>
                      <span className="font-bold text-slate-700">{telepon || '-'} / {email || '-'}</span>
                    </div>
                    <div className="py-1">
                      <span className="text-slate-400 block mb-0.5">Alamat Lengkap</span>
                      <span className="font-bold text-slate-700 leading-relaxed block">{alamat}</span>
                    </div>
                  </div>
                </div>

                {/* 2. AKADEMIK */}
                <div className="p-5 bg-slate-50/40 rounded-xl border border-slate-200 space-y-3">
                  <h5 className="font-extrabold text-slate-700 tracking-tight flex items-center gap-1.5 border-b border-slate-200 pb-2">
                    <span className="w-1.5 h-3 bg-blue-500 rounded-sm"></span>
                    INFORMASI AKADEMIK
                  </h5>
                  <div className="space-y-2">
                    <div className="flex justify-between border-b border-slate-100/50 py-1">
                      <span className="text-slate-400">Tahun Ajaran / Angkatan</span>
                      <span className="font-bold text-slate-700">
                        {academicYears.find(y => y.id === academicYearId)?.name || '-'} / {angkatan}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100/50 py-1">
                      <span className="text-slate-400">Status Siswa</span>
                      <span className="font-bold text-slate-700">{status}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100/50 py-1">
                      <span className="text-slate-400">Kelas / Jurusan</span>
                      <span className="font-bold text-slate-700">{kelas} / {jurusan}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100/50 py-1">
                      <span className="text-slate-400">Asal Sekolah / Lulus</span>
                      <span className="font-bold text-slate-700">{asalSekolah || '-'} ({tahunLulusSebelumnya || '-'})</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100/50 py-1">
                      <span className="text-slate-400">NIS Sekolah</span>
                      <span className="font-bold text-slate-700">{nisSekolah || '(Otomatis)'}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100/50 py-1">
                      <span className="text-slate-400">No. PPDB / Registrasi</span>
                      <span className="font-bold text-slate-700">{registrationNumber || '(Otomatis)'}</span>
                    </div>
                    {catatan && (
                      <div className="py-1">
                        <span className="text-slate-400 block mb-0.5">Catatan Khusus</span>
                        <span className="font-bold text-slate-700 block leading-relaxed">{catatan}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. KELUARGA & WALI */}
                <div className="p-5 bg-slate-50/40 rounded-xl border border-slate-200 space-y-3 lg:col-span-2">
                  <h5 className="font-extrabold text-slate-700 tracking-tight flex items-center gap-1.5 border-b border-slate-200 pb-2">
                    <span className="w-1.5 h-3 bg-purple-500 rounded-sm"></span>
                    DATA KELUARGA & ORANG TUA / WALI
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                    {/* Ayah */}
                    <div className="space-y-1.5">
                      <p className="font-bold text-slate-700 text-xs border-b border-slate-150 pb-1">Ayah Kandung</p>
                      <p><span className="text-slate-400">Nama:</span> <span className="font-semibold text-slate-700">{namaAyah || '-'}</span></p>
                      <p><span className="text-slate-400">NIK:</span> <span className="font-semibold text-slate-700">{ktpAyah || '-'}</span></p>
                      <p><span className="text-slate-400">Pendidikan:</span> <span className="font-semibold text-slate-700">{pendidikanAyah || '-'}</span></p>
                      <p><span className="text-slate-400">Pekerjaan:</span> <span className="font-semibold text-slate-700">{pekerjaanAyah || '-'}</span></p>
                      <p><span className="text-slate-400">HP:</span> <span className="font-semibold text-slate-700">{teleponAyah || '-'}</span></p>
                      <p>
                        <span className="text-slate-400">Status:</span>{' '}
                        <span className="font-semibold text-slate-700">
                          {statusAyah === 'MASIH_HIDUP' ? 'Masih Hidup' : statusAyah === 'MENINGGAL' ? 'Wafat' : '-'}
                        </span>
                      </p>
                    </div>
                    {/* Ibu */}
                    <div className="space-y-1.5">
                      <p className="font-bold text-slate-700 text-xs border-b border-slate-150 pb-1">Ibu Kandung</p>
                      <p><span className="text-slate-400">Nama:</span> <span className="font-semibold text-slate-700">{namaIbu || '-'}</span></p>
                      <p><span className="text-slate-400">NIK:</span> <span className="font-semibold text-slate-700">{ktpIbu || '-'}</span></p>
                      <p><span className="text-slate-400">Pendidikan:</span> <span className="font-semibold text-slate-700">{pendidikanIbu || '-'}</span></p>
                      <p><span className="text-slate-400">Pekerjaan:</span> <span className="font-semibold text-slate-700">{pekerjaanIbu || '-'}</span></p>
                      <p><span className="text-slate-400">HP:</span> <span className="font-semibold text-slate-700">{teleponIbu || '-'}</span></p>
                      <p>
                        <span className="text-slate-400">Status:</span>{' '}
                        <span className="font-semibold text-slate-700">
                          {statusIbu === 'MASIH_HIDUP' ? 'Masih Hidup' : statusIbu === 'MENINGGAL' ? 'Wafat' : '-'}
                        </span>
                      </p>
                    </div>
                    {/* Wali & Lainnya */}
                    <div className="space-y-1.5">
                      <p className="font-bold text-slate-700 text-xs border-b border-slate-150 pb-1">Wali & Keluarga</p>
                      {namaWali ? (
                        <>
                          <p><span className="text-slate-400">Wali:</span> <span className="font-semibold text-slate-700">{namaWali} ({hubunganWali})</span></p>
                          <p><span className="text-slate-400">HP Wali:</span> <span className="font-semibold text-slate-700">{teleponWali || '-'}</span></p>
                        </>
                      ) : (
                        <p className="text-slate-400 italic">Tanpa wali</p>
                      )}
                      <p><span className="text-slate-400">Anak Ke- / Saudara:</span> <span className="font-semibold text-slate-700">{anakKe || '-'} / {jumlahSaudara || '-'}</span></p>
                      <p><span className="text-slate-400">Kontak Utama:</span> <span className="font-semibold text-slate-700">{teleponOrangTua || '-'}</span></p>
                      <p className="truncate"><span className="text-slate-400">Domisili OT:</span> <span className="font-semibold text-slate-700" title={alamatOrangTua}>{alamatOrangTua || 'Sama dengan anak'}</span></p>
                    </div>
                  </div>
                </div>

                {/* 4. DOKUMEN YANG SIAP DIUNGGAH */}
                <div className="p-5 bg-slate-50/40 rounded-xl border border-slate-200 space-y-3 lg:col-span-2">
                  <h5 className="font-extrabold text-slate-700 tracking-tight flex items-center gap-1.5 border-b border-slate-200 pb-2">
                    <span className="w-1.5 h-3 bg-yellow-500 rounded-sm"></span>
                    STATUS BERKAS & DOKUMEN
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                      { key: 'kk', label: 'Kartu Keluarga' },
                      { key: 'akta', label: 'Akta Kelahiran' },
                      { key: 'ijazah', label: 'Ijazah Terakhir' },
                      { key: 'skl', label: 'Surat Ket. Lulus' },
                      { key: 'pasFoto', label: 'Pas Foto Siswa' },
                      { key: 'rapor', label: 'Rapor Terakhir' }
                    ].map((d) => {
                      const uploaded = docsUploaded[d.key as keyof DocsUploadedState];
                      const pending = pendingFiles[d.key];

                      return (
                        <div key={d.key} className="bg-white border border-slate-150 rounded-lg p-2.5 space-y-1">
                          <p className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">{d.label}</p>
                          {uploaded ? (
                            <p className="text-slate-700 font-semibold text-xs truncate flex items-center gap-1" title={uploaded.name}>
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0"></span>
                              {uploaded.name}
                            </p>
                          ) : pending ? (
                            <div className="space-y-1">
                              <p className={`font-semibold text-xs truncate flex items-center gap-1 ${uploadErrors[d.key] ? 'text-rose-600 font-bold' : 'text-blue-700 animate-pulse'}`} title={pending.name}>
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${uploadErrors[d.key] ? 'bg-rose-500' : 'bg-blue-500'}`}></span>
                                {pending.name}
                              </p>
                              {uploadProgress[d.key] > 0 && uploadProgress[d.key] < 100 && (
                                <div className="text-[9px] text-slate-400">
                                  Mengunggah... {uploadProgress[d.key]}%
                                </div>
                              )}
                              {uploadErrors[d.key] && (
                                <p className="text-[9px] text-rose-500 truncate font-medium" title={uploadErrors[d.key]}>
                                  Error: {uploadErrors[d.key]}
                                </p>
                              )}
                              {uploadErrors[d.key] && loadedStudentId && loadedStudentId !== 'new' && !isReadOnly && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      addToast(`Mengunggah ulang ${d.label}...`, 'info');
                                      const result = await useStudentFormStore.getState().flushPendingUploads(loadedStudentId, d.key);
                                      if (result.success) {
                                        addToast(`${d.label} berhasil diunggah!`, 'success');
                                      } else {
                                        addToast(`Gagal mengunggah ulang ${d.label}`, 'error');
                                      }
                                    } catch (err: any) {
                                      addToast(`Gagal mengunggah ulang: ${getFriendlyErrorMessage(err)}`, 'error');
                                    }
                                  }}
                                  className="mt-1 bg-amber-600 hover:bg-amber-500 text-white px-2 py-0.5 rounded text-[9px] font-bold transition w-full text-center cursor-pointer"
                                >
                                  Coba Lagi
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className="text-slate-400 italic text-[11px]">Belum diunggah</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>


            </div>
          )}

          {/* BOTTOM CONTROLS & SUBMIT ACTION (SHARED) */}
          <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/40 p-4 -mx-6 -mb-6">
            {/* Left side: Back Button & Step-specific Hint Text */}
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {activeTab !== 'biodata' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    if (activeTab === 'akademik') handleGoToStep('biodata');
                    else if (activeTab === 'keluarga') handleGoToStep('akademik');
                    else if (activeTab === 'dokumen') handleGoToStep('keluarga');
                    else if (activeTab === 'review') handleGoToStep('dokumen');
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg transition text-xs flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                  disabled={isSaving}
                >
                  <span>← Kembali</span>
                </button>
              )}
              
              <div className="text-[11px] text-slate-400 font-medium">
                {activeTab === 'biodata' && (
                  <span>
                    Semua kolom bertanda <span className="text-rose-500 font-bold">*</span> wajib diisi.
                  </span>
                )}
                {activeTab === 'keluarga' && (
                  <span>
                    Semua kolom sudah terisi? Silakan lanjutkan ke langkah berikutnya.
                  </span>
                )}
                {activeTab === 'dokumen' && (
                  <span>
                    Dokumen ditandai <span className="text-rose-500 font-bold">*</span> dianjurkan untuk kelengkapan administrasi.
                  </span>
                )}
                {activeTab === 'review' && (
                  <span className="text-emerald-600 font-bold">
                    Data yang terisi sudah valid dan siap disimpan ke sistem.
                  </span>
                )}
              </div>
            </div>

            {/* Right side: Clear Form, Cancel, and Forward/Save buttons */}
            <div className="flex items-center justify-end gap-3 w-full sm:w-auto shrink-0">
              {!editingStudent && !isReadOnly && (
                <div className="flex items-center gap-2">
                  {!showClearConfirm ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowClearConfirm(true);
                      }}
                      disabled={isSaving}
                      className="border border-red-200 hover:border-red-500 hover:bg-red-50/50 text-red-600 font-bold py-2.5 px-4 rounded-lg transition flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer shadow-2xs"
                    >
                      <Trash2 size={14} className="text-red-500" />
                      <span className="text-red-600">Kosongkan Form</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-lg p-1.5 px-3">
                      <span className="text-red-700 font-extrabold text-[11px]">Bersihkan semua?</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          clearForm();
                          setField('loadedStudentId', 'new');
                          setShowClearConfirm(false);
                          onAddNotification('Formulir Dikosongkan', 'Seluruh isian formulir berhasil dikosongkan.', 'info');
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white font-extrabold py-1 px-3 rounded-md transition text-[10px] cursor-pointer shadow-xs"
                      >
                        Ya
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowClearConfirm(false);
                        }}
                        className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-extrabold py-1 px-3 rounded-md transition text-[10px] cursor-pointer shadow-2xs"
                      >
                        Batal
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onCancel();
                }}
                disabled={isSaving}
                className="bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-700 font-bold py-2.5 px-5 rounded-lg transition cursor-pointer text-xs"
              >
                {isReadOnly ? 'Tutup Peninjauan' : 'Batalkan'}
              </button>

              {!isReadOnly && (
                activeTab === 'review' ? (
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-lg transition shadow-md hover:shadow-emerald-600/10 flex items-center space-x-2 cursor-pointer text-xs"
                  >
                    {isSaving ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    <span>
                      {isSaving 
                        ? 'Menyimpan...' 
                        : (editingStudent ? 'Perbaharui Profil' : 'Simpan Pendaftaran')}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      if (activeTab === 'biodata') handleGoToStep('akademik');
                      else if (activeTab === 'akademik') handleGoToStep('keluarga');
                      else if (activeTab === 'keluarga') handleGoToStep('dokumen');
                      else if (activeTab === 'dokumen') handleGoToStep('review');
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-6 rounded-lg transition shadow-md flex items-center space-x-2 cursor-pointer text-xs"
                  >
                    <span>
                      {activeTab === 'biodata' && 'Lanjutkan ke Akademik →'}
                      {activeTab === 'akademik' && 'Lanjutkan ke Keluarga →'}
                      {activeTab === 'keluarga' && 'Lanjutkan ke Upload Dokumen →'}
                      {activeTab === 'dokumen' && 'Lanjutkan ke Review →'}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>
        </form>
      </div>

      {/* MANAGE ACADEMIC YEARS MODAL */}
      {showManageAyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-800 text-sm">Kelola Tahun Ajaran</h4>
              <button 
                type="button" 
                onClick={() => {
                  setShowManageAyModal(false);
                  setNewAyName('');
                  setEditingClassId(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tambah Tahun Ajaran Baru Form */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-3 text-xs">
              <h5 className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">Tambah Tahun Ajaran Baru</h5>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Format: YYYY/YYYY (misal: 2025/2026)"
                  value={newAyName}
                  onChange={(e) => setNewAyName(e.target.value)}
                  className="bg-white text-slate-800 text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition font-medium flex-1"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const trimmed = newAyName.trim();
                    if (!trimmed) {
                      addToast('Nama Tahun Ajaran tidak boleh kosong!', 'warning');
                      return;
                    }
                    if (!/^\d{4}\/\d{4}$/.test(trimmed)) {
                      addToast('Format Tahun Ajaran harus YYYY/YYYY (contoh: 2025/2026)!', 'warning');
                      return;
                    }
                    setIsAddingAy(true);
                    try {
                      const created = await studentService.createAcademicYear(trimmed);
                      setAcademicYears((prev) => [created, ...prev].sort((a, b) => b.name.localeCompare(a.name)));
                      setNewAyName('');
                      addToast('Tahun Ajaran berhasil dibuat!', 'success');
                    } catch (err: any) {
                      addToast(`Gagal membuat Tahun Ajaran: ${getFriendlyErrorMessage(err)}`, 'error');
                    } finally {
                      setIsAddingAy(false);
                    }
                  }}
                  disabled={isAddingAy}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                >
                  {isAddingAy ? 'Menyimpan...' : 'Tambah'}
                </button>
              </div>
            </div>

            {/* List Tahun Ajaran */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
              <h5 className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">Daftar Tahun Ajaran</h5>
              {academicYears.length === 0 ? (
                <p className="text-slate-400 text-center py-4 text-xs">Belum ada tahun ajaran terdaftar.</p>
              ) : (
                academicYears.map((ay) => {
                  const isEditing = editingClassId === ay.id;
                  return (
                    <div key={ay.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition gap-2">
                      {isEditing ? (
                        <div className="flex-1 flex items-center space-x-2">
                          <input
                            type="text"
                            value={editingClassName}
                            onChange={(e) => setEditingClassName(e.target.value)}
                            className="bg-white text-slate-800 text-xs px-3 py-1 rounded-md border border-slate-200 focus:outline-none focus:border-emerald-500 transition flex-1"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              const trimmed = editingClassName.trim();
                              if (!trimmed) {
                                addToast('Nama Tahun Ajaran tidak boleh kosong!', 'warning');
                                return;
                              }
                              if (!/^\d{4}\/\d{4}$/.test(trimmed)) {
                                addToast('Format harus YYYY/YYYY!', 'warning');
                                return;
                              }
                              try {
                                const updated = await studentService.updateAcademicYear(ay.id, { name: trimmed });
                                setAcademicYears((prev) => prev.map((y) => (y.id === ay.id ? updated : y)).sort((a, b) => b.name.localeCompare(a.name)));
                                setEditingClassId(null);
                                addToast('Tahun Ajaran berhasil diperbarui!', 'success');
                              } catch (err: any) {
                                addToast(`Gagal memperbarui: ${getFriendlyErrorMessage(err)}`, 'error');
                              }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer"
                          >
                            Simpan
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingClassId(null)}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded-md text-[10px] font-bold cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0 flex items-center space-x-2">
                            <span className="font-bold text-xs text-slate-800">{ay.name}</span>
                            {ay.isActive && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                                Aktif
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-1.5">
                            {!ay.isActive && (
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await studentService.setActiveAcademicYear(ay.id);
                                    const refreshed = await studentService.getAcademicYears();
                                    setAcademicYears(refreshed);
                                    setField('academicYearId', ay.id);
                                    addToast(`Tahun Ajaran ${ay.name} sekarang Aktif!`, 'success');
                                  } catch (err: any) {
                                    addToast(`Gagal mengaktifkan: ${getFriendlyErrorMessage(err)}`, 'error');
                                  }
                                }}
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer"
                              >
                                Set Aktif
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingClassId(ay.id);
                                setEditingClassName(ay.name);
                              }}
                              className="text-slate-500 hover:text-emerald-600 p-1.5 rounded-md hover:bg-white border border-transparent hover:border-slate-200 transition cursor-pointer"
                              title="Edit Tahun Ajaran"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm(`Apakah Anda yakin ingin menghapus Tahun Ajaran "${ay.name}"?`)) {
                                  try {
                                    await studentService.deleteAcademicYear(ay.id);
                                    setAcademicYears((prev) => prev.filter((y) => y.id !== ay.id));
                                    addToast('Tahun Ajaran berhasil dihapus!', 'success');
                                  } catch (err: any) {
                                    addToast(`Gagal menghapus: ${getFriendlyErrorMessage(err)}`, 'error');
                                  }
                                }
                              }}
                              className="text-rose-500 hover:text-rose-700 p-1.5 rounded-md hover:bg-rose-50 transition cursor-pointer"
                              title="Hapus Tahun Ajaran"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 text-xs">
              <button
                type="button"
                onClick={() => setShowManageAyModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE CLASSES MODAL */}
      {showManageClassesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-800 text-sm">Kelola Master Kelas</h4>
              <button 
                type="button" 
                onClick={() => {
                  setShowManageClassesModal(false);
                  setNewClassName('');
                  setNewClassDesc('');
                  setEditingClassId(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Tambah Kelas Baru Form */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-3 text-xs">
              <h5 className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">Tambah Kelas Baru</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Nama Kelas (misal: X-A, XII RPL)"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="bg-white text-slate-800 text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition font-medium"
                />
                <input
                  type="text"
                  placeholder="Deskripsi Kelas (opsional)"
                  value={newClassDesc}
                  onChange={(e) => setNewClassDesc(e.target.value)}
                  className="bg-white text-slate-800 text-xs px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition font-medium"
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  const trimmed = newClassName.trim();
                  if (!trimmed) {
                    addToast('Nama Kelas tidak boleh kosong!', 'warning');
                    return;
                  }
                  setIsSavingClass(true);
                  try {
                    const created = await studentService.createClass(trimmed, newClassDesc.trim() || undefined);
                    setClasses((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
                    setNewClassName('');
                    setNewClassDesc('');
                    addToast('Kelas berhasil dibuat!', 'success');
                  } catch (err: any) {
                    addToast(`Gagal membuat kelas: ${getFriendlyErrorMessage(err)}`, 'error');
                  } finally {
                    setIsSavingClass(false);
                  }
                }}
                disabled={isSavingClass}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              >
                {isSavingClass ? 'Menyimpan...' : 'Tambah Kelas'}
              </button>
            </div>

            {/* List Kelas */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
              <h5 className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">Daftar Kelas</h5>
              {classes.length === 0 ? (
                <p className="text-slate-400 text-center py-4 text-xs">Belum ada kelas yang terdaftar.</p>
              ) : (
                classes.map((cls) => {
                  const isEditing = editingClassId === cls.id;
                  return (
                    <div key={cls.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition gap-2">
                      {isEditing ? (
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={editingClassName}
                            onChange={(e) => setEditingClassName(e.target.value)}
                            className="bg-white text-slate-800 text-xs px-3 py-1 rounded-md border border-slate-200 focus:outline-none focus:border-emerald-500 transition w-full"
                          />
                          <input
                            type="text"
                            value={editingClassDesc}
                            onChange={(e) => setEditingClassDesc(e.target.value)}
                            className="bg-white text-slate-800 text-xs px-3 py-1 rounded-md border border-slate-200 focus:outline-none focus:border-emerald-500 transition w-full"
                            placeholder="Deskripsi..."
                          />
                          <div className="flex space-x-1.5">
                            <button
                              type="button"
                              onClick={async () => {
                                const trimmed = editingClassName.trim();
                                if (!trimmed) {
                                  addToast('Nama kelas tidak boleh kosong!', 'warning');
                                  return;
                                }
                                try {
                                  const updated = await studentService.updateClass(cls.id, { name: trimmed, description: editingClassDesc.trim() || undefined });
                                  setClasses((prev) => prev.map((c) => (c.id === cls.id ? updated : c)).sort((a, b) => a.name.localeCompare(b.name)));
                                  setEditingClassId(null);
                                  addToast('Kelas berhasil diperbarui!', 'success');
                                } catch (err: any) {
                                  addToast(`Gagal memperbarui kelas: ${getFriendlyErrorMessage(err)}`, 'error');
                                }
                              }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              Simpan
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingClassId(null)}
                              className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1 rounded-md text-[10px] font-bold cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className={`font-bold text-xs ${cls.isActive ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                                {cls.name}
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${cls.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                                {cls.isActive ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </div>
                            {cls.description && (
                              <p className="text-[10px] text-slate-400 mt-0.5 truncate">{cls.description}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingClassId(cls.id);
                                setEditingClassName(cls.name);
                                setEditingClassDesc(cls.description || '');
                              }}
                              className="text-slate-500 hover:text-emerald-600 p-1.5 rounded-md hover:bg-white border border-transparent hover:border-slate-200 transition cursor-pointer"
                              title="Edit Kelas"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const updated = await studentService.updateClass(cls.id, { isActive: !cls.isActive });
                                  setClasses((prev) => prev.map((c) => (c.id === cls.id ? updated : c)));
                                  addToast(cls.isActive ? 'Kelas dinonaktifkan!' : 'Kelas diaktifkan!', 'success');
                                } catch (err: any) {
                                  addToast(`Gagal mengubah status: ${getFriendlyErrorMessage(err)}`, 'error');
                                }
                              }}
                              className={`p-1.5 rounded-md border border-transparent hover:border-slate-200 transition cursor-pointer ${cls.isActive ? 'text-rose-500 hover:bg-rose-50' : 'text-emerald-500 hover:bg-emerald-50'}`}
                              title={cls.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                            >
                              {cls.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm(`Apakah Anda yakin ingin menghapus kelas "${cls.name}"?`)) {
                                  try {
                                    await studentService.deleteClass(cls.id);
                                    setClasses((prev) => prev.filter((c) => c.id !== cls.id));
                                    addToast('Kelas berhasil dihapus!', 'success');
                                  } catch (err: any) {
                                    addToast(`Gagal menghapus kelas: ${getFriendlyErrorMessage(err)}`, 'error');
                                  }
                                }
                              }}
                              className="text-rose-500 hover:text-rose-700 p-1.5 rounded-md hover:bg-rose-50 transition cursor-pointer"
                              title="Hapus Kelas"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 text-xs">
              <button
                type="button"
                onClick={() => setShowManageClassesModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INDONESIAN OCCUPATIONS DATALIST */}
      <datalist id="indonesian-professions">
        <option value="PNS / ASN" />
        <option value="Karyawan Swasta" />
        <option value="Wiraswasta" />
        <option value="Buruh Harian Lepas" />
        <option value="Petani / Pekebun" />
        <option value="Nelayan" />
        <option value="Pedagang" />
        <option value="Guru / Dosen" />
        <option value="TNI / POLRI" />
        <option value="Dokter / Tenaga Medis" />
        <option value="Ibu Rumah Tangga" />
        <option value="Pensiunan" />
        <option value="Buruh Pabrik" />
        <option value="Sopir / Driver" />
        <option value="Ojek Online" />
        <option value="Tidak Bekerja / Menganggur" />
      </datalist>
    </div>
  );
}
