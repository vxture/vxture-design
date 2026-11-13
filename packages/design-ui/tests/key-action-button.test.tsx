/**
 * Key action button semantics and interaction regression coverage.
 * @package @vxture/design-ui
 * @layer Presentation
 * @category test
 * @author AI-Generated
 * @date 2026-11-13
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "../src/components/base/form/Button";

describe("key action buttons", () => {
  it("uses the shared height and radius without changing ordinary buttons", () => {
    render(
      <>
        <Button size="action">Continue</Button>
        <Button>Ordinary</Button>
      </>,
    );
    const action = screen.getByRole("button", { name: "Continue" });
    expect(action).toHaveClass("h-control-3xl", "rounded-action");
    expect(action).not.toHaveClass("rounded-full", "rounded-md");
    expect(screen.getByRole("button", { name: "Ordinary" })).toHaveClass(
      "h-control-md",
    );
  });
  it("preserves native disabled behavior", async () => {
    const click = vi.fn();
    render(
      <Button size="action" disabled onClick={click}>
        Continue
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(click).not.toHaveBeenCalled();
  });
  it("supports a real navigation link with the same geometry", () => {
    render(
      <Button size="action" asChild>
        <a href="/login">Sign in again</a>
      </Button>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link")).toHaveClass(
      "h-control-3xl",
      "rounded-action",
    );
  });
});
