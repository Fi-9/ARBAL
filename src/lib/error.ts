import axios from 'axios';

export function getFriendlyErrorMessage(error: any): string {
  if (!error) return 'Terjadi kesalahan yang tidak diketahui.';

  if (axios.isAxiosError(error)) {
    // Check if network error
    if (error.code === 'ERR_NETWORK' || !error.response) {
      return 'Koneksi ke server gagal. Silakan periksa koneksi internet Anda atau hubungi admin.';
    }

    const status = error.response.status;
    const data = error.response.data;

    // Handle NestJS validation/custom exception messages
    if (data && typeof data === 'object') {
      const message = data.message;
      if (Array.isArray(message)) {
        return `Data input tidak valid: ${message.join(', ')}`;
      }
      if (typeof message === 'string') {
        // Translate common backend errors
        if (message.includes('Invalid email or password') || message.includes('Invalid credentials') || message.includes('Invalid email')) {
          return 'Email atau kata sandi salah. Silakan coba lagi.';
        }
        if (message.includes('Account is inactive')) {
          return 'Akun Anda dinonaktifkan. Silakan hubungi Administrator.';
        }
        if (message.includes('Account is locked')) {
          return 'Akun terkunci sementara karena terlalu banyak percobaan masuk gagal. Coba lagi nanti.';
        }
        if (message.includes('already exists') || message.includes('unique constraint') || message.includes('Unique constraint')) {
          return 'Data sudah terdaftar di sistem.';
        }
        if (message.includes('Forbidden resource') || message.includes('Forbidden')) {
          return 'Anda tidak memiliki hak akses untuk melakukan aksi ini.';
        }
        return message;
      }
    }

    if (status === 401) {
      return 'Email atau kata sandi salah. Silakan coba lagi.';
    }
    if (status === 403) {
      return 'Anda tidak memiliki hak akses untuk melakukan aksi ini.';
    }
    if (status === 404) {
      return 'Data tidak ditemukan di server.';
    }
    if (status === 429) {
      return 'Terlalu banyak permintaan ke server. Silakan tunggu beberapa saat.';
    }
    if (status === 413) {
      return 'Ukuran file terlalu besar. Batas maksimal unggahan adalah 10MB.';
    }
    if (status >= 500) {
      return 'Terjadi kesalahan internal pada server. Silakan coba lagi nanti.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
