"""
KK (Kartu Keluarga) regex parser.

Extracts structured fields from raw OCR text of Indonesian Family Cards.
KK has a tabular layout with family member rows, making parsing more complex.
"""

import re
from typing import Optional


def parse_kk(raw_text: str) -> dict:
    """
    Parse raw OCR text from a KK image into structured fields.

    Args:
        raw_text: Raw text output from PaddleOCR (lines joined by newline)

    Returns:
        Dict with extracted fields and list of family members
    """
    # Input length cap to prevent ReDoS on excessively long text
    if len(raw_text) > 10_000:
        raw_text = raw_text[:10_000]

    text = raw_text.replace("\r", "").strip()
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    full_text = " ".join(lines)

    result = {
        "no_kk": _extract_no_kk(full_text, lines),
        "nama_kepala": _extract_nama_kepala(full_text, lines),
        "alamat": _extract_alamat(full_text, lines),
        "rt_rw": _extract_rt_rw(full_text),
        "kel_desa": _extract_kel_desa(full_text),
        "kecamatan": _extract_kecamatan(full_text),
        "kabupaten": _extract_kabupaten(full_text),
        "provinsi": _extract_provinsi(full_text),
        "members": _extract_members(lines),
    }

    return result


# ---------------------------------------------------------------------------
# Field extractors
# ---------------------------------------------------------------------------

def _extract_no_kk(full_text: str, lines: list[str]) -> Optional[str]:
    """Extract 16-digit KK number (similar to NIK but for family card)."""
    # Look near "No. KK" or "Nomor KK" keyword
    match = re.search(
        r'(?:No(?:mor)?\s*(?:KK|Kartu\s*Keluarga)\s*[:\-]?\s*)(\d{16})',
        full_text, re.I,
    )
    if match:
        return match.group(1)

    # Generic 16-digit match (first occurrence, usually KK number is near top)
    match = re.search(r'\b(\d{16})\b', full_text)
    if match:
        return match.group(1)

    # OCR error correction fallback
    for line in lines:
        cleaned = re.sub(r'[Oo]', '0', line)
        cleaned = re.sub(r'[Il]', '1', cleaned)
        cleaned = re.sub(r'S', '5', cleaned)
        cleaned = re.sub(r'B', '8', cleaned)
        match = re.search(r'\b(\d{16})\b', cleaned)
        if match:
            return match.group(1)

    return None


def _extract_nama_kepala(full_text: str, lines: list[str]) -> Optional[str]:
    """
    Extract the head of family name.
    Usually the first name in the family member table (row 1, column 'Nama').
    """
    # Look for "Kepala Keluarga" keyword
    match = re.search(
        r'Kepala\s*Keluarga\s*[:\-]?\s*([A-Z][A-Za-z\'\.\,\s]{2,50})',
        full_text, re.I,
    )
    if match:
        return match.group(1).strip()

    # Try "Nama Kepala" pattern
    match = re.search(
        r'Nama\s*Kepala\s*[:\-]?\s*([A-Z][A-Za-z\'\.\,\s]{2,50})',
        full_text, re.I,
    )
    if match:
        return match.group(1).strip()

    # Fallback: first member in table (row with No. 1)
    for i, line in enumerate(lines):
        if re.match(r'^1\s+[A-Z]', line):
            # "1  Nama Orang  ..."
            parts = re.split(r'\s{2,}', line)
            if len(parts) >= 2:
                return parts[1].strip()
        # Pattern: "1." or "1)" followed by name
        match = re.match(r'^1[.)]\s+([A-Z][A-Za-z\'\.\s]{2,50})', line)
        if match:
            return match.group(1).strip()

    return None


def _extract_alamat(full_text: str, lines: list[str]) -> Optional[str]:
    """Extract address."""
    match = re.search(r'Alamat\s*[:\-]?\s*(.+)', full_text, re.I)
    if match:
        addr = match.group(1).strip()
        cutoff = re.search(
            r'\b(RT|RW|Kel|Desa|Kec|Kab|Provinsi|Kode)\b',
            addr, re.I,
        )
        if cutoff:
            addr = addr[:cutoff.start()].strip()
        return addr if len(addr) > 3 else None

    for i, line in enumerate(lines):
        if re.search(r'\bAlamat\b', line, re.I):
            parts = re.split(r'[:\-]\s*', line, maxsplit=1)
            if len(parts) == 2 and parts[1].strip():
                return parts[1].strip()
            if i + 1 < len(lines):
                return lines[i + 1].strip()
    return None


def _extract_rt_rw(full_text: str) -> Optional[str]:
    """Extract RT/RW."""
    match = re.search(r'RT\s*/?\s*RW\s*[:\-]?\s*(\d{1,3}\s*/\s*\d{1,3})', full_text, re.I)
    if match:
        return match.group(1).replace(" ", "")
    match = re.search(r'RT\s*[:\-]?\s*(\d{1,3})\s*/\s*(\d{1,3})', full_text, re.I)
    if match:
        return f"{match.group(1)}/{match.group(2)}"
    return None


def _extract_kel_desa(full_text: str) -> Optional[str]:
    """Extract Kelurahan/Desa."""
    match = re.search(
        r'(?:Kel(?:urahan)?|Desa)\s*[:\-]?\s*([A-Za-z\s]{2,40})',
        full_text, re.I,
    )
    if match:
        val = match.group(1).strip()
        cutoff = re.search(r'\b(Kec|Kecamatan|Kab|Prov)\b', val, re.I)
        if cutoff:
            val = val[:cutoff.start()].strip()
        return val if len(val) > 1 else None
    return None


def _extract_kecamatan(full_text: str) -> Optional[str]:
    """Extract Kecamatan."""
    match = re.search(r'Kec(?:amatan)?\s*[:\-]?\s*([A-Za-z\s]{2,40})', full_text, re.I)
    if match:
        val = match.group(1).strip()
        cutoff = re.search(r'\b(Kab|Provinsi|Prov|Kode)\b', val, re.I)
        if cutoff:
            val = val[:cutoff.start()].strip()
        return val if len(val) > 1 else None
    return None


def _extract_kabupaten(full_text: str) -> Optional[str]:
    """Extract Kabupaten/Kota."""
    match = re.search(
        r'(?:Kab(?:upaten)?|Kota)\s*[:\-]?\s*([A-Za-z\s]{2,40})',
        full_text, re.I,
    )
    if match:
        val = match.group(1).strip()
        cutoff = re.search(r'\b(Provinsi|Prov|Kode)\b', val, re.I)
        if cutoff:
            val = val[:cutoff.start()].strip()
        return val if len(val) > 1 else None
    return None


def _extract_provinsi(full_text: str) -> Optional[str]:
    """Extract Provinsi."""
    match = re.search(r'Prov(?:insi)?\s*[:\-]?\s*([A-Za-z\s]{2,40})', full_text, re.I)
    if match:
        val = match.group(1).strip()
        cutoff = re.search(r'\b(Kode|No\.|Data)\b', val, re.I)
        if cutoff:
            val = val[:cutoff.start()].strip()
        return val if len(val) > 1 else None
    return None


def _extract_members(lines: list[str]) -> list[dict]:
    """
    Extract family member table rows.

    KK table columns typically:
    No. | Nama | NIK | Jenis Kelamin | Tempat Lahir | Tgl Lahir | Agama | Pendidikan | Pekerjaan | Status

    This is a best-effort extraction — tabular OCR output is often messy.
    """
    members = []

    # Try to detect table header line
    header_idx = None
    for i, line in enumerate(lines):
        if re.search(r'\bNama\b', line, re.I) and (
            re.search(r'\bNIK\b', line, re.I) or
            re.search(r'\bNo\b', line, re.I)
        ):
            header_idx = i
            break

    if header_idx is None:
        # No header detected, try row-based extraction
        for line in lines:
            # Pattern: number followed by name and NIK-like digits
            match = re.match(
                r'^(\d{1,2})[.)\s]+\s*'
                r'([A-Z][A-Za-z\'\.\s]{2,40}?)\s+'
                r'(\d{16})',
                line,
            )
            if match:
                members.append({
                    "no": int(match.group(1)),
                    "nama": match.group(2).strip(),
                    "nik": match.group(3),
                    "jenis_kelamin": None,
                    "tempat_lahir": None,
                    "tanggal_lahir": None,
                })
        return members

    # Parse rows after header
    for line in lines[header_idx + 1:]:
        # Skip separator lines (dashes, equals)
        if re.match(r'^[\-=\s]+$', line):
            continue
        # Stop at end markers
        if re.search(r'(?:Jumlah|Total|Catatan|Lembar)', line, re.I):
            break

        # Try to extract row data
        match = re.match(
            r'^(\d{1,2})[.)\s]+\s*'
            r'(.+)',
            line,
        )
        if not match:
            continue

        no = int(match.group(1))
        rest = match.group(2)

        # Try to split by double-space (column separator in OCR)
        cols = re.split(r'\s{2,}', rest.strip())

        member = {
            "no": no,
            "nama": cols[0].strip() if cols else None,
            "nik": None,
            "jenis_kelamin": None,
            "tempat_lahir": None,
            "tanggal_lahir": None,
        }

        # Try to find NIK in columns
        for col in cols[1:]:
            nik_match = re.search(r'\b(\d{16})\b', col)
            if nik_match:
                member["nik"] = nik_match.group(1)
                break

        # Try to find gender
        if re.search(r'\b(Laki[\-\s]*Laki|L)\b', rest, re.I):
            member["jenis_kelamin"] = "LAKI-LAKI"
        elif re.search(r'\b(Perempuan|P)\b', rest, re.I):
            member["jenis_kelamin"] = "PEREMPUAN"

        # Try to find date
        date_match = re.search(r'(\d{1,2}[\-/.]\d{1,2}[\-/.]\d{2,4})', rest)
        if date_match:
            member["tanggal_lahir"] = date_match.group(1)

        members.append(member)

    return members
