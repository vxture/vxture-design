/**
 * Native select wrapper and system option theme regression coverage.
 * @package @vxture/design-ui
 * @layer Presentation
 * @category test
 * @author AI-Generated
 * @date 2026-11-10
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { NativeSelect } from "../src/components/base/form/NativeSelect";

describe("NativeSelect", () => {
  it("anchors the arrow and width to the same wrapper", () => {
    render(
      <NativeSelect aria-label="Language" wrapperClassName="max-w-panel-sm">
        <option>English</option>
      </NativeSelect>,
    );
    const select = screen.getByRole("combobox");
    expect(select.parentElement).toHaveAttribute(
      "data-slot",
      "native-select-wrapper",
    );
    expect(select.parentElement).toHaveClass("relative", "max-w-panel-sm");
    expect(select.parentElement?.querySelector("svg")).toBeInTheDocument();
    expect(select).toHaveClass(
      "w-full",
      "scheme-light",
      "dark:scheme-dark",
      "[&_option]:bg-popover",
      "[&_option]:text-foreground",
    );
  });
  it("retains native selection, form values and disabled state", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <NativeSelect name="locale" aria-label="Language">
        <option value="zh">中文</option>
        <option value="en">English</option>
      </NativeSelect>,
    );
    await user.selectOptions(screen.getByRole("combobox"), "en");
    expect(screen.getByRole("combobox")).toHaveValue("en");
    rerender(
      <NativeSelect aria-label="Language" disabled>
        <option>English</option>
      </NativeSelect>,
    );
    expect(screen.getByRole("combobox")).toBeDisabled();
  });
});
