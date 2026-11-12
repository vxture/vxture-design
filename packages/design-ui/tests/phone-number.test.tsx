/**
 * Phone display preserves data while distinguishing the country calling code.
 * @package @vxture/design-ui
 * @layer Presentation
 * @category test
 * @author AI-Generated
 * @date 2026-11-12
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PhoneNumber } from "../src/components/composite/data/PhoneNumber";

describe("PhoneNumber", () => {
  it("keeps an explicit space and a muted country code", () => {
    const { container } = render(
      <PhoneNumber callingCode="+86" number="188 8888 8888" />,
    );
    const root = container.querySelector('[data-slot="phone-number"]')!;
    expect(root.textContent).toBe("+86 188 8888 8888");
    expect(screen.getByText("+86")).toHaveClass("text-muted-foreground");
    expect(screen.getByText("188 8888 8888")).toHaveClass("text-foreground");
    expect(root).toHaveAttribute("dir", "ltr");
  });
  it("preserves masked or unknown content without a fabricated country code", () => {
    const { container } = render(<PhoneNumber number="188****8888" />);
    expect(container.textContent).toBe("188****8888");
    expect(container.querySelector(".text-muted-foreground")).toBeNull();
  });
});
