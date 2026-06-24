/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentService } from '../services/student.service';
import { getFriendlyErrorMessage } from '../lib/error';
import {
  Search,
  Filter,
  FileText,
  Check,
  X,
  Trash2,
  Plus,
  Minus,
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
  RefreshCw,
  FileSpreadsheet,
  DownloadCloud,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Student, DocumentItem, DocumentType, StudentStatus, RoleType } from '../types';
import { useToastStore } from '../stores/toast.store';
import { useUIStore } from '../stores/ui.store';
import { useAuthStore } from '../stores/auth.store';
import { documentService, getDocumentFileUrl, normalizeStatus } from '../services/document.service';
import { api } from '../lib/api';

interface StudentDirectoryViewProps {
  students: Student[];
  selectedRole: RoleType;
  onUpdateStudents: (updated: Student[]) => void;
  onAddNotification: (title: string, message: string, type: 'info' | 'success' | 'warning') => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent?: (id: string) => void;
}

export default function StudentDirectoryView({
  students,
  selectedRole,
  onUpdateStudents,
  onAddNotification,
  onEditStudent,
  onDeleteStudent,
}: StudentDirectoryViewProps) {
  const addToast = useToastStore((state) => state.addToast);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('Semua');
  const [selectedStatus, setSelectedStatus] = useState('Semua');
  const [selectedDocCompleteness, setSelectedDocCompleteness] = useState('Semua');

  const initialDirectoryFilter = useUIStore((state) => state.initialDirectoryFilter);
  const setInitialDirectoryFilter = useUIStore((state) => state.setInitialDirectoryFilter);

  React.useEffect(() => {
    if (initialDirectoryFilter) {
      if (initialDirectoryFilter.completeness) {
        setSelectedDocCompleteness(initialDirectoryFilter.completeness);
      }
      if (initialDirectoryFilter.status) {
        setSelectedStatus(initialDirectoryFilter.status);
      }
      // Clear it after applying
      setInitialDirectoryFilter(null);
    }
  }, [initialDirectoryFilter, setInitialDirectoryFilter]);

  // Selected student for detail modal
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<'profile' | 'timeline'>('profile');

  // Reset drawer tab when student changes
  React.useEffect(() => {
    setDrawerTab('profile');
  }, [activeStudentId]);

  // Fetch timeline data for the active student
  const { data: timelineData = [], isLoading: isTimelineLoading } = useQuery({
    queryKey: ['students', activeStudentId, 'timeline'],
    queryFn: () => studentService.getTimeline(activeStudentId!),
    enabled: !!activeStudentId && drawerTab === 'timeline',
  });
  
  // New Document Upload Form State (for detail modal)
  const [uploadDocType, setUploadDocType] = useState<DocumentType>('Ijazah Terakhir');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isUploadingIdx, setIsUploadingIdx] = useState(false);

  // Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Rejection Notes Modal State
  const [rejectingDoc, setRejectingDoc] = useState<{ studentId: string; docId: string } | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');

  const handleConfirmReject = async () => {
    if (!rejectingDoc) return;
    await handleVerifyDocument(rejectingDoc.studentId, rejectingDoc.docId, 'reject', rejectionNotes);
    setRejectingDoc(null);
    setRejectionNotes('');
  };

  const closePreview = () => {
    setPreviewDoc(null);
    setIsFullscreen(false);
    setZoomScale(1);
  };

  // Indonesian Date Formatter helper
  const formatIndonesianDate = (dateStr?: string | Date): string => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      
      const day = String(d.getDate()).padStart(2, '0');
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      
      return `${day} ${month} ${year}`;
    } catch {
      return String(dateStr);
    }
  };

  // File Input Ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Active student object helper
  const activeStudent = students.find(s => s.id === activeStudentId) || null;

  // Effect for fetching document preview blob URL
  React.useEffect(() => {
    if (!previewDoc) {
      setPreviewObjectUrl(null);
      return;
    }

    // Only fetch if ID looks like a UUID (real backend ID)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(previewDoc.id) ||
                   /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(previewDoc.id);
    if (!isUuid) {
      setPreviewObjectUrl(null);
      return;
    }

    let isMounted = true;
    setPreviewLoading(true);

    documentService.download(previewDoc.id)
      .then(blob => {
        if (isMounted) {
          const url = window.URL.createObjectURL(blob);
          setPreviewObjectUrl(url);
        }
      })
      .catch(err => {
        console.error('[preview] fetch failed:', err);
        if (isMounted) {
          addToast(`Gagal memuat pratinjau berkas: ${getFriendlyErrorMessage(err)}`, 'warning');
          setPreviewObjectUrl(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setPreviewLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (previewObjectUrl) {
        window.URL.revokeObjectURL(previewObjectUrl);
      }
    };
  }, [previewDoc?.id]);

  // Permissions helper — dynamic from useAuthStore
  const permissions = useAuthStore((state) => state.permissions);
  const canDelete = permissions.includes('student.delete');
  const canWrite = permissions.includes('student.write');
  const canVerify = permissions.includes('document.verify');
  const canUpload = permissions.includes('document.upload');
  const canExport = permissions.includes('report.export');
  const canDeleteDoc = permissions.includes('document.delete');

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
      matchesCompleteness = student.completenessPercent === 100 || student.documents.length >= 5;
    } else if (selectedDocCompleteness === 'Belum Lengkap') {
      matchesCompleteness = student.completenessPercent !== undefined ? student.completenessPercent < 100 : student.documents.length < 5;
    }

    return matchesSearch && matchesClass && matchesStatus && matchesCompleteness;
  });

  // Handle Delete Student
  const handleDeleteStudent = (id: string, name: string) => {
    if (!canDelete) {
      addToast('Maaf, Anda tidak memiliki hak akses untuk menghapus data siswa.', 'warning');
      return;
    }
    if (confirm(`Apakah Anda yakin ingin menghapus data siswa ${name}? Seluruh arsip dokumen digital juga akan dihapus.`)) {
      if (onDeleteStudent) {
        onDeleteStudent(id);
      } else {
        const updated = students.filter(s => s.id !== id);
        onUpdateStudents(updated);
      }
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
      if (fileInputRef.current) {
        fileInputRef.current.files = e.dataTransfer.files;
      }
      setSelectedFileName(e.dataTransfer.files[0].name);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      addToast('Pilih berkas digital terlebih dahulu.', 'warning');
      return;
    }

    // Validation
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) {
      addToast(`File terlalu besar. Maksimal 10MB. File anda: ${(file.size / 1024 / 1024).toFixed(1)}MB`, 'warning');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      addToast(`Tipe file tidak didukung: ${file.type}. Hanya JPG, PNG, PDF.`, 'warning');
      return;
    }

    setIsUploadingIdx(true);

    try {
      const uploaded = await documentService.upload(file, activeStudent.id, uploadDocType);

      // Optimistic update: tambah document ke active student state
      const newDoc: DocumentItem = {
        id: uploaded.id,
        type: uploadDocType,
        name: uploaded.originalName,
        url: getDocumentFileUrl(uploaded.id),
        uploadedAt: typeof uploaded.uploadedAt === 'string'
          ? uploaded.uploadedAt
          : new Date(uploaded.uploadedAt).toISOString().replace('T', ' ').substring(0, 16),
        status: normalizeStatus(uploaded.status),
        size: uploaded.sizeBytes > 1_048_576
          ? `${(uploaded.sizeBytes / 1_048_576).toFixed(1)} MB`
          : `${Math.round(uploaded.sizeBytes / 1024)} KB`,
        version: uploaded.version ?? 1,
        isLatest: uploaded.isLatest ?? true,
        previousId: uploaded.previousId ?? undefined,
      };

      const isAlreadyHave = activeStudent.documents.some(d => d.type === uploadDocType);
      let updatedDocs = [...activeStudent.documents];
      if (isAlreadyHave) {
        updatedDocs = updatedDocs.map(d => d.type === uploadDocType ? newDoc : d);
      } else {
        updatedDocs.push(newDoc);
      }

      const updatedStudents = students.map(s =>
        s.id === activeStudent.id ? { ...s, documents: updatedDocs } : s
      );
      onUpdateStudents(updatedStudents);

      // Reset form
      setSelectedFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      onAddNotification(
        'Dokumen Tersimpan',
        `Dokumen ${uploadDocType} atas nama ${activeStudent.nama} berhasil diunggah ke server.`,
        'success'
      );
    } catch (err: any) {
      onAddNotification(
        'Upload Gagal',
        `Dokumen tidak dapat diunggah: ${getFriendlyErrorMessage(err)}`,
        'warning'
      );
    } finally {
      setIsUploadingIdx(false);
    }
  };

  // Document Verification Action (Approve / Reject)
  const handleVerifyDocument = async (studentId: string, docId: string, action: 'approve' | 'reject', notes?: string) => {
    if (!canVerify) {
      addToast('Anda tidak memiliki izin memverifikasi dokumen.', 'warning');
      return;
    }

    try {
      const updated = await documentService.verify(docId, action, notes);
      const newStatus = normalizeStatus(updated.status);
      const newNotes = updated.verificationNotes ?? undefined;

      const updatedStudents = students.map(s => {
        if (s.id !== studentId) return s;
        return {
          ...s,
          documents: s.documents.map(d =>
            d.id === docId ? { ...d, status: newStatus, verificationNotes: newNotes } : d
          ),
        };
      });
      onUpdateStudents(updatedStudents);

      // Update preview modal if open
      if (previewDoc?.id === docId) {
        setPreviewDoc({ ...previewDoc, status: newStatus, verificationNotes: newNotes });
      }

      const studentName = students.find(s => s.id === studentId)?.nama || '';
      const docType = students.find(s => s.id === studentId)?.documents.find(d => d.id === docId)?.type || '';

      onAddNotification(
        'Verifikasi Selesai',
        `Dokumen ${docType} dari ${studentName} ${action === 'approve' ? 'berhasil diverifikasi.' : 'ditolak.'}`,
        action === 'approve' ? 'success' : 'warning'
      );
    } catch (err: any) {
      onAddNotification('Verifikasi Gagal', `Tidak dapat memperbarui status: ${getFriendlyErrorMessage(err)}`, 'warning');
    }
  };

  // Delete document action
  const handleDeleteDocument = async (studentId: string, docId: string, docName: string) => {
    if (!canDeleteDoc) {
      addToast('Anda tidak diizinkan menghapus dokumen arsip.', 'warning');
      return;
    }
    if (!confirm(`Hapus arsip berkas "${docName}" ke sampah?\n\nDokumen masih dapat dipulihkan dari menu Sampah.`)) {
      return;
    }

    try {
      await documentService.remove(docId);

      const updatedStudents = students.map(s => {
        if (s.id !== studentId) return s;
        return {
          ...s,
          documents: s.documents.filter(d => d.id !== docId),
        };
      });
      onUpdateStudents(updatedStudents);

      onAddNotification(
        'Dokumen Dihapus',
        `Dokumen "${docName}" dipindahkan ke sampah.`,
        'warning'
      );
    } catch (err: any) {
      onAddNotification('Hapus Gagal', `Tidak dapat menghapus dokumen: ${getFriendlyErrorMessage(err)}`, 'warning');
    }
  };

  // Download document action
  const handleDownloadFile = async (docId: string, fileName: string) => {
    try {
      const blob = await documentService.download(docId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      // Defer revocation to prevent Chrome from losing the filename on larger documents
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 30000);

      onAddNotification(
        'Unduh Berkas',
        `Berkas "${fileName}" berhasil diunduh.`,
        'success'
      );
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        onAddNotification('File Tidak Ditemukan', `Berkas "${fileName}" tidak tersedia di server.`, 'warning');
      } else if (status === 403) {
        onAddNotification('Akses Ditolak', 'Anda tidak memiliki izin mengunduh berkas ini.', 'warning');
      } else {
        onAddNotification('Unduh Gagal', `Tidak dapat mengunduh berkas: ${getFriendlyErrorMessage(err)}`, 'warning');
      }
    }
  };

  // Export students as CSV (backup data siswa)
  const handleExportCsv = async () => {
    try {
      const response = await api.get('/students/export?format=csv', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ARBAL_Data_Siswa_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      addToast('Ekspor CSV berhasil diunduh.', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`Gagal mengunduh file ekspor CSV: ${getFriendlyErrorMessage(err)}`, 'warning');
    }
  };

  // Export students as Excel
  const handleExportExcel = async () => {
    try {
      const response = await api.get('/students/export?format=xlsx', { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ARBAL_Data_Siswa_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      addToast('Ekspor Excel berhasil diunduh.', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(`Gagal mengunduh file ekspor Excel: ${getFriendlyErrorMessage(err)}`, 'warning');
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

          <div className="flex items-center gap-2 flex-wrap">
            {canExport && (
              <>
                <button
                  id="btn-export-excel"
                  onClick={handleExportExcel}
                  className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg transition shadow-sm"
                  title="Ekspor semua data siswa ke Excel"
                >
                  <FileSpreadsheet size={13} />
                  <span>Excel</span>
                </button>
                <button
                  id="btn-export-csv"
                  onClick={handleExportCsv}
                  className="flex items-center space-x-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs px-3.5 py-2.5 rounded-lg transition shadow-sm"
                  title="Ekspor semua data siswa ke CSV"
                >
                  <DownloadCloud size={13} />
                  <span>CSV</span>
                </button>
              </>
            )}
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
              <option value="Pendaftar">Status: Pendaftar</option>
              <option value="Aktif">Status: Aktif</option>
              <option value="Cuti">Status: Cuti</option>
              <option value="Lulus">Status: Lulus</option>
              <option value="Keluar">Status: Keluar</option>
              <option value="Alumni">Status: Alumni</option>
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
                          student.status === 'Pendaftar' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                          student.status === 'Cuti' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          student.status === 'Lulus' ? 'bg-cyan-50 text-cyan-700 border border-cyan-100' :
                          student.status === 'Keluar' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                          'bg-slate-50 text-slate-700 border border-slate-100'
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

            {/* Tab Selector inside Drawer */}
            <div className="flex border-b border-slate-200 bg-slate-50 font-bold shrink-0">
              <button
                type="button"
                onClick={() => setDrawerTab('profile')}
                className={`flex-1 py-3 text-center text-xs border-b-2 transition ${
                  drawerTab === 'profile'
                    ? 'border-emerald-500 text-emerald-700 bg-white font-extrabold shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                Profil &amp; Dokumen
              </button>
              <button
                type="button"
                onClick={() => setDrawerTab('timeline')}
                className={`flex-1 py-3 text-center text-xs border-b-2 transition ${
                  drawerTab === 'timeline'
                    ? 'border-emerald-500 text-emerald-700 bg-white font-extrabold shadow-2xs'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                Riwayat &amp; Timeline
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {drawerTab === 'profile' && (
                <>
                  {/* Profile Details Block */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                    <div className="flex items-center space-x-2.5 text-slate-600">
                      <Calendar size={14} className="text-slate-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Tanggal Lahir</p>
                        <p className="text-slate-800 mt-0.5">{formatIndonesianDate(activeStudent.tanggalLahir)}</p>
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
                        {(permissions.includes('student.write') || permissions.includes('logs.view')) && (
                          <p className="text-[10px] text-slate-400 mt-0.5">No. KTP: {activeStudent.ktpAyah || '-'}</p>
                        )}
                        {activeStudent.teleponAyah && (
                          <p className="text-[10px] text-slate-400 mt-0.5">No. HP: {activeStudent.teleponAyah}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Nama Ibu / Wali</p>
                        <p className="text-slate-800 font-bold mt-0.5">{activeStudent.namaIbu || 'Belum Diisi'}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Pekerjaan: {activeStudent.pekerjaanIbu || 'Belum Diisi'}</p>
                        {(permissions.includes('student.write') || permissions.includes('logs.view')) && (
                          <p className="text-[10px] text-slate-400 mt-0.5">No. KTP: {activeStudent.ktpIbu || '-'}</p>
                        )}
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
                            <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                              <div className="bg-slate-100 text-slate-600 p-2 rounded-lg shrink-0">
                                <FileText size={18} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(doc)}
                                  className="font-bold text-slate-800 hover:text-emerald-600 hover:underline text-left truncate block w-full text-xs"
                                  title="Klik untuk Pratinjau Dokumen"
                                >
                                  {doc.type}
                                </button>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  File: {doc.name} • {doc.size} • Diupload {formatIndonesianDate(doc.uploadedAt)}
                                </p>
                                {doc.verificationNotes && (
                                  <p className="text-[10px] text-rose-600 font-semibold mt-1 bg-rose-50/55 p-1.5 rounded border border-rose-100/50">
                                    Catatan: {doc.verificationNotes}
                                  </p>
                                )}
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
                                    onClick={() => { setRejectingDoc({ studentId: activeStudent.id, docId: doc.id }); setRejectionNotes(''); }}
                                    className="bg-rose-500 font-bold hover:bg-rose-600 text-white p-1 rounded transition"
                                    title="Tolak Berkas"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              )}

                              {/* Generic Actions */}
                              <div className="flex items-center space-x-1 border-l border-slate-200 pl-2">
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc(doc)}
                                  className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-1 rounded font-bold transition inline-block"
                                  title="Pratinjau Berkas"
                                >
                                  <Eye size={13} />
                                </button>
                                
                                <button 
                                  type="button"
                                  onClick={() => handleDownloadFile(doc.id, doc.name)}
                                  className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-1 rounded font-bold transition inline-block"
                                  title="Unduh Berkas"
                                >
                                  <Download size={13} />
                                </button>
                                
                                {canDeleteDoc && (
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

                  {/* Upload Document Form Widget — Admin only */}
                  {canUpload && (
                    <div className="bg-slate-50 border border-dashed border-slate-300 p-4 rounded-xl space-y-3">
                      <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <UploadCloud size={14} className="text-slate-400" />
                        Input Arsip Berkas Baru (Penyimpanan Lokal)
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
                              ref={fileInputRef}
                              onChange={handleDocSelection}
                              className="hidden"
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
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
                </>
              )}

              {drawerTab === 'timeline' && (
                <div className="space-y-6 animate-slide-in">
                  <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Riwayat &amp; Timeline Aktivitas</h4>
                  
                  {isTimelineLoading ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-emerald-500" />
                      Memuat linimasa aktivitas siswa...
                    </div>
                  ) : timelineData.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs space-y-1.5 border border-dashed border-slate-200 rounded-xl">
                      <Calendar size={24} className="mx-auto text-slate-400" />
                      <p className="font-bold text-slate-700">Linimasa Belum Tercatat</p>
                      <p>Belum ada rekaman riwayat/mutasi untuk siswa ini.</p>
                    </div>
                  ) : (
                    <div className="relative border-l border-slate-200 pl-5 ml-2.5 space-y-6 text-xs">
                      {timelineData.map((item: any) => (
                        <div key={item.id} className="relative">
                          {/* Dot indicator */}
                          <span className="absolute -left-[26px] top-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white ring-2 ring-emerald-100 flex items-center justify-center shrink-0" />
                          
                          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">{item.event}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(item.createdAt).toLocaleString('id-ID', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}
                              </span>
                            </div>
                            <p className="text-slate-600 leading-relaxed font-medium">{item.details}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
              Disimpan secara aman di direktori lokal server.
            </div>
          </div>
        </div>
      )}

      {/* 4. PREVIEW MODAL */}
      {previewDoc && (
        <div id="document-preview-modal" className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div className={`${
            isFullscreen
              ? 'w-screen h-screen fixed inset-0 z-50 rounded-none border-none'
              : 'rounded-xl w-full max-w-5xl h-[95vh] sm:h-[90vh] border border-slate-800 shadow-2xl'
          } bg-slate-900 flex flex-col overflow-hidden text-white`}>
            {/* Header */}
            <div className="bg-slate-950 p-3 sm:p-4 border-b border-slate-800 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white truncate max-w-[180px] sm:max-w-md" title={previewDoc.name}>
                  {previewDoc.type}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">File: {previewDoc.name}</p>
              </div>

              {/* Zoom & Fullscreen Controls */}
              <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs text-slate-300">
                <button
                  onClick={() => setZoomScale(prev => Math.max(0.5, prev - 0.25))}
                  className="hover:bg-slate-800 hover:text-white p-1 rounded transition font-bold"
                  title="Zoom Out"
                >
                  <Minus size={14} />
                </button>
                <span className="px-1.5 font-mono text-[10px] select-none">{Math.round(zoomScale * 100)}%</span>
                <button
                  onClick={() => setZoomScale(prev => Math.min(3, prev + 0.25))}
                  className="hover:bg-slate-800 hover:text-white p-1 rounded transition font-bold"
                  title="Zoom In"
                >
                  <Plus size={14} />
                </button>
                <span className="w-[1px] h-4 bg-slate-800 mx-1" />
                <button
                  onClick={() => {
                    setIsFullscreen(!isFullscreen);
                    setZoomScale(1);
                  }}
                  className="hover:bg-slate-800 hover:text-white p-1 rounded transition font-bold flex items-center gap-1"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
              </div>

              <button 
                onClick={closePreview} 
                className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white p-1.5 rounded-lg transition"
                title="Tutup Pratinjau"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Sidebar */}
              <div className="w-full md:w-72 flex-shrink-0 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 overflow-y-auto p-4 flex flex-col justify-between max-h-[35vh] md:max-h-none text-xs">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Informasi Dokumen</h4>
                    <div className="space-y-2 bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Tipe Berkas:</span>
                        <span className="font-semibold text-slate-200">{previewDoc.type}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Ukuran:</span>
                        <span className="font-semibold text-slate-200">{previewDoc.size}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Diunggah Pada:</span>
                        <span className="font-semibold text-slate-200">{formatIndonesianDate(previewDoc.uploadedAt)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Status:</span>
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold mt-1 ${
                          previewDoc.status === 'Terarsip' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          previewDoc.status === 'Verifikasi' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {previewDoc.status}
                        </span>
                      </div>
                      {previewDoc.verificationNotes && (
                        <div>
                          <span className="text-rose-400 block text-[10px] font-bold">Catatan Penolakan:</span>
                          <span className="font-semibold text-rose-300 block mt-0.5 whitespace-pre-wrap">{previewDoc.verificationNotes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Siswa Terkait</h4>
                    <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/80 space-y-1">
                      <p className="font-bold text-slate-200">{activeStudent?.nama}</p>
                      <p className="text-[10px] text-slate-400">Kelas: {activeStudent?.kelas}</p>
                      <p className="text-[10px] text-slate-400">Jurusan: {activeStudent?.jurusan}</p>
                    </div>
                  </div>
                </div>

                {/* Local alert fallback warning */}
                {!previewObjectUrl && !previewLoading && (
                  <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-[10px] space-y-1">
                    <p className="font-bold">⚠️ Dokumen Offline/Lokal</p>
                    <p className="text-slate-400 leading-normal">
                      Dokumen ini menggunakan ID lokal/simulasi dan belum terunggah ke server cloud PKBM. Untuk mengaktifkan pratinjau dan verifikasi resmi, silakan hapus dan unggah ulang berkas secara riil.
                    </p>
                  </div>
                )}
              </div>

              {/* Viewport */}
              <div className="flex-1 bg-slate-950 p-2 sm:p-4 flex items-center justify-center overflow-auto min-h-[300px] relative">
                {previewLoading ? (
                  <div className="text-center">
                    <RefreshCw className="animate-spin text-emerald-400 mx-auto mb-2" size={24} />
                    <p className="text-xs text-slate-400">Mengunduh file dari cloud...</p>
                  </div>
                ) : previewObjectUrl ? (
                  previewDoc.name.toLowerCase().endsWith('.pdf') ? (
                    <iframe
                      src={previewObjectUrl}
                      className="w-full h-full rounded border border-slate-800 bg-white"
                      style={{
                        transform: `scale(${zoomScale})`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.15s ease-out'
                      }}
                    />
                  ) : (
                    <img
                      src={previewObjectUrl}
                      alt={previewDoc.name}
                      className="max-w-full max-h-full object-contain rounded border border-slate-800 shadow-lg"
                      style={{
                        transform: `scale(${zoomScale})`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.15s ease-out'
                      }}
                    />
                  )
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-lg max-w-sm bg-slate-900/40">
                    <AlertCircle className="mx-auto text-amber-500 mb-2 animate-pulse" size={32} />
                    <p className="font-bold text-slate-200">Pratinjau Tidak Tersedia (Berkas Lokal)</p>
                    <p className="mt-1 text-slate-400 leading-normal">Dokumen ini merupakan data simulasi lokal. Untuk melihat pratinjau asli, silakan unggah ulang dokumen.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-950 p-3 sm:p-4 border-t border-slate-800 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <button 
                onClick={closePreview} 
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
              >
                Tutup Pratinjau
              </button>
              
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {/* Download (only for real files) */}
                {previewDoc.id.includes('-') && (
                  <button 
                    onClick={() => handleDownloadFile(previewDoc.id, previewDoc.name)}
                    className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition border border-slate-700/80 flex items-center justify-center gap-1.5"
                  >
                    <Download size={12} />
                    Unduh Berkas
                  </button>
                )}

                {/* Approve/Reject (TU/Admin only) */}
                {canVerify && previewDoc.status === 'Verifikasi' && activeStudent && (
                  <>
                    <button 
                      onClick={() => handleVerifyDocument(activeStudent.id, previewDoc.id, 'approve')}
                      className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition flex items-center justify-center gap-1.5"
                    >
                      <Check size={12} />
                      Setujui
                    </button>
                    <button 
                      onClick={() => { setRejectingDoc({ studentId: activeStudent.id, docId: previewDoc.id }); setRejectionNotes(''); }}
                      className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition flex items-center justify-center gap-1.5"
                    >
                      <X size={12} />
                      Tolak
                    </button>
                  </>
                )}

                {/* Delete (Admin/TU only) */}
                {activeStudent && canDeleteDoc && (
                  <button 
                    onClick={() => { handleDeleteDocument(activeStudent.id, previewDoc.id, previewDoc.name); closePreview(); }}
                    className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 hover:text-rose-300 rounded-lg transition border border-rose-900/30 flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={12} />
                    Hapus
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. REJECTION NOTES MODAL */}
      {rejectingDoc && (
        <div id="rejection-notes-modal" className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 UAT-modal animate-fade-in">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden text-slate-800 border border-slate-200 shadow-2xl flex flex-col">
            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm">Alasan Penolakan Dokumen</h3>
              <button onClick={() => setRejectingDoc(null)} className="text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-xs text-slate-500">
                Masukkan alasan penolakan agar siswa/admin tahu penyebab dokumen ini tidak lolos verifikasi.
              </p>
              <textarea
                id="input-rejection-notes"
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="Contoh: Dokumen buram, data NIK tidak sesuai..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 min-h-[100px] resize-none"
              />
            </div>
            <div className="bg-slate-50 p-3.5 border-t border-slate-200 flex justify-end gap-2 text-xs font-semibold">
              <button
                onClick={() => setRejectingDoc(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={!rejectionNotes.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg transition"
              >
                Simpan Penolakan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
