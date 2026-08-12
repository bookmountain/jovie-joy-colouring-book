"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { adminQuickSearch, type AdminSearchResult } from "@/lib/adminApi";

const TYPE_LABEL: Record<AdminSearchResult["type"], string> = {
  product: "Product",
  order: "Order",
  customer: "Customer",
  cms: "CMS",
};

export function AdminTopbar() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [items, setItems] = useState<AdminSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const statusMessage = error
    ? `Search failed: ${error}`
    : loading
      ? "Searching"
      : debouncedQuery.length >= 2
        ? `${items.length} search result${items.length === 1 ? "" : "s"}`
        : "";

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    if (debouncedQuery.length < 2) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    adminQuickSearch(debouncedQuery, 12)
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setActiveIndex(0);
      })
      .catch((reason: Error) => {
        if (!cancelled) setError(reason.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onShortcut(event: KeyboardEvent) {
      const target = event.target;
      const typing = target instanceof Element && target.matches("input, textarea, select, [contenteditable='true']");
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      } else if (!typing && event.key === "/") {
        event.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onShortcut);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onShortcut);
    };
  }, []);

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (items.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % items.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + items.length) % items.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      document.getElementById(`admin-search-result-${activeIndex}`)?.click();
    }
  }

  return (
    <div className="admin-topbar">
      <div className="qs" ref={rootRef}>
        <span aria-hidden style={{ color: "var(--admin-muted)" }}>🔍</span>
        <input
          aria-activedescendant={open && items.length > 0 ? `admin-search-result-${activeIndex}` : undefined}
          aria-autocomplete="list"
          aria-controls={open && items.length > 0 ? "admin-search-results" : undefined}
          aria-expanded={open}
          aria-label="Quick search"
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Jump to product, order, customer or CMS…"
          ref={inputRef}
          role="combobox"
          value={query}
        />
        <kbd>⌘K</kbd>
        <span className="sr-only" aria-live="polite" role="status">{statusMessage}</span>
        {open ? (
          <div className="admin-quick-results">
            {query.trim().length < 2 ? <p>Type at least 2 characters</p> : null}
            {query.trim().length >= 2 && loading ? <p>Searching…</p> : null}
            {error ? <p className="error" role="alert">{error}</p> : null}
            {!loading && !error && debouncedQuery.length >= 2 && items.length === 0 ? <p>No matches</p> : null}
            {!error && items.length > 0 ? (
              <div className="admin-quick-listbox" id="admin-search-results" role="listbox">
                {items.map((item, index) => (
                  <Link
                    aria-selected={index === activeIndex}
                    className="admin-quick-result"
                    data-active={index === activeIndex ? "true" : undefined}
                    href={item.href}
                    id={`admin-search-result-${index}`}
                    key={`${item.type}:${item.id}`}
                    onClick={() => { setOpen(false); setQuery(""); }}
                    onMouseEnter={() => setActiveIndex(index)}
                    role="option"
                  >
                    <span className="type">{TYPE_LABEL[item.type]}</span>
                    <span className="copy">
                      <strong>{item.title}</strong>
                      <small>{item.subtitle}</small>
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="actions">
        <a className="view-site" href="/" target="_blank" rel="noreferrer">View storefront ↗</a>
      </div>
    </div>
  );
}
