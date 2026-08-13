import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Faq } from "@/lib/api";

const faqs: Faq[] = [
  {
    slug: "where-buy-physical",
    question: "Where can I buy physical books?",
    answer: "Physical-book answer.",
    links: [
      { label: "Amazon", href: "https://www.amazon.com/" },
      { label: "Penguin Random House", href: "https://www.penguinrandomhouse.com/" },
    ],
    group: null,
    sortIndex: 0,
  },
  {
    slug: "where-buy-digital",
    question: "Where can I buy digital pages?",
    answer: "Digital answer.",
    links: [{ label: "Etsy", href: "https://www.etsy.com/" }],
    group: null,
    sortIndex: 1,
  },
];

vi.mock("@/data/faqs", () => ({ getFaqs: vi.fn(async () => faqs) }));
vi.mock("@/data/content", () => ({ getFaqArtwork: vi.fn(async () => null) }));

import { FaqAccordion } from "@/components/content/faq-accordion";
import { FaqPreview } from "@/components/content/faq-preview";

describe("FAQ retailer removal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not render Amazon or Penguin buttons on the full FAQ page", async () => {
    render(await FaqAccordion());

    expect(screen.queryByRole("link", { name: "Amazon" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Penguin Random House" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Etsy" })).toHaveAttribute("href", "https://www.etsy.com/");
  });

  it("does not render retailer buttons in the homepage FAQ preview", async () => {
    render(await FaqPreview());

    expect(screen.queryByRole("link", { name: "Amazon" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Penguin Random House" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Etsy" })).not.toBeInTheDocument();
  });
});
