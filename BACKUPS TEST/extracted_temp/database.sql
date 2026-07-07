--
-- PostgreSQL database dump
--

\restrict Ckda5Wqn8QC70tFafi0MOLmOaN2icO6AFAu3vEb2J5EmsbRiPhPCcHucCwBehfQ

-- Dumped from database version 17.10
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: DocumentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DocumentStatus" AS ENUM (
    'UPLOADED',
    'VERIFIED',
    'REJECTED'
);


--
-- Name: DocumentType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DocumentType" AS ENUM (
    'KK',
    'AKTA',
    'IJAZAH_TERAKHIR',
    'RAPORT',
    'PAS_FOTO',
    'KTP_AYAH',
    'KTP_IBU',
    'SURAT_PINDAH',
    'SERTIFIKAT',
    'PRAKERIN',
    'PENDUKUNG',
    'SKL'
);


--
-- Name: JenisKelamin; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."JenisKelamin" AS ENUM (
    'LAKI_LAKI',
    'PEREMPUAN'
);


--
-- Name: LogCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LogCategory" AS ENUM (
    'SISWA',
    'DOKUMEN',
    'HAK_AKSES',
    'AUTENTIKASI',
    'BACKUP'
);


--
-- Name: NoteVisibility; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NoteVisibility" AS ENUM (
    'INTERNAL',
    'PUBLIC'
);


--
-- Name: OcrStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OcrStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);


--
-- Name: ParentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ParentStatus" AS ENUM (
    'MASIH_HIDUP',
    'MENINGGAL'
);


--
-- Name: ReviewStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReviewStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: RoleName; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RoleName" AS ENUM (
    'SUPER_ADMIN',
    'GURU',
    'KEPALA_SEKOLAH',
    'TATA_USAHA'
);


--
-- Name: StudentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StudentStatus" AS ENUM (
    'PENDAFTAR',
    'AKTIF',
    'CUTI',
    'LULUS',
    'KELUAR',
    'ALUMNI'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AcademicYear; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."AcademicYear" (
    id text NOT NULL,
    name text NOT NULL,
    "isActive" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ActivityLog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ActivityLog" (
    id text NOT NULL,
    "actorUserId" text NOT NULL,
    action text NOT NULL,
    category public."LogCategory" NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text,
    details text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Class; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Class" (
    id text NOT NULL,
    name text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Document; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Document" (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "uploadedById" text NOT NULL,
    type public."DocumentType" NOT NULL,
    "originalName" text NOT NULL,
    "storedName" text NOT NULL,
    "mimeType" text NOT NULL,
    "sizeBytes" integer NOT NULL,
    status public."DocumentStatus" DEFAULT 'UPLOADED'::public."DocumentStatus" NOT NULL,
    "storagePath" text NOT NULL,
    "ocrResult" jsonb,
    "ocrStatus" public."OcrStatus" DEFAULT 'PENDING'::public."OcrStatus" NOT NULL,
    "ocrRunAt" timestamp(3) without time zone,
    "uploadedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    "isLatest" boolean DEFAULT true NOT NULL,
    "previousId" text,
    "deletedAt" timestamp(3) without time zone,
    "deletedBy" text,
    "fileData" bytea,
    "ocrConfidence" double precision,
    "reviewStatus" public."ReviewStatus" DEFAULT 'PENDING'::public."ReviewStatus" NOT NULL,
    verification_notes text,
    verified_by text,
    verified_at timestamp(3) without time zone
);


--
-- Name: DocumentRequirement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."DocumentRequirement" (
    id text NOT NULL,
    type public."DocumentType" NOT NULL,
    "isRequired" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Guardian; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Guardian" (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "namaAyah" text,
    "pekerjaanAyah" text,
    "ktpAyah" text,
    "teleponAyah" text,
    "namaIbu" text,
    "pekerjaanIbu" text,
    "ktpIbu" text,
    "teleponIbu" text,
    "teleponOrangTua" text,
    "alamatOrangTua" text,
    "deletedAt" timestamp(3) without time zone,
    "deletedBy" text,
    "alamatWali" text,
    "hubunganWali" text,
    "namaWali" text,
    "pendidikanAyah" text,
    "pendidikanIbu" text,
    "statusAyah" public."ParentStatus" DEFAULT 'MASIH_HIDUP'::public."ParentStatus" NOT NULL,
    "statusIbu" public."ParentStatus" DEFAULT 'MASIH_HIDUP'::public."ParentStatus" NOT NULL,
    "teleponWali" text
);


--
-- Name: RefreshToken; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."RefreshToken" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tokenHash" text NOT NULL,
    family text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Role" (
    id text NOT NULL,
    name public."RoleName" NOT NULL
);


--
-- Name: Sequence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Sequence" (
    id text NOT NULL,
    value integer NOT NULL
);


--
-- Name: Student; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Student" (
    id text NOT NULL,
    "nisSekolah" text,
    nisn text,
    "registrationNumber" text,
    angkatan integer NOT NULL,
    nama text NOT NULL,
    kelas text NOT NULL,
    jurusan text NOT NULL,
    email text NOT NULL,
    telepon text NOT NULL,
    alamat text NOT NULL,
    "tanggalLahir" timestamp(3) without time zone NOT NULL,
    status public."StudentStatus" DEFAULT 'AKTIF'::public."StudentStatus" NOT NULL,
    catatan text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "deletedBy" text,
    "graduationYear" integer,
    "certificateNumber" text,
    "academicYearId" text NOT NULL,
    "anakKe" integer,
    "asalSekolah" text,
    "jenisKelamin" public."JenisKelamin",
    "jumlahSaudara" integer,
    "namaPanggilan" text,
    nik text,
    "nomorKK" text,
    "photoUrl" text,
    "tahunLulusSebelumnya" integer,
    "tempatLahir" text
);


--
-- Name: StudentNote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StudentNote" (
    id text NOT NULL,
    "studentId" text NOT NULL,
    "authorId" text NOT NULL,
    content text NOT NULL,
    visibility public."NoteVisibility" DEFAULT 'INTERNAL'::public."NoteVisibility" NOT NULL,
    "isPinned" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: StudentStatusHistory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StudentStatusHistory" (
    id text NOT NULL,
    "studentId" text NOT NULL,
    status public."StudentStatus" NOT NULL,
    "changedById" text NOT NULL,
    reason text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: StudentTimeline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."StudentTimeline" (
    id text NOT NULL,
    "studentId" text NOT NULL,
    event text NOT NULL,
    details text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: SystemSetting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SystemSetting" (
    id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "failedLoginAttempts" integer DEFAULT 0 NOT NULL,
    "lockedUntil" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "roleId" text NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "deletedBy" text
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Data for Name: AcademicYear; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."AcademicYear" (id, name, "isActive", "createdAt") FROM stdin;
a384c374-3971-4ff5-b018-aad809da3334	2026/2027	f	2026-06-29 08:57:21.228
ay-2025-2026-default-id	2025/2026	f	2026-06-23 06:55:15.526
28a1b621-a4ac-4176-817a-34f25a18260f	2027/2028	t	2026-06-29 08:51:20.749
\.


--
-- Data for Name: ActivityLog; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."ActivityLog" (id, "actorUserId", action, category, "entityType", "entityId", details, "createdAt") FROM stdin;
LOG_436cd768-7846-4248-80b0-ba04782bbb86	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin ARBAL" logged in successfully	2026-06-23 00:08:12.253
LOG_0a0e4e59-5f82-4579-98d0-9402990f1817	admin-user-default-id	CREATE_STUDENT	SISWA	Student	TM-2025-0004	Created student "Siswa Simulasi Bencana" (NIS Sekolah: NIS-2025-0004, PPDB: PPDB-2025-0004)	2026-06-23 00:08:12.355
LOG_b5aa74b7-a12f-43b0-a071-ce3050d1ab96	admin-user-default-id	UPLOAD_DOCUMENT	DOKUMEN	Document	182c4a34-04c1-45cf-b0f6-f802a8c83657	Uploaded document "kartu_keluarga_simulasi.pdf" (KK v1) for student TM-2025-0004	2026-06-23 00:08:12.435
LOG_1782173293694_p8vmln	admin-user-default-id	BACKUP_RESTORE	BACKUP	Backup	arbal-backup-manual-2026-06-23T00-08-12-456Z.zip	Database and uploads restored from backup: arbal-backup-manual-2026-06-23T00-08-12-456Z.zip	2026-06-23 00:08:13.694
LOG_a0ef695b-b1d8-4dbc-b6f4-1639f99854d6	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin ARBAL" logged in successfully	2026-06-23 09:23:41.261
LOG_6d584267-6d13-4972-aa4f-04a36cd8c0f2	admin-user-default-id	UPDATE_USER	HAK_AKSES	User	admin-user-default-id	Updated user "Admin Mustaqbal". Changes: {"name":"Admin Mustaqbal","email":"admin@mustaqbal.sch.id"}	2026-06-23 09:24:42.955
LOG_76054d87-2110-4908-8d99-cda4181b662f	admin-user-default-id	RESET_PASSWORD	HAK_AKSES	User	admin-user-default-id	Password reset for user "Admin Mustaqbal" by admin	2026-06-23 09:24:45.066
LOG_3e35322d-24e2-4abd-a39e-d68bb0ed87b8	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-23 09:26:16.754
LOG_1782206784808_klz0nk	admin-user-default-id	BACKUP_CREATE	BACKUP	Backup	arbal-backup-manual-2026-06-23T09-26-24-490Z.zip	Backup created: arbal-backup-manual-2026-06-23T09-26-24-490Z.zip (0.01 MB). Contains 1 students and 0 documents.	2026-06-23 09:26:24.809
LOG_1782206788587_7xmuxv	admin-user-default-id	BACKUP_DELETE	BACKUP	Backup	arbal-backup-manual-2026-06-23T00-08-12-456Z.zip	Backup file deleted: arbal-backup-manual-2026-06-23T00-08-12-456Z.zip	2026-06-23 09:26:28.588
LOG_1782206791288_z8nqaq	admin-user-default-id	BACKUP_DELETE	BACKUP	Backup	arbal-backup-manual-2026-06-22T23-59-48-483Z.zip	Backup file deleted: arbal-backup-manual-2026-06-22T23-59-48-483Z.zip	2026-06-23 09:26:31.288
LOG_110a1d90-71d6-4621-9da0-ca1daf78660d	admin-user-default-id	CREATE_USER	HAK_AKSES	User	b8839858-935d-467f-8821-d9aec1d3eb77	Created user "Guru" with role GURU	2026-06-23 09:30:12.983
LOG_1782207031612_l5e77u	admin-user-default-id	BACKUP_DOWNLOAD	BACKUP	Backup	arbal-backup-manual-2026-06-23T09-26-24-490Z.zip	Backup file downloaded: arbal-backup-manual-2026-06-23T09-26-24-490Z.zip	2026-06-23 09:30:31.612
LOG_6706f11d-1fa6-4989-adf4-caf4e7177c45	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-23 09:42:19.067
LOG_c3bb1f9a-877f-4978-a070-363c975dddbb	admin-user-default-id	CREATE_STUDENT	SISWA	Student	TM-2026-0001	Created student "Fikri Ihsan Abdulloh" (NIS Sekolah: NIS-2026-0001, PPDB: PPDB-2026-0001)	2026-06-23 09:44:06.66
LOG_cf646f16-9840-4639-bc68-a47128866242	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0001	Updated student "Fikri Ihsan Abdulloh". Changes: {"before":{},"after":{}}	2026-06-23 09:45:29.078
LOG_88f2d224-a444-4a79-a995-38dc4bb90c15	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-23 10:25:37.76
LOG_52ebf9af-2641-489e-91dd-4a94719ddb4d	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-23 22:26:03.486
LOG_64c02fcd-aed0-4fd9-8044-c8da8817e0a6	admin-user-default-id	CREATE_STUDENT	SISWA	Student	TM-2026-0002	Created student "Fikri Ihsan Abdulloh" (NIS Sekolah: NIS-2026-0002, PPDB: PPDB-2026-0002)	2026-06-23 22:34:17.127
LOG_be6c243d-d8cd-4c34-9142-9d0ea2cf44f6	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-23 22:50:48.858
LOG_6f95bd2c-a430-49a8-9fa4-cd9a5ec272b8	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-24 02:05:36.391
LOG_55e38173-85ca-444d-9633-2073b8c9e192	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-24 03:28:55.571
LOG_1782271756580_83r6fh	admin-user-default-id	BACKUP_DELETE	BACKUP	Backup	arbal-backup-manual-2026-06-23T09-26-24-490Z.zip	Backup file deleted: arbal-backup-manual-2026-06-23T09-26-24-490Z.zip	2026-06-24 03:29:16.582
LOG_53d71129-521d-4f22-84e2-9eb382b6fab9	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-29 07:28:20.892
LOG_cb48c565-77c7-436e-b62b-f20eaae141d9	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-29 07:35:49.046
LOG_1de7e29b-ef2f-412c-9c77-39859558be18	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-29 07:51:10.763
LOG_cfbe8363-d651-48e2-896c-a15194561c7a	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-29 08:12:34.771
LOG_e91944f2-16a7-462c-a5f7-73686bc34077	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-29 08:40:34.877
LOG_e67a5e9f-6ffa-4c0c-8812-ca9f0aa16e01	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-29 08:50:07.091
LOG_ce769a92-3544-4ada-b681-0dbd4cef89e8	admin-user-default-id	CLASS_CREATED	SISWA	Class	6ebe8243-2f8f-49e7-b81b-887f0bbb23c2	Master Kelas "X" dibuat oleh Admin Mustaqbal (ID: admin-user-default-id)	2026-06-29 08:50:58.83
LOG_4500433e-b76c-473a-be65-0999594f2182	admin-user-default-id	ACADEMIC_YEAR_CREATED	SISWA	AcademicYear	28a1b621-a4ac-4176-817a-34f25a18260f	Tahun Ajaran baru "2027/2028" dibuat oleh Admin Mustaqbal (ID: admin-user-default-id)	2026-06-29 08:51:20.751
LOG_5b698bc1-3193-4b9b-b0c5-6f3faad6a01d	admin-user-default-id	ACADEMIC_YEAR_ACTIVATED	SISWA	AcademicYear	fa4e1253-821c-421f-96cd-69fca11673b9	Tahun Ajaran "2026/2027" diaktifkan oleh Admin Mustaqbal (ID: admin-user-default-id)	2026-06-29 08:51:24.89
LOG_99d6955e-201a-4687-a4d4-ad0f6a33fb2d	admin-user-default-id	ACADEMIC_YEAR_ACTIVATED	SISWA	AcademicYear	ay-2025-2026-default-id	Tahun Ajaran "2025/2026" diaktifkan oleh Admin Mustaqbal (ID: admin-user-default-id)	2026-06-29 08:51:28.117
LOG_16f30bf7-772c-482b-97a0-4d343b00d70f	admin-user-default-id	CLASS_DELETED	SISWA	Class	a2604778-5920-4c99-ba28-34c6802e93e2	Master Kelas "Paket C" dinonaktifkan (Soft Delete) oleh Admin Mustaqbal (ID: admin-user-default-id)	2026-06-29 08:51:41.469
LOG_5aee1875-41c9-4ef6-a50a-4fbd8bb3c3e6	admin-user-default-id	CLASS_DELETED	SISWA	Class	c433a77d-5546-46d1-9e72-8c6c2873b2bf	Master Kelas "Paket B" dinonaktifkan (Soft Delete) oleh Admin Mustaqbal (ID: admin-user-default-id)	2026-06-29 08:51:46.297
LOG_eece27d7-5c2b-41d8-99a2-3f480b8d8303	admin-user-default-id	CLASS_DELETED	SISWA	Class	c89ce30d-8b39-40c6-83f4-eef34944a153	Master Kelas "Paket A" dinonaktifkan (Soft Delete) oleh Admin Mustaqbal (ID: admin-user-default-id)	2026-06-29 08:51:53.142
LOG_10681c6c-8c8e-4406-9b5f-63026280e266	admin-user-default-id	CLASS_DELETED	SISWA	Class	a2604778-5920-4c99-ba28-34c6802e93e2	Master Kelas "Paket C" dinonaktifkan (Soft Delete) oleh Admin Mustaqbal (ID: admin-user-default-id)	2026-06-29 08:52:10.895
LOG_4b9f57fb-0cff-4459-8e16-3b21876ac3e6	admin-user-default-id	CLASS_DELETED	SISWA	Class	c433a77d-5546-46d1-9e72-8c6c2873b2bf	Master Kelas "Paket B" dinonaktifkan (Soft Delete) oleh Admin Mustaqbal (ID: admin-user-default-id)	2026-06-29 08:52:18.03
LOG_fbde12e2-9c93-402a-a3cb-6ce8fdc5eb5d	admin-user-default-id	CLASS_DELETED	SISWA	Class	6ebe8243-2f8f-49e7-b81b-887f0bbb23c2	Master Kelas "X" dinonaktifkan (Soft Delete) oleh Admin Mustaqbal (ID: admin-user-default-id)	2026-06-29 08:53:28.54
LOG_703b3b21-edc0-4bb9-81f6-05a96b2a5f1d	admin-user-default-id	CLASS_DELETED	SISWA	Class	6ebe8243-2f8f-49e7-b81b-887f0bbb23c2	Master Kelas "X" dinonaktifkan (Soft Delete) oleh Admin Mustaqbal (ID: admin-user-default-id)	2026-06-29 08:56:40.707
LOG_4131c27e-7ede-40a2-a993-4212e86dc763	admin-user-default-id	ACADEMIC_YEAR_DELETED	SISWA	AcademicYear	fa4e1253-821c-421f-96cd-69fca11673b9	Tahun Ajaran "2026/2027" dihapus oleh Admin Mustaqbal (ID: admin-user-default-id)	2026-06-29 08:57:06.6
LOG_bdca048b-3f89-4005-aae9-2436328a124c	admin-user-default-id	ACADEMIC_YEAR_CREATED	SISWA	AcademicYear	a384c374-3971-4ff5-b018-aad809da3334	Tahun Ajaran baru "2026/2027" dibuat oleh Admin Mustaqbal (ID: admin-user-default-id)	2026-06-29 08:57:21.229
LOG_d3632f1d-46f3-4ab1-ac04-828bb3a6a8c9	admin-user-default-id	ACADEMIC_YEAR_ACTIVATED	SISWA	AcademicYear	28a1b621-a4ac-4176-817a-34f25a18260f	Tahun Ajaran "2027/2028" diaktifkan oleh Admin Mustaqbal (ID: admin-user-default-id)	2026-06-29 08:57:22.766
LOG_61f3d090-2a22-47c1-8dc0-33a3e55a899b	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-29 08:58:45.342
LOG_67cd6b87-3b69-4121-9483-9a3b43fd7e03	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-29 09:20:46.912
LOG_72897745-0bb1-4cbd-aa29-ce704d938be1	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-29 09:42:07.479
LOG_1782756000616_c4zjbr	SYSTEM	BACKUP_CREATE	BACKUP	Backup	arbal-backup-daily-2026-06-29T18-00-00-033Z.zip	Backup created: arbal-backup-daily-2026-06-29T18-00-00-033Z.zip (0.01 MB). Contains 0 students and 0 documents.	2026-06-29 18:00:00.639
LOG_e4245243-bc72-4548-bd35-1c25f458fa66	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-30 01:01:18.948
LOG_d6bc48a5-f55d-46e2-a1f0-3954089897c2	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-30 01:23:03.021
LOG_cb1308fb-8523-4a5f-88b7-a58fc8ed376c	admin-user-default-id	CREATE_STUDENT	SISWA	Student	TM-2026-0003	Created student "DZAKY ARHAB PASHA" (NIS Sekolah: NIS-2026-0003, PPDB: PPDB-2026-0003)	2026-06-30 01:25:27.761
LOG_0d111ac2-d05f-4b4d-b3d0-9b81b39c74d2	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0003	Updated student "DZAKY ARHAB PASHA". Changes: {"before":{},"after":{}}	2026-06-30 01:25:36.812
LOG_5cba01ee-3d38-41ed-9ea0-0c27c9e2c0a2	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0003	Updated student "DZAKY ARHAB PASHA". Changes: {"before":{},"after":{}}	2026-06-30 01:26:48.147
LOG_d887ef5e-9282-4c4f-803b-8adbb297bf4a	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-30 01:41:08.799
LOG_528d53dd-71d7-4797-bc1a-517a486ceb65	admin-user-default-id	CREATE_STUDENT	SISWA	Student	TM-2026-0004	Created student "BYANTARA SACHIO PRATAMA" (NIS Sekolah: NIS-2026-0004, PPDB: PPDB-2026-0004)	2026-06-30 01:41:19.376
LOG_d0ac6c87-0f6d-4d00-9bca-8c49e86bd957	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	2fcd96af-96a5-4af4-9812-dfd93d2d2acc	Uploaded document "byantara akta lahir.jpeg" (AKTA v1) for student TM-2026-0004	2026-06-30 01:41:19.496
LOG_b1adb4c7-2d81-4629-b79f-6d34a9ffaab8	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0004	Updated student "BYANTARA SACHIO PRATAMA". Changes: {"before":{},"after":{}}	2026-06-30 01:41:21.785
LOG_4d561de9-a618-470a-905f-3e659796042e	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0004	Updated student "BYANTARA SACHIO PRATAMA". Changes: {"before":{},"after":{}}	2026-06-30 01:42:02.577
LOG_41d6d460-782f-4dc6-bbd3-c3eb4151d3a8	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0003	Updated student "DZAKY ARHAB PASHA". Changes: {"before":{},"after":{}}	2026-06-30 01:44:19.694
LOG_d43480e6-5ec7-4799-9363-0e37546a8f68	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0003	Updated student "DZAKY ARHAB PASHA". Changes: {"before":{"pekerjaanIbu":"Ibu Rumah Tangga"},"after":{"pekerjaanIbu":"Karyawan Swasta"}}	2026-06-30 01:46:33.618
LOG_ae07e9d2-cbf9-4c95-b0ff-8c6a19547710	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-30 01:56:31.115
LOG_9ec91437-cdb1-44b3-89f7-aeb24226fe7e	admin-user-default-id	CREATE_STUDENT	SISWA	Student	TM-2026-0005	Created student "MUHAMMAD ARDHANI" (NIS Sekolah: NIS-2026-0005, PPDB: PPDB-2026-0005)	2026-06-30 01:59:40.676
LOG_e55006fe-9292-4375-84fb-fa0d9a2e8b96	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0005	Updated student "MUHAMMAD ARDHANI". Changes: {"before":{},"after":{}}	2026-06-30 01:59:43.629
LOG_93cd5ce3-7ff5-420d-885a-cacc02f3a85a	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0005	Updated student "MUHAMMAD ARDHANI". Changes: {"before":{},"after":{}}	2026-06-30 01:59:52.23
LOG_30362ab6-2400-442c-9693-e8462f73b41f	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0005	Updated student "MUHAMMAD ARDHANI". Changes: {"before":{},"after":{}}	2026-06-30 01:59:59.136
LOG_35cf5a8a-e0f1-47c7-875f-e858ba3b290e	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0005	Updated student "MUHAMMAD ARDHANI". Changes: {"before":{},"after":{}}	2026-06-30 02:00:25.03
LOG_eefde0f3-6ef9-4d29-9d3c-e3323f9ecd6a	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-30 02:18:14.576
LOG_81448539-69b2-41e9-941e-bf872ff93166	admin-user-default-id	CREATE_STUDENT	SISWA	Student	TM-2026-0006	Created student "FAIZA ALFIANSYAH" (NIS Sekolah: NIS-2026-0006, PPDB: PPDB-2026-0006)	2026-06-30 02:18:26.185
LOG_514727e2-b5c9-4817-bcec-6639d960f9cf	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0006	Updated student "FAIZA ALFIANSYAH". Changes: {"before":{},"after":{}}	2026-06-30 02:18:48.773
LOG_9812662d-1fbc-43df-8052-cfcecbfb79c6	admin-user-default-id	CREATE_STUDENT	SISWA	Student	TM-2026-0007	Created student "ADAM PUTRA ARDIANTO" (NIS Sekolah: NIS-2026-0007, PPDB: PPDB-2026-0007)	2026-06-30 02:32:14.619
LOG_852a4dd9-19da-46bf-9ef5-c5a7bb21e093	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0007	Updated student "ADAM PUTRA ARDIANTO". Changes: {"before":{},"after":{}}	2026-06-30 02:32:40.389
LOG_17a2fcba-36e8-480f-bc1e-22f9e9908277	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-30 02:42:47.876
LOG_27748318-6531-47ec-a1bb-2026a376a957	admin-user-default-id	CREATE_STUDENT	SISWA	Student	TM-2026-0008	Created student "HUSNA FAKHIRA" (NIS Sekolah: NIS-2026-0008, PPDB: PPDB-2026-0008)	2026-06-30 02:51:46.124
LOG_0735acfb-99ef-41ca-a277-f7f23534ddaf	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0008	Updated student "HUSNA FAKHIRA". Changes: {"before":{},"after":{}}	2026-06-30 02:52:08.176
LOG_038f8705-3799-4fb0-b039-e6fd9e161992	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-30 03:13:02.094
LOG_631cdc53-3c25-471e-9833-9201287e9c95	admin-user-default-id	CREATE_STUDENT	SISWA	Student	TM-2026-0009	Created student "HILYA  AZHARI" (NIS Sekolah: NIS-2026-0009, PPDB: PPDB-2026-0009)	2026-06-30 03:13:16.784
LOG_3a6d3646-4490-4bf1-9a5e-54702c92eb8b	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0009	Updated student "HILYA  AZHARI". Changes: {"before":{},"after":{}}	2026-06-30 03:13:34.596
LOG_3e61a8b2-4596-4758-bfcf-3932be193636	admin-user-default-id	CREATE_STUDENT	SISWA	Student	TM-2026-0010	Created student "KHANSA NAFISA MUTHIA MAJID" (NIS Sekolah: NIS-2026-0010, PPDB: PPDB-2026-0010)	2026-06-30 03:25:52.876
LOG_20172951-52cb-49b8-837f-eac0ddf63d81	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0010	Updated student "KHANSA NAFISA MUTHIA MAJID". Changes: {"before":{},"after":{}}	2026-06-30 03:26:43.926
LOG_bd8b198b-7cb8-41b0-9626-58a012c71706	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-30 03:28:26.133
LOG_ec0ec11a-909e-47ba-8abd-b645843d785c	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0010	Updated student "KHANSA NAFISA MUTHIA MAJID". Changes: {"before":{"alamat":"JL. CISADANE 5 NO.15, TAMAN CIBODAS LIPPO CIKARANG, RT.001/RW.017, DESA CIBATU, KECAMATAN CIKARANG SELATAN, KABUPATEN BEKASI, JAWA BARAT."},"after":{"alamat":"VILLA MUTIARA CIKARANG 1, BLOK H11, NO.22, DESA CIANTRA, KECAMATAN CIKARANG SELATAN, KABUPATEN BEKASI, JAWA BARAT."}}	2026-06-30 03:29:17.827
LOG_a76c3246-49f8-43ea-bc9f-362c52982310	admin-user-default-id	CREATE_STUDENT	SISWA	Student	TM-2026-0011	Created student "FADHILAH HASHIFA ANDALAS" (NIS Sekolah: NIS-2026-0011, PPDB: PPDB-2026-0011)	2026-06-30 03:40:50.375
LOG_0c958ffc-f9aa-413d-be55-ed4d7f7ed4e8	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0011	Updated student "FADHILAH HASHIFA ANDALAS". Changes: {"before":{},"after":{}}	2026-06-30 03:40:59.594
LOG_0dc57984-80f1-4526-b030-1db4deb3a8ce	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-30 03:54:31.696
LOG_74abc351-dacb-438e-a74c-4f9985baf1c7	admin-user-default-id	CREATE_STUDENT	SISWA	Student	TM-2026-0012	Created student "RACHEL ARETA AMABELLA" (NIS Sekolah: NIS-2026-0012, PPDB: PPDB-2026-0012)	2026-06-30 03:54:51.633
LOG_a5a073fd-62b7-4bb2-afef-dd607a2bd81e	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0012	Updated student "RACHEL ARETA AMABELLA". Changes: {"before":{},"after":{}}	2026-06-30 03:55:09.704
LOG_4453390c-8877-486e-b0c1-5f600b4a1dc9	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-30 04:27:49.63
LOG_f041e287-955e-4482-bd64-9224be38a878	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0012	Updated student "RACHEL ARETA AMABELLA". Changes: {"before":{},"after":{}}	2026-06-30 04:32:33.27
LOG_2b856e4b-93fc-42f7-bbea-d639a1e80e3d	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	d545a833-f5db-4539-91b3-2900e9ab16d6	Uploaded document "rachel akta kk.pdf" (KK v1) for student TM-2026-0012	2026-06-30 04:32:33.404
LOG_5c060173-9f0c-495c-9693-26003140e9e0	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0012	Updated student "RACHEL ARETA AMABELLA". Changes: {"before":{},"after":{}}	2026-06-30 04:35:12.4
LOG_bf0def68-eebc-4841-8732-c3c1d7b01a5f	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	3cc51221-46bc-43bc-9622-e98b5824465e	Uploaded document "rachel akta lahir.pdf" (AKTA v1) for student TM-2026-0012	2026-06-30 04:35:12.559
LOG_1f8412d2-acfb-4c75-857b-b647e605fa37	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	ae968b86-743d-4f09-8695-d753bc214d4f	Uploaded document "rachel skl.pdf" (SKL v1) for student TM-2026-0012	2026-06-30 04:35:12.667
LOG_150eb2a4-5fcb-4e6a-b80e-2027bebb6fa8	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0011	Updated student "FADHILAH HASHIFA ANDALAS". Changes: {"before":{},"after":{}}	2026-06-30 04:40:12.318
LOG_c59455b3-3aa0-46c8-9bb5-4ee352314fa1	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	f49a2af3-eb0a-4617-82a1-fd18f644b68c	Uploaded document "fadhilah Hashifa kk.pdf" (KK v1) for student TM-2026-0011	2026-06-30 04:40:12.504
LOG_0751d13c-3d00-40e1-8606-7c1eebe8f3fd	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	eb266885-77f9-45bc-b56f-86b0186abe04	Uploaded document "fadhilah Hashifa skl.pdf" (SKL v1) for student TM-2026-0011	2026-06-30 04:40:13.23
LOG_1f6b5146-276d-4be0-9a0a-cf01afcc7451	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-30 04:43:00.925
LOG_efcce899-0158-4e81-b3cc-1b0046dbbe64	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0011	Updated student "FADHILAH HASHIFA ANDALAS". Changes: {"before":{},"after":{}}	2026-06-30 04:43:25.818
LOG_67ca9deb-7f18-4f0c-9fbf-53467b686435	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	b1297419-b2a4-4d46-acba-77a144207252	Uploaded document "fadhilah Hashifa akta lahir.pdf" (AKTA v1) for student TM-2026-0011	2026-06-30 04:43:25.879
LOG_7d45f4f2-6513-4758-818a-3b72f5eb9269	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0010	Updated student "KHANSA NAFISA MUTHIA MAJID". Changes: {"before":{},"after":{}}	2026-06-30 04:46:45.433
LOG_1ac767af-2b5a-4427-bbb4-ba4047c350ed	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	b629a846-23cb-46ae-868b-fd3b8568510d	Uploaded document "khansa nafisa akta lahir.pdf" (AKTA v1) for student TM-2026-0010	2026-06-30 04:46:45.58
LOG_043a6cce-c68a-4418-8625-25136a4096d2	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	73c7c69e-af52-47b2-a4a8-bf6e1d2f86cf	Uploaded document "khansa nafisa  kk.pdf" (KK v1) for student TM-2026-0010	2026-06-30 04:46:45.707
LOG_a35f320a-8fd3-4e10-ab7a-66f1a97d839c	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0009	Updated student "HILYA  AZHARI". Changes: {"before":{},"after":{}}	2026-06-30 04:50:40.425
LOG_b31224e0-32f8-4633-8ba8-f29d70bd5142	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	ce66accd-03a4-4b4f-b9e9-f5d234a157eb	Uploaded document "Hilya azhari  kk.pdf" (KK v1) for student TM-2026-0009	2026-06-30 04:50:40.549
LOG_1b674f7c-e98c-4976-bfb1-6bc103fc8079	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	2a287280-d666-4637-9f49-b1163293466b	Uploaded document "Hilya azhari akta lahir.pdf" (AKTA v1) for student TM-2026-0009	2026-06-30 04:50:40.672
LOG_072c1a0b-81d7-4f5a-a226-5b08a4998dd4	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	430ac9b8-c55e-4f44-b489-8970676bac39	Uploaded document "Hilya azhari skl.pdf" (SKL v1) for student TM-2026-0009	2026-06-30 04:50:40.741
LOG_b4be4c10-9206-438f-bb97-74ae1b6a5cd7	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0008	Updated student "HUSNA FAKHIRA". Changes: {"before":{},"after":{}}	2026-06-30 04:53:17.7
LOG_79452bd2-9f73-475f-86f0-6637ebf7b264	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	6248d118-099e-4fe6-a0d9-64f84ac33c14	Uploaded document "husna fakhira kk.png.pdf" (KK v1) for student TM-2026-0008	2026-06-30 04:53:17.818
LOG_c2151907-48db-4dba-9857-9317423455be	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	d5c22612-66de-47b0-ba4a-333234700b2b	Uploaded document "husna fakhira akta.png.pdf" (AKTA v1) for student TM-2026-0008	2026-06-30 04:53:17.906
LOG_6d8b9503-f3c7-4afc-9ab5-717a4ee555e8	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-30 04:58:10.598
LOG_1ffbb043-e83f-4aa0-8573-ec5098aa3639	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0007	Updated student "ADAM PUTRA ARDIANTO". Changes: {"before":{},"after":{}}	2026-06-30 04:58:44.042
LOG_93d78b83-b928-4e83-a420-2995679be816	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	d41309b0-d602-4103-a0cc-8a31bf2a5fbc	Uploaded document "ADAM PUTRA kk.pdf" (KK v1) for student TM-2026-0007	2026-06-30 04:58:44.185
LOG_d27c70e7-478f-468f-9031-6789990314b7	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	d42ca224-f0fe-4f08-b32b-f56ee4fc09b9	Uploaded document "ADAM PUTRA akta lahir.pdf" (AKTA v1) for student TM-2026-0007	2026-06-30 04:58:44.289
LOG_91e084d3-da39-4ead-923a-1e9dd7bb9541	admin-user-default-id	DOCUMENT_UPLOAD_FAILED	DOKUMEN	Document	\N	Gagal mengunggah dokumen tipe SKL untuk siswa TM-2026-0007. Rincian: Traversal path detected	2026-06-30 04:58:44.369
LOG_3f737748-643e-42bc-a5e3-39b7093e582a	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0007	Updated student "ADAM PUTRA ARDIANTO". Changes: {"before":{},"after":{}}	2026-06-30 04:59:09.894
LOG_09a9bad0-0e56-482e-9815-9cc1a906158e	admin-user-default-id	DOCUMENT_UPLOAD_FAILED	DOKUMEN	Document	\N	Gagal mengunggah dokumen tipe SKL untuk siswa TM-2026-0007. Rincian: Traversal path detected	2026-06-30 04:59:09.981
LOG_b5a754d6-0aa6-4556-9d2f-c82acd4ed5a6	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0007	Updated student "ADAM PUTRA ARDIANTO". Changes: {"before":{},"after":{}}	2026-06-30 04:59:28.085
LOG_a7db4518-9d8a-4186-8c5e-27cf6551406b	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	e4443d2c-4225-4387-aba9-b2574f7f67b3	Uploaded document "ADAM PUTRA skl.png.pdf" (SKL v1) for student TM-2026-0007	2026-06-30 04:59:28.173
LOG_bec0df50-d807-4888-ad24-edca45fac52c	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0006	Updated student "FAIZA ALFIANSYAH". Changes: {"before":{},"after":{}}	2026-06-30 05:02:37.654
LOG_6f58fe33-c03c-49c4-82cb-f3b6715abedf	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	f5d8617c-3bdd-4fa4-b08b-cefed71129a8	Uploaded document "FAIZA ALFIANSYAH KK.pdf" (KK v1) for student TM-2026-0006	2026-06-30 05:02:37.766
LOG_d1bab297-cc39-4c77-989c-bfb2e547b3b2	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	a60496e0-00eb-4818-98c5-0ed6abc28f9b	Uploaded document "FAIZA ALFIANSYAH akta lahir.png.pdf" (AKTA v1) for student TM-2026-0006	2026-06-30 05:02:37.879
LOG_4172991e-e42b-4e74-931d-8067cd970873	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0005	Updated student "MUHAMMAD ARDHANI". Changes: {"before":{},"after":{}}	2026-06-30 05:05:18.747
LOG_66a23e1c-87e9-4106-a2f7-7923ff994fc3	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	75872d8d-0fd5-496e-8d36-b5e4cdbdf2c2	Uploaded document "muhammad ardhani kk.pdf" (KK v1) for student TM-2026-0005	2026-06-30 05:05:18.862
LOG_03046fa5-1f7d-4c98-bb00-08e51a215a8a	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	eab0b718-348c-4e74-9c87-8f877e045ec9	Uploaded document "muhammad ardhani akta lahir.pdf" (AKTA v1) for student TM-2026-0005	2026-06-30 05:05:18.953
LOG_500f93f9-27a3-445d-bce5-82ec5bc8c80f	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0004	Updated student "BYANTARA SACHIO PRATAMA". Changes: {"before":{},"after":{}}	2026-06-30 05:08:15.285
LOG_28e17d68-c2c5-43e4-a154-517350e2f873	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	9f0b768e-7e61-4e5e-a044-adde806c48ed	Uploaded document "byantara kk.pdf" (KK v1) for student TM-2026-0004	2026-06-30 05:08:15.418
LOG_3516da92-43c3-46c5-8d28-25569eae3cb2	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	02b99257-015a-4b21-a0bd-602838ae9f01	Uploaded document "BYANTARA SKL.pdf" (SKL v1) for student TM-2026-0004	2026-06-30 05:08:15.49
LOG_352921b9-d0ec-4dc4-9b05-f994fffbce41	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-30 06:20:40.061
LOG_a74f6477-ab0f-4b38-ac84-e05e06fadd92	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0003	Updated student "DZAKY ARHAB PASHA". Changes: {"before":{},"after":{}}	2026-06-30 06:24:18.256
LOG_a98344ac-50dc-45dd-a70d-5a452104efdb	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0003	Updated student "DZAKY ARHAB PASHA". Changes: {"before":{},"after":{}}	2026-06-30 06:24:58.321
LOG_11ffa333-36f6-4f94-8563-bf9d0928485b	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	90c21cc2-9a53-4600-abfd-8c32486e57bb	Uploaded document "dzaki arhab kk.png.pdf" (KK v1) for student TM-2026-0003	2026-06-30 06:24:58.5
LOG_128b7f75-cd7b-4349-9b71-29d4666355c2	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	1a84d2f0-a642-4db4-b4a0-e46a22f8928c	Uploaded document "dzaki arhab akta lahir.png.pdf" (AKTA v1) for student TM-2026-0003	2026-06-30 06:24:58.626
LOG_1782800715447_npz8zp	admin-user-default-id	DOWNLOAD_DOCUMENT	DOKUMEN	Document	ae968b86-743d-4f09-8695-d753bc214d4f	Document "rachel skl.pdf" (SKL) for student "RACHEL ARETA AMABELLA" downloaded/previewed	2026-06-30 06:25:15.447
LOG_0cdcff52-0671-4de3-ab26-0a35971254bb	admin-user-default-id	LOGIN_FAILED	AUTENTIKASI	User	admin-user-default-id	Failed login attempt: invalid password for account "admin@mustaqbal.sch.id"	2026-06-30 06:37:14.447
LOG_05a5a9a3-f47c-454d-bc67-fba63731e5d1	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-30 06:37:19.227
LOG_1782801454116_h6drt7	admin-user-default-id	BACKUP_CREATE	BACKUP	Backup	arbal-backup-manual-2026-06-30T06-37-32-787Z.zip	Backup created: arbal-backup-manual-2026-06-30T06-37-32-787Z.zip (15.67 MB). Contains 10 students and 25 documents.	2026-06-30 06:37:34.117
LOG_69409115-4a44-4956-9a50-7f90181e9e52	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	d545a833-f5db-4539-91b3-2900e9ab16d6	Document "rachel akta kk.pdf" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"rachel akta kk.pdf","type":"KK","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"rachel akta kk.pdf","type":"KK","verificationNotes":null}}	2026-06-30 06:37:49.593
LOG_0b9c2a30-eba6-416c-90d2-fee559ee9c52	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	ae968b86-743d-4f09-8695-d753bc214d4f	Document "rachel skl.pdf" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"rachel skl.pdf","type":"SKL","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"rachel skl.pdf","type":"SKL","verificationNotes":null}}	2026-06-30 06:37:51.125
LOG_9630b816-0de5-4322-add0-375a1e6895ed	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	3cc51221-46bc-43bc-9622-e98b5824465e	Document "rachel akta lahir.pdf" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"rachel akta lahir.pdf","type":"AKTA","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"rachel akta lahir.pdf","type":"AKTA","verificationNotes":null}}	2026-06-30 06:37:53.133
LOG_87180931-7206-4f94-bcd8-b26e9ff765e2	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	f49a2af3-eb0a-4617-82a1-fd18f644b68c	Document "fadhilah Hashifa kk.pdf" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"fadhilah Hashifa kk.pdf","type":"KK","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"fadhilah Hashifa kk.pdf","type":"KK","verificationNotes":null}}	2026-06-30 06:38:00.377
LOG_a3b78fa4-b0e2-4df3-8427-2b4e95824af6	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	eb266885-77f9-45bc-b56f-86b0186abe04	Document "fadhilah Hashifa skl.pdf" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"fadhilah Hashifa skl.pdf","type":"SKL","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"fadhilah Hashifa skl.pdf","type":"SKL","verificationNotes":null}}	2026-06-30 06:38:01.599
LOG_bfee1eb3-412c-4fcb-81b9-54094d9bd09e	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	b1297419-b2a4-4d46-acba-77a144207252	Document "fadhilah Hashifa akta lahir.pdf" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"fadhilah Hashifa akta lahir.pdf","type":"AKTA","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"fadhilah Hashifa akta lahir.pdf","type":"AKTA","verificationNotes":null}}	2026-06-30 06:38:02.569
LOG_37a98d3c-a719-4b31-8719-20f48929dddd	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	b629a846-23cb-46ae-868b-fd3b8568510d	Document "khansa nafisa akta lahir.pdf" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"khansa nafisa akta lahir.pdf","type":"AKTA","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"khansa nafisa akta lahir.pdf","type":"AKTA","verificationNotes":null}}	2026-06-30 06:38:10.262
LOG_86883ae5-3614-48a0-ad76-f94e126c65d6	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	73c7c69e-af52-47b2-a4a8-bf6e1d2f86cf	Document "khansa nafisa  kk.pdf" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"khansa nafisa  kk.pdf","type":"KK","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"khansa nafisa  kk.pdf","type":"KK","verificationNotes":null}}	2026-06-30 06:38:11.786
LOG_c27df3f9-1405-47fd-a318-6737eee224d1	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	ce66accd-03a4-4b4f-b9e9-f5d234a157eb	Document "Hilya azhari  kk.pdf" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"Hilya azhari  kk.pdf","type":"KK","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"Hilya azhari  kk.pdf","type":"KK","verificationNotes":null}}	2026-06-30 06:38:20.309
LOG_ddc7c78b-c140-433a-aaa4-dd2760dbab06	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	2a287280-d666-4637-9f49-b1163293466b	Document "Hilya azhari akta lahir.pdf" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"Hilya azhari akta lahir.pdf","type":"AKTA","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"Hilya azhari akta lahir.pdf","type":"AKTA","verificationNotes":null}}	2026-06-30 06:38:21.106
LOG_855e9a82-1487-4ec6-949d-d8b62e43eea5	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	430ac9b8-c55e-4f44-b489-8970676bac39	Document "Hilya azhari skl.pdf" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"Hilya azhari skl.pdf","type":"SKL","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"Hilya azhari skl.pdf","type":"SKL","verificationNotes":null}}	2026-06-30 06:38:22.2
LOG_8d4d24b0-e244-40ef-9ad0-371b3c8abe71	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	6248d118-099e-4fe6-a0d9-64f84ac33c14	Document "husna fakhira kk.png.pdf" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"husna fakhira kk.png.pdf","type":"KK","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"husna fakhira kk.png.pdf","type":"KK","verificationNotes":null}}	2026-06-30 06:38:30.213
LOG_211be127-c51a-4579-b60c-1af94389a988	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	d5c22612-66de-47b0-ba4a-333234700b2b	Document "husna fakhira akta.png.pdf" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"husna fakhira akta.png.pdf","type":"AKTA","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"husna fakhira akta.png.pdf","type":"AKTA","verificationNotes":null}}	2026-06-30 06:38:31.611
LOG_34258138-a089-4046-b13d-22840b877181	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	d41309b0-d602-4103-a0cc-8a31bf2a5fbc	Document "ADAM PUTRA kk.pdf" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"ADAM PUTRA kk.pdf","type":"KK","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"ADAM PUTRA kk.pdf","type":"KK","verificationNotes":null}}	2026-06-30 06:38:37.591
LOG_1783015201631_8do6j9	SYSTEM	BACKUP_CREATE	BACKUP	Backup	arbal-backup-daily-2026-07-02T18-00-00-026Z.zip	Backup created: arbal-backup-daily-2026-07-02T18-00-00-026Z.zip (15.67 MB). Contains 0 students and 0 documents.	2026-07-02 18:00:01.632
LOG_06d32ae8-30dc-445a-a36c-0214fe41d2f9	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	d42ca224-f0fe-4f08-b32b-f56ee4fc09b9	Document "ADAM PUTRA akta lahir.pdf" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"ADAM PUTRA akta lahir.pdf","type":"AKTA","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"ADAM PUTRA akta lahir.pdf","type":"AKTA","verificationNotes":null}}	2026-06-30 06:38:38.469
LOG_1c53fe7a-9a83-4377-8393-c1a7cee0233c	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	e4443d2c-4225-4387-aba9-b2574f7f67b3	Document "ADAM PUTRA skl.png.pdf" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"ADAM PUTRA skl.png.pdf","type":"SKL","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"ADAM PUTRA skl.png.pdf","type":"SKL","verificationNotes":null}}	2026-06-30 06:38:39.543
LOG_d8db152c-888e-4ae4-84bc-fd057c8837d1	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	f5d8617c-3bdd-4fa4-b08b-cefed71129a8	Document "FAIZA ALFIANSYAH KK.pdf" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"FAIZA ALFIANSYAH KK.pdf","type":"KK","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"FAIZA ALFIANSYAH KK.pdf","type":"KK","verificationNotes":null}}	2026-06-30 06:38:51.79
LOG_7022d32f-0890-47d8-b532-7699185b10e7	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	a60496e0-00eb-4818-98c5-0ed6abc28f9b	Document "FAIZA ALFIANSYAH akta lahir.png.pdf" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"FAIZA ALFIANSYAH akta lahir.png.pdf","type":"AKTA","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"FAIZA ALFIANSYAH akta lahir.png.pdf","type":"AKTA","verificationNotes":null}}	2026-06-30 06:38:53.248
LOG_20722016-5535-4718-8aac-017ba004082a	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	75872d8d-0fd5-496e-8d36-b5e4cdbdf2c2	Document "muhammad ardhani kk.pdf" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"muhammad ardhani kk.pdf","type":"KK","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"muhammad ardhani kk.pdf","type":"KK","verificationNotes":null}}	2026-06-30 06:39:03.52
LOG_f6b976a8-a895-4e88-a065-4fbde43f2a2c	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	eab0b718-348c-4e74-9c87-8f877e045ec9	Document "muhammad ardhani akta lahir.pdf" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"muhammad ardhani akta lahir.pdf","type":"AKTA","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"muhammad ardhani akta lahir.pdf","type":"AKTA","verificationNotes":null}}	2026-06-30 06:39:04.598
LOG_a0502806-701d-465e-88ab-394f296ec536	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	2fcd96af-96a5-4af4-9812-dfd93d2d2acc	Document "byantara akta lahir.jpeg" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"byantara akta lahir.jpeg","type":"AKTA","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"byantara akta lahir.jpeg","type":"AKTA","verificationNotes":null}}	2026-06-30 06:39:10.779
LOG_a5e01597-022e-4a11-bee3-42e1a9295f83	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	9f0b768e-7e61-4e5e-a044-adde806c48ed	Document "byantara kk.pdf" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"byantara kk.pdf","type":"KK","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"byantara kk.pdf","type":"KK","verificationNotes":null}}	2026-06-30 06:39:11.616
LOG_13851f7c-7bc4-4d31-9db8-4705a20b2950	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	02b99257-015a-4b21-a0bd-602838ae9f01	Document "BYANTARA SKL.pdf" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"BYANTARA SKL.pdf","type":"SKL","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"BYANTARA SKL.pdf","type":"SKL","verificationNotes":null}}	2026-06-30 06:39:12.297
LOG_fca0c16e-073e-4b70-8b40-bca6e721da4f	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	90c21cc2-9a53-4600-abfd-8c32486e57bb	Document "dzaki arhab kk.png.pdf" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"dzaki arhab kk.png.pdf","type":"KK","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"dzaki arhab kk.png.pdf","type":"KK","verificationNotes":null}}	2026-06-30 06:39:23.766
LOG_23deb62b-4cf1-474d-973f-2ada324947d4	admin-user-default-id	DOCUMENT_VERIFIED	DOKUMEN	Document	1a84d2f0-a642-4db4-b4a0-e46a22f8928c	Document "dzaki arhab akta lahir.png.pdf" status changed to VERIFIED. Changes: {"before":{"status":"UPLOADED","originalName":"dzaki arhab akta lahir.png.pdf","type":"AKTA","verificationNotes":null},"after":{"status":"VERIFIED","originalName":"dzaki arhab akta lahir.png.pdf","type":"AKTA","verificationNotes":null}}	2026-06-30 06:39:24.712
LOG_1782801574736_v6yo2u	admin-user-default-id	EXPORT_EXCEL	SISWA	Student	\N	Exported 10 student records to Excel	2026-06-30 06:39:34.737
LOG_1782801590369_a653sc	admin-user-default-id	EXPORT_CSV	SISWA	Student	\N	Exported 10 student records to CSV	2026-06-30 06:39:50.37
LOG_1782801842728_85sfz8	admin-user-default-id	BACKUP_DELETE	BACKUP	Backup	arbal-backup-daily-2026-06-23T18-00-00-019Z.zip	Backup file deleted: arbal-backup-daily-2026-06-23T18-00-00-019Z.zip	2026-06-30 06:44:02.729
LOG_1782801860340_zvwu4v	admin-user-default-id	BACKUP_DOWNLOAD	BACKUP	Backup	arbal-backup-manual-2026-06-30T06-37-32-787Z.zip	Backup file downloaded: arbal-backup-manual-2026-06-30T06-37-32-787Z.zip	2026-06-30 06:44:20.34
LOG_9fdebfc1-0034-4423-bf70-7ef20bffb4c2	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-06-30 08:15:40.437
LOG_1782842401756_jleukz	SYSTEM	BACKUP_CREATE	BACKUP	Backup	arbal-backup-daily-2026-06-30T18-00-00-069Z.zip	Backup created: arbal-backup-daily-2026-06-30T18-00-00-069Z.zip (15.67 MB). Contains 10 students and 25 documents.	2026-06-30 18:00:01.759
LOG_1782849601294_j75vw2	SYSTEM	BACKUP_CREATE	BACKUP	Backup	arbal-backup-monthly-2026-06-30T20-00-00-039Z.zip	Backup created: arbal-backup-monthly-2026-06-30T20-00-00-039Z.zip (15.67 MB). Contains 0 students and 0 documents.	2026-06-30 20:00:01.295
LOG_279e082c-4185-4c3b-a028-4edd5a35d321	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-07-02 02:13:34.84
LOG_4b4a9226-fcee-4378-8ece-4c1f00f782c0	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-07-02 02:14:33.65
LOG_6b382cc0-447b-4d20-82bd-9a9aa37c8493	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-07-02 02:21:05.819
LOG_1782958953967_2ql34z	admin-user-default-id	BACKUP_DOWNLOAD	BACKUP	Backup	arbal-backup-monthly-2026-06-30T20-00-00-039Z.zip	Backup file downloaded: arbal-backup-monthly-2026-06-30T20-00-00-039Z.zip	2026-07-02 02:22:33.968
LOG_704c1c77-2e5e-4d71-82a1-2028afeb7db9	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-07-02 02:52:37.544
LOG_446ecb39-4b96-46a6-8021-6f0f22e719cd	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-07-02 09:28:40.236
LOG_afaae416-5d42-4ffa-a174-bd69aff79b08	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-07-03 01:12:04.097
LOG_34a0b71b-2785-4fed-819d-a6fae742f8a8	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-07-03 01:14:49.693
LOG_1783041475291_0lcvnj	admin-user-default-id	BACKUP_DOWNLOAD	BACKUP	Backup	arbal-backup-daily-2026-07-02T18-00-00-026Z.zip	Backup file downloaded: arbal-backup-daily-2026-07-02T18-00-00-026Z.zip	2026-07-03 01:17:55.291
LOG_9da2eb31-e854-4277-95b1-2ea5c628ff9c	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-07-03 01:35:04.274
LOG_450199d5-7551-4cc0-82b9-dcf7987cedab	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-07-03 01:51:46.003
LOG_ae5b0e27-3181-41cd-91d4-1db15c84bd8a	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-07-03 02:07:36.899
LOG_03d856af-b2e3-421c-bc18-9d40e3bc9505	admin-user-default-id	CREATE_STUDENT	SISWA	Student	TM-2026-0013	Created student "ADAM PUTRA ARDIANTO" (NIS Sekolah: NIS-2026-0013, PPDB: PPDB-2026-0013)	2026-07-03 02:07:43.434
LOG_872206bf-2f9a-417d-9f50-5005aa15c6b2	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	88200f44-7748-4ee8-9922-6100ecd3865d	Uploaded document "ADAM PUTRA akta lahir.pdf" (AKTA v1) for student TM-2026-0013	2026-07-03 02:07:43.646
LOG_739b0623-c365-4892-9191-a1528a89d42d	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	daf19f6d-a3dc-4826-83ef-793717159d46	Uploaded document "ADAM PUTRA kk.pdf" (KK v1) for student TM-2026-0013	2026-07-03 02:07:43.784
LOG_02fe2654-5115-4e34-86f0-ca4ea08f056a	admin-user-default-id	DOCUMENT_UPLOAD_FAILED	DOKUMEN	Document	\N	Gagal mengunggah dokumen tipe SKL untuk siswa TM-2026-0013. Rincian: Traversal path detected	2026-07-03 02:07:43.883
LOG_310d1cf2-2b35-4bc0-a6f1-0db07bc568b2	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0013	Updated student "ADAM PUTRA ARDIANTO". Changes: {"before":{},"after":{}}	2026-07-03 02:08:01.62
LOG_6cf59199-b0c5-46b7-af95-d5ad9263d8a4	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	bb63b5c8-ecc7-446a-bf3e-ee225fb6632f	Uploaded document "ADAM PUTRA skl.png.pdf" (SKL v1) for student TM-2026-0013	2026-07-03 02:08:01.739
LOG_ad352633-ce26-461c-8455-94d095c6f326	admin-user-default-id	CREATE_STUDENT	SISWA	Student	TM-2026-0014	Created student "MUHAMMAD ARDHANI" (NIS Sekolah: NIS-2026-0014, PPDB: PPDB-2026-0014)	2026-07-03 02:17:48.486
LOG_ab86d546-720d-4c1a-8b62-0b16e1ccd31b	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	41ef56f8-c676-4a42-ba8e-5235441880af	Uploaded document "muhammad ardhani kk.pdf" (KK v1) for student TM-2026-0014	2026-07-03 02:17:48.661
LOG_93eccdba-89f0-4b15-9334-51d71a37eca7	admin-user-default-id	DOCUMENT_UPLOAD_SUCCESS	DOKUMEN	Document	fbe76d71-422c-4eaa-9e62-3fcf4bb6fdbb	Uploaded document "muhammad ardhani akta lahir.pdf" (AKTA v1) for student TM-2026-0014	2026-07-03 02:17:48.751
LOG_8fb23e30-38b3-46ed-b514-3e50eb3bb3a5	admin-user-default-id	UPDATE_STUDENT	SISWA	Student	TM-2026-0013	Updated student "ADAM PUTRA ARDIANTO". Changes: {"before":{},"after":{}}	2026-07-03 02:18:24.414
LOG_d168dae4-3a06-4dcf-808c-9e0499b9a2a6	admin-user-default-id	LOGIN_SUCCESS	AUTENTIKASI	User	admin-user-default-id	User "Admin Mustaqbal" logged in successfully	2026-07-03 02:18:46.105
\.


--
-- Data for Name: Class; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Class" (id, name, "isActive", description, "createdAt", "updatedAt") FROM stdin;
bc16d37e-cf9b-45fb-a682-5571f35821fb	Kelas X	t	Kelas X PKBM Mustaqbal	2026-06-29 08:45:36.134	2026-06-29 08:45:36.134
45f1e471-797c-4584-bf07-96e264d24d44	Kelas XI	t	Kelas XI PKBM Mustaqbal	2026-06-29 08:45:36.134	2026-06-29 08:45:36.134
a59f0515-0b99-4957-adb6-3fbb4f016b8b	Kelas XII	t	Kelas XII PKBM Mustaqbal	2026-06-29 08:45:36.134	2026-06-29 08:45:36.134
14c6e014-8c4d-4a62-9480-6c5981452c84	Alumni	t	Siswa yang telah menyelesaikan studi	2026-06-29 08:45:36.134	2026-06-29 08:45:36.134
c89ce30d-8b39-40c6-83f4-eef34944a153	Paket A	f	Program Kesetaraan Paket A (SD)	2026-06-29 08:45:36.134	2026-06-29 08:51:53.14
a2604778-5920-4c99-ba28-34c6802e93e2	Paket C	f	Program Kesetaraan Paket C (SMA)	2026-06-29 08:45:36.134	2026-06-29 08:52:10.894
c433a77d-5546-46d1-9e72-8c6c2873b2bf	Paket B	f	Program Kesetaraan Paket B (SMP)	2026-06-29 08:45:36.134	2026-06-29 08:52:18.029
6ebe8243-2f8f-49e7-b81b-887f0bbb23c2	X	f	\N	2026-06-29 08:50:58.827	2026-06-29 08:56:40.704
\.


--
-- Data for Name: Document; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Document" (id, "studentId", "uploadedById", type, "originalName", "storedName", "mimeType", "sizeBytes", status, "storagePath", "ocrResult", "ocrStatus", "ocrRunAt", "uploadedAt", version, "isLatest", "previousId", "deletedAt", "deletedBy", "fileData", "ocrConfidence", "reviewStatus", verification_notes, verified_by, verified_at) FROM stdin;
88200f44-7748-4ee8-9922-6100ecd3865d	TM-2026-0013	admin-user-default-id	AKTA	ADAM PUTRA akta lahir.pdf	88200f44-7748-4ee8-9922-6100ecd3865d.pdf	application/pdf	813291	UPLOADED	88200f44-7748-4ee8-9922-6100ecd3865d.pdf	\N	PENDING	\N	2026-07-03 02:07:43.637	1	t	\N	\N	\N	\N	\N	PENDING	\N	\N	\N
daf19f6d-a3dc-4826-83ef-793717159d46	TM-2026-0013	admin-user-default-id	KK	ADAM PUTRA kk.pdf	daf19f6d-a3dc-4826-83ef-793717159d46.pdf	application/pdf	819265	UPLOADED	daf19f6d-a3dc-4826-83ef-793717159d46.pdf	\N	PENDING	\N	2026-07-03 02:07:43.779	1	t	\N	\N	\N	\N	\N	PENDING	\N	\N	\N
bb63b5c8-ecc7-446a-bf3e-ee225fb6632f	TM-2026-0013	admin-user-default-id	SKL	ADAM PUTRA skl.png.pdf	bb63b5c8-ecc7-446a-bf3e-ee225fb6632f.pdf	application/pdf	573226	UPLOADED	bb63b5c8-ecc7-446a-bf3e-ee225fb6632f.pdf	\N	PENDING	\N	2026-07-03 02:08:01.735	1	t	\N	\N	\N	\N	\N	PENDING	\N	\N	\N
41ef56f8-c676-4a42-ba8e-5235441880af	TM-2026-0014	admin-user-default-id	KK	muhammad ardhani kk.pdf	41ef56f8-c676-4a42-ba8e-5235441880af.pdf	application/pdf	661014	UPLOADED	41ef56f8-c676-4a42-ba8e-5235441880af.pdf	\N	PENDING	\N	2026-07-03 02:17:48.657	1	t	\N	\N	\N	\N	\N	PENDING	\N	\N	\N
fbe76d71-422c-4eaa-9e62-3fcf4bb6fdbb	TM-2026-0014	admin-user-default-id	AKTA	muhammad ardhani akta lahir.pdf	fbe76d71-422c-4eaa-9e62-3fcf4bb6fdbb.pdf	application/pdf	683003	UPLOADED	fbe76d71-422c-4eaa-9e62-3fcf4bb6fdbb.pdf	\N	PENDING	\N	2026-07-03 02:17:48.749	1	t	\N	\N	\N	\N	\N	PENDING	\N	\N	\N
\.


--
-- Data for Name: DocumentRequirement; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."DocumentRequirement" (id, type, "isRequired", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Guardian; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Guardian" (id, "studentId", "namaAyah", "pekerjaanAyah", "ktpAyah", "teleponAyah", "namaIbu", "pekerjaanIbu", "ktpIbu", "teleponIbu", "teleponOrangTua", "alamatOrangTua", "deletedAt", "deletedBy", "alamatWali", "hubunganWali", "namaWali", "pendidikanAyah", "pendidikanIbu", "statusAyah", "statusIbu", "teleponWali") FROM stdin;
f0fee397-b4c8-4333-ab4e-855ef9cdc7f4	TM-2026-0014	SURYADI	Karyawan Swasta	3216191102760005	085882474848	SUWARNI	Ibu Rumah Tangga	3216194711760008	085710535882	085710535882	\N	\N	\N	\N	\N	\N	SMA	SMA	MASIH_HIDUP	MASIH_HIDUP	\N
fe3ee76b-ed5a-4234-9291-75254a41cd84	TM-2026-0013	SUMARDI	\N	\N	\N	SUMARYATI	Ibu Rumah Tangga	3216194603850006	085218479218	085218479218	\N	\N	\N	\N	\N	\N	SMA	SMA	MENINGGAL	MASIH_HIDUP	\N
\.


--
-- Data for Name: RefreshToken; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."RefreshToken" (id, "userId", "tokenHash", family, "expiresAt", "revokedAt", "createdAt") FROM stdin;
54b40b27-e449-4e7e-a8cd-9286707ce56a	admin-user-default-id	ea93dc59e67fe6e2f028c41d9d74d94216e167b30c9007086212e54eddd827dc	84d3ed52-9e46-4c50-a490-bf281a5b70d1	2026-07-01 00:08:12.241	2026-06-23 09:24:45.059	2026-06-23 00:08:12.242
f5c16c9d-8f14-438c-8d64-a96be49edd50	admin-user-default-id	208fc1a6da675d8104de5d2c94fbfce0cc6b32a7bdebe02edb439a064edc7ff9	0468818f-9b9f-4e5a-b42e-36fd6f0701e2	2026-07-01 09:23:41.256	2026-06-23 09:24:45.059	2026-06-23 09:23:41.257
da43e04c-da06-4a3c-95c9-ae2c747ffa5e	admin-user-default-id	6b6d099fd3e2b8151d884cfea40da6ccc2ba0bc6adc706d3e55e9b2bf90e02b1	d09e65e7-c01e-4ea8-b43e-2aadde7d186b	2026-07-01 09:26:16.714	\N	2026-06-23 09:26:16.714
0eed3b95-2c31-4385-843b-2e9c2b149dee	admin-user-default-id	59b7c0f079ccc8aea1ac9cfea9dd145f0a0545cff7a2d85d568ff17f25dc7256	c4a7eab9-23ba-4be0-9bee-fe99d2747973	2026-07-01 09:42:19.052	\N	2026-06-23 09:42:19.052
6beb4862-4359-4bbd-a4a3-4e80a4fa5b8d	admin-user-default-id	3c281539b5dac330d851c2289e888fcf55f7173480af7bf0be81f0d9cdb97c4c	df062639-ce39-4715-8a48-500e7de7c261	2026-07-01 10:25:37.756	\N	2026-06-23 10:25:37.757
141409ca-bec6-4f8b-b86c-c1195c584eb1	admin-user-default-id	32a02315650ce9162ede9f0ff8451617ff80107f0f9bb8d404fc8a5a46ca0bd3	be1696f1-7e83-493d-87f9-d565ee6f6947	2026-07-01 22:26:03.482	\N	2026-06-23 22:26:03.482
3e293016-0fd9-4fa2-b1ff-e582c453c4f9	admin-user-default-id	6acb88be0b6fed924cff99a7be93a045a4cc9690c03aa659872f1314562f5313	4dcca4ff-b0a9-49c5-a9b0-8befe3a4751b	2026-07-01 22:50:48.855	\N	2026-06-23 22:50:48.855
f3f21070-919e-4ac8-ad31-fff4d77ff0d4	admin-user-default-id	34281fc89e9b5a8c61b0b4882ba918da09945f1a222334abade73ad1f98372f2	851038d7-b3de-4190-8e1b-954a6589dfd3	2026-07-02 02:05:36.375	\N	2026-06-24 02:05:36.376
2e35ae5d-3c9c-4f56-bfb7-017db4b2575c	admin-user-default-id	af387e5a9d6cb3817e8e6617cae61199b1d6f193329dbd909390af2e87320d91	580c2f0b-c289-4acd-8bc3-3cdfe593f8a6	2026-07-02 03:28:55.547	\N	2026-06-24 03:28:55.555
b232f400-c981-4b37-a0dd-38c589069657	admin-user-default-id	39b0db300f3c3a976c72a88be08423c827de11db48fd45821c2a04e6ea88f072	0f3e253e-de86-4039-ab87-cba275b5b00f	2026-07-07 07:28:20.864	\N	2026-06-29 07:28:20.871
ed4164ad-7f0f-47ef-8b1b-402e50fcbbae	admin-user-default-id	98be6735bfb2904b6c648f415f8b3d6754f189dc03bd099c99c47e3f6f928224	3671a2e1-f494-4208-8016-934aa3bbbc7c	2026-07-07 07:35:49.004	\N	2026-06-29 07:35:49.005
3d54da9a-082a-4478-8a69-f8dd5f15434e	admin-user-default-id	0ec3caf8313f0d3baeefd176a49cc5cc677c39e2c0735989cec47ccb604b126e	242e3359-133d-432d-ae15-478801289a5b	2026-07-07 07:51:10.759	\N	2026-06-29 07:51:10.759
2e9c397b-6125-400d-9112-1fec3e415d2c	admin-user-default-id	a98ea2a95e2b2d4bf5453b94bc241d8f485f9c2c08aee3db3d3475568bbb9f48	88b2c52a-0359-480a-a312-8ae7dc90bf7f	2026-07-07 08:12:34.767	\N	2026-06-29 08:12:34.767
e0c16f6f-74f0-4c87-96d4-b88677308299	admin-user-default-id	d711b21fcf82f7f5b10ccaa75ccb263077ac34771fbfb48e38abf601ebcb27a8	2ff26086-8db2-4aa9-a4c5-f186c57b508d	2026-07-07 08:40:34.857	\N	2026-06-29 08:40:34.863
f05a3d3e-1500-4dde-b730-155e2e0c3df3	admin-user-default-id	f35875a2113dca99ffd2f9e995552136ee964cff508b6ae59e772273b4d0e36f	ee04c756-b233-40e1-80a5-eaa0a9e4c9d3	2026-07-07 08:50:07.082	\N	2026-06-29 08:50:07.084
117db773-f19e-4ceb-bde0-ee415102d376	admin-user-default-id	3de8a5d66aa33896c2b8af62ecc1306ecd7e941d437a02d041f415d681dfa387	07953f1c-4acd-4801-9fea-5121dc3b8291	2026-07-07 08:58:45.338	\N	2026-06-29 08:58:45.338
8cd43d57-ae53-4a0d-8a75-445d5d801740	admin-user-default-id	40a3ec32bda4ed1584a8ef4c3a17f21094991ddf4984592d0300046fb29fd10c	c2b98fb8-49d6-4b70-bea2-a27e34606b0e	2026-07-07 09:20:46.891	\N	2026-06-29 09:20:46.903
09683055-e508-4df2-bd4c-810f2e94dbcb	admin-user-default-id	180bdbd3aeddd6c96c11cbbff34ad72a30d01ee32d5609b5211f0d153c004e0a	8535a2b9-992f-4cad-a7a6-8f045b90c1bb	2026-07-07 09:42:07.474	\N	2026-06-29 09:42:07.474
ba82b10b-1a55-4e32-a040-2ac98606214f	admin-user-default-id	41acccea49001e70b756bc1f0ddda42fe1a74957e74de37c34b0d162bc48302e	a4b20930-119c-4aba-85a4-000b736a6d2e	2026-07-08 01:01:18.925	\N	2026-06-30 01:01:18.932
e167ff93-3c42-4d19-9ce8-b03180dac630	admin-user-default-id	d322023a9a14afa3b754c1a368407f59df929b7752758d13a895ecf583ce1004	a01d17df-3354-4dcc-88b0-aee9beea4163	2026-07-08 01:23:03.016	\N	2026-06-30 01:23:03.016
5b5de1c5-6cb3-47ca-97c5-a7fc11f77615	admin-user-default-id	1fedbf20a82c4e935f64fa3e03d87a4f8c6e1cd5d3cc1d679f1d13ffad1acc8f	6e88f8df-e0f4-4ee5-8f15-477756d5fff8	2026-07-08 01:41:08.79	\N	2026-06-30 01:41:08.794
40824d63-e005-46ac-a279-a4734010eaed	admin-user-default-id	410e5978b0c0771c5ac100344784c57cb098e461a400f55432ee1d28ac59bf2f	d53fae98-ff80-4166-9351-a45fe5b0cf63	2026-07-08 01:56:31.111	\N	2026-06-30 01:56:31.111
55ba1d0d-cae4-4979-9eab-6cae8f31d941	admin-user-default-id	b5dfa8da00fe5870fa28584a8f8da629522d16912b11fd0c7616e58797389cbd	2c765f7c-33df-407a-8e59-1e7bade3be8c	2026-07-08 02:18:14.509	\N	2026-06-30 02:18:14.509
b98188be-0edd-480c-b69b-76d8a7166b70	admin-user-default-id	c857b0c9f309916167a73e642c5022f8b2dd8e7459f5d2eea9b908cfec3d58ff	3f4af8e3-8675-4e68-9315-698083b067e7	2026-07-08 02:42:47.833	\N	2026-06-30 02:42:47.833
de8e836d-6898-4ab5-83bf-f424f9e0a946	admin-user-default-id	d7baacfa2c50c739a0924bf2a90bfe19af9297015cf3c15c0a02bd2740fda8bc	526fdd48-444f-412f-9833-0f1b63b055cf	2026-07-08 03:13:02.089	\N	2026-06-30 03:13:02.09
79299f12-d5f9-489d-8bd0-cbe0fa5cb8a5	admin-user-default-id	26d85a149c0d78becd61abea3a9d7da72f32a1438d29b7127380d8c559193804	24939003-62ad-4738-a07f-ccb815549e94	2026-07-08 03:28:26.129	\N	2026-06-30 03:28:26.129
aa0c89d2-54b1-455a-b727-ca1d5a334f53	admin-user-default-id	765d8ec07cafd5dc2d42e1f1da9dcddcf5fee6c34bf990dd32b373a80f1d4ee2	3c7740a7-2228-40f8-a626-2cd218a47414	2026-07-08 03:54:31.691	\N	2026-06-30 03:54:31.691
0b9cb501-db30-4185-bb68-b76b32b9c0e2	admin-user-default-id	4a305602d3bab352e9b0244a675120f411ddbb5f7e27c40d4b1283123b3c7715	c4018e54-cf3a-43d9-9c81-1151f477a613	2026-07-08 04:27:49.587	\N	2026-06-30 04:27:49.587
e66c8b6b-c63e-4a0d-acf0-73ad7d4ee744	admin-user-default-id	d9ea027fbdc19e52d333cac0d48b01493bb65c98f054fdd72055e7fd9a956a04	4fd8ae5f-3e3f-44a8-8d94-cc39e2b16228	2026-07-08 04:43:00.882	\N	2026-06-30 04:43:00.883
a4279730-48eb-4e85-8f40-771c5f4cf0a7	admin-user-default-id	70d7991cd5bc04b44c313d8e59e1f2f791a86ab2e56d0bb1dbfb787347846fcf	96e8c89c-2a01-465f-a7ec-f7f98cbcd024	2026-07-08 04:58:10.594	\N	2026-06-30 04:58:10.595
3774748f-07dc-4d26-9502-42802a8b7d4b	admin-user-default-id	3123d79de7eaed93167aa55a7791f80c745cf82d9921f53df1896c1b9282b4b8	072348a8-cb3d-4d31-aaf8-ca39c911e299	2026-07-08 06:20:40.004	\N	2026-06-30 06:20:40.004
d071cc10-a740-455e-b2bf-90618da5cca3	admin-user-default-id	6ff898e666cf1486660e87ad8ff7d2ded7566b7806778eef98a0a163be6f602e	3488386c-42df-4e0b-8456-dd649b089b37	2026-07-08 06:37:19.223	\N	2026-06-30 06:37:19.223
60b2245a-87e7-4056-bd00-af755c2c12c0	admin-user-default-id	adf19d5e172da1e0c7d9fbc8f98d85d2d7e7b6998c4168dd46023fcd1211dae4	4735524c-4b4b-48ed-a470-58ac99f6063b	2026-07-08 08:15:40.432	\N	2026-06-30 08:15:40.433
623af660-11c9-444e-a94c-08de30ec9599	admin-user-default-id	b4f64133255863ab92aa6e796e9bfaf3cfa3d1ef0e8da4646f64e929533abc32	134e23cd-d7c7-42c3-be24-16bfe1fd98db	2026-07-10 02:13:34.82	\N	2026-07-02 02:13:34.829
097fdc8d-0c09-47c7-ac6a-00ca3933790c	admin-user-default-id	309a3daab78a095261e56f8f734b6f8d38f035ff22a27654866ed55529a0c090	75fc2f86-20aa-41b3-9fc1-75cc37e242c0	2026-07-10 02:14:33.647	\N	2026-07-02 02:14:33.647
2865bfc0-66f9-4fca-bccc-14e86fb6206d	admin-user-default-id	ae05ce17529db792c56e17cfc9a848fb283feb07521a678935ee5fe9f3a61041	cee4fecd-f83e-4924-983a-fc9308a833d7	2026-07-10 02:21:05.778	2026-07-02 02:21:59.416	2026-07-02 02:21:05.779
179dd53d-5134-4f9d-8e25-0c42cfa45e8b	admin-user-default-id	65ef6b896893efb902ccb79c7c3a904a54708eeb26b8de0306c5550d61973f06	cee4fecd-f83e-4924-983a-fc9308a833d7	2026-07-10 02:21:59.467	\N	2026-07-02 02:21:59.468
6eacae88-0958-4bc5-ab65-5b7c1bf6c184	admin-user-default-id	9852ac9413144eb20dda92df3675c07b8cd5d9b09833226bd1ee389feac86800	c7dfc3d4-c02a-4915-96f8-1b37a0a057ca	2026-07-10 02:52:37.54	\N	2026-07-02 02:52:37.54
1a7a9544-6a4e-47eb-ac20-6c76d7780c05	admin-user-default-id	a8c6db3661c81457e19e4eed09a8a9bd7525eedd6a2cc959fc88ac8d662dee4c	d3e06d12-2659-4f2d-98bf-6e3a19caec14	2026-07-10 09:28:40.231	\N	2026-07-02 09:28:40.231
3349c59b-ddd5-4773-aca4-1771f0efb223	admin-user-default-id	4066942fb6029974880a1ab915fcdd5612bb1726955090c344de15ec59d68091	50ca680e-8db7-41a9-a9df-378779d65900	2026-07-11 01:12:04.089	\N	2026-07-03 01:12:04.091
3fdcca22-bd20-427a-8c41-6b590a65f4dc	admin-user-default-id	c4855f0c221636e1866dfbad3ff9dfa288f56235b7006b8c7f92509c71aa5f4e	2fb3d41d-688e-41fc-b30b-ce17389cf43a	2026-07-11 01:14:49.688	\N	2026-07-03 01:14:49.689
b071815e-2ead-4a81-83a8-8e8a87f318aa	admin-user-default-id	ce9c07a6f6a87ddf02b49612a7811d85a0aa90a9275e802569a12ffc489d906c	2d0ad294-5cb4-47a8-a8c2-ccb24eeac8ac	2026-07-11 01:35:04.27	\N	2026-07-03 01:35:04.27
4d365bb9-94c3-4d29-b74d-f2bfb790e873	admin-user-default-id	d0243b11d23def5e9764e4ddf7308bcc536f41178b79accc7c57256575f7f245	abd339fa-55bc-4cac-b3f0-8cb0c3d5dd0f	2026-07-11 01:51:45.999	\N	2026-07-03 01:51:45.999
99456333-1801-459a-ab6e-37483411f5c8	admin-user-default-id	f581c4e4024612e414f123768d70094590d0923c49fb5d88a2555ea0c615fc8e	1cdcf23c-fd83-4af6-b412-77223203ac6b	2026-07-11 02:07:36.894	\N	2026-07-03 02:07:36.895
342e7723-eb75-4992-87e9-7340bd6bc2cf	admin-user-default-id	d1132edf4d249161b121f7c6a8d4951dae894073cac725a21184480281ec5ba8	5731f208-fcff-4fda-bf1a-b4780dabac38	2026-07-11 02:18:46.101	\N	2026-07-03 02:18:46.101
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Role" (id, name) FROM stdin;
role-super_admin	SUPER_ADMIN
role-guru	GURU
role-kepala-sekolah	KEPALA_SEKOLAH
role-tata-usaha	TATA_USAHA
\.


--
-- Data for Name: Sequence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Sequence" (id, value) FROM stdin;
PPDB_2026	14
NIS_2026	14
TM_2026	14
PPDB_2025	4
NIS_2025	4
TM_2025	4
\.


--
-- Data for Name: Student; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Student" (id, "nisSekolah", nisn, "registrationNumber", angkatan, nama, kelas, jurusan, email, telepon, alamat, "tanggalLahir", status, catatan, "createdAt", "updatedAt", "deletedAt", "deletedBy", "graduationYear", "certificateNumber", "academicYearId", "anakKe", "asalSekolah", "jenisKelamin", "jumlahSaudara", "namaPanggilan", nik, "nomorKK", "photoUrl", "tahunLulusSebelumnya", "tempatLahir") FROM stdin;
TM-2026-0014	NIS-2026-0014	0113305236	PPDB-2026-0014	1	MUHAMMAD ARDHANI	Kelas X	-		081333847554	VILLA MUTIARA CIKARANG BLOK H-8 NO.39,RT.025/RW.010, DESA CIANTRA, KECAMATAN CIKARANG SELATAN, KABUPATEN BEKASI, JAWA BARAT	2011-02-15 00:00:00	PENDAFTAR	\N	2026-07-03 02:17:48.47	2026-07-03 02:17:48.467	\N	\N	\N	\N	a384c374-3971-4ff5-b018-aad809da3334	2	SMP IT INSAN TAQWA	LAKI_LAKI	1	ARDHANI	3216191502110008	3216191610120002	\N	2026	BEKASI
TM-2026-0013	NIS-2026-0013	0103059367	PPDB-2026-0013	2026	ADAM PUTRA ARDIANTO	Kelas X	-		089601274840	PERUM GRAHA CIANTRA INDAH BLOK D-1 NO.26, RT.004/RW.011, DESA CIANTRA, KECAMATAN CIKARANG SELATAN, KABUPATEN BEKASI, JAWA BARAT. (17530)	2010-07-08 00:00:00	PENDAFTAR	\N	2026-07-03 02:07:43.41	2026-07-03 02:18:24.397	\N	\N	\N	\N	a384c374-3971-4ff5-b018-aad809da3334	2	SMPI AN-NISA	LAKI_LAKI	3	ADAM 	3216190807100003	3216190404230009	\N	2026	KOTA BEKASI
\.


--
-- Data for Name: StudentNote; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StudentNote" (id, "studentId", "authorId", content, visibility, "isPinned", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: StudentStatusHistory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StudentStatusHistory" (id, "studentId", status, "changedById", reason, "createdAt") FROM stdin;
7b8e4076-2b9f-4238-872a-14d10ef93a8e	TM-2026-0013	PENDAFTAR	admin-user-default-id	Pendaftaran siswa baru	2026-07-03 02:07:43.423
42049bdd-dd42-46e0-be53-a5e6df8eee35	TM-2026-0014	PENDAFTAR	admin-user-default-id	Pendaftaran siswa baru	2026-07-03 02:17:48.481
\.


--
-- Data for Name: StudentTimeline; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."StudentTimeline" (id, "studentId", event, details, "createdAt") FROM stdin;
f0cef9ec-042f-4acf-9736-7d11cec5f77e	TM-2026-0013	Pendaftaran	Siswa baru didaftarkan dengan status awal PENDAFTAR oleh Admin Mustaqbal	2026-07-03 02:07:43.429
1f2c60cc-6f93-44e6-83b0-96176d60181d	TM-2026-0013	Pembaruan Data	Biodata siswa diperbarui oleh Admin Mustaqbal	2026-07-03 02:08:01.617
50f75fa7-2443-4db3-90f3-283ef0346487	TM-2026-0014	Pendaftaran	Siswa baru didaftarkan dengan status awal PENDAFTAR oleh Admin Mustaqbal	2026-07-03 02:17:48.484
5a85fc80-2074-4c86-811c-d50f10fdd284	TM-2026-0013	Pembaruan Data	Biodata siswa diperbarui oleh Admin Mustaqbal	2026-07-03 02:18:24.411
\.


--
-- Data for Name: SystemSetting; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SystemSetting" (id, key, value, "updatedAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."User" (id, name, email, "passwordHash", "isActive", "failedLoginAttempts", "lockedUntil", "createdAt", "updatedAt", "roleId", "deletedAt", "deletedBy") FROM stdin;
b8839858-935d-467f-8821-d9aec1d3eb77	Guru	guru@mustaqbal.sch.id	$2b$12$cgb/F4O710BFf7WkRj.ToOb9LsnJZ.AVcd/4gEueE5xvZbrblLe4y	t	0	\N	2026-06-23 09:30:12.976	2026-06-23 09:30:12.976	role-guru	\N	\N
SYSTEM	SYSTEM	system@arbal.local	SYSTEM_LOCKED_ACCOUNT	f	0	\N	2026-06-29 08:45:36.067	2026-06-29 08:45:36.067	role-super_admin	\N	\N
admin-user-default-id	Admin Mustaqbal	admin@mustaqbal.sch.id	$2b$12$5DtTj/Ym49ZIydGk2LU.KuEqvE/Q/4pnSK2w2K0e3zavqBjXwrsge	t	0	\N	2026-06-23 07:08:08.979	2026-06-30 06:37:19.218	role-super_admin	\N	\N
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
d7ea0438-4367-47a8-aa52-3da6c75acd53	f880b0aa03aa5b37f95688e8b4db5e21a531bd2f04313673ce7cc52a6ddd7100	2026-06-23 06:40:09.991862+07	20260621024906_init	\N	\N	2026-06-23 06:40:09.855132+07	1
fbbf4634-f832-463d-b5ca-b7f7d537000c	50fb2201a251a1bc9f9c02eeaf9e7c6f386ae1811027b16391498be38894f1d5	2026-06-23 06:40:10.045749+07	20260621025248_sprint2_core_models	\N	\N	2026-06-23 06:40:09.993225+07	1
072d2c62-00c2-4d2e-aa78-8103d00c9259	4673b107f73fde471dc9948e368dfa377bae4ccfb999010275e1a0c67229d371	2026-06-23 06:40:10.050611+07	20260621025731_sprint3_bytea_storage	\N	\N	2026-06-23 06:40:10.046908+07	1
9647a893-1c2f-45e8-939f-e99a0881c375	c9ad57cfdd3dfbcce2601d4578c23c9c3195e4945e026ed7ba6ae412d06d3f57	2026-06-23 06:40:10.057385+07	20260621025818_sprint3_ocr_fields	\N	\N	2026-06-23 06:40:10.051629+07	1
e4194eed-8296-4285-b674-4778cf9ebc86	778b2d4038380c775c19b2b654f0282d6932b8b161ba61f36578b9f903bbc80f	2026-06-23 06:40:10.106804+07	20260621093725_v1_stable_schema	\N	\N	2026-06-23 06:40:10.058568+07	1
599527cc-b0f9-4bb6-ba45-fa5df97f1eee	368222a561956aacfe6d37ed23ccbb78a5424a073d64d711725c73c34e2af8f9	2026-06-23 06:57:09.116299+07	20260623000000_add_document_verification_fields	\N	\N	2026-06-23 06:57:09.105168+07	1
95c97d5d-4414-432e-9b63-29fecbc6acac	5dc0636b3256eaf7d90939c35c38fb572a8a7ef3ac35d009ba9870b956d1ff30	2026-06-29 15:45:33.700839+07	20260629082000_add_class_and_roles	\N	\N	2026-06-29 15:45:33.650004+07	1
\.


--
-- Name: AcademicYear AcademicYear_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."AcademicYear"
    ADD CONSTRAINT "AcademicYear_pkey" PRIMARY KEY (id);


--
-- Name: ActivityLog ActivityLog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_pkey" PRIMARY KEY (id, "createdAt");


--
-- Name: Class Class_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Class"
    ADD CONSTRAINT "Class_pkey" PRIMARY KEY (id);


--
-- Name: DocumentRequirement DocumentRequirement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."DocumentRequirement"
    ADD CONSTRAINT "DocumentRequirement_pkey" PRIMARY KEY (id);


--
-- Name: Document Document_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_pkey" PRIMARY KEY (id);


--
-- Name: Guardian Guardian_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Guardian"
    ADD CONSTRAINT "Guardian_pkey" PRIMARY KEY (id);


--
-- Name: RefreshToken RefreshToken_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: Sequence Sequence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Sequence"
    ADD CONSTRAINT "Sequence_pkey" PRIMARY KEY (id);


--
-- Name: StudentNote StudentNote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudentNote"
    ADD CONSTRAINT "StudentNote_pkey" PRIMARY KEY (id);


--
-- Name: StudentStatusHistory StudentStatusHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudentStatusHistory"
    ADD CONSTRAINT "StudentStatusHistory_pkey" PRIMARY KEY (id);


--
-- Name: StudentTimeline StudentTimeline_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudentTimeline"
    ADD CONSTRAINT "StudentTimeline_pkey" PRIMARY KEY (id);


--
-- Name: Student Student_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_pkey" PRIMARY KEY (id);


--
-- Name: SystemSetting SystemSetting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SystemSetting"
    ADD CONSTRAINT "SystemSetting_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AcademicYear_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "AcademicYear_name_key" ON public."AcademicYear" USING btree (name);


--
-- Name: ActivityLog_actorUserId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ActivityLog_actorUserId_idx" ON public."ActivityLog" USING btree ("actorUserId");


--
-- Name: ActivityLog_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ActivityLog_category_idx" ON public."ActivityLog" USING btree (category);


--
-- Name: ActivityLog_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ActivityLog_createdAt_idx" ON public."ActivityLog" USING btree ("createdAt" DESC);


--
-- Name: Class_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Class_name_key" ON public."Class" USING btree (name);


--
-- Name: DocumentRequirement_type_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "DocumentRequirement_type_key" ON public."DocumentRequirement" USING btree (type);


--
-- Name: Document_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Document_deletedAt_idx" ON public."Document" USING btree ("deletedAt");


--
-- Name: Document_ocrStatus_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Document_ocrStatus_idx" ON public."Document" USING btree ("ocrStatus");


--
-- Name: Document_previousId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Document_previousId_idx" ON public."Document" USING btree ("previousId");


--
-- Name: Document_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Document_status_idx" ON public."Document" USING btree (status);


--
-- Name: Document_studentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Document_studentId_idx" ON public."Document" USING btree ("studentId");


--
-- Name: Document_studentId_type_isLatest_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Document_studentId_type_isLatest_idx" ON public."Document" USING btree ("studentId", type, "isLatest");


--
-- Name: Document_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Document_type_idx" ON public."Document" USING btree (type);


--
-- Name: Document_uploadedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Document_uploadedById_idx" ON public."Document" USING btree ("uploadedById");


--
-- Name: Guardian_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Guardian_deletedAt_idx" ON public."Guardian" USING btree ("deletedAt");


--
-- Name: Guardian_studentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Guardian_studentId_key" ON public."Guardian" USING btree ("studentId");


--
-- Name: RefreshToken_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RefreshToken_expiresAt_idx" ON public."RefreshToken" USING btree ("expiresAt");


--
-- Name: RefreshToken_family_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RefreshToken_family_idx" ON public."RefreshToken" USING btree (family);


--
-- Name: RefreshToken_tokenHash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RefreshToken_tokenHash_idx" ON public."RefreshToken" USING btree ("tokenHash");


--
-- Name: RefreshToken_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "RefreshToken_userId_idx" ON public."RefreshToken" USING btree ("userId");


--
-- Name: Role_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);


--
-- Name: StudentNote_authorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StudentNote_authorId_idx" ON public."StudentNote" USING btree ("authorId");


--
-- Name: StudentNote_studentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StudentNote_studentId_idx" ON public."StudentNote" USING btree ("studentId");


--
-- Name: StudentStatusHistory_changedById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StudentStatusHistory_changedById_idx" ON public."StudentStatusHistory" USING btree ("changedById");


--
-- Name: StudentStatusHistory_studentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StudentStatusHistory_studentId_idx" ON public."StudentStatusHistory" USING btree ("studentId");


--
-- Name: StudentTimeline_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StudentTimeline_createdAt_idx" ON public."StudentTimeline" USING btree ("createdAt");


--
-- Name: StudentTimeline_studentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "StudentTimeline_studentId_idx" ON public."StudentTimeline" USING btree ("studentId");


--
-- Name: Student_academicYearId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Student_academicYearId_idx" ON public."Student" USING btree ("academicYearId");


--
-- Name: Student_angkatan_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Student_angkatan_idx" ON public."Student" USING btree (angkatan);


--
-- Name: Student_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Student_deletedAt_idx" ON public."Student" USING btree ("deletedAt");


--
-- Name: Student_jurusan_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Student_jurusan_idx" ON public."Student" USING btree (jurusan);


--
-- Name: Student_kelas_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Student_kelas_idx" ON public."Student" USING btree (kelas);


--
-- Name: Student_nama_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Student_nama_idx" ON public."Student" USING btree (nama);


--
-- Name: Student_nisSekolah_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Student_nisSekolah_key" ON public."Student" USING btree ("nisSekolah");


--
-- Name: Student_nisn_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Student_nisn_key" ON public."Student" USING btree (nisn);


--
-- Name: Student_registrationNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Student_registrationNumber_key" ON public."Student" USING btree ("registrationNumber");


--
-- Name: Student_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Student_status_idx" ON public."Student" USING btree (status);


--
-- Name: SystemSetting_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SystemSetting_key_key" ON public."SystemSetting" USING btree (key);


--
-- Name: User_deletedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_deletedAt_idx" ON public."User" USING btree ("deletedAt");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_roleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "User_roleId_idx" ON public."User" USING btree ("roleId");


--
-- Name: ActivityLog ActivityLog_actorUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ActivityLog"
    ADD CONSTRAINT "ActivityLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Document Document_previousId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_previousId_fkey" FOREIGN KEY ("previousId") REFERENCES public."Document"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Document Document_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Document Document_uploadedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Document"
    ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Guardian Guardian_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Guardian"
    ADD CONSTRAINT "Guardian_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RefreshToken RefreshToken_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StudentNote StudentNote_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudentNote"
    ADD CONSTRAINT "StudentNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StudentNote StudentNote_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudentNote"
    ADD CONSTRAINT "StudentNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StudentStatusHistory StudentStatusHistory_changedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudentStatusHistory"
    ADD CONSTRAINT "StudentStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: StudentStatusHistory StudentStatusHistory_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudentStatusHistory"
    ADD CONSTRAINT "StudentStatusHistory_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: StudentTimeline StudentTimeline_studentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."StudentTimeline"
    ADD CONSTRAINT "StudentTimeline_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES public."Student"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Student Student_academicYearId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Student"
    ADD CONSTRAINT "Student_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES public."AcademicYear"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: User User_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict Ckda5Wqn8QC70tFafi0MOLmOaN2icO6AFAu3vEb2J5EmsbRiPhPCcHucCwBehfQ

