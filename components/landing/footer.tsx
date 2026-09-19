import Link from "next/link";

export function Footer() {
  return (
    <footer className="mx-auto mt-8 w-full max-w-6xl px-6 pb-10">
      <div className="grid gap-4 border-t border-border pt-8 text-sm text-muted sm:grid-cols-3 sm:items-center">
        <p className="flex items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-[10px] text-white">
            ~
          </span>
          <span>© 2026 Aqualign. Differentiable fleet planning. No boats stored.</span>
        </p>
        <nav className="flex items-center gap-4 sm:justify-center">
          <Link className="hover:text-foreground" href="/privacy">
            Privacy Policy
          </Link>
          <span aria-hidden>·</span>
          <Link className="hover:text-foreground" href="/terms">
            Terms of Service
          </Link>
        </nav>
        <p className="sm:text-right">
          Made with <span className="text-accent">♥</span> by Titan
        </p>
      </div>
    </footer>
  );
}
