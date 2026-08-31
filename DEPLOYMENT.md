# Vercel and Supabase Deployment

## Before pushing

Use a new Supabase project for production. Do not reuse the local database or commit any database export.

## Supabase

1. Create a Supabase project and copy its transaction-pooler connection string from **Connect**.
2. Add `sslmode=require` to the connection string if it is not already present.
3. Set `DATABASE_URL` locally to that value and run `npm run db:push` once to create the tables.

## Vercel environment variables

Add these values in Vercel for Preview and Production:

```text
DATABASE_URL=<Supabase transaction-pooler connection string>
SESSION_SECRET=<a unique random string of at least 32 characters>
NODE_ENV=production
```

Only set the following once if a brand-new database needs its first admin account. Remove them after the first deployment.

```text
SEED_DEFAULT_DATA=true
DEFAULT_ADMIN_USERNAME=<your admin username>
DEFAULT_ADMIN_PASSWORD=<a strong password of at least 10 characters>
```

The application stores production sessions in PostgreSQL and sets secure, HTTP-only cookies. The Vercel configuration serves the Vite build and routes API calls to the serverless Express entry point.

## Deploy

1. Push the repository to GitHub without `.env`, `.local`, or database dumps.
2. Import the repository into Vercel.
3. Add the environment variables above.
4. Deploy a preview first and test login, plan purchase, payment, reports, and WhatsApp receipt links.
5. Promote the verified deployment to production.
