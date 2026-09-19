"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "../theme-toggle";

export function Navbar() {
  const pathname = usePathname();
  const onHome = pathname === "/";

  return (
    <header className="sticky top-4 z-40 mx-auto w-[min(1120px,calc(100%-1.5rem))]">
      <div className="flex h-14 items-center justify-between rounded-full border border-border bg-panel/90 px-3 shadow-[var(--shadow)] backdrop-blur-xl">
        <Link href="/" className="flex h-9 items-center gap-2 pl-2 pr-3">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-white">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M3 15c3-6 6-6 9 0s6 6 9 0"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="text-[15px] leading-none font-semibold tracking-tight text-accent">
            Aqualign
          </span>
        </Link>

        <div className="flex h-9 items-center gap-1">
          <ThemeToggle />
          {onHome ? (
            <Link href="/planner" className="btn-primary ml-1">
              Go to planner
            </Link>
          ) : (
            <Link href="/" className="btn-primary ml-1">
              Go to home page
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
