# Voice Command — Pop-up সরিয়ে Toggle Button

## সমস্যা

বর্তমানে মাইক বাটনে ক্লিক করলে একটা বড় dialog/pop-up খুলে যাচ্ছে। ওই pop-up না থাকলেও recognition background-এ চলবে — কিন্তু এখন pop-up-এ ফোকাস আটকে যাচ্ছে, stop button সহজে দেখা যায় না, এবং captured items সব সময় parent list-এ পৌঁছাচ্ছে না।

## সমাধান

`VoiceFordoMic` component থেকে Dialog/Modal সম্পূর্ণ সরিয়ে দেওয়া হবে। শুধু একটা **toggle mic button** থাকবে যা:

1. **প্রথম ক্লিকে** → background-এ recording শুরু (button pulse animation, color পাল্টে যাবে — recording চলছে দেখানোর জন্য)
2. **আবার ক্লিকে** → recording stop, final transcript parse হয়ে items parent list-এ যোগ
3. **Auto-stop** → ১২ সেকেন্ড নীরবতার পর নিজে থেকেই stop হয়ে list-এ items চলে আসবে (যেটা আগে কাজ করত)
4. **No dialog** → page-এ অন্য কোথাও ক্লিক করলেও recording বন্ধ হবে না; user button চাপলে বা চুপ থাকলে তবেই বন্ধ হবে

## পরিবর্তন

### `src/components/app/VoiceFordoMic.tsx`
- Dialog, DialogContent এর সব ব্যবহার সরানো
- `open` state সরিয়ে শুধু `useSpeechRecognition`-এর `listening` state ব্যবহার
- Button-এ ক্লিক হলে: `listening ? stop() : start()` toggle
- Recording চলাকালে button-এ:
  - Color: `bg-destructive` (লাল) → recording active
  - Pulse ring animation (existing audio-level ring এর simplified version button-এর চারপাশে)
  - Icon: `MicOff` বা animated pulse dot
- Stop হলে `onFinal` callback আগের মতই items parse করে `onItems()` call করবে
- Parsing logic (হালি→পিস, ডজন→পিস ইত্যাদি) অপরিবর্তিত

### `src/lib/useSpeechRecognition.ts`
- কোনো পরিবর্তন নেই — এটা ইতিমধ্যেই auto-stop on silence এবং manual stop দুটোই handle করে

### `src/pages/f/Slug.tsx` ও অন্যান্য consumers
- `VoiceFordoMic`-এর props (`onItems`, `className`) একই — কোনো breaking change নেই, তাই কোনো edit লাগবে না

## ফলাফল

- কোনো pop-up আসবে না
- মাইক বাটন নিজেই recording indicator
- কথা বলার পর চুপ থাকলে → auto list-এ যোগ
- বাটন আবার চাপলে → তৎক্ষণাৎ stop ও list-এ যোগ
- পুরোটা একদম আগের কাজ-করা সংস্করণের মতো behavior