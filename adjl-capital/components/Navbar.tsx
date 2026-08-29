"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const TABS = [
  { href: "/", label: "Top 20" },
  { href: "/states", label: "All 50 States" },
  { href: "/college", label: "College Towns" },
  { href: "/defense", label: "Defense & Tech" },
  { href: "/compare", label: "Compare All" },
  { href: "/analyze", label: "⚡ Analyze Property" },
  { href: "/pipeline", label: "My Pipeline" },
];

function initials(name?: string | null) {
  if (!name) return "??";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function Navbar({ user }: { user?: { name?: string | null; email?: string | null } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <nav className="adjl-nav">
      <div className="nav-logo">
        ADJL <span>Capital</span>
      </div>

      <button
        className="nav-burger"
        aria-label="Toggle navigation"
        onClick={() => setOpen((v) => !v)}
      >
        ☰
      </button>

      <div className={`nav-tabs${open ? "" : " collapsed"}`}>
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`tb${isActive(t.href) ? " active" : ""}`}
            onClick={() => setOpen(false)}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="nav-user">
        <div className="nav-avatar" title={user?.name || user?.email || ""}>
          {initials(user?.name)}
        </div>
        <button className="nav-logout" onClick={() => signOut({ callbackUrl: "/login" })}>
          Logout
        </button>
      </div>
    </nav>
  );
}
