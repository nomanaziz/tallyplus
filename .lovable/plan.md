## Problem

On the public fordo page (`src/pages/f/Slug.tsx`):
1. **Voice mic auto-stops too early.** While speaking, the recognizer ends and the dialog closes mid-sentence. Cause: in `src/lib/useSpeechRecognition.ts`, every interim result starts a 1.5s "silence" timer that stops recognition the moment the speaker pauses briefly between items — even though the user is clearly still talking.
2. **"আরও পণ্য যোগ করুন" button is too big** (full width, primary/outline style) — looks heavy inside the card.
3. **"কার্ডের রং" (card color) picker is unwanted** in the public form.

## Changes

### 1. Voice: stop auto-disconnecting mid-speech
File: `src/lib/useSpeechRecognition.ts`

- Increase silence-after-speech threshold from `1500ms` → `12000ms` (~12s) and rename usage so the new default matches the user request ("disconnect only after 10–15s of true silence").
- Update the `VoiceFordoMic` caller (`src/components/app/VoiceFordoMic.tsx`) to pass `silenceTimeoutMs: 12000` and `noSpeechTimeoutMs: 15000`, and update the helper text from "১০ সেকেন্ড" to "১২ সেকেন্ড নীরব থাকলে বন্ধ হবে"।
- Keep the existing manual "বন্ধ করুন" button so the user can stop whenever they want.

This solves the "কথা হচ্ছে but stop হয়ে যাচ্ছে" issue — the recognizer will only close after ~12s of real silence, not after every short pause between item names.

### 2. Smaller, cleaner "Add more product" button
File: `src/pages/f/Slug.tsx`

Replace the full-width outline `<Button>` with a compact, subtle inline button:
- Smaller size (`size="sm"`), auto width, left-aligned (not `w-full`).
- Lighter visual weight (`variant="ghost"` with a dashed border or muted background) so it sits nicely under the item rows.
- Keep the `+` icon and label "আরও পণ্য যোগ করুন".

### 3. Remove the card color picker
File: `src/pages/f/Slug.tsx`

- Delete the entire "কার্ডের রং" block (the `<div className="mt-5">` containing the PALETTE swatches around lines 530–543).
- Keep the note (নোট) textarea — user explicitly wants to keep it.
- Keep `color` state and the `palette` styling on the card so the card still has its current pleasant background; just remove the user-facing chooser. (Default stays `"mint"`.)
- The `color` value is still submitted with the form, so backend behaviour is unchanged.

## Out of scope

- No changes to login/PIN, customer info section, submit button, or backend.
- No changes to the merchant-side voice flow (only the public fordo page reported the issue).
