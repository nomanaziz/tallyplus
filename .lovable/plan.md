## লক্ষ্য

TanStack Start (SSR framework) সরিয়ে **Vite + React Router DOM** (pure SPA) এ migrate করা। এটাই slow loading, 404 deep-link, build/deploy fail, double-header — এই সব মূল সমস্যার root cause।

আপনার সব pages, components, design, business logic, Supabase integration — **সব ১০০% অক্ষুণ্ণ থাকবে**। শুধু routing layer পরিবর্তন হবে।

## কেন এই migration কাজ করবে

- আপনার সব pages আগে থেকেই `src/pages/` এ আছে (