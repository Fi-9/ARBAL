import { create } from 'zustand';
import { Student, StudentStatus } from '../types';
import { uploadDocument } from '../services/document.service';
import { getFriendlyErrorMessage } from '../lib/error';

const DB_NAME = 'arbal_pending_files';
const DB_VERSION = 1;
const STORE_NAME = 'files';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveFileToIndexedDB(key: string, file: File): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const putRequest = store.put({ key, file, timestamp: Date.now() });
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    });
  } catch (err) {
    console.error('IndexedDB save error:', err);
  }
}

export async function loadFilesFromIndexedDB(): Promise<Record<string, File>> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = () => {
        const results = getAllRequest.result || [];
        const filesMap: Record<string, File> = {};
        for (const item of results) {
          filesMap[item.key] = item.file;
        }
        resolve(filesMap);
      };
      getAllRequest.onerror = () => reject(getAllRequest.error);
    });
  } catch (err) {
    console.error('IndexedDB load error:', err);
    return {};
  }
}

export async function deleteFileFromIndexedDB(key: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const deleteRequest = store.delete(key);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  } catch (err) {
    console.error('IndexedDB delete error:', err);
  }
}

export async function clearAllIndexedDB(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });
  } catch (err) {
    console.error('IndexedDB clear error:', err);
  }
}

export async function runIndexedDBTTL(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = () => {
        const results = getAllRequest.result || [];
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        let count = 0;
        for (const item of results) {
          if (now - item.timestamp > sevenDays) {
            store.delete(item.key);
            count++;
          }
        }
        if (count > 0) {
          console.log(`🧹 Cleaned up ${count} stale pending files from IndexedDB.`);
        }
        resolve();
      };
      getAllRequest.onerror = () => reject(getAllRequest.error);
    });
  } catch (err) {
    console.error('IndexedDB TTL error:', err);
  }
}

export interface DocumentMeta {
  name: string;
  size: string;
  status: 'Terarsip' | 'Verifikasi';
}

export interface DocsUploadedState {
  ijazah: DocumentMeta | null;
  kk: DocumentMeta | null;
  akta: DocumentMeta | null;
  rapor: DocumentMeta | null;
  ktpAyahDoc: DocumentMeta | null;
  ktpIbuDoc: DocumentMeta | null;
  pasFoto: DocumentMeta | null;
  suratPindah: DocumentMeta | null;
  sertifikat: DocumentMeta | null;
  prakerin: DocumentMeta | null;
  pendukung: DocumentMeta | null;
  skl: DocumentMeta | null;
}

interface StudentFormStore {
  // Form fields - Step 1: Biodata
  nama: string;
  namaPanggilan: string;
  nik: string;
  nomorKK: string;
  nisn: string;
  jenisKelamin: 'LAKI_LAKI' | 'PEREMPUAN' | '';
  tempatLahir: string;
  tanggalLahir: string;
  email: string;
  telepon: string;
  alamat: string;

  // Form fields - Step 2: Akademik
  academicYearId: string;
  angkatan: number | '';
  status: StudentStatus | '';
  kelas: string;
  jurusan: string;
  asalSekolah: string;
  tahunLulusSebelumnya: number | '';
  anakKe: number | '';
  jumlahSaudara: number | '';
  photoUrl: string;
  catatan: string;
  nisSekolah: string;
  registrationNumber: string;
  graduationYear: string;
  certificateNumber: string;

  // Form fields - Step 3: Keluarga
  // Ayah
  namaAyah: string;
  pekerjaanAyah: string;
  ktpAyah: string;
  teleponAyah: string;
  pendidikanAyah: string;
  statusAyah: 'MASIH_HIDUP' | 'MENINGGAL' | '';
  // Ibu
  namaIbu: string;
  pekerjaanIbu: string;
  ktpIbu: string;
  teleponIbu: string;
  pendidikanIbu: string;
  statusIbu: 'MASIH_HIDUP' | 'MENINGGAL' | '';
  // Wali
  namaWali: string;
  hubunganWali: string;
  teleponWali: string;
  alamatWali: string;
  teleponOrangTua: string;
  alamatOrangTua: string;

  // Form fields - Document Metadata (Phase 4B)
  docsUploaded: DocsUploadedState;

  // Queue of actual File objects (stored by document type/key)
  pendingFiles: Record<string, File>;
  uploadProgress: Record<string, number>;
  uploadErrors: Record<string, string>;

  // UI state
  activeTab: 'biodata' | 'akademik' | 'keluarga' | 'dokumen' | 'review';
  loadedStudentId: string | null;

  // Actions
  setField: <K extends keyof Omit<StudentFormStore, 'setField' | 'setDocsUploaded' | 'addPendingFile' | 'removePendingFile' | 'flushPendingUploads' | 'loadStudent' | 'clearForm' | 'loadPendingFilesFromIndexedDB'>>(key: K, value: StudentFormStore[K]) => void;
  setDocsUploaded: (updater: (prev: DocsUploadedState) => DocsUploadedState) => void;
  addPendingFile: (key: string, file: File) => void;
  removePendingFile: (key: string) => void;
  flushPendingUploads: (studentId: string, singleKey?: string) => Promise<{ success: boolean; failedCount: number }>;
  loadStudent: (student: Student) => void;
  clearForm: () => void;
  loadPendingFilesFromIndexedDB: () => Promise<void>;
}

const initialFields = {
  nama: '',
  namaPanggilan: '',
  nik: '',
  nomorKK: '',
  nisn: '',
  jenisKelamin: '' as 'LAKI_LAKI' | 'PEREMPUAN' | '',
  tempatLahir: '',
  tanggalLahir: '',
  email: '',
  telepon: '',
  alamat: '',

  academicYearId: '',
  angkatan: '' as number | '',
  status: '' as StudentStatus | '',
  kelas: '',
  jurusan: '',
  asalSekolah: '',
  tahunLulusSebelumnya: '' as number | '',
  anakKe: '' as number | '',
  jumlahSaudara: '' as number | '',
  photoUrl: '',
  catatan: '',
  nisSekolah: '',
  registrationNumber: '',
  graduationYear: '',
  certificateNumber: '',

  namaAyah: '',
  pekerjaanAyah: '',
  ktpAyah: '',
  teleponAyah: '',
  pendidikanAyah: '',
  statusAyah: '' as 'MASIH_HIDUP' | 'MENINGGAL' | '',
  namaIbu: '',
  pekerjaanIbu: '',
  ktpIbu: '',
  teleponIbu: '',
  pendidikanIbu: '',
  statusIbu: '' as 'MASIH_HIDUP' | 'MENINGGAL' | '',
  namaWali: '',
  hubunganWali: '',
  teleponWali: '',
  alamatWali: '',
  teleponOrangTua: '',
  alamatOrangTua: '',
};

const initialDocsUploaded: DocsUploadedState = {
  ijazah: null,
  kk: null,
  akta: null,
  rapor: null,
  ktpAyahDoc: null,
  ktpIbuDoc: null,
  pasFoto: null,
  suratPindah: null,
  sertifikat: null,
  prakerin: null,
  pendukung: null,
  skl: null,
};

export const useStudentFormStore = create<StudentFormStore>((set) => ({
  ...initialFields,
  docsUploaded: { ...initialDocsUploaded },
  pendingFiles: {},
  uploadProgress: {},
  uploadErrors: {},
  activeTab: 'biodata',
  loadedStudentId: null,

  setField: (key, value) => set(() => ({ [key]: value } as any)),

  setDocsUploaded: (updater) =>
    set((state) => ({ docsUploaded: updater(state.docsUploaded) })),

  addPendingFile: (key, file) => {
    if (file.size > 10 * 1024 * 1024) return;
    set((state) => ({
      pendingFiles: { ...state.pendingFiles, [key]: file },
      uploadErrors: { ...state.uploadErrors, [key]: '' },
      uploadProgress: { ...state.uploadProgress, [key]: 0 },
    }));
    saveFileToIndexedDB(key, file);
  },

  removePendingFile: (key) =>
    set((state) => {
      const newFiles = { ...state.pendingFiles };
      delete newFiles[key];
      const newProgress = { ...state.uploadProgress };
      delete newProgress[key];
      const newErrors = { ...state.uploadErrors };
      delete newErrors[key];
      deleteFileFromIndexedDB(key);
      return { pendingFiles: newFiles, uploadProgress: newProgress, uploadErrors: newErrors };
    }),

  loadPendingFilesFromIndexedDB: async () => {
    await runIndexedDBTTL();
    const files = await loadFilesFromIndexedDB();
    const progresses: Record<string, number> = {};
    const errors: Record<string, string> = {};
    Object.keys(files).forEach((k) => {
      progresses[k] = 0;
      errors[k] = '';
    });
    set(() => ({ pendingFiles: files, uploadProgress: progresses, uploadErrors: errors }));
  },

  flushPendingUploads: async (studentId: string, singleKey?: string) => {
    const { pendingFiles } = useStudentFormStore.getState();
    const keysToUpload = singleKey ? [singleKey] : Object.keys(pendingFiles);
    
    if (keysToUpload.length === 0) {
      return { success: true, failedCount: 0 };
    }

    let failedCount = 0;

    for (const key of keysToUpload) {
      const file = pendingFiles[key];
      if (!file) continue;

      set((state) => ({
        uploadErrors: { ...state.uploadErrors, [key]: '' },
        uploadProgress: { ...state.uploadProgress, [key]: 0 },
      }));

      try {
        await uploadDocument(file, studentId, key, (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          set((state) => ({
            uploadProgress: { ...state.uploadProgress, [key]: percentCompleted },
          }));
        });

        // Delete successful upload from state and IndexedDB
        set((state) => {
          const newFiles = { ...state.pendingFiles };
          delete newFiles[key];
          const newProgress = { ...state.uploadProgress };
          delete newProgress[key];
          const newErrors = { ...state.uploadErrors };
          delete newErrors[key];
          return { pendingFiles: newFiles, uploadProgress: newProgress, uploadErrors: newErrors };
        });
        await deleteFileFromIndexedDB(key);
      } catch (err: any) {
        failedCount++;
        const friendlyMsg = getFriendlyErrorMessage(err);
        set((state) => ({
          uploadErrors: { ...state.uploadErrors, [key]: friendlyMsg },
          uploadProgress: { ...state.uploadProgress, [key]: 0 },
        }));
      }
    }

    return {
      success: failedCount === 0,
      failedCount,
    };
  },

  loadStudent: (student) => {
    // Determine files meta mapping
    const loadedDocs = { ...initialDocsUploaded };
    student.documents.forEach((doc) => {
      const item: DocumentMeta = {
        name: doc.name,
        size: doc.size,
        status: (doc.status === 'Terarsip' || doc.status === 'Verifikasi') ? doc.status : 'Verifikasi',
      };
      if (doc.type === 'Ijazah Terakhir') loadedDocs.ijazah = item;
      else if (doc.type === 'Kartu Keluarga') loadedDocs.kk = item;
      else if (doc.type === 'Akta Kelahiran') loadedDocs.akta = item;
      else if (doc.type === 'Rapor') loadedDocs.rapor = item;
      else if (doc.type === 'KTP Ayah') loadedDocs.ktpAyahDoc = item;
      else if (doc.type === 'KTP Ibu') loadedDocs.ktpIbuDoc = item;
      else if (doc.type === 'Pas Foto') loadedDocs.pasFoto = item;
      else if (doc.type === 'Surat Pindah') loadedDocs.suratPindah = item;
      else if (doc.type === 'Sertifikat Kompetensi') loadedDocs.sertifikat = item;
      else if (doc.type === 'Laporan Prakerin') loadedDocs.prakerin = item;
      else if (doc.type === 'Dokumen Pendukung') loadedDocs.pendukung = item;
      else if (doc.type === 'Surat Keterangan Lulus') loadedDocs.skl = item;
    });

    set({
      loadedStudentId: student.id,
      activeTab: 'biodata',
      pendingFiles: {}, // Clear pending files when loading existing student
      docsUploaded: loadedDocs,

      // Core fields
      nama: student.nama,
      nisn: student.nisn || '',
      nisSekolah: student.nisSekolah || '',
      registrationNumber: student.registrationNumber || '',
      academicYearId: student.academicYearId || '',
      angkatan: student.angkatan || '',
      kelas: student.kelas || '',
      jurusan: student.jurusan || '',
      email: student.email || '',
      telepon: student.telepon || '',
      alamat: student.alamat || '',
      tanggalLahir: student.tanggalLahir || '',
      status: student.status || '',
      catatan: student.catatan || '',
      graduationYear: student.graduationYear ? String(student.graduationYear) : '',
      certificateNumber: student.certificateNumber || '',

      // Biodata Baru
      nik: student.nik || '',
      nomorKK: student.nomorKK || '',
      namaPanggilan: student.namaPanggilan || '',
      jenisKelamin: student.jenisKelamin || '',
      tempatLahir: student.tempatLahir || '',
      asalSekolah: student.asalSekolah || '',
      tahunLulusSebelumnya: student.tahunLulusSebelumnya || '',
      anakKe: student.anakKe || '',
      jumlahSaudara: student.jumlahSaudara || '',
      photoUrl: student.photoUrl || '',

      // Parents details
      namaAyah: student.namaAyah || '',
      pekerjaanAyah: student.pekerjaanAyah || '',
      ktpAyah: student.ktpAyah || '',
      teleponAyah: student.teleponAyah || '',
      namaIbu: student.namaIbu || '',
      pekerjaanIbu: student.pekerjaanIbu || '',
      ktpIbu: student.ktpIbu || '',
      teleponIbu: student.teleponIbu || '',
      teleponOrangTua: student.teleponOrangTua || '',
      alamatOrangTua: student.alamatOrangTua || '',

      // New family details
      pendidikanAyah: student.pendidikanAyah || '',
      statusAyah: student.statusAyah || '',
      pendidikanIbu: student.pendidikanIbu || '',
      statusIbu: student.statusIbu || '',
      namaWali: student.namaWali || '',
      hubunganWali: student.hubunganWali || '',
      teleponWali: student.teleponWali || '',
      alamatWali: student.alamatWali || '',
    });
  },

  clearForm: () => {
    set({
      ...initialFields,
      docsUploaded: { ...initialDocsUploaded },
      pendingFiles: {},
      uploadProgress: {},
      uploadErrors: {},
      activeTab: 'biodata',
      loadedStudentId: null,
    });
    clearAllIndexedDB();
  },
}));
