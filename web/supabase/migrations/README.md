# Supabase migrations

Files here are the source of truth for the database schema. Filenames follow Supabase CLI convention: `YYYYMMDDHHmmss_name.sql`.

For now we apply migrations by hand (Supabase dashboard → SQL Editor → paste contents → run). Once schema churn picks up we can adopt the Supabase CLI.

## Apply order

Run files in lexicographic order (lowest timestamp first). The CLI does this automatically.

## Conventions

- Every table gets RLS enabled in the same migration that creates it.
- Policies live alongside the table they govern.
- Cross-table changes get one migration per logical change, not one per table.
- Never edit a migration that's been applied to production. Add a new one instead.
