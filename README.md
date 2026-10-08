# Praveenkumar Portfolio

Standalone Next.js portfolio and visual Back Office for Praveen Kumar Kuntolla.

## Run

Dependencies are included in this Desktop copy. Open this folder in a terminal and run:

```powershell
npm run dev
```

Portfolio: http://127.0.0.1:3001
Back Office: http://127.0.0.1:3001/studio

Port 3001 keeps this project separate from the original project on port 3000.
If dependencies need to be restored, run `npm ci`.

## Production

```powershell
npm run build
npm run start
```

## Features

Seven responsive portfolio sections, the supplied portrait, local concept artwork and a downloadable text resume. Back Office provides inline editing, drag and drop, accessible reordering controls, undo/redo, JSON import/export, automatic local drafts and a publish simulation.

Publish Live saves the public view in this browser only. It does not deploy to the internet. The Desktop project uses its own port, so browser storage starts separately from the original site. Export JSON from the original Back Office and import it here to transfer any additional saved edits.

## Checks

```powershell
npm run lint
npm run typecheck
npm test
```

The optional browser check uses Playwright and Microsoft Edge. Set `PORTFOLIO_TEST_URL=http://127.0.0.1:3001` when running `node scripts/check-portfolio.mjs`. Set `PLAYWRIGHT_MODULE` to a module URL if Playwright is installed outside this project.

This standalone copy includes no VoiceBridge routes, database code, or credentials.

Card links and device uploads are now available in each card's organizer and the About/Contact media fields. See [the studio guide](docs/portfolio-studio.md#card-links-and-device-uploads) for formats, size limits, API/storage details and backups. Uploaded media is saved in `.portfolio-uploads/`; keep this folder with the project when moving it. No environment changes are required.

## Deploy to Netlify

This standalone portfolio is the deployable repository root. Use Node.js 24, install with `npm ci`, and run `npm run verify` to lint, test and build. The committed `netlify.toml` specifies that verification command and `.next` publish directory. Netlify automatically supplies the current OpenNext adapter; do not upload `.next` manually, add a SPA catch-all redirect, or switch this app to static export.

In Netlify, choose **Add new project → Import an existing project**, connect GitHub, and select `praveen-kuntolla/Praveen_portfolio`. Deploy branch `main`, leave the base directory empty, and use the committed build settings. No environment secrets are required for the current public portfolio. The supplied portrait and concept covers are included in `public/portfolio/`. Later pushes to the connected branch can trigger Netlify deployments.

### What is published

The shared public content comes from `src/features/portfolio/data.ts` and committed files under `public/portfolio/`. Back Office **Publish Live** currently saves only to this browser's localStorage; it does not commit source, update all visitors, or trigger a Netlify build. Local edits or uploaded files are not automatically transferred to the hosted site. To publish additional edits, export a backup from the local editor, update the source content and commit the intended public assets before pushing again. Keep private backups out of Git.

Device uploads currently require the local server and store files in `.portfolio-uploads/`. Those endpoints deliberately reject hosted requests and require no cloud secrets. Netlify serverless storage must not be used as persistent upload storage. A hosted Back Office with shared publication and uploads needs authentication and durable object/document storage as a separate implementation. Keep `.portfolio-uploads/` with local backups; do not commit that folder.

### Verification and troubleshooting

A local `npm run verify` success checks the application, not the Netlify adapter deployment. Confirm Netlify's build completes and check `/`, `/studio`, the About portrait, links, project dialogs and CV after the first deploy. If the build omits TypeScript or other dev dependencies, remove a custom `NODE_ENV=production` or npm omit-dev setting from the build environment.

Official references: [Next.js on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/), [Next build settings](https://docs.netlify.com/snippets/frameworks/nextjs-config-values/), and [Node.js version configuration](https://docs.netlify.com/build/configure-builds/manage-dependencies/).
