import { NavLinks } from "./nav-links";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col md:max-w-3xl">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-stone-50/90 px-5 pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur">
        <div className="flex items-center gap-2 pb-2">
          <span aria-hidden className="text-xl">🍲</span>
          <span className="text-lg font-bold text-stone-900">Reciplanner</span>
        </div>
        <NavLinks />
      </header>
      <main className="flex-1 space-y-4 px-5 py-5 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
        {children}
      </main>
    </div>
  );
}
