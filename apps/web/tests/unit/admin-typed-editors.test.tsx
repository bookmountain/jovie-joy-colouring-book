import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HomeIntroBlock } from "@/components/admin/blocks/HomeIntroBlock";
import { HomeCozyMomentsHeaderBlock } from "@/components/admin/blocks/HomeCozyMomentsHeaderBlock";
import { FooterContactBlock } from "@/components/admin/blocks/FooterContactBlock";
import { HeaderBrandBlock } from "@/components/admin/blocks/HeaderBrandBlock";
import { NewsletterCopyBlock } from "@/components/admin/blocks/NewsletterCopyBlock";

describe("HomeIntroBlock", () => {
  test("emits updated title on change", () => {
    const onChange = vi.fn();
    render(<HomeIntroBlock blockKey="home.intro" type="HomeIntro" data={{ title: "Old", body: "" }} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue("Old"), { target: { value: "New" } });
    expect(onChange).toHaveBeenCalledWith({ title: "New", body: "" });
  });
});

describe("HomeCozyMomentsHeaderBlock", () => {
  test("emits heading", () => {
    const onChange = vi.fn();
    render(<HomeCozyMomentsHeaderBlock blockKey="x" type="HomeCozyMomentsHeader" data={{ heading: "Old" }} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue("Old"), { target: { value: "New" } });
    expect(onChange).toHaveBeenCalledWith({ heading: "New" });
  });
});

describe("FooterContactBlock", () => {
  test("emits customer-care email change", () => {
    const onChange = vi.fn();
    const data = { customerCareEmail: "old@x.com", customerCareLabel: "Customer Care", licensingLabel: "Licensing", licensingEmail: "studio@x.com", blurb: "Hi" };
    render(<FooterContactBlock blockKey="x" type="FooterContact" data={data} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue("old@x.com"), { target: { value: "new@x.com" } });
    expect(onChange).toHaveBeenCalledWith({ ...data, customerCareEmail: "new@x.com" });
  });
});

describe("HeaderBrandBlock", () => {
  test("emits brand name", () => {
    const onChange = vi.fn();
    render(<HeaderBrandBlock blockKey="x" type="HeaderBrand" data={{ name: "Old" }} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue("Old"), { target: { value: "New" } });
    expect(onChange).toHaveBeenCalledWith({ name: "New" });
  });
});

describe("NewsletterCopyBlock", () => {
  test("emits CTA label", () => {
    const onChange = vi.fn();
    render(<NewsletterCopyBlock blockKey="x" type="NewsletterCopy" data={{ ctaLabel: "Sub" }} onChange={onChange} />);
    fireEvent.change(screen.getByDisplayValue("Sub"), { target: { value: "Join" } });
    expect(onChange).toHaveBeenCalledWith({ ctaLabel: "Join" });
  });
});
