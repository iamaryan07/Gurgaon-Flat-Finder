"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/prediction", label: "Prediction" },
  { href: "/analysis", label: "Analysis" },
  { href: "/recommendation", label: "Recommendation" },
  { href: "/insights", label: "Insights" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="navbar">
      <Link className="brand" href="/prediction">
        <span>GP</span>
        Gurgaon Property Lens
      </Link>
      <nav className="nav-links" aria-label="Primary">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link${active ? " active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
