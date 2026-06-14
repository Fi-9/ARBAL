/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  FileText, 
  Check, 
  X, 
  Trash2, 
  Plus, 
  Edit, 
  Eye,
  Download, 
  UploadCloud, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail,
  AlertCircle,
  FolderLock,
  ExternalLink,
  ChevronRight,
  FileCheck2,
  Trash,
  RefreshCw
} from 'lucide-react';
import { Student, DocumentItem, DocumentType, StudentStatus, RoleType } from '../types';

interface StudentDirectoryViewProps {
  students: Student[];
  selectedRole: RoleType;
  onUpdateStudents: (updated: Student[]) => void;
  onAddLog: (action: string, category: 'Siswa' | 'Dokumen' | 'Hak Akses' | 'Google Drive' | 'Google Sheets', details: string) => void;
  onAddNotification: (title: string, message: string, type: 'info' | 'success' | 'warning') => void;
  onEditStudent: (student: Student) => void;
}

export default function StudentDirectoryView({
  students,
  selectedRole,
  onUpdateStudents,
  onAddLog,
  onAddNotification,
  onEditStudent
}: StudentDirectoryViewProps) {

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua');
  const [selectedDocCompleteness, setSelectedDocCompleteness] = useState('Semua');

  // Selected student for detail modal
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  
  // New Document Upload Form State (for detail modal)
  const [uploadDocType, setUploadDocType] = useState<DocumentType>('Ijazah');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isUploadingIdx, setIsUploadingIdx] = useState(false);

  // Active student object helper
  const activeStudent = students.find(s => s.id === activeStudentId) || null;

  // Permissions helper
  const canDelete = selectedRole === 'Super Admin';
  const canWrite = selectedRole === 'Super Admin' || selectedRole === 'Staff TU';
  const canVerify = selectedRole === 'Super Admin' || selectedRole === 'Staff TU';

  // Get distinct classes for filters
  const classes = ['Semua', ...Array.from(new Set(students.map(s => s.kelas)))];

  // Drag and drop mock
  const [dragActive, setDragActive] = useState(false);

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.nisn.includes(searchTerm) || 
                          student.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.jurusan.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClass = selectedClass === 'Semua' || student.kelas === selectedClass;
    const matchesStatus = selectedStatus === 'Semua' || student.status === selectedStatus;
    
    let matchesCompleteness = true;
    if (selectedDocCompleteness === 'Lengkap') {
      matchesCompleteness = student.documents.length >= 5;
    } else if (selectedDocCompleteness === 'Belum Lengkap') {
      matchesCompleteness = student.documents.length < 5;
    }

    return matchesSearch && matchesClass && matchesStatus && matchesCompleteness;
  });

  // Handle Delete Student
  const handleDeleteStudent = (id: string, name: string) => {
    if (!canDelete) {
      alert('Maaf, Anda tidak memiliki hak akses untuk menghapus data siswa.');
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus data siswa ${name}? Seluruh arsip dokumen digital juga akan dihapus.`)) {
      const updated = students.filter(s => s.id !== id);
      onUpdateStudents(updated);
      onAddLog(
        'Hapus Siswa', 
        'Siswa', 
        `Menghapus data siswa ${name} (${id}) berkas arsip terkait dibersihkan.`
      );
      onAddNotification(
        'Siswa Dihapus',
        `Data siswa ${name} berhasil dihapus oleh Super Admin dari direktori terpusat.`,
        'warning'
      );
      if (activeStudentId === id) {
        setActiveStudentId(null);
      }
    }
  };

  // Mock Upload Document Form Action
  const handleDocSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFileName(e.target.files[0].name);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFileName(e.dataTransfer.files[0].name);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;
    if (!selectedFileName) {
      alert('Pilih berkas digital terlebih dahulu.');
      return;
    }

    setIsUploadingIdx(true);

    // Simulate upload delay (e.g. sending metadata to google drive)
    setTimeout(() => {
      const isAlreadyHaveDoc = activeStudent.documents.some(d => d.type === uploadDocType);
      
      const newDoc: DocumentItem = {
        id: `D_${activeStudent.id}_${Date.now()}`,
        type: uploadDocType,
        name: selectedFileName,
        url: '#',
        uploadedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status: 'Verifikasi', // Initial state is waiting for verification
        size: `${(Math.random() * 2 + 0.5).toFixed(1)} MB`
      };

      // Replace or Add
      let updatedDocs = [...activeStudent.documents];
      if (isAlreadyHaveDoc) {
        updatedDocs = updatedDocs.map(d => d.type === uploadDocType ? newDoc : d);
      } else {
        updatedDocs.push(newDoc);
      }

      const updatedStudents = students.map(s => {
        if (s.id === activeStudent.id) {
          return { ...s, documents: updatedDocs };
        }
        return s;
      });

      onUpdateStudents(updatedStudents);
      setIsUploadingIdx(false);
      setSelectedFileName('');
      
      onAddLog(
        'Upload Dokumen',
        'Dokumen',
        `Mendapatkan unggahan baru dokumen ${uploadDocType} (${newDoc.name}) untuk siswa ${activeStudent.nama}. Sinkronisasi cadangan Google Drive berjalan.`
      );

      onAddNotification(
        'Dokumen Baru Diunggah',
        `Dokumen ${uploadDocType} atas nama ${activeStudent.nama} berhasil diunggah dan membutuhkan verifikasi.`,
        'success'
      );
    }, 1200);
  };

  // Document Verification Action (Approve / Reject)
  const handleVerifyDocument = (studentId: string, docId: string, action: 'approve' | 'reject') => {
    if (!canVerify) {
      alert('Anda tidak memiliki izin memverifikasi dokumen.');
      return;
    }

    const updatedStudents = students.map(s => {
      if (s.id === studentId) {
        const updatedDocs = s.documents.map(d => {
          if (d.id === docId) {
            return { 
              ...d, 
              status: action === 'approve' ? 'Terarsip' as const : 'Ditolak' as const
            };
          }
          return d;
        });
        return { ...s, documents: updatedDocs };
      }
      return s;
    });

    onUpdateStudents(updatedStudents);

    const studentName = students.find(s => s.id === studentId)?.nama || '';
    const docType = students.find(s => s.id === studentId)?.documents.find(d => d.id === docId)?.type || '';

    onAddLog(
      'Verifikasi Dokumen',
      'Dokumen',
      `Dokumen ${docType} siswa ${studentName} telah ${action === 'approve' ? 'DISETUJUI (Terarsip)' : 'DITOLAK'} oleh ${selectedRole}.`
    );

    onAddNotification(
      'Verifikasi Selesai',
      `Dokumen ${docType} dari ${studentName} ${action === 'approve' ? 'berhasil diverifikasi dan diarsipkan.' : 'ditolak.'}`,
      action === 'approve' ? 'success' : 'warning'
    );
  };

  // Delete document action
  const handleDeleteDocument = (studentId: string, docId: string, docName: string) => {
    if (!selectedRole || selectedRole === 'Guru / Wali Kelas') {
      alert('Anda tidak diizinkan menghapus dokumen arsip.');
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus arsip berkas ${docName} ini?`)) {
      const updatedStudents = students.map(s => {
        if (s.id === studentId) {
          return {
            ...s,
            documents: s.documents.filter(d => d.id !== docId)
          };
        }
        return s;
      });

      onUpdateStudents(updatedStudents);

      const targetStudent = students.find(s => s.id === studentId);
      onAddLog(
        'Hapus Dokumen',
        'Dokumen',
        `Menghapus berkas ${docName} milik ${targetStudent?.nama}. Berkas otomatis terhapus dari server Google Drive.`
      );

      onAddNotification(
        'Arsip Berkas Dihapus',
        `Berkas ${docName} berhasil dihapus dari arsip digital terpusat.`,
        'warning'
      );
    }
  };

  return (
    <div id="student-directory-view" className="space-y-6">
      {/* Search and Filters Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-800">Direktori Arsip Siswa</h3>
            <p className="text-xs text-slate-500">Mencari dan memfilter seluruh dokumen murid, status verifikasi, dan kelengkapan arsip.</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
              {filteredStudents.length} dari {students.length} Siswa Terdaftar
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              id="search-student"
              type="text"
              placeholder="Cari Nama, NISN, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 placeholder-slate-400 text-xs pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Class filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <select
              id="filter-class"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 text-xs pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 appearance-none transition-colors"
            >
              <option disabled>Pilih Kelas</option>
              {classes.map((cls) => (
                <option key={cls} value={cls}>{cls === 'Semua' ? 'Semua Kelas' : cls}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <select
              id="filter-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 text-xs pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 appearance-none transition-colors"
            >
              <option value="Semua">Semua Status</option>
              <option value="Aktif">Status: Aktif</option>
              <option value="Alumni">Status: Alumni</option>
              <option value="Pindahan">Status: Pindahan</option>
              <option value="Non-Aktif">Status: Non-Aktif</option>
            </select>
          </div>

          {/* Completeness filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <select
              id="filter-completeness"
              value={selectedDocCompleteness}
              onChange={(e) => setSelectedDocCompleteness(e.target.value)}
              className="w-full bg-slate-50 text-slate-800 text-xs pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-emerald-500 appearance-none transition-colors"
            >
              <option value="Semua">Kelengkapan Arsip</option>
              <option value="Lengkap">Arsip Lengkap (5/5)</option>
              <option value="Belum Lengkap">Belum Lengkap (&lt; 5)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <FolderLock size={36} className="mx-auto text-slate-300" />
            <p className="font-bold text-slate-600">Tidak ada data siswa ditemukan</p>
            <p>Silakan sesuaikan filter pencarian atau daftarkan siswa baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">ID / NISN</th>
                  <th className="p-4">Nama Siswa</th>
                  <th className="p-4">Kelas & Jurusan</th>
                  <th className="p-4 text-center">Kelengkapan Dokumen</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStudents.map((student) => {
                  const docCount = student.documents.length;
                  const percentComplete = Math.min((docCount / 5) * 100, 100);
                  
                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 font-mono">
                        <span className="font-semibold text-slate-900 block">{student.id}</span>
                        <span className="text-slate-400 text-[10px]">NISN: {student.nisn}</span>
                      </td>
                      <td className="p-4 font-bold text-slate-800">
                        {student.nama}
                        <span className="text-[10px] font-normal text-slate-400 block mt-0.5 max-w-[200px] truncate">{student.email}</span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-700 block">{student.kelas}</span>
                        <span className="text-slate-400 text-[10px]">{student.jurusan}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col items-center space-y-1 max-w-[120px] mx-auto">
                          <div className="flex items-center justify-between w-full text-[10px] text-slate-500">
                            <span>{docCount}/5 Berkas</span>
                            <span>{percentComplete}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                percentComplete === 100 ? 'bg-emerald-500' :
                                percentComplete >= 60 ? 'bg-amber-400' : 'bg-rose-400'
                              }`}
                              style={{ width: `${percentComplete}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold ${
                          student.status === 'Aktif' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          student.status === 'Alumni' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                          student.status === 'Pindahan' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          ● {student.status}
                        </span>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center space-x-1.5">
                          <button
                            id={`btn-detail-${student.id}`}
                            onClick={() => setActiveStudentId(student.id)}
                            className="bg-slate-50 hover:bg-slate-100 text-slate-700 p-1.5 rounded-lg border border-slate-200 transition"
                            title="Buka Dokumen & Informasi Detil"
                          >
                            <Eye size={14} />
                          </button>
                          
                          {canWrite && (
                            <button
                              id={`btn-edit-${student.id}`}
                              onClick={() => onEditStudent(student)}
                              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-1.5 rounded-lg border border-indigo-100 transition"
                              title="Edit Profil Siswa"
                            >
                              <Edit size={14} />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              id={`btn-delete-${student.id}`}
                              onClick={() => handleDeleteStudent(student.id, student.nama)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 p-1.5 rounded-lg border border-rose-105 transition"
                              title="Hapus Data Siswa"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL MODAL DRAWER (WHEN CLICKED EYE) */}
      {activeStudent && (
        <div id="student-detail-drawer" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-end z-50 transition-opacity">
          <div className="w-full max-w-2xl bg-white h-screen flex flex-col shadow-2xl relative animate-slide-in p-0 overflow-hidden">
            {/* Drawer Header */}
            <div className="bg-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800">
              <div className="space-y-1">
                <span className="text-xs bg-emerald-500/10 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/20">
                  ID SISWA: {activeStudent.id}
                </span>
                <h3 className="text-lg font-bold text-white tracking-tight">{activeStudent.nama}</h3>
                <p className="text-xs text-slate-400">Kelas {activeStudent.kelas} — {activeStudent.jurusan}</p>
              </div>
              <button 
                id="btn-close-drawer"
                onClick={() => setActiveStudentId(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white p-2 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Profile Details Block */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                <div className="flex items-center space-x-2.5 text-slate-600">
                  <Calendar size={14} className="text-slate-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Tanggal Lahir</p>
                    <p className="text-slate-800 mt-0.5">{activeStudent.tanggalLahir}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 text-slate-600">
                  <Phone size={14} className="text-slate-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">No. Telepon</p>
                    <p className="text-slate-800 mt-0.5">{activeStudent.telepon}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 text-slate-600">
                  <Mail size={14} className="text-slate-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Surel Siswa / Wali</p>
                    <p className="text-slate-800 mt-0.5 truncate">{activeStudent.email}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 text-slate-600">
                  <MapPin size={14} className="text-slate-400 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Alamat Rumah</p>
                    <p className="text-slate-800 mt-0.5 truncate">{activeStudent.alamat}</p>
                  </div>
                </div>
                
                {activeStudent.catatan && (
                  <div className="col-span-1 sm:col-span-2 pt-2 border-t border-slate-200 mt-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Catatan Tambahan Wali Kelas</p>
                    <p className="text-slate-600 font-normal leading-relaxed italic">"{activeStudent.catatan}"</p>
                  </div>
                )}
              </div>

              {/* Parent Info Block */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Data Orang Tua / Wali Murid</h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Nama Ayah / Wali</p>
                    <p className="text-slate-800 font-bold mt-0.5">{activeStudent.namaAyah || 'Belum Diisi'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Pekerjaan: {activeStudent.pekerjaanAyah || 'Belum Diisi'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">No. KTP: {activeStudent.ktpAyah || '-'}</p>
                    {activeStudent.teleponAyah && (
                      <p className="text-[10px] text-slate-400 mt-0.5">No. HP: {activeStudent.teleponAyah}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Nama Ibu / Wali</p>
                    <p className="text-slate-800 font-bold mt-0.5">{activeStudent.namaIbu || 'Belum Diisi'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Pekerjaan: {activeStudent.pekerjaanIbu || 'Belum Diisi'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">No. KTP: {activeStudent.ktpIbu || '-'}</p>
                    {activeStudent.teleponIbu && (
                      <p className="text-[10px] text-slate-400 mt-0.5">No. HP: {activeStudent.teleponIbu}</p>
                    )}
                  </div>
                  <div className="col-span-1 sm:col-span-2 pt-2 border-t border-slate-200 mt-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">No. Telepon Orang Tua (Umum)</p>
                      <p className="text-slate-800 mt-0.5">{activeStudent.teleponOrangTua || '-'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Alamat Rumah Orang Tua</p>
                      <p className="text-slate-800 mt-0.5 truncate" title={activeStudent.alamatOrangTua || activeStudent.alamat}>
                        {activeStudent.alamatOrangTua || activeStudent.alamat || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Digital Archive Documents list */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Daftar Dokumen Digital Siswa</h4>
                  <span className="text-[10px] font-bold text-slate-400">{activeStudent.documents.length}/5 Dokumen Terdaftar</span>
                </div>

                {activeStudent.documents.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl text-slate-400 space-y-1">
                    <AlertCircle size={24} className="mx-auto text-amber-400" />
                    <p className="font-bold text-slate-600 text-xs">Arsip Dokumen Masih Kosong</p>
                    <p className="text-[11px]">Silakan unggah dokumen pendukung siswa di bawah ini.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {activeStudent.documents.map((doc) => (
                      <div key={doc.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-start space-x-2.5 min-w-0">
                          <div className="bg-slate-100 text-slate-600 p-2 rounded-lg shrink-0">
                            <FileText size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate">{doc.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {doc.type} • {doc.size} • Diupload {doc.uploadedAt}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* Document Status */}
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            doc.status === 'Terarsip' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            doc.status === 'Verifikasi' ? 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse' :
                            doc.status === 'Ditolak' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {doc.status}
                          </span>

                          {/* Approval Switch Panel for TU & Admin */}
                          {canVerify && doc.status === 'Verifikasi' && (
                            <div className="flex items-center space-x-1 border-l border-slate-200 pl-2">
                              <button
                                onClick={() => handleVerifyDocument(activeStudent.id, doc.id, 'approve')}
                                className="bg-emerald-500 font-bold hover:bg-emerald-600 text-white p-1 rounded transition"
                                title="Setujui dan Arsipkan ke Cloud"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                onClick={() => handleVerifyDocument(activeStudent.id, doc.id, 'reject')}
                                className="bg-rose-500 font-bold hover:bg-rose-600 text-white p-1 rounded transition"
                                title="Tolak Berkas"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )}

                          {/* Generic Actions */}
                          <div className="flex items-center space-x-1 border-l border-slate-200 pl-2">
                            <a 
                              href="#" 
                              onClick={(e) => { e.preventDefault(); alert(`Mengunduh ${doc.name} dari arsip Google Drive.`); }}
                              className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-1 rounded font-bold transition inline-block"
                              title="Unduh Berkas"
                            >
                              <Download size={13} />
                            </a>
                            
                            {selectedRole !== 'Guru / Wali Kelas' && (
                              <button
                                onClick={() => handleDeleteDocument(activeStudent.id, doc.id, doc.name)}
                                className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded font-bold transition"
                                title="Hapus Berkas"
                              >
                                <Trash size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upload Document Form Widget */}
              {canWrite && (
                <div className="bg-slate-50 border border-dashed border-slate-300 p-4 rounded-xl space-y-3">
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <UploadCloud size={14} className="text-slate-400" />
                    Input Arsip Berkas Baru (Google Drive Sinkronisasi)
                  </h5>

                  <form onSubmit={handleUploadSubmit} className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase">Jenis Dokumen</label>
                        <select
                          id="upload-doc-type"
                          value={uploadDocType}
                          onChange={(e) => setUploadDocType(e.target.value as DocumentType)}
                          className="w-full bg-white text-slate-800 text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-500 appearance-none transition-colors"
                        >
                          <option value="Ijazah">Ijazah SMP</option>
                          <option value="Kartu Keluarga">Kartu Keluarga (KK)</option>
                          <option value="Akta Kelahiran">Akta Kelahiran</option>
                          <option value="Pas Foto">Pas Foto 3x4 / 4x6</option>
                          <option value="Rapor">Berkas Rapor Gabungan</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase">Pilih Berkas</label>
                        <input
                          id="file-uploader"
                          type="file"
                          onChange={handleDocSelection}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => document.getElementById('file-uploader')?.click()}
                          className="w-full bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-800 py-2 rounded-lg border border-slate-300 transition-colors text-center text-xs font-medium truncate"
                        >
                          {selectedFileName ? selectedFileName : 'Saring Lokasi Berkas...'}
                        </button>
                      </div>
                    </div>

                    {/* Simulated Drag & Drop Box */}
                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`h-24 rounded-lg flex flex-col items-center justify-center text-center border border-dashed transition p-3 ${
                        dragActive ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-400 bg-white'
                      }`}
                    >
                      <UploadCloud size={20} className="mb-1 text-slate-300" />
                      <p className="text-[10px]">Atau drag & drop berkas PDF/PNG di sini</p>
                    </div>

                    <button
                      id="btn-submit-upload"
                      type="submit"
                      disabled={isUploadingIdx || !selectedFileName}
                      className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-2 rounded-lg text-xs transition duration-150 flex items-center justify-center space-x-1.5 shadow"
                    >
                      {isUploadingIdx ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          <span>Mengunggah dokumen ke Drive utama...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud size={12} />
                          <span>Unggah Dokumen Baru</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
              Disinkronisasikan secara otomatis dengan Server cloud Google Workspace. Enkripsi AES-256 aktif.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
