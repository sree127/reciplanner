# Reciplanner

A shared recipe book for a household. Next.js 16 (App Router) + Supabase (Auth, Postgres with row-level security). Phone-first layout.

Milestone 1 (Skeleton): sign in with an emailed code or link, create a household, invite a member by email, and both members see the same recipe book.

## Go live (one-time, about 20 minutes)

### 1. Apply the database migration (about 5 minutes)

You need the database password from Supabase → Project Settings → Database.

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>   # the subdomain of SUPABASE_URL
npx supabase db push --remote
# Later milestones add files in supabase/migrations. Run the same command again;
# it applies only the new ones. Milestone 2 loads the USDA ingredient catalog.
```

Use the CLI rather than pasting SQL into the dashboard: the CLI records which migrations ran, so later milestones apply only their new files.

### 2. Configure Supabase Auth (about 5 minutes)

In Supabase → Authentication:

1. **URL Configuration:** set Site URL to your Vercel URL (e.g. `https://reciplanner.vercel.app`). Add `https://reciplanner.vercel.app/**` to Redirect URLs.
2. **Email delivery:** Supabase's built-in email only sends to members of your Supabase organization, a few emails per hour. Either invite your partner to the organization (Organization → Team), or add custom SMTP under Authentication → Emails → SMTP Settings.
3. **Optional, needs custom SMTP:** under Emails → Templates, paste `supabase/templates/magic-link.html` into "Magic link" and `supabase/templates/confirmation.html` into "Confirm signup". These add a 6-digit code and a link that works in any browser. With Supabase's default emails, the link must be opened in the same browser where sign-in was requested.

### 3. Deploy to Vercel (about 5 minutes)

1. Vercel → Add New → Project → import `sree127/reciplanner`.
2. Add environment variables `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (and, to turn on the AI nutrition estimate and step condensing, `GEMINI_API_KEY`). Set them for both Production and Preview.
3. Deploy. Use the resulting URL in step 2.1.

## Environment variables

| Name | Used for |
|---|---|
| `SUPABASE_URL` | Project URL. A trailing `/rest/v1/` is accepted. |
| `SUPABASE_PUBLISHABLE_KEY` | Browser-safe key; all access is limited by row-level security. |
| `ENABLE_GOOGLE_LOGIN` | Optional. `true` shows "Continue with Google" (enable the Google provider in Supabase first). |
| `GEMINI_API_KEY` | Optional. Enables the AI helpers: condensing imported steps and the recipe **Estimate nutrition** button. Without it, those features show a plain message and everything else keeps working. Get a key from [Google AI Studio](https://aistudio.google.com/apikey). Set it on the server only — never commit it or expose it to the browser. |
| `GEMINI_MODEL` | Optional. Model used for the AI helpers. Defaults to `gemini-3.5-flash-lite`. |

`SUPABASE_SECRET_KEY` is not used yet.

## Local development

Requires Docker.

```bash
npm install
npm run db:start            # local Supabase; applies supabase/migrations
cp .env.example .env.local  # then paste the local URL and publishable key from `npx supabase status`
npm run dev
```

Local emails (sign-in codes) appear in Mailpit at http://127.0.0.1:54324.

## Tests

```bash
npm run typecheck
npm run lint
npm run test:e2e   # needs `npm run db:start`; builds the app and runs two-user household tests
```

## Database

Migrations live in `supabase/migrations/`. Add a new timestamped file per change (`npx supabase migration new <name>`), then run `npm run db:reset` locally and `npm run db:types` to refresh `src/lib/supabase/database.types.ts`.

Every table has row-level security: a user can read and write a row only if they belong to that row's household. Households, members, and invites change only through the `create_household`, `create_invite`, `accept_invite`, and `leave_household` functions. Recipes carry a `visibility` column that is limited to `household` until public recipes ship.
