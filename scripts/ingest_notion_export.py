#!/usr/bin/env python3
"""
Ingest a Notion Markdown export (zip or folder) into this repo structure.

Usage examples:
  python scripts/ingest_notion_export.py --source imports/notion/export.zip \
      --default-year Year1 --default-semester Semester1 --dry-run

  python scripts/ingest_notion_export.py --source imports/notion/export_dir \
      --course-map scripts/config/course_map.example.yaml

Heuristics:
- Detect course from a leading line like `Class: <Course>`; fallback to parent folder name.
- Detect lecture vs. notes/exam based on title/content/file name.
- Preserve images/assets by copying sibling asset folders.

Notes:
- Keeps .md extension. Your site code handles both with/without .md.
- Non-destructive by default; will not overwrite unless --overwrite is passed.
"""

import argparse
import os
import re
import shutil
import sys
import tempfile
import time
import zipfile
from pathlib import Path

try:
    import yaml  # type: ignore
except Exception:
    yaml = None


def slugify(name: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9\-_. ]+", "", name).strip()
    s = s.replace("/", "-")
    s = re.sub(r"\s+", "_", s)
    return s


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except Exception:
        try:
            return path.read_text(encoding="latin-1")
        except Exception as e:
            raise e


def detect_course(md_text: str, fallback: str) -> str:
    # Look for a line like: Class: Studying and Presenting
    m = re.search(r"^\s*(Class|Course|Subject)\s*:\s*(.+)$", md_text, re.IGNORECASE | re.MULTILINE)
    if m:
        return m.group(2).strip()
    # Fallback to parent folder name
    return fallback


def detect_title(md_text: str, default: str) -> str:
    # Prefer first ATX header
    m = re.search(r"^\s*#\s+(.+)$", md_text, re.MULTILINE)
    if m:
        return m.group(1).strip()
    return default


def is_lecture(title: str, md_text: str, src_name: str) -> bool:
    patterns = [r"\blecture\b", r"\bweek\s*\d+\b", r"^#\s*lecture", r"^#\s*week"]
    hay = " ".join([title or "", src_name or ""]).lower()
    if any(re.search(p, hay) for p in patterns):
        return True
    # Also: if content has many headings, assume lecture notes
    if len(re.findall(r"^\s*##+\s+", md_text, re.MULTILINE)) >= 2:
        return True
    return False


def is_exam_prep(title: str, src_name: str) -> bool:
    hay = f"{title} {src_name}".lower()
    return any(k in hay for k in ["exam prep", "examprep", "exam-prep", "revision", "study guide"])


def target_path(base_repo: Path, year: str, semester: str, course: str, is_lect: bool, title: str) -> Path:
    course_dir = base_repo / year / semester / course
    if is_lect:
        # Put under Lectures
        base = slugify(title)
        # Keep extension .md for consistency
        return course_dir / "Lectures" / base
    else:
        # Single notes/ExamPrep
        name = "ExamPrep.md" if "exam" in title.lower() else "Notes.md"
        return course_dir / name


def copy_with_assets(src_md: Path, dst_md: Path, overwrite: bool, dry_run: bool):
    # Ensure destination parent exists
    if not dry_run:
        dst_md.parent.mkdir(parents=True, exist_ok=True)

    # Decide actual destination filename: keep .md extension
    if dst_md.suffix.lower() != ".md":
        dst_md = dst_md.with_suffix(".md")

    # Write/Copy file
    if dst_md.exists() and not overwrite:
        print(f"[skip] exists: {dst_md}")
    else:
        print(f"[write] {dst_md}")
        if not dry_run:
            shutil.copy2(src_md, dst_md)

    # Copy sibling asset folder if any (Notion often exports as <name> <assets>/)
    assets_dir = src_md.with_name(src_md.stem + "_assets")
    if assets_dir.exists() and assets_dir.is_dir():
        dst_assets = dst_md.with_name(dst_md.stem + "_assets")
        if dst_assets.exists() and not overwrite:
            print(f"[skip] assets exist: {dst_assets}")
        else:
            print(f"[copy] assets -> {dst_assets}")
            if not dry_run:
                if dst_assets.exists():
                    shutil.rmtree(dst_assets)
                shutil.copytree(assets_dir, dst_assets)


def load_course_map(path: Path | None) -> dict:
    if not path:
        return {}
    if not path.exists():
        print(f"[warn] course map not found: {path}")
        return {}
    if yaml is None:
        print("[warn] PyYAML not installed; ignoring course map")
        return {}
    with path.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    # Normalize keys
    return {str(k).strip().lower(): str(v).strip() for k, v in data.items()}


def main():
    ap = argparse.ArgumentParser(description="Ingest Notion Markdown export into repo")
    ap.add_argument("--source", required=True, help="Path to Notion export zip or directory")
    ap.add_argument("--default-year", default="Year1")
    ap.add_argument("--default-semester", default="Semester1")
    ap.add_argument("--course-map", default=None, help="Optional YAML mapping from detected names to repo course folder names")
    ap.add_argument("--overwrite", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    source = Path(args.source).resolve()
    temp_dir: Path | None = None
    extract_root: Path

    if not source.exists():
        print(f"[error] source not found: {source}")
        sys.exit(1)

    if source.suffix.lower() == ".zip":
        temp_dir = Path(tempfile.mkdtemp(prefix="notion_export_"))
        with zipfile.ZipFile(source, "r") as z:
            z.extractall(temp_dir)
        extract_root = temp_dir
    else:
        extract_root = source

    course_map = load_course_map(Path(args.course_map) if args.course_map else None)

    # Walk for .md files only
    md_files = sorted([p for p in extract_root.rglob("*.md") if p.is_file()])
    if not md_files:
        print("[warn] no markdown files found in export")

    for md in md_files:
        try:
            txt = read_text(md)
        except Exception as e:
            print(f"[warn] cannot read {md}: {e}")
            continue

        parent_guess = md.parent.name
        course_name = detect_course(txt, parent_guess)
        course_key = course_name.strip().lower()
        course_folder = course_map.get(course_key, course_name)

        title = detect_title(txt, md.stem)
        lect = is_lecture(title, txt, md.name)
        if is_exam_prep(title, md.name):
            lect = False
            title = "ExamPrep"

        dst = target_path(repo_root, args.default_year, args.default_semester, course_folder, lect, title)
        copy_with_assets(md, dst, overwrite=args.overwrite, dry_run=args.dry_run)

    if temp_dir and temp_dir.exists():
        # Clean up extracted files
        shutil.rmtree(temp_dir, ignore_errors=True)

    print("\nDone.")


if __name__ == "__main__":
    main()

