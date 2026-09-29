# CrewLab

CrewLab is a collaboration MVP for builders. It uses the Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth, PostgreSQL, and row-level security.

## MVP features

- Email signup, login, password reset, and profile onboarding.
- Editable builder profiles and authenticated public profile pages.
- Project creation, discovery, filtering, editing, and owner deletion.
- Join applications, owner review, crew membership, leaving, and member removal.
- A personal dashboard for projects, crew, and incoming or outgoing applications.
- PostgreSQL constraints, security-definer RPCs, and RLS policies for protected data.

## Local development

Requirements: Node.js and npm. Install dependencies and create a local environment file:

```powershell
npm ci
Copy-Item .env.example .env.local
```

Set the values below in `.env.local`, then run the development server:

```powershell
npm run dev
```

Open <http://localhost:3000>. `.env.local` is gitignored; do not commit credentials.

### Environment variables

| Variable | Use |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL used by the browser and server clients. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key. If the project still uses the legacy key name, `NEXT_PUBLIC_SUPABASE_ANON_KEY` is accepted instead. |
| `NEXT_PUBLIC_SITE_URL` | Trusted site origin used to build auth redirect URLs. Use the full origin with scheme and no path, such as `http://localhost:3000`. |

Only Supabase publishable/anon keys belong in `NEXT_PUBLIC_*` variables. Never put a service-role key or other secret in a client-visible variable.

## Supabase setup

Use a development or staging Supabase project. Review and apply the repository migrations in timestamp order using the Supabase CLI or SQL tooling approved for that environment:

1. `supabase/migrations/20260926000000_auth_onboarding.sql`
2. `supabase/migrations/20260926000001_expand_skills.sql`
3. `supabase/migrations/20260926000002_profile_username.sql`
4. `supabase/migrations/20260927000000_projects.sql`
5. `supabase/migrations/20260928000000_crew_collaboration.sql`
6. `supabase/migrations/20260928000001_join_request_applications.sql`
7. `supabase/migrations/20260929000000_public_user_profiles.sql`
8. `supabase/migrations/20260929000100_security_remediation.sql`

The final migration adds profile constraints, protects onboarding completion, enforces onboarding checks on restricted mutations, and rate-limits join applications. It checks existing rows before adding constraints and can stop if existing data needs review. Resolve any reported data issue deliberately before retrying; do not weaken constraints or RLS to force a migration through.

This README lists the repository migration sequence. It does not assert that any migration has been applied to a particular Supabase environment. Verify migration history and RLS behavior in staging before release.

## Authentication redirect configuration

In Supabase Authentication URL Configuration:

- Set the Site URL to the intended environment origin.
- Allow `/auth/callback` for email confirmation and `/auth/reset-password` for password recovery on each local, preview, staging, and production origin that will be used.
- Set `NEXT_PUBLIC_SITE_URL` for custom domains and non-Vercel deployments. The callback accepts only configured site/Vercel origins (and localhost during development); forwarded host headers are not trusted.

The callback exchanges Supabase's code for a session and then routes the user to onboarding. Supabase redirect allowlists must include the exact origins and paths used by the app.

## Validation commands

Run the checks supported by the current package scripts:

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

There is currently no automated test script or browser E2E framework configured in `package.json`. Do not treat the commands above as a substitute for the staging flow checks below.

## Staging and release prerequisites

- Apply and verify all required migrations in staging before testing signup or project flows.
- Confirm profile ownership/privacy, application privacy, project ownership, onboarding guards, and membership actions against RLS using separate test accounts.
- Test email confirmation, password reset, and callback redirects on every intended origin.
- Keep production credentials and production data out of local validation. Review environment variables and Supabase Auth URL allowlists before release.
- Complete manual mobile, keyboard, and end-to-end checks for signup, onboarding, profile editing, project management, applications, crew changes, and dashboard states.

No deployment or database migration is performed by the commands in this README.
