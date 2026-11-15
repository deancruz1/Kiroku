"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  baseUrl: string;
  paramName: string;
}

const LINK_CLASS =
  "px-2 sm:px-3 py-1.5 sm:py-2 rounded-md bg-secondary text-xs sm:text-sm hover:bg-secondary/80 transition-colors";

export function Pagination({
  currentPage,
  lastPage,
  baseUrl,
  paramName,
}: PaginationProps) {
  const router = useRouter();
  const inputId = useId();
  const errorId = useId();
  const [jumpPage, setJumpPage] = useState("");
  const [error, setError] = useState("");

  function buildUrl(page: number) {
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}${paramName}=${page}`;
  }

  function handleJump(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = jumpPage.trim();

    if (!trimmed) {
      setError("Enter a page number");
      return;
    }

    const page = parseInt(trimmed, 10);

    if (isNaN(page) || page < 1 || page > lastPage || !Number.isInteger(page)) {
      setError(`Enter 1–${lastPage}`);
      return;
    }

    if (page === currentPage) {
      setError("Already on this page");
      return;
    }

    setError("");
    setJumpPage("");
    router.push(buildUrl(page));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val === "" || /^[1-9]\d*$/.test(val)) {
      setJumpPage(val);
      setError("");
    }
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex justify-center items-center gap-1 sm:gap-2 mt-6 sm:mt-8 flex-wrap"
    >
      {currentPage > 2 && (
        <Link href={buildUrl(1)} aria-label="First page" className={LINK_CLASS}>
          First
        </Link>
      )}
      {currentPage > 1 && (
        <Link
          href={buildUrl(currentPage - 1)}
          aria-label="Previous page"
          className={LINK_CLASS}
        >
          Prev
        </Link>
      )}

      <form onSubmit={handleJump} className="flex items-center gap-1">
        <label htmlFor={inputId} className="sr-only">
          Go to page (currently page {currentPage} of {lastPage})
        </label>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          value={jumpPage}
          onChange={handleChange}
          placeholder={String(currentPage)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="w-12 sm:w-16 px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-md bg-secondary text-xs sm:text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <span
          aria-hidden="true"
          className="text-xs sm:text-sm text-muted-foreground"
        >
          / {lastPage}
        </span>
      </form>

      {error && (
        <span
          id={errorId}
          role="alert"
          className="text-[10px] sm:text-xs text-destructive w-full text-center"
        >
          {error}
        </span>
      )}

      {currentPage < lastPage && (
        <Link
          href={buildUrl(currentPage + 1)}
          aria-label="Next page"
          className={LINK_CLASS}
        >
          Next
        </Link>
      )}
      {currentPage < lastPage - 1 && (
        <Link
          href={buildUrl(lastPage)}
          aria-label="Last page"
          className={LINK_CLASS}
        >
          Last
        </Link>
      )}
    </nav>
  );
}
