## Goal
Finalize the two repeated issues:
1. Desktop Chrome install should trigger the real install flow when available instead of always falling back to instructions.
2. Mobile Fordo voice input should stop rapidly turning the mic on/off and behave reliably on phones.

## What I found
- Your screenshot and my browser checks both confirm the app-level install buttons are visible.
- Clicking those buttons currently opens the fallback desktop instruction modal instead of a native install prompt.
- The published site is serving a valid manifest and `sw.js`, so the missing native prompt is a detection/installability problem, not a missing button problem.
- The current speech implementation opens extra microphone access through `useMicLevel()` while `SpeechRecognition` is also using the mic. That double mic usage is a likely cause of mobile Chrome repeatedly stopping/restarting.
- The current speech hook also restarts recognition aggressively, which is more fragile on mobile than on desktop.

## Plan
### 1) Fix desktop install flow
- Audit the current `usePwaInstall` hook and install button behavior.
- Improve detection so the UI distinguishes between:
  - native install prompt available now
  - installable but browser did not expose `beforeinstallprompt`
  - unsupported / already installed
- Add stronger desktop fallback behavior:
  - keep the button visible
  - show clearer status text for Chrome/Edge/Brave
  - avoid implying the prompt is unavailable when it may simply not have fired yet
- Add lightweight runtime diagnostics so we can confirm whether `beforeinstallprompt` is firing on the user’s machine on the next report.
- Verify behavior on the published domain and make the fallback copy match Chrome’s actual install paths.

### 2) Stabilize mobile Fordo voice input
- Refactor `useSpeechRecognition` for mobile-safe behavior:
  - prevent overlapping start/stop/restart cycles
  - separate manual stop from auto-recovery
  - reduce restart thrashing on Android Chrome
  - handle permission and no-speech states more gracefully
- Remove the extra microphone stream conflict during dictation UI:
  - stop `useMicLevel()` from competing with speech recognition on mobile, or gate/replace it while recording
- Update `VoiceFordoMic` to use a mobile-optimized recognition mode with steadier continuous capture.
- Apply the same stability improvements to reusable text dictation where appropriate, without breaking the desktop experience.

### 3) Verify end-to-end
- Test desktop published install behavior again.
- Test mobile-sized Fordo voice interaction in the browser tools as far as supported.
- Confirm the UI gives accurate feedback when install prompt or mic permission is not available.

## Technical details
Files likely involved:
- `src/hooks/use-pwa-install.ts`
- `src/components/app/InstallAppPrompt.tsx`
- `src/components/site/SiteHeader.tsx`
- `src/lib/useSpeechRecognition.ts`
- `src/components/app/VoiceFordoMic.tsx`
- `src/components/app/VoiceTextMic.tsx`
- `src/lib/useMicLevel.ts`

Implementation notes:
- I will preserve the existing manifest/service-worker approach and improve install detection/UX rather than replacing the whole PWA setup.
- For voice, the main change will be making mobile recognition single-owner of the microphone during dictation, because the current visual mic-level analyzer likely conflicts with speech capture on phones.
- If needed, I’ll add temporary logging to capture why Chrome is not exposing the native install prompt in your environment.

## Expected result
- Desktop users will either get the actual install flow when Chrome exposes it, or a more accurate fallback with less confusion.
- Mobile Fordo dictation will stop flickering on/off and become much more reliable for continuous list creation.