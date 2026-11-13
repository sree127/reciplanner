"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Recipes" },
  { href: "/lists", label: "Lists" },
  { href: "/household", label: "Household" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="-mb-px flex gap-6">
      {LINKS.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`border-b-2 pb-2.5 text-sm font-semibold ${
              active ? "border-orange-600 text-orange-700" : "border-transparent text-stone-500"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
