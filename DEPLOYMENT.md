# Vercel and Supabase Deployment

## Before pushing

Use a new Supabase project for production. Do not reuse the local database or commit any database export.

## Supabase

1. Create a Supabase project and copy its transaction-pooler connection string from **Connect**.
2. Add `sslmode=require` to the connection string if it is not already present.
3. Vercel runs the committed Drizzle migrations automatically during each deployment. Make sure `DATABASE_URL` is available to both the Preview and Production environments before the first deployment.

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

The application stores production sessions in PostgreSQL and sets secure, HTTP-only cookies. The Vercel build runs `npm run db:migrate` before creating the Vite output, so a new Supabase database receives all application tables automatically. It also bundles the Express server into the Vercel API function, ensuring its server modules are available at runtime. Drizzle records completed migrations in its journal, making later builds safe to repeat.

## Deploy

1. Push the repository to GitHub without `.env`, `.local`, or database dumps.
2. Import the repository into Vercel.
3. Add the environment variables above to both Preview and Production.
4. Deploy a preview first. The build log should show the `npm run db:migrate` step, and the new tables should appear in Supabase's Table Editor.
5. Test login, plan purchase, payment, reports, and WhatsApp receipt links.
6. Promote the verified deployment to production.
