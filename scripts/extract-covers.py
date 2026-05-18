"""Extract first-page cover images from issue PDFs and ZIP archives.

Expected input naming examples:
  001.pdf
  1.pdf
  知音漫客_第001期.pdf
  1-100.zip containing per-issue PDFs

Usage:
  python scripts/extract-covers.py "D:/Comics/知音漫客PDF" mobile/assets/covers

After extraction, run:
  cd mobile
  node scripts/build-cover-index.mjs
"""

from __future__ import annotations

import io
import re
import sys
import zipfile
from pathlib import Path


def issue_number(text: str, issue_range: tuple[int, int] | None = None) -> int | None:
    numbers = [int(match) for match in re.findall(r"\d{1,4}", text)]
    if issue_range:
        start, end = issue_range
        in_range = [number for number in numbers if start <= number <= end]
        if in_range:
            return in_range[-1]
    return numbers[-1] if numbers else None


def zip_issue_range(path: Path) -> tuple[int, int] | None:
    match = re.search(r"(\d{1,4})\s*-\s*(\d{1,4})", path.stem)
    if not match:
        return None
    start, end = int(match.group(1)), int(match.group(2))
    return (min(start, end), max(start, end))


def render_cover(document_source: str | bytes, output_path: Path) -> None:
    import fitz  # PyMuPDF

    if isinstance(document_source, bytes):
        document = fitz.open(stream=document_source, filetype="pdf")
    else:
        document = fitz.open(document_source)

    with document:
        if document.page_count == 0:
            raise ValueError("PDF has no pages")
        page = document.load_page(0)
        max_width = 760
        max_height = 1040
        zoom = min(max_width / page.rect.width, max_height / page.rect.height)
        zoom = max(0.35, min(zoom, 1.5))
        pixmap = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        pixmap.save(output_path, jpg_quality=86)


def extract_pdf_file(pdf_path: Path, output_dir: Path, overwrite: bool) -> tuple[int, str]:
    number = issue_number(pdf_path.stem)
    if number is None:
        return 0, f"skip without issue number: {pdf_path.name}"

    output_path = output_dir / f"{number:03d}.jpg"
    if output_path.exists() and not overwrite:
        return 0, f"skip existing: {output_path.name}"

    render_cover(str(pdf_path), output_path)
    return 1, f"wrote {output_path.name} from {pdf_path.name}"


def extract_zip_file(zip_path: Path, output_dir: Path, overwrite: bool) -> tuple[int, list[str]]:
    logs: list[str] = []
    written = 0
    archive_range = zip_issue_range(zip_path)
    if archive_range is None:
        return 0, [f"{zip_path.name}: skipped because it is not an issue range archive"]

    with zipfile.ZipFile(zip_path) as archive:
        pdf_entries = [
            entry
            for entry in archive.infolist()
            if not entry.is_dir() and entry.filename.lower().endswith(".pdf")
        ]
        logs.append(f"{zip_path.name}: {len(pdf_entries)} PDF entries")

        for index, entry in enumerate(pdf_entries, start=1):
            number = issue_number(entry.filename, archive_range)
            if number is None:
                logs.append(f"  skip without issue number: {entry.filename}")
                continue

            output_path = output_dir / f"{number:03d}.jpg"
            if output_path.exists() and not overwrite:
                continue

            with archive.open(entry) as handle:
                data = handle.read()
            try:
                render_cover(data, output_path)
                written += 1
                if written % 10 == 0:
                    logs.append(f"  progress: wrote {written} covers in {zip_path.name}")
            except Exception as exc:
                logs.append(f"  failed {entry.filename}: {exc}")

    return written, logs


def main() -> int:
    if len(sys.argv) not in (3, 4):
        print('Usage: python scripts/extract-covers.py "<pdf-or-zip-dir>" "<output-dir>" [--overwrite]')
        return 2

    input_dir = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])
    overwrite = len(sys.argv) == 4 and sys.argv[3] == "--overwrite"
    output_dir.mkdir(parents=True, exist_ok=True)

    if not input_dir.exists():
        print(f"Input path does not exist: {input_dir}")
        return 2

    written = 0
    paths = sorted(input_dir.iterdir()) if input_dir.is_dir() else [input_dir]
    for path in paths:
        suffix = path.suffix.lower()
        if suffix == ".pdf":
            count, message = extract_pdf_file(path, output_dir, overwrite)
            written += count
            print(message, flush=True)
        elif suffix == ".zip":
            count, logs = extract_zip_file(path, output_dir, overwrite)
            written += count
            for log in logs:
                print(log, flush=True)

    print(f"Extracted {written} covers to {output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
