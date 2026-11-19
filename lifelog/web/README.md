# Lifelog showcase

Unpublished end-state demo for the Lifelog research prototype: a year of timed frames and watch audio, read as a contact sheet. It is not a navigation aid and not a medical device.

The site is a Next.js app. `LIFELOG_MODE` defaults to showcase. `src/lib/api/showcase.ts` reads `showcase-data/` (see `meta.json` for the file map). Frame ids map to scene slots in `image-registry.json`. A scene with a photograph uses `public/showcase/photos/`; other scenes use a neutral plate in `public/showcase/placeholders/`. Ask reads `answers/{locale}.json` (`status` plus sentences with evidence ids) until the golden-question pipeline drops in precomputed answers.

## Provenance

`showcase-data/meta.json` records that the year, the people, and the testimonials are invented. That note stays in this file and in `meta.json`. It is not rendered in the page chrome. The eight photographs are placeholder plates for 18 April 2026. Capture interval in the archive is 300 seconds (162 frames that day). Raw audio is not included.

## Run

```bash
npm install
npm run validate
npm run dev
```

`npm run typecheck`, `npm run lint`, `npm test` via `npm run test:e2e`, and `npm run build` are the checks.

Keyboard on the timeline: arrows move a frame, shift plus arrows moves five minutes, J and K move between stretches, slash opens Ask, P pauses. Resuming asks first.
