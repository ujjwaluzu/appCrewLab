# CrewLab

CrewLab is a collaboration workspace for people who want to turn project ideas into work they can build with others. It helps builders present what they can do, discover projects that need their skills, form a small crew through an owner-reviewed application process, and coordinate the work in a shared project space.

The application is built with the Next.js App Router, TypeScript, Tailwind CSS, Supabase Auth, PostgreSQL, and row-level security.

## Project goal

Many useful projects begin with one person and an incomplete team. The person with the idea may need a designer, engineer, researcher, writer, or another kind of collaborator. At the same time, builders often want meaningful projects to contribute to but have trouble finding work that fits their interests and abilities. Project information, recruiting, and day-to-day coordination can also end up scattered across profiles, forms, chat tools, and code-hosting sites.

CrewLab's goal is to connect those parts into one understandable path: make a project legible to potential collaborators, help the right people find it, let the project owner form a crew deliberately, and give accepted members a common place to keep moving. A project is the organizing unit. Its description and status explain what the team is making; its requested skills help people judge fit; its applications help the owner review interest; and its discussion space gives members a place to coordinate after joining.

### Who CrewLab is for

- **Project owners** who have an idea or active project and want to find collaborators, review requests, and keep the team coordinated.
- **Builders looking for a project** where their skills and interests can contribute. They can explore project listings, learn about the owner and project, and apply to join.
- **Project crew members** who need shared context for discussion and, when the owner connects a repository, read-only visibility into the code and related GitHub activity.

### The intended collaboration flow

1. **Build a useful profile.** A member adds a name, username, short introduction, and skills so other builders can understand their experience and interests.
2. **Describe a project.** An owner publishes the idea, its current stage, and the skills or contributions that would help move it forward.
3. **Find a good fit.** Builders browse and filter projects, review project details, and send a request to join work that interests them.
4. **Form the crew.** The owner reviews incoming requests and decides who joins. Members can keep track of projects they own, projects they have joined, and applications they have sent or received.
5. **Work with shared context.** Accepted members use the project discussion for realtime crew chat. An owner can connect GitHub once, install the CrewLab GitHub App, and select a repository separately for each project. The repository view gives that project's crew read-only access to relevant repository information; it does not give crew members the owner's GitHub credentials.

### What the product is trying to make easier

- Explain an idea clearly enough that potential collaborators can decide whether it is for them.
- Match projects and builders through visible skills, project details, and project discovery filters.
- Give project owners a simple, intentional way to review and manage crew membership.
- Keep the path from discovery to application to project discussion connected to the project itself.
- Give team members enough shared project and repository context to coordinate without granting unnecessary account access.

The current implementation is an MVP of this workflow. It focuses on profiles, project discovery and management, join applications, crew membership, discussion, and optional read-only GitHub context. It does not claim that a project is guaranteed to find contributors or that repository access replaces a team's own development, planning, or communication practices.

## MVP features

- Email signup, login, password reset, and profile onboarding.
- Editable builder profiles and authenticated public profile pages.
- Project creation, discovery, filtering, editing, and owner deletion.
- Join applications, owner review, crew membership, leaving, and member removal.
- A personal dashboard for projects, crew, and incoming or outgoing applications.
- Project discussion spaces with realtime crew chat and an optional read-only GitHub repository workspace.
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
| `GITHUB_APP_ID` | GitHub App ID used to sign short-lived installation tokens. |
| `GITHUB_APP_SLUG` | GitHub App URL slug used to start repository installation. |
| `GITHUB_APP_CLIENT_ID` | GitHub App client ID used for owner account authorization. |
| `GITHUB_APP_CLIENT_SECRET` | Server-only GitHub App client secret. |
| `GITHUB_APP_PRIVATE_KEY` | Server-only PEM private key for GitHub App authentication. Newlines may be literal or written as `\\n`. |
| `GITHUB_TOKEN_ENCRYPTION_KEY` | Base64-encoded 32-byte key used to encrypt GitHub user tokens at rest. Generate a separate value for each environment. |

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
9. `supabase/migrations/20260929000200_project_discussions.sql`
10. `supabase/migrations/20260929000300_github_repositories.sql`

The security-remediation migration adds profile constraints, protects onboarding completion, enforces onboarding checks on restricted mutations, and rate-limits join applications. It checks existing rows before adding constraints and can stop if existing data needs review. Resolve any reported data issue deliberately before retrying; do not weaken constraints or RLS to force a migration through.

The discussion migration adds project chat data and its access policies. The GitHub migration stores encrypted owner authorization tokens and links a repository to a project. It does not store installation access tokens. Review the migration and verify its policies in a development or staging environment before using GitHub linking. No migration is asserted to have been applied by this README.

This README lists the repository migration sequence. It does not assert that any migration has been applied to a particular Supabase environment. Verify migration history and RLS behavior in staging before release.

## Authentication redirect configuration

In Supabase Authentication URL Configuration:

- Set the Site URL to the intended environment origin.
- Allow `/auth/callback` for email confirmation and `/auth/reset-password` for password recovery on each local, preview, staging, and production origin that will be used.
- Set `NEXT_PUBLIC_SITE_URL` for custom domains and non-Vercel deployments. The callback accepts only configured site/Vercel origins (and localhost during development); forwarded host headers are not trusted.

The callback exchanges Supabase's code for a session and then routes the user to onboarding. Supabase redirect allowlists must include the exact origins and paths used by the app.

## GitHub App setup

GitHub repository access is optional. Configure a GitHub App for each environment that will test this feature. Keep all App credentials server-only; do not prefix them with `NEXT_PUBLIC_`.

Configure these URLs using the same site origin as `NEXT_PUBLIC_SITE_URL`:

- **Callback URL:** `https://your-host.example/api/github/oauth/callback` (locally: `http://localhost:3000/api/github/oauth/callback`)
- **Setup URL:** `https://your-host.example/api/github/install/callback` (locally: `http://localhost:3000/api/github/install/callback`)

Keep GitHub's separate "Request user authorization (OAuth) during installation" option disabled; CrewLab runs owner authorization through the callback flow above. Do not enable webhook events for this read-only integration. Request only these repository permissions:

- Contents: Read-only
- Issues: Read-only
- Pull requests: Read-only

Project owners connect their GitHub account and install CrewLab once from the GitHub tab in the workspace sidebar. In each project discussion, the owner can then choose a repository from any of their CrewLab App installations. Installation tokens are minted server-side and restricted to the selected repository. The connected repository's metadata, commits, branches, open pull requests, and open issues are intentionally visible to all CrewLab members of that project, including for private repositories. Crew members do not receive a GitHub token from CrewLab. The owner can unlink a repository from a project; removing or suspending the App installation at GitHub also revokes access to its repositories.

Generate `GITHUB_TOKEN_ENCRYPTION_KEY` as base64 for 32 random bytes (for example, `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`). Store distinct values in local, preview, staging, and production secret stores. Rotating this key requires reconnecting accounts whose stored tokens were encrypted with the old key. Before enabling the feature in an environment, configure the App URLs there, set the variables in that environment, apply the migration sequence to its non-production database as approved, and verify the full owner/member flow with test accounts and a test repository.

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
- For GitHub-enabled environments, test account authorization, installation, repository selection, read-only repository sections, private-repository sharing with project members, unlinking, and access revocation after App removal.
- Keep production credentials and production data out of local validation. Review environment variables and Supabase Auth URL allowlists before release.
- Complete manual mobile, keyboard, and end-to-end checks for signup, onboarding, profile editing, project management, applications, crew changes, and dashboard states.

No deployment or database migration is performed by the commands in this README.
