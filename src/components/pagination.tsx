"use client";

import { useState } from "react";

interface PaginationProps {
  currentPage: number;
  lastPage: number;
  baseUrl: string;
  paramName: string;
}

export function Pagination({
  currentPage,
  lastPage,
  baseUrl,
  paramName,
}: PaginationProps) {
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
    window.location.href = buildUrl(page);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val === "" || /^[1-9]\d*$/.test(val)) {
      setJumpPage(val);
      setError("");
    }
  }

  return (
    <div className="flex justify-center items-center gap-1 sm:gap-2 mt-6 sm:mt-8 flex-wrap">
      {currentPage > 2 && (
        <a
          href={buildUrl(1)}
          className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-md bg-secondary text-xs sm:text-sm hover:bg-secondary/80 transition-colors"
        >
          First
        </a>
      )}
      {currentPage > 1 && (
        <a
          href={buildUrl(currentPage - 1)}
          className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-md bg-secondary text-xs sm:text-sm hover:bg-secondary/80 transition-colors"
        >
          Prev
        </a>
      )}

      <form onSubmit={handleJump} className="flex items-center gap-1">
        <input
          type="text"
          value={jumpPage}
          onChange={handleChange}
          placeholder={String(currentPage)}
          className="w-12 sm:w-16 px-1.5 sm:px-2 py-1.5 sm:py-2 rounded-md bg-secondary text-xs sm:text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <span className="text-xs sm:text-sm text-muted-foreground">
          / {lastPage}
        </span>
      </form>

      {error && (
        <span className="text-[10px] sm:text-xs text-destructive w-full text-center">
          {error}
        </span>
      )}

      {currentPage < lastPage && (
        <a
          href={buildUrl(currentPage + 1)}
          className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-md bg-secondary text-xs sm:text-sm hover:bg-secondary/80 transition-colors"
        >
          Next
        </a>
      )}
      {currentPage < lastPage - 1 && (
        <a
          href={buildUrl(lastPage)}
          className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-md bg-secondary text-xs sm:text-sm hover:bg-secondary/80 transition-colors"
        >
          Last
        </a>
      )}
    </div>
  );
}
