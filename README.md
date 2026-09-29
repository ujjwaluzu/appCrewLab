CrewLab’s authentication and onboarding foundation, built with Next.js App Router and Supabase Auth.

## Getting started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Copy `.env.example` to `.env.local` and fill in the Supabase URL and publishable/anon key. Apply `supabase/migrations/20260926000000_auth_onboarding.sql` to the Supabase project before testing signup.

## Supabase Auth redirect URLs

Configure these in Supabase Authentication → URL Configuration:

- Site URL: the current environment’s origin.
- Redirect URLs: `http://localhost:3000/auth/callback`, `http://localhost:3000/auth/reset-password`, your Vercel preview origin followed by `/auth/callback` and `/auth/reset-password`, and the equivalent two paths on `https://app.crewlab.ujjwaluzu.in`.

The browser uses its current origin when requesting an auth email redirect; Supabase must allow that exact URL. The callback accepts only origins matching `NEXT_PUBLIC_SITE_URL`, Vercel's `VERCEL_URL`, or `VERCEL_PROJECT_PRODUCTION_URL`. Set `NEXT_PUBLIC_SITE_URL` to the intended origin for local, preview, and production environments when a custom domain is used. The callback ignores forwarded host and protocol headers and returns a configuration error if no trusted origin matches.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

The current scope intentionally stops at entry routing, auth, profile onboarding, and the `/home` placeholder.
