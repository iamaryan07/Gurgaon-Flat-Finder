"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { IconClose, IconMenu, LogoMark } from "@/components/icons";

const links = [
  { href: "/prediction", label: "Prediction" },
  { href: "/analysis", label: "Market" },
  { href: "/recommendation", label: "Recommendations" },
  { href: "/insights", label: "Insights" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link className="brand" href="/" aria-label="Gurgaon Property Lens home">
          <span className="brand-mark">
            <LogoMark size={19} />
          </span>
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
        <div className="nav-cta-group">
          <Link className="btn" href="/prediction" style={{ padding: "10px 20px", fontSize: 14 }}>
            Get an estimate
          </Link>
        </div>
        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <IconClose /> : <IconMenu />}
        </button>
      </div>
      <div id="mobile-nav" className={`mobile-menu${open ? " open" : ""}`}>
        <div className="container">
          <nav aria-label="Mobile">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={active ? "active" : ""}
                  aria-current={active ? "page" : undefined}
                  onClick={close}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link href="/" onClick={close}>
              Home
            </Link>
          </nav>
          <Link className="btn btn-block" href="/prediction" onClick={close}>
            Get an estimate
          </Link>
        </div>
      </div>
    </header>
  );
}
