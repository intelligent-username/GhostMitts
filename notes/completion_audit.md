# GhostMitts - Project Completion & Readiness Audit

## 1. Executive Summary
This audit reviews GhostMitts across its React frontend, Cloudflare Worker backend, audio generation pipeline, asset mappings, configuration, and production readiness. Findings are prioritized into **Critical Bugs**, **Functional Gaps**, and **Polish / Cleanup**.

---

## 2. Critical Issues (Blockers / Crashing Bugs)

### 2.1 [RESOLVED] Infinite Loop in `replenishQueue()` Freezes Browser Thread
- **Location**: [App.tsx](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/src/App.tsx#L542-L553)
- **Status**: Fixed with bounded attempts and early termination when `keys.length === 0`.

### 2.2 Guest / Unauthenticated Workouts Never Save to LocalStorage
- **Location**: [App.tsx](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/src/App.tsx#L268-L270)
- **Problem**: 
  ```typescript
  const uname = usernameRef.current;
  if (!uname) return;
  ```
  `endWorkoutSegment` exits immediately if `uname` is empty. However, the local state updates (`setTotalPracticeCombos`, `setTotalPracticeSeconds`), the streak calculations, and local storage synchronization are located *after* this line (lines 286–315). Consequently, guest users (anyone using the app without an account) have 0 seconds and 0 combos recorded upon completing or pausing workouts.
- **Fix**: Move the `uname` check down to only guard cloud API calls (`triggerCloudSessionSave` and `insertWorkout`).

### 2.3 Broken Production Startup Script (`npm run start`)
- **Location**: [package.json](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/package.json#L11), [src/index.ts](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/src/index.ts#L54)
- **Problem**: `package.json` specifies `"start": "NODE_ENV=production bun src/index.ts"`. In `src/index.ts`, requests to `"/*"` serve `src/index.html`, which points directly to `./scripts/frontend.tsx`. Standard browsers in production cannot compile JSX or TypeScript. Production needs to serve the compiled bundle from `dist/` created by `vite build`.
- **Fix**: Update `src/index.ts` to serve from `dist/` or adjust the `start` script to `vite preview` / a static file server for `dist/`.

---

## 3. Functional Gaps & Logic Inconsistencies

### 3.1 [RESOLVED] UTC Rollover Inconsistency for Daily Stats & Streaks
- **Location**: [storage.ts](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/src/utils/storage.ts), [App.tsx](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/src/App.tsx), [StreakGridModal.tsx](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/src/components/StreakGridModal.tsx), [worker/src/index.ts](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/worker/src/index.ts)
- **Status**: Fixed by formatting local dates via `toLocalDateStr()`, passing client local date to `/bootstrap?date=...` and `/workouts/insert`, and referencing client local date in worker streak calculations.

### 3.2 Key 1 Assumptions in `combogenerator.ts`
- **Location**: [combogenerator.ts](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/src/scripts/combogenerator.ts#L116-L118), [combogenerator.ts](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/src/scripts/combogenerator.ts#L155-L162)
- **Problem**: 
  - `if (last === 1) candidates = allKeys.filter(k => k === 1 || k % 2 === 0);`
  - `if (k === 1) ... doubleJabCount logic`
  The generator assumes slot key `1` is always "JAB". For presets like **Wrestling** (where key 1 is `SHOOT`), or custom user presets where slot 1 has been remapped, the logic treats non-punch moves with double-jab repetition mechanics.
- **Fix**: Check `move.name.toUpperCase() === "JAB"` rather than `k === 1`.

### 3.3 Subsequent Parity Dead-End in Combo Generation
- **Location**: [combogenerator.ts](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/src/scripts/combogenerator.ts#L128-L136)
- **Problem**: In step 0, if no odd punches exist, fallbacks allow any odd key or any key. However, for steps `> 0`, if parity filtering results in `candidates.length === 0` (e.g. a preset with only odd moves, or moves deleted down to one parity), the loop simply executes `break;`, cutting the combo short without attempting a fallback.
- **Fix**: Add a fallback to `candidates = allKeys` before breaking if the candidate list is empty.

### 3.4 Combos Mode Silent Failure on Zero/Empty Input
- **Location**: [App.tsx](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/src/App.tsx#L920-L935)
- **Problem**: In Combos mode, if the user leaves the combo input blank or 0 and clicks START, `const count = parseInt(comboInput) || 0;` evaluates to `<= 0` and the click handler silently does nothing. There is no validation message or visual feedback.
- **Fix**: Provide visual validation feedback or default to a reasonable fallback (e.g. 20 combos).

### 3.5 Combos Completed Counter Increments on Emission, Not Completion
- **Location**: [App.tsx](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/src/App.tsx#L621-L625)
- **Problem**: `setCombosCompleted` increments as soon as the combo is emitted and starts playing audio. If a user pauses or resets during the first combo, the counter already registers `1` completed combo.
- **Fix**: Increment upon completion of the interval or sync completion when transitioning to the next combo.

### 3.6 Wrestling Preset Defaults to Numbers Voice Callout
- **Location**: [App.tsx](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/src/App.tsx#L521-L527), [useAudioSequencer.ts](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/src/hooks/useAudioSequencer.ts#L83-L97)
- **Problem**: GhostMitts defaults `displayMode` to `"numbers"`. When selecting the **Wrestling** preset (SHOOT, SPRAWL, DOWNBLOCK, etc.), voice cues call out "ONE", "TWO", "THREE" instead of the wrestling action names unless the user discovers the display mode toggle and switches to `"fullname"`.
- **Fix**: Automatically switch `displayMode` to `"fullname"` when switching to Wrestling, or add preset-level default display mode metadata.

### 3.7 Missing React Error Boundary
- **Location**: [frontend.tsx](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/src/scripts/frontend.tsx)
- **Problem**: `frontend.tsx` directly renders `<App />` with `createRoot`. Any uncaught error in audio loading, speech synthesis, or localStorage parsing results in a completely blank white screen with no user recovery path.
- **Fix**: Wrap `<App />` in a top-level `ErrorBoundary` component with a reset/reload fallback UI.

---

## 4. Asset & Mapping Integrity

### 4.1 Duplicate / Stale Voice Audio Files in Public Assets
- **Location**: [src/public/voicegen/en-US-GuyNeural](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/src/public/voicegen/en-US-GuyNeural)
- **Problem**: The voice directory contains 87 audio files, including duplicate moves with conflicting number prefixes:
  - `n17_JAB.ogg` AND `n21_JAB.ogg` (active mapping uses `n21_JAB.ogg`)
  - `n18_CROSS.ogg` AND `n22_CROSS.ogg` (active mapping uses `n22_CROSS.ogg`)
  - `n19_FRONT_HOOK.ogg` AND `n23_FRONT_HOOK.ogg`
  - `n20_REAR_HOOK.ogg` AND `n24_REAR_HOOK.ogg`
  - `n21_FRONT_UPPERCUT.ogg` AND `n25_FRONT_UPPERCUT.ogg`
  - `n22_REAR_UPPERCUT.ogg` AND `n26_REAR_UPPERCUT.ogg`
  - `n23_OVERHAND_LEFT.ogg` AND `n27_OVERHAND_LEFT.ogg`
  - `n24_OVERHAND_RIGHT.ogg` AND `n28_OVERHAND_RIGHT.ogg`
  - `n25_LEAD_KNEE.ogg` AND `n29_LEAD_KNEE.ogg`
  - `n26_REAR_KNEE.ogg` AND `n30_REAR_KNEE.ogg`
  - `n27_LEAD_KICK.ogg` AND `n31_LEAD_KICK.ogg`
  - `n28_REAR_KICK.ogg` AND `n32_REAR_KICK.ogg`
  - `n29_BODY_KICK.ogg` AND `n33_BODY_KICK.ogg`
  - `n30_ROUNDHOUSE_KICK.ogg` AND `n34_ROUNDHOUSE_KICK.ogg`
  - `n31_TEEP.ogg` AND `n35_TEEP.ogg`
- **Impact**: Bloats repository and production build bundle with dead audio files.
- **Fix**: Purge orphaned audio files (`n17_JAB` through `n31_TEEP` duplicates) that don't match `constants.ts` mappings.

### 4.2 Move Name Synonyms without Explicit Mappings
- **Location**: [constants.ts](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/src/utils/constants.ts#L5-L13), [combogenerator.ts](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/src/scripts/combogenerator.ts#L25)
- **Problem**: `FRONT_MOVES` lists both `PARRY LEFT` and `LEFT PARRY`, `SHOOT` and `SHOOT A TAKEDOWN`. In `MOVE_AUDIO_MAP`, both have separate audio files (`n40_PARRY_LEFT.ogg` and `n46_LEFT_PARRY.ogg`, `n52_SHOOT.ogg` and `n44_SHOOT_A_TAKEDOWN.ogg`). Having duplicate names for the identical physical movement creates confusion in the preset editor dropdowns.
- **Fix**: Standardize terminology across presets and dropdowns.

---

## 5. Dead Ends & Orphaned Code

### 5.1 Orphaned `src/__config.js`
- **Location**: [src/__config.js](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/src/__config.js)
- **Problem**: Leftover configuration script from earlier Bun prototype. It is neither referenced in `index.html` nor imported anywhere in `src/`.
- **Fix**: Delete `src/__config.js`.

### 5.2 Unused Dependencies in `package.json`
- **Location**: [package.json](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/package.json#L21-L22)
- **Problem**: 
  - `@tursodatabase/serverless` is listed in frontend `dependencies` in `package.json`, but Turso is only accessed from the Cloudflare Worker (`worker/src/index.ts`). The frontend connects via fetch HTTP requests to the worker API.
  - `wrangler` is listed in `dependencies` instead of `devDependencies`.
- **Fix**: Remove `@tursodatabase/serverless` from root `package.json` (or move backend deps into a dedicated `worker/package.json`), and move `wrangler` to `devDependencies`.

### 5.3 Dead Legacy Workouts / History Endpoints
- **Location**: [worker/src/index.ts](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/worker/src/index.ts)
- **Problem**: The backend inserts records into `workouts` table on `/workouts/insert`, but there are no endpoints to query workout history, nor is there any UI to view past workout logs (only the GitHub-style streak contribution grid exists).
- **Fix**: Either implement a simple workout history modal or document `workouts` table as write-only telemetry for future analytics.

---

## 6. Production Readiness & Configuration

### 6.1 OpenGraph / Twitter Meta Tags Use Relative Paths
- **Location**: [index.html](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/src/index.html#L11-L15)
- **Problem**:
  ```html
  <meta property="og:image" content="./assets/logo.svg" />
  <link rel="icon" type="image/svg+xml" href="./assets/logo.svg" />
  ```
  Social platforms (Facebook, Twitter/X, Discord, Slack) require absolute canonical URLs for `og:image`. Relative paths fail to render link previews.
- **Fix**: Use absolute URL or configure build-time base injection.

### 6.2 Cloudflare Worker CORS Handling
- **Location**: [worker/src/index.ts](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/worker/src/index.ts#L12-L15), [worker/src/index.ts](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/worker/src/index.ts#L231-L237)
- **Problem**: Worker strictly requires `ALLOWED_ORIGINS` to match the `Origin` header. In local development or testing with curl / health checks without an `Origin` header, requests return `403 Forbidden` rather than allowing health probes or same-origin requests.
- **Fix**: Allow `/health` unconditionally without origin check.

### 6.3 README & Documentation Outdated
- **Location**: [README.md](file:///c:/Users/varak/Documents/CODE/Projects/Easy%20Projects/GhostMitts/README.md)
- **Problem**: Documentation references obsolete workflows and does not document the Cloudflare Worker setup, Turso database migration instructions (`schema.sql`), or local development environment variables (`VITE_API_BASE`, `TURSO_DATABASE_URL`).
- **Fix**: Update README with step-by-step setup for both frontend and worker.

---

## 7. Action Plan Matrix

| Priority | Issue | Location | Complexity |
|---|---|---|---|
| **Critical** | Prevent infinite loop freezing browser on empty combo | `src/App.tsx` | Low |
| **Critical** | Fix guest workouts not recording to localStorage | `src/App.tsx` | Low |
| **Critical** | Fix `npm run start` script for production | `package.json`, `src/index.ts` | Low |
| **Functional** | Fix UTC date rollover bug for local streaks | `src/utils/storage.ts`, `src/App.tsx` | Medium |
| **Functional** | Remove hardcoded `k === 1` JAB assumptions | `src/scripts/combogenerator.ts` | Low |
| **Functional** | Add empty candidate fallback for step > 0 combos | `src/scripts/combogenerator.ts` | Low |
| **Functional** | Add validation feedback on Combos mode START | `src/App.tsx` | Low |
| **Functional** | Add top-level React ErrorBoundary | `src/components/ErrorBoundary.tsx`, `src/scripts/frontend.tsx` | Medium |
| **Cleanup** | Purge duplicate/stale audio files in `voicegen` | `src/public/voicegen/en-US-GuyNeural/` | Low |
| **Cleanup** | Remove orphaned `src/__config.js` | `src/__config.js` | Low |
| **Cleanup** | Clean `package.json` dependencies | `package.json` | Low |
| **Polish** | Fix OpenGraph absolute image URLs | `src/index.html` | Low |
| **Polish** | Update README with Turso & Worker instructions | `README.md` | Medium |
