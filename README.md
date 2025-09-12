# DSAI 2025–2026 Class Notes (Leiden University)

Class notes and study materials for the Data Science and Artificial Intelligence (DSAI) program, academic year 2025–2026, at Leiden University. The goal is to keep lecture notes, exam prep, and supporting materials organized and easy to navigate across years and semesters.

If you find issues or have suggestions, feel free to open an issue or a PR. These are personal notes and may contain mistakes; they are not official course materials. Feel free however to submit your own notes for each lecture, I will review pull requests regularly 

## Repository Structure

Top-level folders group content by academic year, then by semester, then by course. Each course can contain lecture notes, general notes, exam prep, and (optionally) assignments or assets.

```
Year1/
  Semester1/
    <Course Name>/
      Lectures/
        Lecture_<N>[_ShortTopic][.md]
      ExamPrep.md
      Notes.md
      Assignments/           (optional)
      assets/                (optional; images/diagrams)
  Semester2/
Year2/
Year3/
```

Current examples include:
- `Year1/Semester1/Introduction to Digital Skills and Programming/Lectures/`
- `Year1/Semester1/Studying and Presenting/Lectures/`
- `Year1/Semester1/Calculus 1/Lectures/`

Some lecture files were initially created without the `.md` extension. Going forward, prefer adding `.md` to new Markdown notes for better tooling support. Existing files can stay as-is.

## Naming Conventions

- Directories: Title Case with spaces allowed (e.g., `Calculus 1`, `Orientation AI`). Avoid special characters beyond spaces, digits, and letters.
- Lecture files: `Lecture_<N>[_ShortTopic].md` (e.g., `Lecture_1_DSIP.md`, `Lecture_1&2_Calculus.md`). Use underscores instead of spaces within filenames.
- General course notes: `Notes.md` for miscellaneous notes not tied to a single lecture.
- Exam preparation: `ExamPrep.md` for summaries, key formulas, definitions, and practice checklists.

## Content Conventions (Markdown)

- Start each note with a top-level heading and, optionally, the date.
- Use the following sections when helpful:
  - Summary
  - Learning goals
  - Key concepts / Definitions
  - Worked examples / Exercises
  - References / Links
- Use fenced code blocks for code or pseudocode. Example:

  ```
  ```python
  def example():
      return 42
  ```
  ```

- For math, GitHub supports inline `$...$` and block `$$...$$` LaTeX. Keep formulas concise and readable.
- Images/diagrams: place under an `assets/` folder inside the course or lecture folder, and link with relative paths, e.g., `![Title](assets/filename.png)`.

## How to Add Content

### Add a new course

1. Create the course directory under the correct semester.
2. Add subfolders/files as needed:
   - `Lectures/`
   - `ExamPrep.md`
   - `Notes.md`
   - Optional: `Assignments/`, `assets/`

### Add a lecture note

1. Create a new file in the course’s `Lectures/` folder using the naming convention.
2. Start with a heading and brief summary; add learning goals and key concepts.
3. Commit with a clear message.

Template:

```
# Lecture <N>: <Topic>

Date: YYYY-MM-DD

## Summary
<2–4 lines>

## Learning goals
- ...
- ...

## Key concepts
- Term — definition
- ...

## Commit Message Style

- Use concise, descriptive messages. Suggested pattern:
  - `Year1/<Course>: Lecture_<N> - <Topic> (<short summary>)`
  - `Year1/<Course>: update ExamPrep (sections + examples)`


## Roadmap / TODO

- Fill out currently empty `ExamPrep.md` files in `Year1/Semester1`.
- Prefer `.md` extensions for new lecture notes
- Add `Semester2` structure and placeholders when schedules are confirmed.
- Add assets (figures/diagrams) to each course as needed and fix any “attachment:” style links by moving images into an `assets/` folder.

## Disclaimer and License

These are personal study notes intended for learning and revision. They may contain errors or omissions and are not official course materials.
