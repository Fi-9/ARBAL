/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  UserPlus, 
  Edit3, 
  ArrowLeft, 
  Save, 
  HelpCircle,
  BrainCircuit,
  FileSearch2,
  RefreshCw,
  Layout,
  CheckCircle2,
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

  // Form States - Tab 3: Upload Dokumen (KK, Akta Kelahiran, Nilai Rapor, Ijazah)
  const [docsUploaded, setDocsUploaded] = useState<{
    ijazah: { name: string; size: string; status: 'Terarsip' | 'Verifikasi' } | null;
    kk: { name: string; size: string; status: 'Terarsip' | 'Verifikasi' } | null;
    akta: { name: string; size: string; status: 'Terarsip' | 'Verifikasi' } | null;
    rapor: { name: string; size: string; status: 'Terarsip' | 'Verifikasi' } | null;
  }>({
    ijazah: null,
    kk: null,
    akta: null,
    rapor: null,
  });

  // Scanning simulation state
  const [showAiScanner, setShowAiScanner] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgressLogs, setScanProgressLogs] = useState<string[]>([]);
  const [scannedDocType, setScannedDocType] = useState<'kk' | 'akta' | 'ijazah'>('kk');
  const [flashFields, setFlashFields] = useState(false);

  // Initialize form if editing
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
        rapor: null as any
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

      setDocsUploaded({ ijazah: null, kk: null, akta: null, rapor: null });
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

    const currentDocKeys: { key: 'ijazah' | 'kk' | 'akta' | 'rapor'; docType: DocumentType }[] = [
      { key: 'ijazah', docType: 'Ijazah' },
      { key: 'kk', docType: 'Kartu Keluarga' },
      { key: 'akta', docType: 'Akta Kelahiran' },
      { key: 'rapor', docType: 'Rapor' }
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

  // Simulated Manual File Selector Trigger
  const handleSimulateUpload = (type: 'ijazah' | 'kk' | 'akta' | 'rapor') => {
    let mockFileName = '';
    let mockSize = '1.2 MB';

    if (type === 'ijazah') {
      mockFileName = `Ijazah_SMP_${nama.replace(/\s+/g, '_') || 'Siswa'}.pdf`;
      mockSize = '1.4 MB';
    } else if (type === 'kk') {
      mockFileName = `KK_Keluarga_${nama.split(' ')[0] || 'Siswa'}.pdf`;
      mockSize = '950 KB';
    } else if (type === 'akta') {
      mockFileName = `Akta_Lahir_${nama.replace(/\s+/g, '_') || 'Siswa'}.pdf`;
      mockSize = '720 KB';
    } else {
      mockFileName = `Nilai_Rapor_Semester_Lalu_${nama.split(' ')[0] || 'Siswa'}.pdf`;
      mockSize = '2.1 MB';
    }

    setDocsUploaded(prev => ({
      ...prev,
      [type]: {
        name: mockFileName,
        size: mockSize,
        status: 'Verifikasi'
      }
    }));

    onAddNotification(
      'Lampiran Berkas Diunggah',
      `Berhasil menautkan berkas baru ${mockFileName}. Klik simpan untuk mencadangkan ke cloud.`,
      'info'
    );
  };

  // Remove uploaded file
  const handleRemoveDoc = (type: 'ijazah' | 'kk' | 'akta' | 'rapor') => {
    setDocsUploaded(prev => ({
      ...prev,
      [type]: null
    }));
  };

  // Simulate AI scan with ThinkingLevel.HIGH and models/gemini-3.1-pro-preview
  const triggerAiScan = (type: 'kk' | 'akta' | 'ijazah') => {
    setScannedDocType(type);
    setIsScanning(true);
    setScanProgressLogs([]);

    const scanLogs = [
      '⚡ [SISTEM]: Membuat sesi penawaran model cerdas @google/genai (gemini-3.1-pro-preview)...',
      '⚙️ [AI]: Mengaktifkan Pemikiran Intensitas Tinggi (ThinkingLevel.HIGH)...',
      '🔍 [AI]: Memindai struktur metadata dokumen ' + type.toUpperCase() + '...',
      '🎓 [AI]: Menemukan kesesuaian penanda PKBM Teknologi Mustaqbal...',
      '📑 [AI]: Melakukan Optical Character Recognition (OCR) pada formulir arsip...',
      '👤 [AI]: Mengekstrak Identitas Siswa beserta Nama Orang Tua & Pekerjaan...',
      '📂 [AI]: Melacak relasi data kependudukan dan memvalidasi nomor telepon...',
      '🚀 [SUKSES]: Integrasi berhasil memetakan 14 bidang data kependudukan lengkap!'
    ];

    let count = 0;
    const interval = setInterval(() => {
      if (count < scanLogs.length) {
        setScanProgressLogs(prev => [...prev, scanLogs[count]]);
        count++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          if (type === 'kk') {
            setNama('Zahra Kirana Maharani');
            setNisn('0094827184');
            setKelas('X-B');
            setJurusan('Rekayasa Perangkat Lunak');
            setEmail('zahra.kirana@siswa.sch.id');
            setTelepon('089912345678');
            setAlamat('Perumahan Cigadung Elok Blok D-22, Coblong, Bandung');
            setTanggalLahir('2010-04-14');
            setStatus('Aktif');
            setCatatan('Data diisi otomatis via ARBAL Gemini AI Scanner (Kartu Keluarga)');

            // Parents info filled
            setNamaAyah('Irvan Kusuma Maharani');
            setPekerjaanAyah('Karyawan Swasta');
            setKtpAyah('3273181803760002');
            setTeleponAyah('089987654311');
            setNamaIbu('Siti Halimah');
            setPekerjaanIbu('Ibu Rumah Tangga');
            setKtpIbu('3273184407810003');
            setTeleponIbu('089912123434');
            setTeleponOrangTua('089987654311');
            setAlamatOrangTua('Perumahan Cigadung Elok Blok D-22, Coblong, Bandung');

            // Attach KK document
            setDocsUploaded(prev => ({
              ...prev,
              kk: { name: 'KK_Zahra_Kirana_Bandung.pdf', size: '1.2 MB', status: 'Verifikasi' }
            }));

          } else if (type === 'akta') {
            setNama('Ade Bagus Saputra');
            setNisn('0091122334');
            setKelas('X-A');
            setJurusan('Teknik Jaringan Komputer');
            setEmail('ade.bagus@siswa.sch.id');
            setTelepon('081122334455');
            setAlamat('Jl. Cisitu Indah No. 10B, Dago, Bandung');
            setTanggalLahir('2010-08-19');
            setStatus('Aktif');
            setCatatan('Data diisi otomatis via ARBAL Gemini AI Scanner (Akta Kelahiran)');

            // Parents
            setNamaAyah('Suryanto Saputra');
            setPekerjaanAyah('PNS / Guru');
            setKtpAyah('3273121010720001');
            setTeleponAyah('08119876542');
            setNamaIbu('Endang Lestari');
            setPekerjaanIbu('Wiraswasta');
            setKtpIbu('3273125211750005');
            setTeleponIbu('08119876543');
            setTeleponOrangTua('08119876542');
            setAlamatOrangTua('Jl. Cisitu Indah No. 10B, Dago, Bandung');

            // Attach Akta document
            setDocsUploaded(prev => ({
              ...prev,
              akta: { name: 'Akta_Lahir_Ade_Bagus.pdf', size: '780 KB', status: 'Verifikasi' }
            }));

          } else {
            setNama('Kevin Austin Pratama');
            setNisn('0083344556');
            setKelas('XII RPL 1');
            setJurusan('Rekayasa Perangkat Lunak');
            setEmail('kevin.austin@siswa.sch.id');
            setTelepon('085566778899');
            setAlamat('Pondok Hijau Indah Blok H No. 4, Geger Kalong, Bandung');
            setTanggalLahir('2009-02-28');
            setStatus('Aktif');
            setCatatan('Data diisi otomatis via ARBAL Gemini AI Scanner (Ijazah Kelulusan)');

            // Parents
            setNamaAyah('Stefanus Pratama');
            setPekerjaanAyah('Wiraswasta');
            setKtpAyah('3273151505740003');
            setTeleponAyah('08552233445');
            setNamaIbu('Clara Austin');
            setPekerjaanIbu('Dosen');
            setKtpIbu('3273154810780002');
            setTeleponIbu('08556677889');
            setTeleponOrangTua('08552233445');
            setAlamatOrangTua('Pondok Hijau Indah Blok H No. 4, Geger Kalong, Bandung');

            // Attach Ijazah and Rapor document
            setDocsUploaded(prev => ({
              ...prev,
              ijazah: { name: 'Ijazah_SMP_Kevin_Austin.pdf', size: '1.4 MB', status: 'Verifikasi' },
              rapor: { name: 'Rapor_SMP_Smt5_Kevin.pdf', size: '2.3 MB', status: 'Verifikasi' }
            }));
          }

          setIsScanning(false);
          setShowAiScanner(false);
          setFlashFields(true);
          setActiveTab('orangtua'); // Switch to let parents info be verified

          onAddLog(
            'Pemindaian AI',
            'Siswa',
            `Melakukan ekstraksi pendaftaran AI scan menggunakan model cerdas kementerian untuk melengkapi folder murid.`
          );

          onAddNotification(
            'Auto-Fill AI Sukses',
            `Data siswa, orang tua, dan berkas scan berhasil dimasukkan secara otomatis! Silakan tinjau tiap tab.`,
            'success'
          );

          // Clear flash after 2 seconds
          setTimeout(() => setFlashFields(false), 2000);
        }, 800);
      }
    }, 400);
  };

  return (
    <div id="student-form-view" className="space-y-6">
      
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
            onClick={() => setShowAiScanner(true)}
            className="flex items-center space-x-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-100 font-bold text-xs px-3.5 py-2.5 rounded-lg shadow-md transition shrink-0"
          >
            <BrainCircuit size={15} className="text-emerald-400" />
            <span>Isi Otomatis via AI Scanner</span>
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
                      flashFields ? 'border-emerald-500 bg-emerald-50 animate-pulse' : 'border-slate-200'
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
                      flashFields ? 'border-emerald-500 bg-emerald-50 animate-pulse' : 'border-slate-200'
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
                      flashFields ? 'border-emerald-500 bg-emerald-50 animate-pulse' : 'border-slate-200'
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
                      flashFields ? 'border-emerald-500 bg-emerald-50 animate-pulse' : 'border-slate-200'
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
                      flashFields ? 'border-emerald-500 bg-emerald-50 animate-pulse' : 'border-slate-200'
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
                      flashFields ? 'border-emerald-500 bg-emerald-50 animate-pulse' : 'border-slate-200'
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
                          flashFields ? 'border-emerald-500 bg-emerald-50 animate-pulse' : 'border-slate-200'
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
                          flashFields ? 'border-emerald-500 bg-emerald-50 animate-pulse' : 'border-slate-200'
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
                          flashFields ? 'border-emerald-500 bg-emerald-50 animate-pulse' : 'border-slate-200'
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
                          flashFields ? 'border-emerald-500 bg-emerald-50 animate-pulse' : 'border-slate-200'
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
                          flashFields ? 'border-emerald-500 bg-emerald-50 animate-pulse' : 'border-slate-200'
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
                          flashFields ? 'border-emerald-500 bg-emerald-50 animate-pulse' : 'border-slate-200'
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
                          flashFields ? 'border-emerald-500 bg-emerald-50 animate-pulse' : 'border-slate-200'
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
                          flashFields ? 'border-emerald-500 bg-emerald-50 animate-pulse' : 'border-slate-200'
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
                      flashFields ? 'border-emerald-500 bg-emerald-50 animate-pulse' : 'border-slate-200'
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
                      flashFields ? 'border-emerald-500 bg-emerald-50 animate-pulse' : 'border-slate-200'
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
                      onClick={() => handleSimulateUpload('kk')}
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
                      onClick={() => handleSimulateUpload('akta')}
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
                      onClick={() => handleSimulateUpload('rapor')}
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
                      onClick={() => handleSimulateUpload('ijazah')}
                      className="border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/10 p-5 rounded-xl transition flex flex-col items-center justify-center text-center space-y-1 cursor-pointer"
                    >
                      <UploadCloud size={20} className="text-slate-400" />
                      <span className="font-bold text-xs text-slate-600">Unggah Lembar Ijazah</span>
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

      {/* MODAL WINDOWS: AI AUTOSCAN POPUP */}
      {showAiScanner && (
        <div id="ai-scanner-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl relative p-6 space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BrainCircuit className="text-emerald-500" size={22} />
                <h3 className="text-base font-extrabold text-slate-800">Gemini AI Document Auto-Extractor</h3>
              </div>
              <button 
                id="btn-close-scanner"
                onClick={() => setShowAiScanner(false)}
                disabled={isScanning}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content description */}
            <div className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
              <p>
                Fitur ini mensimulasikan integrasi tingkat tinggi menggunakan model cerdas <strong className="text-emerald-600">gemini-3.1-pro-preview</strong> yang dikonfigurasi dengan <strong className="text-emerald-600">ThinkingLevel.HIGH</strong>.
              </p>
              <p>
                Sistem akan memindai berkas digital pendaftaran (Kartu Keluarga, Akta, Ijazah), menalar struktur letak data pendaftar, lalu mengisi formulir registrasi utama secara instan.
              </p>
            </div>

            {/* Choice of mock files to scan */}
            {!isScanning ? (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PILIH SAMPEL DOKUMEN PINDAIAN</p>
                
                <div className="grid grid-cols-1 gap-2.5 text-xs">
                  {/* Option 1 */}
                  <button
                    id="scan-option-kk"
                    onClick={() => triggerAiScan('kk')}
                    className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:bg-slate-50 text-left transition hover:border-emerald-500 cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-50 text-blue-500 p-2 rounded-lg">
                        <FileSearch2 size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">KK_Zahra_Bandung.jpg</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Berkas scan Kartu Keluarga resmi Jawa Barat.</p>
                      </div>
                    </div>
                    <Sparkles size={14} className="text-emerald-500 shrink-0" />
                  </button>

                  {/* Option 2 */}
                  <button
                    id="scan-option-akta"
                    onClick={() => triggerAiScan('akta')}
                    className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:bg-slate-50 text-left transition hover:border-emerald-500 cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="bg-amber-50 text-amber-500 p-2 rounded-lg">
                        <FileSearch2 size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">Akta_Lahir_Ade_Saputra.pdf</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Berkas scan Akta Kelahiran resmi cap basah.</p>
                      </div>
                    </div>
                    <Sparkles size={14} className="text-emerald-500 shrink-0" />
                  </button>

                  {/* Option 3 */}
                  <button
                    id="scan-option-ijazah"
                    onClick={() => triggerAiScan('ijazah')}
                    className="flex items-center justify-between p-3 border border-slate-200 rounded-xl hover:bg-slate-50 text-left transition hover:border-emerald-500 cursor-pointer"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="bg-purple-50 text-purple-500 p-2 rounded-lg">
                        <FileSearch2 size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">Ijazah_SMP_Kevin.pdf</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Berkas scan Ijazah kelulusan tingkat SMP.</p>
                      </div>
                    </div>
                    <Sparkles size={14} className="text-emerald-500 shrink-0" />
                  </button>
                </div>
              </div>
            ) : (
              /* Scanning Status & Terminal Log Output */
              <div className="space-y-4">
                {/* Loader animated orb */}
                <div className="flex flex-col items-center justify-center p-4">
                  <div className="relative flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full border-4 border-slate-200 border-t-emerald-500 animate-spin" />
                    <Sparkles className="absolute text-emerald-500 animate-pulse" size={24} />
                  </div>
                  <p className="text-xs font-bold text-slate-700 mt-3 animate-pulse">Menghubungkan & Menalar via Gemini AI...</p>
                </div>

                {/* Progress Log Monitor (Terminal Interface) */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 font-mono text-[10px] text-slate-300 h-44 overflow-y-auto space-y-1">
                  {scanProgressLogs.map((logStr, index) => (
                    <div key={index} className="leading-relaxed">
                      {logStr}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Simulated footer with API info */}
            <div className="text-[10.5px] text-slate-400 text-center flex items-center justify-center gap-1.5 pt-2 border-t border-slate-100 font-medium">
              <CheckCircle2 size={12} className="text-emerald-500" />
              <span>Thinking Mode: High, 100% Secure Enclave.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
