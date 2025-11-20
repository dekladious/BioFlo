# Peter Attia RAG Ingestion Guide

This walkthrough explains how to load Peter Attia’s MasterClass transcripts into the `documents` table so the AI coach can draw from them safely.

---

## 1. Prepare source files

```
project-root/
└── data/
    └── attia/
        video1.txt
        video2.txt
        ...
        longevity_cheatsheet.txt
```

* Create `data/attia/` if it doesn’t exist.
* Drop **`.txt`, `.pdf`, or `.docx` files** (one per lesson/chapter). Other formats should be exported to PDF/Word first.
* Keep titles descriptive (`sleep_foundations.txt`, `four_horsemen_overview.txt`, etc.). Filenames drive metadata (domain inference) and chunk titles.

> ⚠️ Only ingest content you are licensed to use. The repo should contain your own transcripts/notes, not copyrighted assets.

---

## 2. Environment prerequisites

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (must have `documents` table + `pgvector`) |
| `OPENAI_API_KEY` | Used for `text-embedding-3-small` (1536-dim) |

Set both in `.env.local`. You already need them for the rest of the app.

---

## 3. Run the ingestion script

```bash
pnpm ingest:attia
# which runs: node scripts/ingest-attia.js
```

What the script does:
1. Reads every `.txt`, `.pdf`, and `.docx` file in `data/attia/`
2. Splits content into ~1k-token chunks (paragraph-aware)
3. Generates embeddings with `text-embedding-3-small`
4. Inserts rows into `documents` with:
   - `metadata.topic` (auto-inferred: sleep, exercise, metabolic, longevity, nutrition, etc.)
   - `metadata.source = "attia_masterclass"`
   - `metadata.author = "Peter Attia"`
   - `visibility = 'global'`

> The script throttles itself (100 ms delay) to avoid OpenAI rate limits. Big files may take a few minutes.

---

## 4. Verify results

1. **Database check** – In Supabase/psql:
   ```sql
   select id, title, metadata
   from documents
   where metadata->>'source' = 'attia_masterclass'
   order by created_at desc
   limit 10;
   ```
2. **RAG smoke test** – Hit `/api/chat/v2` (or the UI) with Attia-specific questions (“Explain the four horsemen per Attia”). You should see targeted answers referencing the new knowledge.
3. **Analytics** – Run `pnpm db:check-analytics` and send a couple of chat queries to confirm usage is logged.

---

## 5. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `ERROR: Source directory does not exist` | Create `data/attia/` and add `.txt`, `.pdf`, or `.docx` files. |
| `OpenAI API key not found` | Ensure `OPENAI_API_KEY` is present in `.env.local`. |
| `column "embedding" is of type vector but expression is text` | Confirm `documents.embedding` uses `vector(1536)` and the `pgvector` extension is installed. |
| Duplicates appearing | The script uses `ON CONFLICT DO NOTHING`. Delete rows manually if you need to re-ingest with updated content. |

---

## 6. Safety reminders

- Stick to education: no personalized medical advice, diagnoses, or prescriptions.
- Label risky content in the source files so the AI’s safety layer can flag it (e.g., include sentences such as “General education – not medical advice”).
- Keep transcripts up to date; re-run the script whenever you add new lessons.

---

Happy ingesting! Once the data is in Postgres, the chat pipeline automatically considers it via `buildRagBundle`, so no additional wiring is necessary.

