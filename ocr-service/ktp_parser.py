"""
KTP (Kartu Tanda Penduduk) regex parser.

Extracts structured fields from raw OCR text of Indonesian ID cards.
Handles common OCR errors: O→0, I→1, S→5, B→8, missing colons, etc.
"""

import re
from typing import Optional


def parse_ktp(raw_text: str) -> dict:
    """
    Parse raw OCR text from a KTP image into structured fields.

    Args:
        raw_text: Raw text output from PaddleOCR (lines joined by newline)

    Returns:
        Dict with extracted fields (None for fields that couldn't be extracted)
    """
    # Input length cap to prevent ReDoS on excessively long text
    if len(raw_text) > 10_000:
        raw_text = raw_text[:10_000]

    # Normalize text: collapse whitespace, fix common OCR misreads in numeric contexts
    text = raw_text.replace("\r", "").strip()
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    full_text = " ".join(lines)

    result = {
        "nik": _extract_nik(full_text, lines),
        "nama": _extract_nama(full_text, lines),
        "tempat_lahir": _extract_tempat_lahir(full_text, lines),
        "tanggal_lahir": _extract_tanggal_lahir(full_text, lines),
        "jenis_kelamin": _extract_jenis_kelamin(full_text),
        "gol_darah": _extract_gol_darah(full_text),
        "alamat": _extract_alamat(full_text, lines),
        "rt_rw": _extract_rt_rw(full_text, lines),
        "kel_desa": _extract_kel_desa(full_text, lines),
        "kecamatan": _extract_kecamatan(full_text, lines),
        "agama": _extract_agama(full_text),
        "status_perkawinan": _extract_status_perkawinan(full_text),
        "pekerjaan": _extract_pekerjaan(full_text, lines),
        "kewarganegaraan": _extract_kewarganegaraan(full_text),
    }

    return result


# ---------------------------------------------------------------------------
# Field extractors
# ---------------------------------------------------------------------------

def _extract_nik(full_text: str, lines: list[str]) -> Optional[str]:
    """Extract 16-digit NIK. Most reliable field — strict regex."""
    # Try exact 16-digit match first
    match = re.search(r'\b(\d{16})\b', full_text)
    if match:
        return match.group(1)

    # Try with common OCR errors: O→0, I→1, l→1, S→5, B→8
    # Look for a sequence of 16 chars that are mostly digits
    for line in lines:
        cleaned = re.sub(r'[Oo]', '0', line)
        cleaned = re.sub(r'[Il]', '1', cleaned)
        cleaned = re.sub(r'S', '5', cleaned)
        cleaned = re.sub(r'B', '8', cleaned)
        match = re.search(r'\b(\d{16})\b', cleaned)
        if match:
            return match.group(1)

    # Last resort: find longest digit sequence >= 14 chars
    digits = re.findall(r'\d{14,18}', full_text)
    if digits:
        return max(digits, key=len)[:16]

    return None


def _extract_nama(full_text: str, lines: list[str]) -> Optional[str]:
    """Extract nama from 'Nama : XXX' pattern."""
    # Standard pattern
    match = re.search(r'Nama\s*[:\-]?\s*([A-Z][A-Za-z\'\.\,\s]{2,50})', full_text, re.I)
    if match:
        name = match.group(1).strip()
        # Stop at known next-field keywords
        cutoff = re.search(r'\b(Tempat|Tgl|Tanggal|Jenis|Kelamin|Gol)\b', name, re.I)
        if cutoff:
            name = name[:cutoff.start()].strip()
        return name if len(name) > 2 else None

    # Fallback: look for "Nama" on a line, value might be on same or next line
    for i, line in enumerate(lines):
        if re.search(r'\bNama\b', line, re.I):
            # Value might be after colon on same line
            parts = re.split(r'[:\-]\s*', line, maxsplit=1)
            if len(parts) == 2 and parts[1].strip():
                return parts[1].strip()
            # Or on the next line
            if i + 1 < len(lines):
                candidate = lines[i + 1].strip()
                if candidate and not re.search(r'[:\-]', candidate):
                    return candidate
    return None


def _extract_tempat_lahir(full_text: str, lines: list[str]) -> Optional[str]:
    """Extract birth place from 'Tempat Lahir : XXX' or 'Tempat/Tgl Lahir'."""
    match = re.search(
        r'Tempat\s*(?:Lahir)?\s*[:\-]?\s*([A-Za-z\s]{2,40})',
        full_text, re.I,
    )
    if match:
        place = match.group(1).strip()
        # Remove date part if combined field
        place = re.split(r'[,/]?\s*\d', place, maxsplit=1)[0].strip()
        return place if len(place) > 1 else None
    return None


def _extract_tanggal_lahir(full_text: str, lines: list[str]) -> Optional[str]:
    """Extract birth date in DD-MM-YYYY or DD/MM/YYYY format."""
    # Standard date pattern
    match = re.search(
        r'(?:Tgl|Tanggal)\s*(?:Lahir)?\s*[:\-]?\s*(\d{1,2}[\-/.]\d{1,2}[\-/.]\d{2,4})',
        full_text, re.I,
    )
    if match:
        return match.group(1)

    # Look for date pattern after "Tempat" line (combined field)
    match = re.search(
        r'Tempat.*?(\d{1,2}[\-/.]\d{1,2}[\-/.]\d{2,4})',
        full_text, re.I,
    )
    if match:
        return match.group(1)

    return None


def _extract_jenis_kelamin(full_text: str) -> Optional[str]:
    """Extract gender: LAKI-LAKI or PEREMPUAN."""
    if re.search(r'\bLAKI[\s\-]*LAKI\b', full_text, re.I):
        return "LAKI-LAKI"
    if re.search(r'\bPEREMPUAN\b', full_text, re.I):
        return "PEREMPUAN"
    # Common OCR misreads
    if re.search(r'\bLAKI\b', full_text, re.I):
        return "LAKI-LAKI"
    return None


def _extract_gol_darah(full_text: str) -> Optional[str]:
    """Extract blood type: A, B, AB, or O."""
    match = re.search(r'(?:Gol(?:ongan)?\s*(?:Darah)?\s*[:\-]?\s*)([ABO]{1,2})\b', full_text, re.I)
    if match:
        val = match.group(1).upper()
        if val in ("A", "B", "AB", "O"):
            return val
    # Fallback: standalone blood type near keyword
    match = re.search(r'\bDarah\s*[:\-]?\s*([ABO]{1,2})\b', full_text, re.I)
    if match:
        val = match.group(1).upper()
        if val in ("A", "B", "AB", "O"):
            return val
    return None


def _extract_alamat(full_text: str, lines: list[str]) -> Optional[str]:
    """Extract address from 'Alamat : XXX' pattern."""
    match = re.search(r'Alamat\s*[:\-]?\s*(.+)', full_text, re.I)
    if match:
        addr = match.group(1).strip()
        # Trim at next known field
        cutoff = re.search(
            r'\b(RT|RW|Kel|Desa|Kec|Agama|Status|Pekerjaan)\b',
            addr, re.I,
        )
        if cutoff:
            addr = addr[:cutoff.start()].strip()
        return addr if len(addr) > 3 else None

    # Line-by-line fallback
    for i, line in enumerate(lines):
        if re.search(r'\bAlamat\b', line, re.I):
            parts = re.split(r'[:\-]\s*', line, maxsplit=1)
            if len(parts) == 2 and parts[1].strip():
                return parts[1].strip()
            if i + 1 < len(lines):
                return lines[i + 1].strip()
    return None


def _extract_rt_rw(full_text: str, lines: list[str]) -> Optional[str]:
    """Extract RT/RW in format 'NNN/NNN'."""
    match = re.search(r'RT\s*/?\s*RW\s*[:\-]?\s*(\d{1,3}\s*/\s*\d{1,3})', full_text, re.I)
    if match:
        return match.group(1).replace(" ", "")
    # Try pattern like "001/002" near RT keyword
    match = re.search(r'RT\s*[:\-]?\s*(\d{1,3})\s*/\s*(\d{1,3})', full_text, re.I)
    if match:
        return f"{match.group(1)}/{match.group(2)}"
    return None


def _extract_kel_desa(full_text: str, lines: list[str]) -> Optional[str]:
    """Extract Kelurahan/Desa."""
    match = re.search(
        r'(?:Kel(?:urahan)?|Desa)\s*[:\-]?\s*([A-Za-z\s]{2,40})',
        full_text, re.I,
    )
    if match:
        val = match.group(1).strip()
        cutoff = re.search(r'\b(Kec|Kecamatan|Agama)\b', val, re.I)
        if cutoff:
            val = val[:cutoff.start()].strip()
        return val if len(val) > 1 else None
    return None


def _extract_kecamatan(full_text: str, lines: list[str]) -> Optional[str]:
    """Extract Kecamatan."""
    match = re.search(r'Kec(?:amatan)?\s*[:\-]?\s*([A-Za-z\s]{2,40})', full_text, re.I)
    if match:
        val = match.group(1).strip()
        cutoff = re.search(r'\b(Agama|Status|Pekerjaan)\b', val, re.I)
        if cutoff:
            val = val[:cutoff.start()].strip()
        return val if len(val) > 1 else None
    return None


def _extract_agama(full_text: str) -> Optional[str]:
    """Extract religion from known list."""
    religions = [
        "ISLAM", "KRISTEN", "KATOLIK", "HINDU", "BUDDHA", "BUDHA",
        "KONGHUCU", "PROTESTAN",
    ]
    # After "Agama :" keyword
    match = re.search(r'Agama\s*[:\-]?\s*([A-Za-z]+)', full_text, re.I)
    if match:
        candidate = match.group(1).upper()
        for rel in religions:
            if rel.startswith(candidate[:4]):
                return rel

    # Direct keyword search
    for rel in religions:
        if re.search(rf'\b{rel}\b', full_text, re.I):
            return rel

    return None


def _extract_status_perkawinan(full_text: str) -> Optional[str]:
    """Extract marital status."""
    statuses = [
        "BELUM KAWIN", "KAWIN", "CERAI HIDUP", "CERAI MATI",
    ]
    match = re.search(
        r'(?:Status\s*(?:Perkawinan)?\s*[:\-]?\s*)(.+)',
        full_text, re.I,
    )
    if match:
        val = match.group(1).strip().upper()
        for st in statuses:
            if st in val:
                return st

    # Direct search
    for st in statuses:
        if re.search(rf'\b{st}\b', full_text, re.I):
            return st

    return None


def _extract_pekerjaan(full_text: str, lines: list[str]) -> Optional[str]:
    """Extract occupation from 'Pekerjaan : XXX'."""
    match = re.search(r'Pekerjaan\s*[:\-]?\s*(.+)', full_text, re.I)
    if match:
        job = match.group(1).strip()
        # Trim at next known field
        cutoff = re.search(
            r'\b(Kewarganegaraan|Agama|Status)\b',
            job, re.I,
        )
        if cutoff:
            job = job[:cutoff.start()].strip()
        return job if len(job) > 1 else None

    return None


def _extract_kewarganegaraan(full_text: str) -> Optional[str]:
    """Extract citizenship — usually WNI on KTP."""
    if re.search(r'\bWNI\b', full_text, re.I):
        return "WNI"
    if re.search(r'\bWNA\b', full_text, re.I):
        return "WNA"
    match = re.search(
        r'Kewarganegaraan\s*[:\-]?\s*([A-Za-z\s]{2,20})',
        full_text, re.I,
    )
    if match:
        return match.group(1).strip().upper()
    return None
