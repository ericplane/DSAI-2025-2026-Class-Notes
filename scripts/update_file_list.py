#!/usr/bin/env python3
"""
Scan the repo for note files (Markdown or supported images) and refresh file-list.json used by the site.

Rules:
- Include root-level Markdown files.
- Include under Year*/Semester*/<Course>/:
  - ExamPrep.md, Notes.md (if present)
  - Additional Markdown or supported image files directly under the course directory
  - Supported files inside note subdirectories (Lectures, Readings, etc.)

Writes a sorted, stable JSON array of relative paths.
"""

import json
from pathlib import Path


NOTE_DIR_NAMES = {
    "lectures",
    "readings",
    "tutorials",
    "workshops",
    "assignments",
    "projects",
    "seminars",
    "exercises",
    "labs",
    "practicals",
    "resources",
    "misc",
    "scans",
    "images",
    "notes",
}

ALLOWED_NOTE_EXTENSIONS = {
    ".md",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
    ".bmp",
    ".heic",
    ".heif",
    ".tif",
    ".tiff",
}

IGNORED_FILENAMES = {".DS_Store"}


def main():
    repo = Path(__file__).resolve().parents[1]
    files: list[str] = []

    # Always include root-level markdown files
    for md_file in sorted(repo.glob("*.md")):
        if md_file.name.startswith('.') or md_file.name in IGNORED_FILENAMES:
            continue
        files.append(md_file.relative_to(repo).as_posix())

    for year_dir in sorted(p for p in repo.glob("Year*") if p.is_dir()):
        for sem_dir in sorted(p for p in year_dir.glob("Semester*") if p.is_dir()):
            for course_dir in sorted(p for p in sem_dir.iterdir() if p.is_dir()):
                # Top-level course files
                for name in ("ExamPrep.md", "Notes.md"):
                    fp = course_dir / name
                    if fp.exists():
                        files.append(fp.relative_to(repo).as_posix())

                for note_file in sorted(p for p in course_dir.iterdir() if p.is_file()):
                    if note_file.name.startswith('.') or note_file.name in IGNORED_FILENAMES:
                        continue
                    if note_file.name in ("ExamPrep.md", "Notes.md"):
                        continue
                    suffix = note_file.suffix.lower()
                    if suffix and suffix not in ALLOWED_NOTE_EXTENSIONS:
                        continue
                    files.append(note_file.relative_to(repo).as_posix())

                for note_dir in sorted(p for p in course_dir.iterdir() if p.is_dir() and p.name.lower() in NOTE_DIR_NAMES):
                    for lf in sorted(note_dir.rglob("*")):
                        if not lf.is_file():
                            continue
                        if lf.name.startswith('.') or lf.name in IGNORED_FILENAMES:
                            continue
                        suffix = lf.suffix.lower()
                        if suffix and suffix not in ALLOWED_NOTE_EXTENSIONS:
                            continue
                        files.append(lf.relative_to(repo).as_posix())

    # De-duplicate and sort for stable output
    unique_sorted = sorted(dict.fromkeys(files))
    out = repo / "file-list.json"
    out.write_text(json.dumps(unique_sorted, indent=4) + "\n", encoding="utf-8")
    print(f"Updated {out} with {len(unique_sorted)} entries")


if __name__ == "__main__":
    main()
