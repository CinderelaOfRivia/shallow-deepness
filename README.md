# shallow-deepness

Anonymous publishing site for essays and articles.

## Stack
- Next.js App Router
- TypeScript strict mode
- Tailwind CSS v4
- Supabase (Postgres)
- Vercel-ready deployment

## What is already implemented
- Public homepage with featured article and recent articles
- Article listing page
- Individual article pages with markdown rendering and metadata
- Private editorial studio at `/studio`
- xAI-powered editorial lab inside the studio (feedback, steelman, editorial)
- Supabase SQL schema for articles and stored AI runs (`article_ai_runs`)
- Safe local fallback content when Supabase is not configured

## Environment
Copy `.env.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SITE_NAME`
- `NEXT_PUBLIC_SITE_DESCRIPTION`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BLOG_ADMIN_PASSWORD`
- `XAI_API_KEY`
- `XAI_API_URL` (optional, defaults to xAI chat completions endpoint)
- `XAI_MODEL_DEFAULT`
- `XAI_MODEL_HEAVY`

## Database setup
1. Create a Supabase project.
2. Open the SQL editor.
3. Run `supabase/schema.sql`.

## Local dev
```bash
npm install
npm run security:axios-check
npm run dev
```

If Supabase env vars are missing, the public site still runs using local sample content so the UI can be reviewed honestly.

If `XAI_API_KEY` is missing, the studio still loads but the editorial lab stays disabled with an explicit warning.

## Deploy to Vercel
1. Push this project to GitHub.
2. Import the repo into Vercel.
3. Add the environment variables from `.env.example`.
4. Redeploy.

## Editorial workflow in `/studio`
1. Paste the raw draft into the main form
2. Add optional voice notes so the AI knows what must survive
3. Run `feedback` to diagnose weak points
4. Run `steelman` to pressure-test the argument
5. Run `editorial` to polish without flattening the voice
6. Load the suggested rewrite into the draft if useful
7. Save only after reviewing like a suspicious adult

## Obvious next improvements
- Add image uploads / storage bucket integration
- Add article series and better tag pages
- Add draft preview links
- Add article delete/archive controls with explicit confirmation
- Add article series / sequencing once the archive has enough density
