# Supabase media integration — exact setup

The Next.js App Router website keeps its visual Studio and design. The new **/studio/media** manager uses Supabase Auth and database RLS. Once configured, Supabase records replace the public **Selected Works** cards; the Hero, About, text, navigation and other sections continue using the existing portfolio architecture. Media drafts in Supabase never appear publicly. The visual Studio's Works drafts no longer control public Works when Supabase is configured.

## 1. Get your project URL and public key

1. Create or open your project at https://supabase.com/dashboard.
2. In the project's **Connect** dialog copy **Project URL**, normally https://PROJECT_REF.supabase.co.
3. Copy its **Publishable key** (starts with sb_publishable_). You can also find keys under **Settings → API Keys**. If your project only has legacy keys, copy **anon / public**, not service_role.
4. No secret/service-role key, database password or connection string is needed by this application. Never put one in a NEXT_PUBLIC variable.

Official references: [Supabase SSR clients](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [API keys](https://supabase.com/docs/guides/getting-started/api-keys), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## 2. Enter values privately in the local environment

Exact filename: **.env.local**

Exact location: **C:\Users\PC\Desktop\Praveenkumar Portfolio\.env.local** (alongside package.json).

Create that file if it does not exist. If it already exists, edit or append only these two entries; preserve all other values. .env.example is the committed placeholder reference, not the file the app reads for local secrets.

    NEXT_PUBLIC_SUPABASE_URL=https://YOUR_REAL_PROJECT_REF.supabase.co
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_REAL_PUBLISHABLE_KEY

Replace the first entire placeholder with the copied Project URL and the second with the complete publishable key (or complete legacy anon key). Use one line per variable, with no trailing comments. Do not paste credentials into chat or commit .env.local. Local .env files are ignored by Git; .env.example is explicitly included.

These are the only required variables for this integration. The existing PORTFOLIO_ADMIN_PASSWORD belongs to the separate visual Studio /studio on hosting; it does not grant Supabase media administrator permissions. Preserve it if present. If you also need that visual Studio on hosting, set a private password of at least 16 characters there. Existing Netlify Blobs variables, if any, continue to serve the old content/upload functionality.

## 3. Run the versioned migration

1. Open **SQL Editor → New query** inside the SAME Supabase project.
2. Open **supabase/migrations/202610110001_portfolio_media.sql** in this repository.
3. Copy the ENTIRE file, including begin and commit, into SQL Editor and click **Run**.
4. Confirm success and that Table Editor now contains **portfolio_media** and **portfolio_media_admins**.
5. Run this migration once. It creates new objects without dropping existing ones. If an object with these names already exists, it fails and rolls back; inspect that conflict instead of deleting objects or blindly rerunning. Do not run it against an unrelated production project.

The migration creates all media columns, HTTPS/video constraints, ordering indexes, timestamp trigger, RLS policies and an atomic reorder function. Visitors read only published rows. Authenticated non-admins cannot write. Only the SQL owner can provision administrator membership; there is no user-facing role assignment or self-registration route.

## 4. Provision your administrator securely

1. In Supabase **Authentication → Users → Add user → Create new user**, create your own email/password account. Use a strong unique password. Confirm the email through the dashboard's auto-confirm option for this owner-provisioned account (or complete email confirmation through your configured email flow).
2. Copy that user's exact **User UID** from Authentication → Users. It is a UUID, not an email address.
3. As project owner, open SQL Editor and run the following after replacing the placeholder UUID with YOUR user UID:

    insert into public.portfolio_media_admins (user_id)
    values ('PASTE_YOUR_USER_UUID_HERE'::uuid)
    on conflict (user_id) do nothing;

4. Confirm the membership points to your own user. Do not grant authenticated users INSERT/UPDATE/DELETE on portfolio_media_admins. Do not add a policy that lets users set their own role. No service key is required for provisioning.
5. If this is a private back office, turn off **Allow new users to sign up** in Authentication settings. Even if signups remain enabled, ordinary users receive no media management permissions.
6. To revoke access, use SQL Editor as project owner:

    delete from public.portfolio_media_admins
    where user_id = 'UUID_TO_REVOKE'::uuid;

Existing sessions lose mutation access on their next request because membership is checked every time. The Supabase API additionally enforces RLS. Localhost does NOT bypass media authorization.

## 5. Install and restart locally

In PowerShell:

    Set-Location 'C:\Users\PC\Desktop\Praveenkumar Portfolio'
    npm install

Stop any running app with Ctrl+C, then:

    npm run dev

Open **http://127.0.0.1:3001/studio/media**. Sign in using the Supabase email/password from step 4, not PORTFOLIO_ADMIN_PASSWORD. Tokens use HTTP-only cookies; protected API routes refresh tokens and write refreshed cookies. Authorization is performed in those routes, so no auth Proxy is required for this client-rendered manager. Protected lists are never rendered into the public page shell.

For a local production run:

    npm run build
    npm run start

Both scripts use port 3001. Restart after changing .env.local. If values are still missing, the manager displays setup guidance rather than pretending to connect.

## 6. Add, preview and publish

1. Click **New / cancel edit**. Fill in **Title**, optional **Description**, and **Media type**.
2. For an image, paste a publicly accessible HTTPS image-file URL or a Google Drive image file sharing link. The app accepts URLs without requiring a filename extension because some image CDNs use extensionless URLs.
3. For a video, paste one of:
   - https://www.youtube.com/watch?v=VIDEO_ID (also youtu.be, shorts, live and embed links)
   - https://vimeo.com/NUMERIC_ID or https://player.vimeo.com/video/NUMERIC_ID
   - https://drive.google.com/file/d/FILE_ID/view (also open/uc links with id)
   - A direct HTTPS .mp4, .webm or .ogg URL, optionally with a query string
4. For Google Drive, allow public/anyone-with-link viewing. YouTube and Vimeo must allow embedding. A URL cannot override permissions or platform playback restrictions.
5. Optionally add a direct HTTPS image URL or a Google Drive image sharing link as **Thumbnail URL** for video cards. Without one, the existing motion artwork is the thumbnail. Image cards use their media URL.
6. Set **Display order**: lower numbers appear first. Equal numbers are resolved by creation time and ID. Up/down buttons atomically normalize and reorder records.
7. Click **Preview**. Confirm the image/player loads. The preview uses validated media elements and fixed-host embeds, never raw HTML.
8. Leave **Published** unchecked and click **Save media** to create a draft. Click **Publish** in the library, or check **Published** before saving.
9. Open **http://127.0.0.1:3001/#works**. The existing two-row gallery alternates sorted records between top and bottom rows; click a card to view the full image or play the video.
10. Edit and save, publish/unpublish, move up/down or delete using the library buttons. Deleted records cannot be undone. Browser tabs refresh through storage/focus events, and active public tabs poll once per minute. Public API reads are uncached and mutations invalidate the home route. Reload to confirm immediately.

No media uploads or Supabase Storage buckets are required. Existing uploaded files and the old visual Studio remain intact. This migration does not import old localStorage cards: add their URLs through the new manager if you want them in the database.

## 7. Configure hosting (no deployment performed by this change)

On your existing Next.js-capable hosting provider (the repository includes Netlify configuration), set:

- NEXT_PUBLIC_SUPABASE_URL — same real Supabase Project URL.
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — same publishable/anon key.

Set both for **build and runtime**, then rebuild/redeploy through your usual workflow when ready. NEXT_PUBLIC values are baked into browser bundles at build time. Do not upload .env.local. Do not use static export: the authenticated Route Handlers require a Next.js server/runtime. Production cookies require HTTPS.

Keep existing PORTFOLIO_ADMIN_PASSWORD and Netlify Blobs settings if you use the original visual Studio, text publishing or uploads. Supabase media uses its own email/password accounts.

Hosted back office: **https://YOUR_SITE/studio/media**.
Hosted gallery: **https://YOUR_SITE/#works**.

## 8. Files and generated output

No code edits are needed for setup.

- .env.example: placeholder reference; copy VALUES into your private .env.local.
- src/lib/supabase/config.ts, browser.ts, server.ts: named public configuration, browser client, route-handler cookie client and anonymous public client. No secret key client.
- src/features/media-library/model.ts: shared validation and gallery mapping.
- src/features/media-library/server.ts: per-request authorization and API errors.
- src/features/media-library/manager.tsx and manager.css: protected editor, previews, saving/error feedback and responsive layout.
- src/app/studio/media/page.tsx: media manager route.
- src/app/api/media-library/route.ts and session/route.ts: public reads, protected CRUD/reordering and authentication.
- supabase/migrations/202610110001_portfolio_media.sql: exact one-time migration.
- src/features/portfolio/portfolio.tsx and studio.tsx: existing gallery integration and manager links.
- Tests alongside the media module: automated validation, authorization, API and editor checks.
- package.json/package-lock.json: installed Supabase libraries.
- Next.js generates .next and next-env.d.ts while running/building; do not hand-edit generated output.

## 9. Verify connection and permissions after setup

1. Visit /api/media-library. With correct values and migration it returns configured:true and records (initially []). Missing values return configured:false; this is not a successful connection.
2. Sign in at /studio/media. Create a draft. In a separate private/incognito browser, confirm /api/media-library does not return that draft.
3. Publish it and confirm the public gallery displays it. Edit title/URL and save, then reload public gallery. Unpublish and verify it disappears. Test reorder and deletion with disposable records.
4. Create an ordinary confirmed test account without a membership row. Signing into the manager must fail with a not-administrator error. Even direct Data API requests using that account's token must not insert/update/delete media or assign membership.
5. Sign out; the administrative list /api/media-library?admin=1 must return 401. Cross-origin mutations must return 403.
6. Run npm run lint, npm run typecheck, npm test, and npm run build locally.

Automated tests mock Supabase to exercise authorization and API/editor behavior; they do not prove live database connectivity or RLS. A real database/publishing check needs your privately entered values and provisioned account. No live database objects are modified by the implementation process.

Troubleshooting: setup guidance means environment values are absent; service unavailable usually means bad URL/key, network failure or missing migration; not-administrator means membership is absent; sign-in failure means wrong password/email or unconfirmed account; player refusal means the media host's permissions/embedding settings. Use browser network tools and Supabase logs for additional detail without posting tokens publicly.

## Implementation verification — 11 October 2026

Completed: npm run lint; npm run typecheck; npm test (5 files, 40 tests); npm run build. Local production HTTP smoke checks returned 200 for / and /studio/media, explicit configured:false for the media and session APIs, no-store media headers, and 403 for a foreign-origin mutation. The added tests cover URL validation, anonymous/ordinary-user denial for all mutations (including localhost), administrator CRUD/publication/reordering, public published filtering, sign-in denial, editor preview/save/error behavior and safe error responses.

Not completed: applying SQL to a real Supabase project, real login, live RLS and real publishing/playback checks. No credentials were available. Automated database/API tests use mocks. Playwright is not installed in this repository, so a real-browser visual regression was not run.

The dependency audit also reports existing high-severity findings in the current dependency tree (including Next.js); framework/dependency remediation beyond adding Supabase packages was not included in this integration.

## Google Drive image links

You can paste a Drive image file's sharing link (https://drive.google.com/file/d/FILE_ID/view?usp=drive_link) directly into image or thumbnail fields. Set Google Drive **Share → General access → Anyone with the link → Viewer**. Folder links and Google Docs documents are not image files. The app retains the original URL and converts file links into a Drive image thumbnail URL only while displaying them, including old Studio drafts and existing database records. Resource keys are preserved.

Verified on 11 October 2026: the user-supplied image's thumbnail URL returned HTTP 200, Content-Type image/png, without authentication. This confirms access to that file; other files still depend on their own sharing settings. Google Drive is an external media host, so its availability and image endpoint behavior can change.

