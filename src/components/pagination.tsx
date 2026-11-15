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
  "inline-flex min-h-10 min-w-10 items-center justify-center px-1 text-base text-muted-foreground transition-colors hover:text-foreground motion-reduce:transition-none";

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
      className="flex justify-center items-center gap-x-4 gap-y-2 mt-8 sm:mt-10 flex-wrap"
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

      <form onSubmit={handleJump} className="flex items-center gap-2">
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
          className="h-10 w-14 border-0 border-b border-control bg-transparent px-0.5 text-base text-center aria-invalid:border-destructive"
        />
        <span
          aria-hidden="true"
          className="text-base text-muted-foreground"
        >
          / {lastPage}
        </span>
      </form>

      {error && (
        <span
          id={errorId}
          role="alert"
          className="text-[15px] text-vermilion w-full text-center order-last"
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
