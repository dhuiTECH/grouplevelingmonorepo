# Supabase

This project uses **Supabase** (hosted). Your project URL: `https://eydnmdgxyqrwfrecoylb.supabase.co`

## SQL Editor (run queries & migrations)

The **SQL Editor** is built into the Supabase Dashboard and is **on by default**. You don’t need to activate it in the repo.

- **Open the SQL Editor:**  
  [**https://supabase.com/dashboard/project/eydnmdgxyqrwfrecoylb/sql/new**](https://supabase.com/dashboard/project/eydnmdgxyqrwfrecoylb/sql/new)

- Or: **Dashboard** → select your project → **SQL Editor** in the left sidebar.

There you can run any SQL (e.g. paste contents of files in `supabase/migrations/`).

## Migrations in this repo

- `skills_system_setup.sql` – `user_skills`, `profiles.skill_loadout`, RLS
- `advancement_system.sql` – rank/title, `attempt_advancement` RPC
- `20250207000000_skills_table.sql` – `skills` table (and seed) for the skill tree

Run them in the SQL Editor in the order above if you’re applying them manually. If you use the Supabase CLI, run `supabase link --project-ref eydnmdgxyqrwfrecoylb` once, then `supabase db push` to apply migrations.

## MCP

Supabase MCP is configured in `.cursor/mcp.json` (URL, service role key, access token) so Cursor can use Supabase tools against this project.
