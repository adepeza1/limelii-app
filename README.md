# limelii

A Next.js 16 + Capacitor app, deployed on Vercel and wrapped for iOS.

## Local Development

Develop locally with `npm run dev` against a **separate Kinde dev application**.
Do not reuse production Kinde credentials — the production app's callback URLs
point at the production domain, which is why Vercel previews (or any non-prod
host) bounce you back to production after sign-in.

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Kinde dev application

In the Kinde dashboard:

1. Create a new application (type: **Back-end web**).
2. Under **Allowed callback URLs**, add:
   - `http://localhost:3000/api/auth/kinde_callback`
   - `http://localhost:3000/auth/callback`
3. Under **Allowed logout redirect URLs**, add:
   - `http://localhost:3000`
4. Copy the **Client ID**, **Client secret**, and your Kinde **domain**
   (e.g. `https://your-tenant.kinde.com`).

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the Kinde values from step 2. `.env.local` is gitignored.

### 4. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000. Sign-in should now stay on `localhost` instead of
redirecting to production.

### Notes

- Xano API URLs are hardcoded in `src/lib/xano.ts` and point at the shared
  Xano workspace — local dev hits the same backend as production. If you need
  isolated data, create a separate Xano branch or workspace and override
  the constants there.
- iOS / Capacitor: after changing web code, run `npm run sync` to push the
  build into the iOS project.

## Vercel preview redirect issue

If a Vercel preview deployment redirects to the production domain after login,
the cause is almost always Kinde env vars in Vercel pointing at production.
Fix in the Vercel project settings:

- Set `KINDE_SITE_URL` and the post-login/logout redirect URLs to use
  `${VERCEL_URL}` (or a preview-specific Kinde app), **scoped to the Preview
  environment**, not Production.
- Add the corresponding preview URLs to the Kinde app's allowed callback list.

For day-to-day development, prefer local (`npm run dev`) — it's faster and
avoids this class of issue entirely.
