import { describe, expect, test } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import CustomersPage from "@/app/admin/customers/page";
import NotifyMePage from "@/app/admin/notify-me/page";
import SubscribersPage from "@/app/admin/subscribers/page";

describe("placeholder admin pages", () => {
  test("CustomersPage renders heading and roadmap copy", () => {
    cleanup();
    render(<CustomersPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Customers" })).toBeTruthy();
    expect(screen.getByText(/orders & customers spec/i)).toBeTruthy();
  });
  test("NotifyMePage renders heading and roadmap copy", () => {
    cleanup();
    render(<NotifyMePage />);
    expect(screen.getByRole("heading", { level: 1, name: "Notify me" })).toBeTruthy();
    expect(screen.getByText(/orders & customers spec/i)).toBeTruthy();
  });
  test("SubscribersPage renders heading and roadmap copy", () => {
    cleanup();
    render(<SubscribersPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Subscribers" })).toBeTruthy();
    expect(screen.getByText(/orders & customers spec/i)).toBeTruthy();
  });
});
