# Dead Code Removal Plan

1. **Clean up `src/App.tsx`**:
   - Remove unused `AuthPanel` import.
   - Remove unused refs `currentTimerDuration` and `sessionStartMs`.
   - Remove unused `preset` local variable in `flushCloudSavesOnClose`.
   - Remove `saveGenSettings` import & call (or clean up storage.ts).
   - Remove unused props passed to `LeftDisplay` (`username`, `onStreakClick`) and `ControlsColumn` (`isMobile`).

2. **Clean up `src/components/ControlsColumn.tsx`**:
   - Remove `isMobile` from `ControlsColumnProps` and destructured props.

3. **Clean up `src/components/LeftDisplay.tsx`**:
   - Remove `username` and `onStreakClick` from `LeftDisplayProps` and destructured props.

4. **Clean up `src/components/GenerationSettingsModal.tsx`**:
   - Remove `probability: 0` property from `lengthDistribution`.

5. **Clean up `src/components/StreakGridModal.tsx`**:
   - Remove `isPreAccount` and `isFuture` properties from type definitions and day object.

6. **Clean up `src/utils/storage.ts`**:
   - Remove `LS_GEN_SETTINGS` and `saveGenSettings`.

7. **Clean up `worker/src/index.ts` & Wrangler configs**:
   - Remove `/history/save` and `/history/*` routes.
   - Remove `D1_BINDING` and `R2_BUCKET` from `Env` interface.
   - Remove `[[r2_buckets]]` and `[[d1_databases]]` in `worker/wrangler.toml` and `worker/wrangler.local.toml`.

8. **Clean up `src/index.ts` and `src/__config.js`**:
   - Remove `/api/hello` and `/api/hello/:name` routes from `src/index.ts`.
   - Remove `src/__config.js`.

9. **Remove Misplaced Public Files**:
   - Remove `src/public/voicegen/gen.py` and `src/public/voicegen/requirements.txt`.

10. **Clean up `package.json`**:
    - Remove `sirv` and `vite-plugin-static-copy` from `devDependencies`.
