"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("aqualign-theme", next ? "dark" : "light");
    setDark(next);
  }

  return (
    <button
      type="button"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={toggle}
      className="grid h-9 w-9 place-items-center rounded-full text-foreground/70 transition hover:bg-panel-2"
    >
      {dark ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M12 3v1.6M12 19.4V21M4.2 12H3M21 12h-1.2M6.1 6.1l-1.1-1.1M19 19l-1.1-1.1M17.9 6.1 19 5M5 19l1.1-1.1"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M16.5 13.2A6.5 6.5 0 0 1 10.8 5a7 7 0 1 0 8.7 8.7 6.4 6.4 0 0 1-3-0.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
