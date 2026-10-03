import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  TenantInfoOneline,
  TenantInfoSimple,
  UserInfoOneline,
  UserInfoSimple,
} from "../src/components/shell/IdentityInfo";

const classes = (element: Element) =>
  (element as HTMLElement).className.split(" ").filter(Boolean);

describe("TenantInfo", () => {
  it("simple renders the name and tenant id as a two-line identity", () => {
    render(<TenantInfoSimple name="Acme" tenantId="T-001" />);

    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("T-001")).toBeInTheDocument();
    expect(classes(screen.getByText("T-001"))).toContain("text-label-micro");
  });

  it("oneline defaults to the Figma 24px shape", () => {
    const { container } = render(<TenantInfoOneline name="Acme" />);
    const root = container.firstElementChild as HTMLElement;

    expect(classes(root)).toEqual(
      expect.arrayContaining(["inline-flex", "h-control-md", "gap-xs"]),
    );
    expect(screen.getByText("Acme")).toBeInTheDocument();
  });

  it("oneline sm follows the 20px body line and uses the small identity mark", () => {
    const { container } = render(<TenantInfoOneline name="Acme" size="sm" />);
    const root = container.firstElementChild as HTMLElement;
    const mark = root.firstElementChild as HTMLElement;

    expect(classes(root)).toEqual(
      expect.arrayContaining(["inline-flex", "min-h-control-sm", "gap-2xs"]),
    );
    expect(classes(mark)).toContain("size-icon-sm");
  });
});

describe("UserInfo", () => {
  it("simple renders the name, phone, and default avatar", () => {
    render(<UserInfoSimple name="Ada" phone="18000000000" />);

    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("18000000000")).toBeInTheDocument();
    expect(document.querySelector(".size-icon-lg")).toBeInTheDocument();
  });

  it("oneline sm is suitable for inline body content", () => {
    const { container } = render(
      <p>
        Owner: <UserInfoOneline name="Ada" size="sm" />
      </p>,
    );
    const root = container.querySelector("span.inline-flex") as HTMLElement;
    const mark = root.firstElementChild as HTMLElement;

    expect(root).toBeInTheDocument();
    expect(classes(root)).toEqual(expect.arrayContaining(["min-h-control-sm"]));
    expect(classes(mark)).toContain("size-icon-sm");
    expect(screen.queryByText("18000000000")).not.toBeInTheDocument();
  });

  it("accepts a custom fallback without changing the layout contract", () => {
    render(
      <UserInfoOneline
        name="Ada"
        size="sm"
        avatarFallback="A"
        avatarAlt="Ada avatar"
      />,
    );

    expect(document.querySelector(".size-icon-sm")).toBeInTheDocument();
  });
});
