/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { uploadDocument } from '../services/document.service';
import { 
  UserPlus, 
  Edit3, 
  ArrowLeft, 
  Save, 
  HelpCircle,
  RefreshCw,
  Layout,
  FileSpreadsheet,
  X,
  FileText,
  UploadCloud,
  Check,
  AlertCircle
} from 'lucide-react';
import { Student, StudentStatus, RoleType, DocumentItem, DocumentType } from '../types';

interface StudentFormViewProps {
  editingStudent: Student | null;
  onSaveStudent: (student: Student) => void;
  onCancel: () => void;
  selectedRole: RoleType;
  onAddLog: (action: string, category: 'Siswa' | 'Dokumen' | 'Hak Akses' | 'Google Drive' | 'Google Sheets', details: string) => void;
  onAddNotification: (title: string, message: string, type: 'info' | 'success' | 'warning') => void;
}

export default function StudentFormView({
  editingStudent,
  onSaveStudent,
  onCancel,
  selectedRole,
  onAddLog,
  onAddNotification
}: StudentFormViewProps) {

  // Current Active Tab
  const [activeTab, setActiveTab] = useState<'siswa' | 'orangtua' | 'dokumen'>('siswa');

  // Form States - Tab 1: Identitas Pokok
  const [nama, setNama] = useState('');
  const [nisn, setNisn] = useState('');
  const [kelas, setKelas] = useState('X-A');
  const [jurusan, setJurusan] = useState('Rekayasa Perangkat Lunak');
  const [email, setEmail] = useState('');
  const [telepon, setTelepon] = useState('');
  const [alamat, setAlamat] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('2009-01-01');
  const [status, setStatus] = useState<StudentStatus>('Aktif');
  const [catatan, setCatatan] = useState('');

  // Form States - Tab 2: Data Orang Tua
  const [namaAyah, setNamaAyah] = useState('');
  const [pekerjaanAyah, setPekerjaanAyah] = useState('');
  const [ktpAyah, setKtpAyah] = useState('');
  const [teleponAyah, setTeleponAyah] = useState('');
  const [namaIbu, setNamaIbu] = useState('');
  const [pekerjaanIbu, setPekerjaanIbu] = useState('');
  const [ktpIbu, setKtpIbu] = useState('');
  const [teleponIbu, setTeleponIbu] = useState('');
  const [teleponOrangTua, setTeleponOrangTua] = useState('');
  const [alamatOrangTua, setAlamatOrangTua] = useState('');

  // Form States - Tab 3: Upload Dokumen (KK, Akta Kelahiran, Nilai Rapor, Ijazah, KTP Ayah, KTP Ibu)
  const [docsUploaded, setDocsUploaded] = useState<{
    ijazah: { name: string; size: string; status: 'Terarsip' | 'Verifikasi' } | null;
    kk: { name: string; size: string; status: 'Terarsip' | 'Verifikasi' } | null;
    akta: { name: string; size: string; status: 'Terarsip' | 'Verifikasi' } | null;
    rapor: { name: string; size: string; status: 'Terarsip' | 'Verifikasi' } | null;
    ktpAyahDoc: { name: string; size: string; status: 'Terarsip' | 'Verifikasi' } | null;
    ktpIbuDoc: { name: string; size: string; status: 'Terarsip' | 'Verifikasi' } | null;
  }>({
    ijazah: null,
    kk: null,
    akta: null,
    rapor: null,
    ktpAyahDoc: null,
    ktpIbuDoc: null,
  });

  // Real file picker reference and pending document type tracker
  useEffect(() => {
    if (editingStudent) {
      setNama(editingStudent.nama);
      setNisn(editingStudent.nisn);
      setKelas(editingStudent.kelas);
      setJurusan(editingStudent.jurusan);
      setEmail(editingStudent.email);
      setTelepon(editingStudent.telepon);
      setAlamat(editingStudent.alamat);
      setTanggalLahir(editingStudent.tanggalLahir);
      setStatus(editingStudent.status);
      setCatatan(editingStudent.catatan || '');

      // Load parents details
      setNamaAyah(editingStudent.namaAyah || '');
      setPekerjaanAyah(editingStudent.pekerjaanAyah || '');
      setKtpAyah(editingStudent.ktpAyah || '');
      setTeleponAyah(editingStudent.teleponAyah || '');
      setNamaIbu(editingStudent.namaIbu || '');
      setPekerjaanIbu(editingStudent.pekerjaanIbu || '');
      setKtpIbu(editingStudent.ktpIbu || '');
      setTeleponIbu(editingStudent.teleponIbu || '');
      setTeleponOrangTua(editingStudent.teleponOrangTua || '');
      setAlamatOrangTua(editingStudent.alamatOrangTua || '');

      // Load documents from list
      const loadedDocs = {
        ijazah: null as any,
        kk: null as any,
        akta: null as any,
        rapor: null as any,
        ktpAyahDoc: null as any,
        ktpIbuDoc: null as any
      };

      editingStudent.documents.forEach(doc => {
        if (doc.type === 'Ijazah') {
          loadedDocs.ijazah = { name: doc.name, size: doc.size, status: doc.status };
        } else if (doc.type === 'Kartu Keluarga') {
          loadedDocs.kk = { name: doc.name, size: doc.size, status: doc.status };
        } else if (doc.type === 'Akta Kelahiran') {
          loadedDocs.akta = { name: doc.name, size: doc.size, status: doc.status };
        } else if (doc.type === 'Rapor') {
          loadedDocs.rapor = { name: doc.name, size: doc.size, status: doc.status };
        } else if (doc.type === 'KTP Ayah') {
          loadedDocs.ktpAyahDoc = { name: doc.name, size: doc.size, status: doc.status };
        } else if (doc.type === 'KTP Ibu') {
          loadedDocs.ktpIbuDoc = { name: doc.name, size: doc.size, status: doc.status };
        }
      });
      setDocsUploaded(loadedDocs);
      setActiveTab('siswa');
    } else {
      // Clear forms for new registration
      setNama('');
      setNisn('');
      setKelas('X-A');
      setJurusan('MIPA');
      setEmail('');
      setTelepon('');
      setAlamat('');
      setTanggalLahir('2009-01-01');
      setStatus('Aktif');
      setCatatan('');

      setNamaAyah('');
      setPekerjaanAyah('');
      setKtpAyah('');
      setTeleponAyah('');
      setNamaIbu('');
      setPekerjaanIbu('');
      setKtpIbu('');
      setTeleponIbu('');
      setTeleponOrangTua('');
      setAlamatOrangTua('');

      setDocsUploaded({ ijazah: null, kk: null, akta: null, rapor: null, ktpAyahDoc: null, ktpIbuDoc: null });
      setActiveTab('siswa');
    }
  }, [editingStudent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama || !nisn || !email) {
      alert('Nama Lengkap, NISN, dan Surel wajib diisi!');
      setActiveTab('siswa');
      return;
    }

    // Pack uploaded documents in application format
    const existingDocuments = editingStudent?.documents || [];
    const updatedDocumentsList: DocumentItem[] = [...existingDocuments];

    const currentDocKeys: { key: 'ijazah' | 'kk' | 'akta' | 'rapor' | 'ktpAyahDoc' | 'ktpIbuDoc'; docType: DocumentType }[] = [
      { key: 'ijazah', docType: 'Ijazah' },
      { key: 'kk', docType: 'Kartu Keluarga' },
      { key: 'akta', docType: 'Akta Kelahiran' },
      { key: 'rapor', docType: 'Rapor' },
      { key: 'ktpAyahDoc', docType: 'KTP Ayah' },
      { key: 'ktpIbuDoc', docType: 'KTP Ibu' }
    ];

    currentDocKeys.forEach(({ key, docType }) => {
      const liveUploaded = docsUploaded[key];
      if (liveUploaded) {
        // find if we already have it
        const existsIndex = updatedDocumentsList.findIndex(d => d.type === docType);
        const packedDoc: DocumentItem = {
          id: existsIndex !== -1 ? updatedDocumentsList[existsIndex].id : `DOC_${key.toUpperCase()}_${Date.now()}`,
          type: docType,
          name: liveUploaded.name,
          url: '#',
          uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          status: liveUploaded.status || 'Verifikasi',
          size: liveUploaded.size
        };

        if (existsIndex !== -1) {
          updatedDocumentsList[existsIndex] = packedDoc;
        } else {
          updatedDocumentsList.push(packedDoc);
        }
      } else {
        // If it was removed, take it out
        const existsIdx = updatedDocumentsList.findIndex(d => d.type === docType);
        if (existsIdx !== -1) {
          updatedDocumentsList.splice(existsIdx, 1);
        }
      }
    });

    const studentData: Student = {
      id: editingStudent ? editingStudent.id : `S00${Math.floor(Math.random() * 900) + 100}`,
      nama,
      nisn,
      kelas,
      jurusan,
      email,
      telepon,
      alamat,
      tanggalLahir,
      status,
      catatan,
      createdAt: editingStudent?.createdAt || new Date().toISOString().replace('T', ' ').substring(0, 16),
      documents: updatedDocumentsList,

      // Parents details saved in state
      namaAyah,
      pekerjaanAyah,
      ktpAyah,
      teleponAyah,
      namaIbu,
      pekerjaanIbu,
      ktpIbu,
      teleponIbu,
      teleponOrangTua,
      alamatOrangTua
    };

    onSaveStudent(studentData);
    
    onAddLog(
      editingStudent ? 'Edit Siswa' : 'Daftar Siswa Baru',
      'Siswa',
      `${editingStudent ? 'Memperbaharui' : 'Mendaftarkan'} siswa atas nama ${nama} (Kelas ${kelas}). Otomatis sinkronisasi Google Sheets.`
    );

    onAddNotification(
      editingStudent ? 'Profil Diperbarui' : 'Siswa Terdaftar',
      `Data siswa ${nama} berhasil disimpan ke sistem arsip pusat ARBAL.`,
      'success'
    );
  };

  // Real file picker reference and pending document type tracker
  type DocKey = 'ijazah' | 'kk' | 'akta' | 'rapor' | 'ktpAyahDoc' | 'ktpIbuDoc';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingDocType, setPendingDocType] = useState<DocKey | null>(null);

  // Queue for files waiting to be uploaded after student creation
  const pendingFilesRef = useRef<Map<DocKey, File>>(new Map());

  // Open native file picker for a specific document type
  const openFilePicker = (type: DocKey) => {
    setPendingDocType(type);
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // reset so same file can be re-selected
      fileInputRef.current.click();
    }
  };

  // Handle real file selection from the OS file picker
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingDocType) return;

    // Validate file type (PDF or image only)
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      onAddNotification('Format Berkas Tidak Valid', 'Hanya file PDF, JPG, atau PNG yang diterima.', 'warning');
      return;
    }

    // Format file size to human-readable
    const sizeKB = file.size / 1024;
    const sizeStr = sizeKB >= 1024
      ? `${(sizeKB / 1024).toFixed(1)} MB`
      : `${Math.round(sizeKB)} KB`;

    // Always update local state immediately for UI feedback
    setDocsUploaded(prev => ({
      ...prev,
      [pendingDocType]: {
        name: file.name,
        size: sizeStr,
        status: 'Verifikasi'
      }
    }));

    // If editing existing student, upload to backend immediately
    if (editingStudent?.id) {
      try {
        await uploadDocument(file, editingStudent.id, pendingDocType);
        onAddNotification(
          'Berkas Diunggah ke Server',
          `${file.name} berhasil disimpan ke server arsip ARBAL.`,
          'success'
        );
      } catch (err) {
        onAddNotification(
          'Gagal Mengunggah Berkas',
          `File ${file.name} tersimpan lokal namun gagal diunggah ke server. Coba lagi setelah menyimpan.`,
          'warning'
        );
        // Keep in pending queue as fallback
        pendingFilesRef.current.set(pendingDocType, file);
      }
    } else {
      // New student — queue file for upload after student creation
      pendingFilesRef.current.set(pendingDocType, file);
      onAddNotification(
        'Lampiran Berkas Diunggah',
        `Berkas ${file.name} siap. Akan diunggah ke server setelah data siswa disimpan.`,
        'info'
      );
    }

    setPendingDocType(null);
  };

  // Remove uploaded file
  const handleRemoveDoc = (type: DocKey) => {
    pendingFilesRef.current.delete(type);
    setDocsUploaded(prev => ({
      ...prev,
      [type]: null
    }));
  };

  // Upload all pending files — called after student is created/saved
  const flushPendingUploads = async (studentId: string) => {
    const entries = Array.from(pendingFilesRef.current.entries());
    if (entries.length === 0) return;

    for (const [docKey, file] of entries) {
      try {
        await uploadDocument(file, studentId, docKey);
      } catch {
        // Silent fail — file stays in local state
      }
    }
    pendingFilesRef.current.clear();
  };

  // Expose flushPendingUploads for parent to call after student creation
  useEffect(() => {
    (window as any).__arbalFlushUploads = flushPendingUploads;
    return () => { delete (window as any).__arbalFlushUploads; };
  });

  return (
    <div id="student-form-view" className="space-y-6">
      
      {/* Hidden native file input — triggered by openFilePicker() */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleFileChange}
      />
      
      {/* Header Navigasi */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onCancel}
            className="flex items-center justify-center p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition text-slate-600 shadow-xs"
            title="Kembali ke Daftar Murid"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h3 className="text-base font-extrabold text-slate-800 tracking-tight">
              {editingStudent ? `Sunting Profil: ${nama}` : 'Formulir Registrasi Siswa Baru'}
            </h3>
            <p className="text-xs text-slate-500">
              {editingStudent ? 'Modifikasi lengkap isian identitas kependudukan, wali murid, dan berkas kearsipan.' : 'Modul penerimaan siswa baru PKBM Teknologi Mustaqbal.'}
            </p>
          </div>
        </div>

        {/* AI Auto Fill Trigger */}
        {!editingStudent && (
          <button
            id="btn-open-scanner"
            type="button"
            onClick={() => onAddNotification('OCR Dalam Pengembangan', 'Fitur OCR AI akan segera hadir. Saat ini Anda dapat mengunggah dokumen secara manual.', 'info')}
            className="flex items-center space-x-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-100 font-bold text-xs px-3.5 py-2.5 rounded-lg shadow-md transition shrink-0"
          >
            <RefreshCw size={15} className="text-emerald-400" />
            <span>OCR AI (Segera Hadir)</span>
          </button>
        )}
      </div>

      {/* Main Multi-Tab Core Area */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* TAB NAVIGATION HEADER */}
        <div className="flex bg-slate-50/50 border-b border-slate-200 overflow-x-auto scrollbar-none font-bold">
          
          {/* Tab 1: Siswa */}
          <button
            type="button"
            onClick={() => setActiveTab('siswa')}
            className={`px-5 py-3.5 text-xs inline-flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'siswa' 
                ? 'border-emerald-500 text-emerald-700 bg-white font-extrabold shadow-2xs' 
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/40'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-700 font-bold">1</span>
            Data Diri Siswa
          </button>

          {/* Tab 2: Orang Tua */}
          <button
            type="button"
            onClick={() => setActiveTab('orangtua')}
            className={`px-5 py-3.5 text-xs inline-flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'orangtua' 
                ? 'border-emerald-500 text-emerald-700 bg-white font-extrabold shadow-2xs' 
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/40'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-700 font-bold">2</span>
            Data Orang Tua / Wali
          </button>

          {/* Tab 3: Dokumen Upload */}
          <button
            type="button"
            onClick={() => setActiveTab('dokumen')}
            className={`px-5 py-3.5 text-xs inline-flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === 'dokumen' 
                ? 'border-emerald-500 text-emerald-700 bg-white font-extrabold shadow-2xs' 
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/40'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-700 font-bold">3</span>
            Upload Berkas Persyaratan
            {Object.values(docsUploaded).filter(Boolean).length > 0 && (
              <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[9px] font-black">
                {Object.values(docsUploaded).filter(Boolean).length} Berkas
              </span>
            )}
          </button>
        </div>

        {/* TAB CONTENTS */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs">
          
          {/* TAB 1: DATA DIRI SISWA */}
          {activeTab === 'siswa' && (
            <div className="space-y-6 animate-slide-in">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-slate-800 font-extrabold text-xs uppercase tracking-wide">Identitas Pokok & Kontak Siswa</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Isi seluruh kolom yang bertanda bintang guna keperluan data pokok kementerian.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Nama Lengkap */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Nama Lengkap Siswa *</label>
                  <input
                    id="student-name-input"
                    type="text"
                    placeholder="Masukkan nama lengkap siswa..."
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className={`w-full bg-slate-50 text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border focus:outline-none focus:border-emerald-500 transition ${
                      'border-slate-200'
                    }`}
                    required
                  />
                </div>

                {/* NISN */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">NISN (10 Digit Nasional) *</label>
                  <input
                    id="student-nisn-input"
                    type="text"
                    placeholder="Contoh: 0087491234"
                    maxLength={10}
                    value={nisn}
                    onChange={(e) => setNisn(e.target.value.replace(/\D/g, ''))}
                    className={`w-full bg-slate-50 text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border focus:outline-none focus:border-emerald-500 transition ${
                      'border-slate-200'
                    }`}
                    required
                  />
                </div>

                {/* Tanggal Lahir */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Tanggal Lahir *</label>
                  <input
                    id="student-dob-input"
                    type="date"
                    value={tanggalLahir}
                    onChange={(e) => setTanggalLahir(e.target.value)}
                    className={`w-full bg-slate-50 text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border focus:outline-none focus:border-emerald-500 transition ${
                      'border-slate-200'
                    }`}
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Alamat Surel (Email) *</label>
                  <input
                    id="student-email-input"
                    type="email"
                    placeholder="nama.siswa@siswa.sch.id"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full bg-slate-50 text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border focus:outline-none focus:border-emerald-500 transition ${
                      'border-slate-200'
                    }`}
                    required
                  />
                </div>

                {/* Telefon Seluler */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Nomor HP / WhatsApp Siswa</label>
                  <input
                    id="student-phone-input"
                    type="tel"
                    placeholder="Contoh: 081298765432"
                    value={telepon}
                    onChange={(e) => setTelepon(e.target.value.replace(/\D/g, ''))}
                    className={`w-full bg-slate-50 text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border focus:outline-none focus:border-emerald-500 transition ${
                      'border-slate-200'
                    }`}
                  />
                </div>

                {/* Status Keaktifan */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Status Siswa</label>
                  <select
                    id="student-status-input"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as StudentStatus)}
                    className="w-full bg-slate-50 text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 appearance-none transition-colors font-medium"
                  >
                    <option value="Aktif">Aktif (Murid Berjalan)</option>
                    <option value="Alumni">Alumni (Lulus/Tuntas)</option>
                    <option value="Pindahan">Siswa Pindahan Masuk</option>
                    <option value="Non-Aktif">Non-Aktif/Keluar</option>
                  </select>
                </div>

                {/* Kelas */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Kelas Penempatan</label>
                  <select
                    id="student-class-input"
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 appearance-none transition-colors font-medium"
                  >
                    <option value="X-A">X-A (Umum)</option>
                    <option value="X-B">X-B (Umum)</option>
                    <option value="X-C">X-C (Umum)</option>
                    <option value="XI MIPA 1">XI MIPA 1 (Sains)</option>
                    <option value="XI RPL 1">XI RPL 1 (Vokasional)</option>
                    <option value="XII RPL 1">XII RPL 1 (Vokasional)</option>
                    <option value="XII IPS 3">XII IPS 3 (Sosial)</option>
                  </select>
                </div>

                {/* Konsentrasi / Jurusan */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Jurusan / Peta Kepeminatan</label>
                  <input
                    id="student-major-input"
                    type="text"
                    placeholder="Misal: Rekayasa Perangkat Lunak, IPS..."
                    value={jurusan}
                    onChange={(e) => setJurusan(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3">
                {/* Alamat Lengkap */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Alamat Tinggal Siswa</label>
                  <textarea
                    id="student-address-input"
                    rows={4}
                    placeholder="Tulis alamat rumah, RT/RW, desa/kelurahan, kecamatan, kota..."
                    value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                    className={`w-full bg-slate-50 text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border focus:outline-none focus:border-emerald-500 transition ${
                      'border-slate-200'
                    }`}
                    required
                  />
                </div>

                {/* Catatan Administratif */}
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Catatan Khusus Bimbingan</label>
                  <textarea
                    id="student-notes-input"
                    rows={4}
                    placeholder="Tulis riwayat mutasi, pencapaian beasiswa, atau kebutuhan bimbingan khusus..."
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                    className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 text-xs px-3.5 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              {/* Quick Tab control */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveTab('orangtua')}
                  className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg tracking-wide transition"
                >
                  Lanjut ke Data Orang Tua →
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: DATA ORANG TUA / WALI */}
          {activeTab === 'orangtua' && (
            <div className="space-y-6 animate-slide-in">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-slate-800 font-extrabold text-xs uppercase tracking-wide">Data Walimurid & Orang Tua Kandung</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Lengkapi identitas penanggungjawab siswa demi mempermudah jejaring komsos sekolah.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Ayah Kandung Panel */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 space-y-4">
                  <h5 className="font-bold text-slate-700 tracking-tight flex items-center gap-2 border-b border-slate-200/60 pb-2">
                    <span className="w-1.5 h-3 bg-blue-500 rounded-xs"></span>
                    Profil Ayah Kandung / Wali Laki-Laki
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-mono">Nama Ayah</label>
                      <input
                        type="text"
                        placeholder="Nama lengkap Ayah..."
                        value={namaAyah}
                        onChange={(e) => setNamaAyah(e.target.value)}
                        className={`w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border focus:outline-none focus:border-emerald-500 transition ${
                          'border-slate-200'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-mono">Pekerjaan Ayah</label>
                      <input
                        type="text"
                        placeholder="Misal: Wiraswasta, Karyawan, TNI..."
                        value={pekerjaanAyah}
                        onChange={(e) => setPekerjaanAyah(e.target.value)}
                        className={`w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border focus:outline-none focus:border-emerald-500 transition ${
                          'border-slate-200'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-mono">No KTP Ayah</label>
                      <input
                        type="text"
                        placeholder="16 digit nomor induk KTP..."
                        maxLength={16}
                        value={ktpAyah}
                        onChange={(e) => setKtpAyah(e.target.value.replace(/\D/g, ''))}
                        className={`w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border focus:outline-none focus:border-emerald-500 transition ${
                          'border-slate-200'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-mono">No HP Ayah</label>
                      <input
                        type="tel"
                        placeholder="Contoh: 0812XXXXXXXX..."
                        value={teleponAyah}
                        onChange={(e) => setTeleponAyah(e.target.value.replace(/\D/g, ''))}
                        className={`w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border focus:outline-none focus:border-emerald-500 transition ${
                          'border-slate-200'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Ibu Kandung Panel */}
                <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 space-y-4">
                  <h5 className="font-bold text-slate-700 tracking-tight flex items-center gap-2 border-b border-slate-200/60 pb-2">
                    <span className="w-1.5 h-3 bg-pink-500 rounded-xs"></span>
                    Profil Ibu Kandung / Wali Perempuan
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-mono">Nama Ibu</label>
                      <input
                        type="text"
                        placeholder="Nama lengkap Ibu..."
                        value={namaIbu}
                        onChange={(e) => setNamaIbu(e.target.value)}
                        className={`w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border focus:outline-none focus:border-emerald-500 transition ${
                          'border-slate-200'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-mono">Pekerjaan Ibu</label>
                      <input
                        type="text"
                        placeholder="Pekerjaan Ibu..."
                        value={pekerjaanIbu}
                        onChange={(e) => setPekerjaanIbu(e.target.value)}
                        className={`w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border focus:outline-none focus:border-emerald-500 transition ${
                          'border-slate-200'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-mono">No KTP Ibu</label>
                      <input
                        type="text"
                        placeholder="16 digit nomor induk KTP..."
                        maxLength={16}
                        value={ktpIbu}
                        onChange={(e) => setKtpIbu(e.target.value.replace(/\D/g, ''))}
                        className={`w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border focus:outline-none focus:border-emerald-500 transition ${
                          'border-slate-200'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider font-mono">No HP Ibu</label>
                      <input
                        type="tel"
                        placeholder="Contoh: 0812XXXXXXXX..."
                        value={teleponIbu}
                        onChange={(e) => setTeleponIbu(e.target.value.replace(/\D/g, ''))}
                        className={`w-full bg-white text-slate-800 text-xs px-3 py-2.5 rounded-lg border focus:outline-none focus:border-emerald-500 transition ${
                          'border-slate-200'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Kontak Orang Tua */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">No Telepon Orang Tua / HP Penanggungjawab</label>
                  <input
                    type="tel"
                    placeholder="Contoh: 081234567800"
                    value={teleponOrangTua}
                    onChange={(e) => setTeleponOrangTua(e.target.value.replace(/\D/g, ''))}
                    className={`w-full bg-slate-50 text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border focus:outline-none focus:border-emerald-500 transition ${
                      'border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">Alamat Rumah Orang Tua (Kosongkan jika sama dengan anak)</label>
                  <input
                    type="text"
                    placeholder="Alamat domisili wali kandung..."
                    value={alamatOrangTua}
                    onChange={(e) => setAlamatOrangTua(e.target.value)}
                    className={`w-full bg-slate-50 text-slate-800 text-xs px-3.5 py-2.5 rounded-lg border focus:outline-none focus:border-emerald-500 transition ${
                      'border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* Tab control */}
              <div className="pt-4 border-t border-slate-100 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('siswa')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg transition"
                >
                  ← Kembali ke Data Siswa
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('dokumen')}
                  className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg tracking-wide transition"
                >
                  Lanjut ke Upload Dokumen persyaratan →
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: UPLOAD DOKUMEN PERSYARATAN */}
          {activeTab === 'dokumen' && (
            <div className="space-y-6 animate-slide-in">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-slate-800 font-extrabold text-xs uppercase tracking-wide">Pemberkasan Digital & Validasi Dokumen Persyaratan</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Unggah salinan draf persyaratan pendaftaran. Berkas akan divalidasi oleh Tim TU PKBM Teknologi Mustaqbal.</p>
              </div>

              {/* Grid 4 files: KK, Akta Lahir, Nilai Rapor, Ijazah */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Kartu Keluarga */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-xs transition flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Kartu Keluarga (KK)
                      </span>
                      {docsUploaded.kk ? (
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                          <Check size={10} /> Terlampir
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                          <AlertCircle size={10} /> Belum Ada
                        </span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-slate-400 leading-normal">Salinan KK digital resmi yang memuat NIK siswa pendaftar.</p>
                  </div>

                  {docsUploaded.kk ? (
                    <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between border border-dashed border-slate-200">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <FileText size={18} className="text-blue-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-[11px] truncate">{docsUploaded.kk.name}</p>
                          <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">{docsUploaded.kk.size} &bull; Status: {docsUploaded.kk.status}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc('kk')}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded transition shrink-0"
                        title="Hapus Berkas"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openFilePicker('kk')}
                      className="border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/10 p-5 rounded-xl transition flex flex-col items-center justify-center text-center space-y-1 cursor-pointer"
                    >
                      <UploadCloud size={20} className="text-slate-400" />
                      <span className="font-bold text-xs text-slate-600">Unggah Kartu Keluarga</span>
                      <span className="text-[9px] text-slate-400">Pilih berkas dari komputer (PDF/JPG)</span>
                    </button>
                  )}
                </div>

                {/* 2. Akta Kelahiran */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-xs transition flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        Akta Kelahiran
                      </span>
                      {docsUploaded.akta ? (
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                          <Check size={10} /> Terlampir
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                          <AlertCircle size={10} /> Belum Ada
                        </span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-slate-400 leading-normal">Salinan Akta sah yang dikeluarkan oleh Dinas Kependudukan Sipil.</p>
                  </div>

                  {docsUploaded.akta ? (
                    <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between border border-dashed border-slate-200">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <FileText size={18} className="text-amber-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-[11px] truncate">{docsUploaded.akta.name}</p>
                          <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">{docsUploaded.akta.size} &bull; Status: {docsUploaded.akta.status}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc('akta')}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded transition shrink-0"
                        title="Hapus Berkas"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openFilePicker('akta')}
                      className="border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/10 p-5 rounded-xl transition flex flex-col items-center justify-center text-center space-y-1 cursor-pointer"
                    >
                      <UploadCloud size={20} className="text-slate-400" />
                      <span className="font-bold text-xs text-slate-600">Unggah Akta Kelahiran</span>
                      <span className="text-[9px] text-slate-400">Pilih berkas dari komputer (PDF/JPG)</span>
                    </button>
                  )}
                </div>

                {/* 3. Nilai Rapor */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-xs transition flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        Transkrip / Nilai Rapor
                      </span>
                      {docsUploaded.rapor ? (
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                          <Check size={10} /> Terlampir
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                          <AlertCircle size={10} /> Belum Ada
                        </span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-slate-400 leading-normal">Nilai rapor jenjang terakhir (Halaman Nilai Pengesahan).</p>
                  </div>

                  {docsUploaded.rapor ? (
                    <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between border border-dashed border-slate-200">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <FileText size={18} className="text-emerald-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-[11px] truncate">{docsUploaded.rapor.name}</p>
                          <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">{docsUploaded.rapor.size} &bull; Status: {docsUploaded.rapor.status}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc('rapor')}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded transition shrink-0"
                        title="Hapus Berkas"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openFilePicker('rapor')}
                      className="border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/10 p-5 rounded-xl transition flex flex-col items-center justify-center text-center space-y-1 cursor-pointer"
                    >
                      <UploadCloud size={20} className="text-slate-400" />
                      <span className="font-bold text-xs text-slate-600">Unggah Transkrip Nilai Rapor</span>
                      <span className="text-[9px] text-slate-400">Pilih berkas dari komputer (PDF/JPG)</span>
                    </button>
                  )}
                </div>

                {/* 4. Ijazah Kelulusan */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-xs transition flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                        Ijazah Sekolah Asal (SMP/MTS)
                      </span>
                      {docsUploaded.ijazah ? (
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                          <Check size={10} /> Terlampir
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                          <AlertCircle size={10} /> Belum Ada
                        </span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-slate-400 leading-normal">Salinan ijazah lulusan terakhir tanda pengenal akademis legal.</p>
                  </div>

                  {docsUploaded.ijazah ? (
                    <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between border border-dashed border-slate-200">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <FileText size={18} className="text-purple-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-[11px] truncate">{docsUploaded.ijazah.name}</p>
                          <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">{docsUploaded.ijazah.size} &bull; Status: {docsUploaded.ijazah.status}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc('ijazah')}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded transition shrink-0"
                        title="Hapus Berkas"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openFilePicker('ijazah')}
                      className="border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/10 p-5 rounded-xl transition flex flex-col items-center justify-center text-center space-y-1 cursor-pointer"
                    >
                      <UploadCloud size={20} className="text-slate-400" />
                      <span className="font-bold text-xs text-slate-600">Unggah Lembar Ijazah</span>
                      <span className="text-[9px] text-slate-400">Pilih berkas dari komputer (PDF/JPG)</span>
                    </button>
                  )}
                </div>

                {/* 5. KTP Ayah */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-xs transition flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        KTP Ayah Kandung / Wali
                      </span>
                      {docsUploaded.ktpAyahDoc ? (
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                          <Check size={10} /> Terlampir
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                          <AlertCircle size={10} /> Belum Ada
                        </span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-slate-400 leading-normal">Salinan KTP Ayah Kandung atau Wali murid yang terdaftar.</p>
                  </div>

                  {docsUploaded.ktpAyahDoc ? (
                    <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between border border-dashed border-slate-200">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <FileText size={18} className="text-blue-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-[11px] truncate">{docsUploaded.ktpAyahDoc.name}</p>
                          <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">{docsUploaded.ktpAyahDoc.size} &bull; Status: {docsUploaded.ktpAyahDoc.status}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc('ktpAyahDoc')}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded transition shrink-0"
                        title="Hapus Berkas"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openFilePicker('ktpAyahDoc')}
                      className="border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/10 p-5 rounded-xl transition flex flex-col items-center justify-center text-center space-y-1 cursor-pointer"
                    >
                      <UploadCloud size={20} className="text-slate-400" />
                      <span className="font-bold text-xs text-slate-600">Unggah KTP Ayah</span>
                      <span className="text-[9px] text-slate-400">Pilih berkas dari komputer (PDF/JPG)</span>
                    </button>
                  )}
                </div>

                {/* 6. KTP Ibu */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-xs transition flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                        KTP Ibu Kandung / Wali
                      </span>
                      {docsUploaded.ktpIbuDoc ? (
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                          <Check size={10} /> Terlampir
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                          <AlertCircle size={10} /> Belum Ada
                        </span>
                      )}
                    </div>
                    <p className="text-[10.5px] text-slate-400 leading-normal">Salinan KTP Ibu Kandung atau Wali murid yang terdaftar.</p>
                  </div>

                  {docsUploaded.ktpIbuDoc ? (
                    <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between border border-dashed border-slate-200">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <FileText size={18} className="text-pink-500 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-[11px] truncate">{docsUploaded.ktpIbuDoc.name}</p>
                          <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">{docsUploaded.ktpIbuDoc.size} &bull; Status: {docsUploaded.ktpIbuDoc.status}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc('ktpIbuDoc')}
                        className="text-red-500 hover:bg-red-50 p-1.5 rounded transition shrink-0"
                        title="Hapus Berkas"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openFilePicker('ktpIbuDoc')}
                      className="border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/10 p-5 rounded-xl transition flex flex-col items-center justify-center text-center space-y-1 cursor-pointer"
                    >
                      <UploadCloud size={20} className="text-slate-400" />
                      <span className="font-bold text-xs text-slate-600">Unggah KTP Ibu</span>
                      <span className="text-[9px] text-slate-400">Pilih berkas dari komputer (PDF/JPG)</span>
                    </button>
                  )}
                </div>

              </div>

              {/* Tab control */}
              <div className="pt-4 border-t border-slate-100 flex justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('orangtua')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg transition"
                >
                  ← Kembali ke Data Orang Tua
                </button>

                <p className="text-[10px] text-slate-400 italic">Tinjau seluruh data sebelum menekan tombol simpan utama.</p>
              </div>
            </div>
          )}

          {/* SUBMIT FORM BUTTONS (SHARED) */}
          <div className="pt-5 border-t border-slate-100 flex items-center justify-end space-x-3 bg-slate-50/40 p-4 -mx-6 -mb-6">
            <button
              id="btn-cancel-form"
              type="button"
              onClick={onCancel}
              className="bg-slate-200 hover:bg-slate-300 text-slate-705 font-bold py-2.5 px-5 rounded-lg transition text-slate-800"
            >
              Batalkan
            </button>
            <button
              id="btn-submit-student"
              type="submit"
              disabled={selectedRole === 'Guru / Wali Kelas'}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-lg transition shadow-md hover:shadow-emerald-600/10 flex items-center space-x-2 cursor-pointer"
            >
              <Save size={14} />
              <span>{editingStudent ? 'Perbaharui & Verifikasi' : 'Simpan Pendaftaran Lengkap'}</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
