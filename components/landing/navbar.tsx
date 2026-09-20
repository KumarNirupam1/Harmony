"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "../theme-toggle";
import { WaveMark } from "../brand/wave-mark";

export function Navbar() {
  const pathname = usePathname();
  const onHome = pathname === "/";

  return (
    <header className="fixed top-4 z-40 mx-auto w-[min(1120px,calc(100%-1.5rem))] inset-x-0">
      <div className="flex h-14 items-center justify-between rounded-full border border-border bg-panel/90 px-3 shadow-[var(--shadow)] backdrop-blur-xl">
        <Link href="/" className="flex h-9 items-center gap-2 pl-2 pr-3">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-white">
            <WaveMark />
          </span>
          <span className="text-[15px] leading-none font-semibold tracking-tight text-accent">
            Harmony
          </span>
        </Link>

        {onHome && (
          <nav className="hidden items-center gap-6 text-xs font-medium text-muted md:flex">
            <a className="hover:text-foreground" href="#playground">
              Live map
            </a>
            <a className="hover:text-foreground" href="#how">
              How it works
            </a>
            <Link className="hover:text-foreground" href="/architecture">
              Architecture
            </Link>
          </nav>
        )}

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
