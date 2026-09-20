import { WaveMark } from "@/components/brand/wave-mark";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="mx-auto mt-8 w-full max-w-6xl px-6 pb-10">
      <div className="grid gap-4 border-t border-border pt-8 text-sm text-muted sm:grid-cols-3 sm:items-center">
        <p className="flex items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-white">
            <WaveMark />
          </span>
          <span>© 2026 Harmony. Differentiable fleet planning for ocean cleanup.</span>
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
          <a className="hover:text-foreground" href="https://d32eo4z8j4qsxd.cloudfront.net">
            Live on CloudFront
          </a>
          <span className="mx-2">·</span>
          Made with <span className="text-accent">♥</span> by Titan
        </p>
      </div>
    </footer>
  );
}
