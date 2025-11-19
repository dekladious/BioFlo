# Matthew Walker Sleep Content

This folder contains user-supplied Matthew Walker "Science of Better Sleep" MasterClass transcripts and the compiled PDF guide.

**Usage:**
- These files are used ONLY for internal RAG inside BioFlo, not exposed directly.
- They are ingested into the `documents` table via `scripts/ingest_sleep_matthew_walker.js`
- Content is tagged with `metadata.topic = "sleep"` and `metadata.author = "Matthew Walker"`

**Files expected:**
- Part 1 - Matthew Walker Teaches the Science of Better Sleep MasterClass - Meet your instructor.txt
- Part 2 - Matthew Walker Teaches the Science of Better Sleep MasterClass - What is Sleep.txt
- ... (Parts 1-15)
- MW_complete_2025_GB.pdf

**Important:**
- Do not commit this folder to a public repo if you're concerned about licensing.
- Add `knowledge/sleep/matthew-walker/raw/*.txt` and `knowledge/sleep/matthew-walker/raw/*.pdf` to `.gitignore` if needed.

