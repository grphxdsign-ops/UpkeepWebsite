# Upkeep Backend Workspace

The backend workspace runs at:

```text
http://127.0.0.1:4377/backend
```

It preserves the landing page and adds a working intake-to-record backend surface:

- Intake documents from TXT, CSV, JSON, or image files.
- Route image data through the OCR Studio API when it is running.
- Parse transaction-like rows into prepared records.
- Review or approve records.
- Export records as CSV.
- Persist to Supabase when environment variables are configured.

## Supabase Setup

Run `supabase.sql` in the Supabase SQL editor.

Set these server-only environment variables before starting the server:

```powershell
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"
npm.cmd run dev
```

If those variables are not present, the backend uses in-memory local storage for testing.

Do not put `SUPABASE_SERVICE_ROLE_KEY` in browser JavaScript or any public `NEXT_PUBLIC_*` variable. The `/backend` screen talks to this Node server, and the Node server performs the database writes.

If Supabase Data API exposure is disabled for newly-created tables in your project, enable the Data API for the `public` schema or adjust the project Data API settings after running `supabase.sql`. The schema keeps RLS enabled and grants only the server-side `service_role`; direct browser access should be added later with user-specific policies.

## OCR Studio

The backend can call the existing OCR Studio API for image files:

```powershell
cd C:\Users\rickii\Documents\OCR\ocr-studio
$env:OPENAI_API_KEY = "your_key_here"; npm run api
```

The default OCR endpoint is:

```text
http://127.0.0.1:8787/api/vision-ocr
```

Override it with:

```powershell
$env:OCR_STUDIO_API = "http://127.0.0.1:8787/api/vision-ocr"
```
