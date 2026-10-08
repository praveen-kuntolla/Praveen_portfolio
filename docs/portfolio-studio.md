# Praveen portfolio and PK Studio

The public portfolio is at `/`. The visual CMS is at `/studio`. Existing VoiceBridge routes are retained.

Run `npm run dev`, then open http://127.0.0.1:3000. For production, run `npm run build` and `npm run start`.

## Editing

Use Inline Edit Mode to select text and save, cancel, reset or change its font. Each sidebar section has Edit Section, Quick Drawer, visibility and movement controls. Drawers contain every field and item list. Lists support drag and drop, arrow movement, duplication and deletion. Works can move between rows through drag and drop or the explicit row transfer button. Touch users can use the arrows. Desktop, tablet and mobile preview frames use container queries to render the actual portfolio at the selected width.

Drafts are saved automatically to localStorage under `pk-studio-draft-v1`. Undo/redo includes whole-document import and restore operations; text typing is grouped into an edit transaction. Export JSON provides a portable backup. Import validates the schema, allowed URL protocols, unique sections and unique item IDs before replacing the draft. Restore Default is undoable.

Publish Live is a **local browser simulation** as requested in the brief. It copies the validated draft to `pk-studio-live-v1`, which the public portfolio reads. Changes also update other public tabs in the same browser through storage events. It does not deploy or synchronize to a remote server. The editor requires no login because its data is browser-local; remote persistence would need server-side authorization.

## Media and links

Five original SVG concept covers are included under `public/portfolio`. They are expressly labeled as concept artwork. No client reel footage was provided. The About section uses the supplied curly-haired portrait stored locally at `/portfolio/praveen-portrait.png`; its URL remains editable in the About organizer. Set a Works video URL to enable video playback in the native, keyboard-accessible media dialog. Missing images fall back to the local motion artwork.

Social destinations are configurable. LinkedIn, Facebook and GitHub use name-search destinations; Instagram opens the platform because no verified profile URL was supplied. Replace these with the owner's actual profile links in the Contact organizer. Download CV serves a text resume populated with the provided facts, or can be pointed at a final PDF in the Contact organizer. Google Fonts are loaded with system-font fallbacks.

## Validation

- `npm run typecheck`
- `npx eslint src/features/portfolio src/app/page.tsx src/app/studio/page.tsx scripts/check-portfolio.mjs`
- `npx vitest run src/features/portfolio/portfolio.test.ts`
- `npm run build`

The optional browser regression script is `node scripts/check-portfolio.mjs`. It uses Playwright and installed Microsoft Edge in headless mode. Install Playwright locally, or supply its module URL through `PLAYWRIGHT_MODULE`. `PORTFOLIO_TEST_URL` defaults to http://127.0.0.1:3000. The script uses an isolated browser context; it never modifies the user's saved portfolio. Screenshots are written to `artifacts/`.


## Card links and device uploads

Expand a Hero or Works card and use **Add card link**. Each card supports up to ten labeled URLs. Press Enter or leave the URL field to validate and save it. Duplicate destinations on the same card are rejected; existing backups automatically receive an empty links list. Remove a link with its delete control, or clear its URL. Publish Live makes saved links available on the public cards and project dialog.

Use **Upload from device** beside image, portrait, video or CV fields. Images accept PNG/JPEG/GIF/WebP (10 MB), video accepts MP4/WebM (50 MB), and CV accepts PDF/TXT (10 MB). Empty, unsupported, oversized and mismatched files are rejected. Upload success saves the returned URL to the draft; Publish Live updates the public view. Cancel or failed replacement preserves the previous file. **Import JSON** is reserved for portfolio backups.

POST `/api/portfolio/media` accepts multipart `file` and `kind`; GET `/api/portfolio/media/[id]` retrieves uploaded bytes and supports video range requests. Both endpoints are local-server only; writes require the Back Office's own origin. There is no additional login or database migration. Card records remain in browser localStorage. Uploaded bytes and JSON metadata are stored under `.portfolio-uploads/`, outside the public directory and excluded from Git. Re-uploading identical contents reuses the same content-addressed URL. Removed/replaced files remain available for undo and previously published records.

No environment changes are required. Optionally set `PORTFOLIO_UPLOAD_DIR` to a persistent writable directory. Back up both the exported portfolio JSON and upload directory; JSON alone does not contain uploaded bytes. When transferring between the original and Desktop copies, copy the upload directory as well. Internet hosting and shared multi-device publication still require a separate authenticated persistence design; this implementation retains the existing local CMS architecture.

Additional browser workflow checks: `node scripts/check-card-uploads.mjs` and `node scripts/check-upload-edge-cases.mjs`. Set `PLAYWRIGHT_MODULE` as above and `PORTFOLIO_TEST_PORT=3001` for the Desktop copy. They use isolated browser contexts and cover link CRUD, validation, device uploads, errors, cancellation, retrieval, persistence and real video playback. Image/video size and signature validation also have API regression tests.

## Fix file inventory

The fixes are applied to both `C:/Users/PC/Downloads/voice-ai-agent-full-project` and `C:/Users/PC/Desktop/Praveenkumar Portfolio`:

- `src/features/portfolio/data.ts`: optional card links for older backups, URL and duplicate validation, independent nested card updates.
- `src/features/portfolio/studio.tsx`: card link controls, media attachment/history, stable card identity, upload loading guards, explicit JSON importer.
- `src/features/portfolio/portfolio.tsx` and `portfolio.css`: public and dialog links, saved card accents and upload/link styling.
- `src/features/portfolio/url-field.tsx` and `media.ts`: validated URL entry, device picker, multipart upload, cancellation and actionable status/error messages.
- `src/features/portfolio/media-server.ts`: bounded multipart parsing, file validation, content-addressed bytes/metadata storage, local host/origin checks and storage errors.
- `src/app/api/portfolio/media/route.ts` and `src/app/api/portfolio/media/[id]/route.ts`: upload and retrieval endpoints, including video ranges.
- `src/features/portfolio/portfolio.test.ts` and `media.test.ts`: card compatibility/state and upload API regression coverage.
- `scripts/check-card-uploads.mjs` and `scripts/check-upload-edge-cases.mjs`: repeatable browser workflow checks.
- `.gitignore` and `docs/portfolio-studio.md`: runtime storage exclusion and workflow/backup documentation. The Desktop `README.md` also links this guide.

The original app runs on port 3000; the standalone Desktop project runs on port 3001.
