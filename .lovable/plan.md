# Plan: পুরো App এর জন্য Color Theme সিস্টেম

## যা করব

পুরো অ্যাপের (homepage, app pages, online-shop সহ সব) জন্য একটা global color theme switcher। User চাইলে যেকোনো জায়গা থেকে color পাল্টাবে আর সব পেজে সাথে সাথে effect হবে।

### ৫টা Color Theme

1. **Green** — সবুজ (default)
2. **Blue** — নীল
3. **Red** — লাল
4. **Yellow** — হলুদ
5. **Soft Dark** — হালকা ash/dark (একদম pitch-black না, soft slate; চোখের জন্য আরাম)

প্রতিটা theme এর জন্য `--primary`, `--ring`, `--accent`, `--sidebar-primary`, `--sidebar-ring` সেমান্টিক টোকেনগুলো একসাথে আপডেট হবে। কারণ পুরো অ্যাপ ইতিমধ্যে এই tokens ব্যবহার করে (`bg-primary`, `text-primary` ইত্যাদি), তাই একটাই জায়গায় change করলে সর্বত্র effect হবে।

### সিস্টেম কীভাবে কাজ করবে

1. `<html>` element-এ একটা `data-theme` attribute set হবে: `green | blue | red | yellow | soft-dark`।
2. `src/styles.css`-এ প্রত্যেক theme এর জন্য `[data-theme="..."]` selector দিয়ে primary/accent/ring tokens override করব। বাকি tokens (background, foreground, card) যেমন আছে তেমনই থাকবে — শুধু accent color পাল্টাবে।
3. **Soft Dark** আলাদা — এতে background-foreground দুটোই পাল্টাবে: pure black (`oklch(0.129...)`) না দিয়ে soft slate (`oklch(0.22 0.015 250)` মতো ash tone) ব্যবহার করব যাতে white text চোখে লাগে না।
4. Default = **green**। প্রথমবার লোড হলে localStorage এ কিছু না থাকলে green সেট হবে।

### Provider

`src/lib/theme.tsx` — নতুন `ThemeProvider`:
- State: `theme: "green" | "blue" | "red" | "yellow" | "soft-dark"`
- localStorage key: `tp_theme_color`
- Mount-এ saved theme load করবে, না থাকলে `green`
- `useTheme()` hook দিয়ে যেকোনো component theme পাবে/পাল্টাতে পারবে
- `<html data-theme="...">` set করবে এবং soft-dark হলে `.dark` class-ও add করবে (Tailwind dark variant এর জন্য)

`__root.tsx` এ `<ThemeProvider>` দিয়ে সব wrap করব।

### UI — কোথায় থেকে পাল্টাবে

1. **SettingsSheet-এ** নতুন "App Color" row — ৫টা color swatch (গোল circle), select করলেই সাথে সাথে apply। বর্তমান light/dark dropdown টা remove হবে, কারণ soft-dark সেটা cover করছে।
2. **AppTopbar-এ** একটা ছোট palette icon button — ক্লিক করলে popover খুলবে ৫টা color swatch নিয়ে, এক ক্লিকে switch।
3. (Site/landing page এর header-ও একই button পাবে যাতে homepage থেকেও পাল্টানো যায়।)

## টেকনিক্যাল ডিটেইলস

### `src/styles.css` পরিবর্তন

```css
/* Default green theme — :root token override */
:root, [data-theme="green"] {
  --primary: oklch(0.62 0.18 145);     /* emerald green */
  --primary-foreground: oklch(0.99 0 0);
  --ring: oklch(0.62 0.18 145);
  --accent: oklch(0.94 0.05 145);
  --sidebar-primary: oklch(0.62 0.18 145);
  --sidebar-ring: oklch(0.62 0.18 145);
}

[data-theme="blue"] {
  --primary: oklch(0.55 0.20 255);
  --ring: oklch(0.55 0.20 255);
  --accent: oklch(0.94 0.05 255);
  --sidebar-primary: oklch(0.55 0.20 255);
  --sidebar-ring: oklch(0.55 0.20 255);
}

[data-theme="red"]    { /* primary: oklch(0.58 0.22 25)  — coral red */ }
[data-theme="yellow"] { /* primary: oklch(0.78 0.17 90)  — amber */ }

/* Soft Dark — overrides background tokens too */
html.dark[data-theme="soft-dark"],
[data-theme="soft-dark"] {
  --background: oklch(0.22 0.012 250);     /* soft ash, not pitch black */
  --foreground: oklch(0.92 0.005 250);     /* slightly off-white */
  --card: oklch(0.27 0.014 250);
  --card-foreground: oklch(0.92 0.005 250);
  --popover: oklch(0.27 0.014 250);
  --popover-foreground: oklch(0.92 0.005 250);
  --muted: oklch(0.30 0.014 250);
  --muted-foreground: oklch(0.72 0.012 250);
  --border: oklch(1 0 0 / 8%);
  --primary: oklch(0.72 0.16 145);   /* still green-tinted accent on dark */
  --sidebar: oklch(0.25 0.013 250);
  /* etc. */
}
```

### `src/lib/theme.tsx` (নতুন ফাইল)

```tsx
type AppColor = "green" | "blue" | "red" | "yellow" | "soft-dark";
const KEY = "tp_theme_color";

export function ThemeProvider({ children }) {
  const [color, setColor] = useState<AppColor>("green");
  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as AppColor) || "green";
    apply(saved); setColor(saved);
  }, []);
  const change = (c: AppColor) => {
    apply(c); setColor(c); localStorage.setItem(KEY, c);
  };
  return <Ctx.Provider value={{ color, setColor: change }}>{children}</Ctx.Provider>;
}

function apply(c: AppColor) {
  document.documentElement.setAttribute("data-theme", c);
  document.documentElement.classList.toggle("dark", c === "soft-dark");
}
```

### নতুন Component: `ColorThemePicker.tsx`

৫টা swatch button:
- Green ●  Blue ●  Red ●  Yellow ●  Soft Dark ●
- Active swatch এ ring/border highlighting।
- ছোট popover variant (Topbar) + inline grid variant (SettingsSheet)।

### Files

**নতুন:**
- `src/lib/theme.tsx`
- `src/components/app/ColorThemePicker.tsx`

**সম্পাদনা:**
- `src/styles.css` — প্রতি theme এর tokens
- `src/routes/__root.tsx` — `<ThemeProvider>` wrap
- `src/components/app/SettingsSheet.tsx` — old theme dropdown remove → ColorThemePicker (inline)
- `src/components/app/AppTopbar.tsx` — palette icon popover
- `src/components/site/SiteHeader.tsx` — homepage header-এ same icon

## ফলাফল

User এক ক্লিকে পুরো অ্যাপের accent color পাল্টাতে পারবে — homepage, dashboard, online-shop, sidebar, button, link, form ring, sidebar highlight সব এক সাথে update হবে। Choice survive করবে browser refresh-এও। Soft-dark mode-এ background pitch-black না হয়ে comfortable ash-dark হবে।