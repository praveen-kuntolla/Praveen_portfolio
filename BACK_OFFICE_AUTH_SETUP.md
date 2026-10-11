# Back-office authentication setup

## 1. Add the environment values

Edit `C:\Users\PC\Desktop\Praveenkumar Portfolio\.env.local`. Keep existing values and add missing lines:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_LEGACY_ANON_KEY
SUPABASE_SECRET_KEY=YOUR_SERVER_ONLY_SECRET_KEY
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3001
```

Get the URL and keys from Supabase Dashboard → Project Settings → API Keys (or Connect). `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is browser-safe. `SUPABASE_SECRET_KEY` must be the `sb_secret_...` key or legacy `service_role` key and must never use a `NEXT_PUBLIC_` name, appear in screenshots/chat, or be committed. `.env.local` is Git-ignored. `.env.example` contains placeholders only.

For hosting, set the same variables in the provider. Change `NEXT_PUBLIC_SITE_URL` to the exact HTTPS production origin, such as `https://portfolio.example.com`. The secret is needed at runtime for invitations. It is not sent to browsers.

## 2. Run migrations in order

In the same Supabase project, open SQL Editor. Copy and run each entire file in this order:

1. `supabase/migrations/202610110001_portfolio_media.sql`
2. `supabase/migrations/202610110002_back_office_auth.sql`

The second migration is additive. It creates roles, permission records, invitations, audit history, protected database functions, signup handling, and RLS. It also migrates existing `portfolio_media_admins` members to ordinary admins with view/media/publish permissions. It does not create a super administrator or delete existing data.

Run each migration once. If an object-name conflict occurs, the transaction rolls back; investigate instead of dropping production objects.

## 3. Configure Supabase Auth URLs and email

In Supabase Dashboard → Authentication → URL Configuration:

1. Set **Site URL** to `http://127.0.0.1:3001` for local-only setup, or your production HTTPS origin when deployed.
2. Add these **Redirect URLs**:
   - `http://127.0.0.1:3001/api/back-office/callback`
   - `http://127.0.0.1:3001/api/back-office/callback?next=/studio/login`
   - `http://127.0.0.1:3001/api/back-office/callback?next=/studio/reset-password`
   - Production equivalents using your exact `NEXT_PUBLIC_SITE_URL`.
3. Keep email confirmation enabled for public signup unless you have a deliberate reason to change it.
4. In Authentication → Email Templates, ensure **Confirm signup**, **Invite user**, and **Reset password** templates are enabled and retain Supabase’s confirmation URL token/link.
5. Configure custom SMTP for reliable production delivery. Supabase’s default mail service is rate-limited and intended for testing.
6. Set your desired password policy in Authentication settings. The UI accepts 6–1024 characters and passes the password to Supabase; a stricter Supabase policy remains authoritative.

Public signup creates a `pending` record with no permissions. It never grants admin or super-admin access.

## 4. Provision the one initial super administrator

Restart after saving `.env.local`, then run from the repository root:

```powershell
npm run auth:bootstrap
```

The command prompts for the email and a password with hidden input. Nothing is printed or saved. Use your chosen email and a simple password that still meets the Supabase password policy; change it later through the reset flow if desired.

If the email exists, the script verifies the supplied password against Supabase before granting the role. If it does not exist, Supabase creates and confirms it. The script refuses to replace a different active super administrator. No browser-submitted email or editable profile field can grant this role.

After success, close the terminal. The script itself provides no HTTP bootstrap route, so there is no bootstrap endpoint to disable. For local environments where you will not send invitations, remove `SUPABASE_SECRET_KEY` from `.env.local` after bootstrapping. Put it back only when invitations are needed. Production invitation handling requires the key in protected server environment variables. Never run the bootstrap command on an untrusted machine.

## 5. Start and use the back office

```powershell
npm run dev
```

- Login: `http://127.0.0.1:3001/studio/login`
- Signup: `http://127.0.0.1:3001/studio/signup`
- Forgot password: `http://127.0.0.1:3001/studio/forgot-password`
- Media: `http://127.0.0.1:3001/studio/media`
- Administrators: `http://127.0.0.1:3001/studio/administrators`

Sign in as the super administrator. Open **Administrators**, enter an email, choose permissions, and send the invitation. Supabase emails a supported invitation link. The recipient follows it, sets a password, and logs in.

Permissions are:

- **View back office**: required base access.
- **Manage image/video links**: create, edit, reorder, or delete media drafts.
- **Publish content**: publish/unpublish and mutate published media.
- **Invite administrators**: send invitations. Ordinary admins can grant only permissions they already possess.

Only the super administrator sees and modifies the full roster. Use **Save permissions** to change an admin and **Revoke access** to remove access. Revocation is checked against the database on every protected request, so an existing session stops working immediately on its next request. Super-admin records and self-promotion are protected by database functions.

## 6. What is protected

The UI does not make authorization decisions. Each protected API validates the Supabase user and current database access. RLS separately enforces media permissions. Privileged tables expose no client insert/update/delete grants; role and permission mutations are constrained database functions. Invitation, permission, role, bootstrap and revocation events are recorded without passwords, tokens, or secret keys.

The older `PORTFOLIO_ADMIN_PASSWORD` controls the separate legacy visual portfolio editor and does not grant Supabase roles.

## 7. Verification after configuration

1. Publicly sign up a test user. Login must report pending access and `/api/media-library?admin=1` must deny it.
2. Invite a second test email with only view + media. It can save a draft but cannot publish it or invite broader access.
3. Grant invitation permission to an admin. Confirm an invitation with a permission the inviter lacks is rejected.
4. Revoke that admin while its browser session remains open. Its next protected request must return 403.
5. Confirm attempts to edit or revoke the super administrator fail.
6. Use forgot password, follow the email, set a new password, log out, then log in with it.
7. Review `back_office_audit_log` in Supabase Table Editor. It must contain no passwords, tokens, or secrets.

Automated tests use mocks and never send emails. Real email delivery, redirects and RLS require the values and dashboard settings above. Do not send a test invitation to a real person without their consent.
