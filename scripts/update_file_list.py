#!/usr/bin/env python3
"""
Scan the repo for note files and refresh file-list.json used by the site.

Rules:
- Include README.md
- Include under Year*/Semester*/<Course>/:
  - ExamPrep.md, Notes.md (if present)
  - Lectures/* (with or without .md extension)

Writes a sorted, stable JSON array of relative paths.
"""

import json
from pathlib import Path


def main():
    repo = Path(__file__).resolve().parents[1]
    files: list[str] = []

    # Always include README
    if (repo / "README.md").exists():
        files.append("README.md")

    for year_dir in sorted(p for p in repo.glob("Year*") if p.is_dir()):
        for sem_dir in sorted(p for p in year_dir.glob("Semester*") if p.is_dir()):
            for course_dir in sorted(p for p in sem_dir.iterdir() if p.is_dir()):
                # Top-level course files
                for name in ("ExamPrep.md", "Notes.md"):
                    fp = course_dir / name
                    if fp.exists():
                        files.append(fp.relative_to(repo).as_posix())

                # Lectures
                lect_dir = course_dir / "Lectures"
                if lect_dir.exists():
                    for lf in sorted(lect_dir.iterdir()):
                        if lf.is_file():
                            # include .md as well as extensionless
                            files.append(lf.relative_to(repo).as_posix())

    # De-duplicate and sort for stable output
    unique_sorted = sorted(dict.fromkeys(files))
    out = repo / "file-list.json"
    out.write_text(json.dumps(unique_sorted, indent=4), encoding="utf-8")
    print(f"Updated {out} with {len(unique_sorted)} entries")


if __name__ == "__main__":
    main()

