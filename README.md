# shallow-deepness

Anonymous publishing site for essays, articles, and an idea backlog.

## Stack
- Next.js App Router
- TypeScript strict mode
- Tailwind CSS v4
- Supabase (Postgres)
- Vercel-ready deployment

## What is already implemented
- Public homepage with featured article, recent articles, and idea bank
- Article listing page
- Individual article pages with markdown rendering and metadata
- Minimal private editorial studio at `/studio`
- Supabase SQL schema for articles + topic backlog (`idea_bank`)
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

If Supabase env vars are missing, the site still runs using local sample content so the UI can be reviewed honestly.

## Deploy to Vercel
1. Push this project to GitHub.
2. Import the repo into Vercel.
3. Add the environment variables from `.env.example`.
4. Redeploy.

## Workflow with the writing skills
1. Use `article-coherence-partner`
2. Use `article-steelman`
3. Use `bilingual-article-editor`
4. Paste the final article into `/studio`
5. Store follow-up themes in the idea bank

## Obvious next improvements
- Add image uploads / storage bucket integration
- Add article series and better tag pages
- Add draft preview links
- Add article delete/archive controls with explicit confirmation
- Connect the idea bank to the writing pipeline more explicitly
