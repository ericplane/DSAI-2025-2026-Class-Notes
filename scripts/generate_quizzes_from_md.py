#!/usr/bin/env python3
"""
Generate quiz JSON files from markdown/text lecture notes.

This script scans lecture files under Year*/Semester*/<Course>/Lectures/* (with or without .md)
and produces quizzes under quizzes/<same-path>.json matching your site's quiz.js format.

Heuristics:
- Detect term-definition patterns in bullet lists (e.g., "- Term: definition" or "- **Term**: def").
- Detect Q/A pairs like lines starting with Q: ... followed by A: ...

By default, only creates quizzes that don't already exist. Use --force to overwrite.

Usage:
  python scripts/generate_quizzes_from_md.py --root Year1 --out quizzes
  python scripts/generate_quizzes_from_md.py --root Year1 --out quizzes --force
"""

import argparse
import json
import os
import random
import re
import sys
from datetime import date
from pathlib import Path
from typing import List, Tuple, Dict


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except Exception:
        return path.read_text(errors="ignore")


def find_lecture_files(root: Path) -> List[Path]:
    lectures = []
    for p in root.rglob("*"):
        if p.is_file():
            if p.suffix.lower() == ".md":
                # include .md files
                if "/Lectures/" in str(p.as_posix()):
                    lectures.append(p)
            else:
                # include extensionless lecture files (existing pattern)
                if p.parent.name == "Lectures":
                    lectures.append(p)
    return sorted(lectures)


def normalize_lecture_path(path: Path, repo_root: Path) -> str:
    # Return repo-relative path without .md extension (matching script.js logic)
    rel = path.relative_to(repo_root).as_posix()
    return rel[:-3] if rel.endswith(".md") else rel


def extract_definitions(md: str) -> List[Tuple[str, str]]:
    defs = []
    # Bullet-based definitions: - Term: definition  or  - **Term** — definition
    pattern = re.compile(r"^\s*[-*]\s*(?:\*\*|__)?\s*([^:\n\-–—]{2,80}?)\s*(?:\*\*|__)?\s*[:\-–—]\s*(.+)$")
    for line in md.splitlines():
        m = pattern.match(line)
        if not m:
            continue
        term = re.sub(r"\s+", " ", m.group(1)).strip()
        definition = re.sub(r"\s+", " ", m.group(2)).strip()
        # Filter out noisy captures
        if len(term) < 2 or len(definition) < 4:
            continue
        if len(definition) > 280:  # keep it concise
            continue
        defs.append((term, definition))
    return defs


def extract_qa_pairs(md: str) -> List[Tuple[str, str]]:
    pairs: List[Tuple[str, str]] = []
    q_pat = re.compile(r"^\s*(?:\*\*\s*)?(?:Q|Question)\s*[:.\-]\s*(.+)$", re.IGNORECASE)
    a_pat = re.compile(r"^\s*(?:\*\*\s*)?(?:A|Answer)\s*[:.\-]\s*(.+)$", re.IGNORECASE)
    lines = md.splitlines()
    i = 0
    while i < len(lines):
        qm = q_pat.match(lines[i])
        if qm:
            # Find next answer line
            j = i + 1
            while j < len(lines):
                am = a_pat.match(lines[j])
                if am:
                    q = qm.group(1).strip()
                    a = am.group(1).strip()
                    if q and a:
                        pairs.append((q, a))
                    i = j
                    break
                j += 1
        i += 1
    return pairs


def build_mc_from_definitions(defs: List[Tuple[str, str]], rng: random.Random, max_q: int = 10) -> List[Dict]:
    questions = []
    if len(defs) < 2:
        return questions
    # Deterministic shuffle
    order = list(range(len(defs)))
    rng.shuffle(order)
    for idx in order:
        if len(questions) >= max_q:
            break
        term, correct_def = defs[idx]
        # Choose up to 3 other definitions as distractors
        others = [d for i, d in enumerate(defs) if i != idx]
        rng.shuffle(others)
        distractors = [d[1] for d in others[:3]]
        options_texts = [correct_def] + distractors
        rng.shuffle(options_texts)
        options = []
        letters = ["a", "b", "c", "d"]
        for i, txt in enumerate(options_texts[:4]):
            options.append({"id": letters[i], "text": txt, "isCorrect": txt == correct_def})
        q = {
            "id": f"def_{idx}",
            "type": "single",
            "prompt": f"Which definition best matches: <strong>{term}</strong>?",
            "options": options,
            "explanation": f"{term}: {correct_def}",
            "tags": ["definition"],
            "difficulty": "easy",
            "points": 1,
        }
        questions.append(q)
    return questions


def build_short_text_from_pairs(pairs: List[Tuple[str, str]], max_q: int = 5) -> List[Dict]:
    qs = []
    for i, (q, a) in enumerate(pairs[:max_q]):
        qs.append({
            "id": f"qa_{i}",
            "type": "short_text",
            "prompt": q,
            "answer": {"acceptable": [a]},
            "explanation": a,
            "tags": ["short"],
            "difficulty": "medium",
            "points": 1,
        })
    return qs


def make_quiz_json(lecture_title: str, lecture_path_norm: str, questions: List[Dict]) -> Dict:
    # ID based on path
    quiz_id = re.sub(r"[^a-z0-9\-]+", "-", lecture_path_norm.lower())
    title_clean = lecture_title.replace("_", " ")
    return {
        "id": quiz_id,
        "lecturePath": lecture_path_norm,
        "title": f"{title_clean} — Auto Quiz",
        "settings": {"shuffleQuestions": True, "shuffleOptions": True, "showImmediateFeedback": True},
        "meta": {"version": 1, "lastUpdated": str(date.today()), "author": "AutoGen"},
        "questions": questions,
    }


def main():
    ap = argparse.ArgumentParser(description="Generate quiz JSONs from markdown lecture notes")
    ap.add_argument("--root", default="Year1", help="Root folder to scan for lectures")
    ap.add_argument("--out", default="quizzes", help="Output quizzes root folder")
    ap.add_argument("--force", action="store_true", help="Overwrite existing quiz files")
    args = ap.parse_args()

    repo_root = Path(__file__).resolve().parents[1]
    root_dir = (repo_root / args.root).resolve()
    out_root = (repo_root / args.out).resolve()

    if not root_dir.exists():
        print(f"[error] root not found: {root_dir}")
        sys.exit(1)

    lectures = find_lecture_files(root_dir)
    if not lectures:
        print("[warn] no lecture files found")
        return

    for lf in lectures:
        try:
            md = read_text(lf)
        except Exception as e:
            print(f"[warn] cannot read {lf}: {e}")
            continue

        lecture_path_norm = normalize_lecture_path(lf, repo_root)
        quiz_path = out_root / f"{lecture_path_norm}.json"

        if quiz_path.exists() and not args.force:
            print(f"[skip] exists: {quiz_path}")
            continue

        defs = extract_definitions(md)
        pairs = extract_qa_pairs(md)

        rng = random.Random(lecture_path_norm)
        questions = []
        questions.extend(build_mc_from_definitions(defs, rng, max_q=10))
        questions.extend(build_short_text_from_pairs(pairs, max_q=5))

        if not questions:
            print(f"[skip] no questions derived from: {lf}")
            continue

        # Derive lecture title from filename
        lecture_title = lf.name
        quiz_obj = make_quiz_json(lecture_title, lecture_path_norm, questions)

        quiz_path.parent.mkdir(parents=True, exist_ok=True)
        quiz_path.write_text(json.dumps(quiz_obj, indent=2), encoding="utf-8")
        print(f"[write] {quiz_path}")

    print("Done.")


if __name__ == "__main__":
    main()

