import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { ShellPreferencePanel } from "../src/components/shell/ShellChrome";

it("owns the five preference rows and uses the existing locale pattern", async () => {
  const width = vi.fn(),
    locale = vi.fn();
  const { container } = render(
    <ShellPreferencePanel
      locale="en"
      localeOptions={[
        { locale: "en", nativeName: "English" },
        { locale: "fr", nativeName: "French" },
      ]}
      theme="system"
      contentWidth="default"
      onContentWidthChange={width}
      onLocaleChange={locale}
      onThemeChange={() => {}}
      labels={{ contentWidth: "Content width" }}
    />,
  );
  expect(container.firstElementChild?.children).toHaveLength(5);
  const groups = screen.getAllByRole("radiogroup");
  expect(groups).toHaveLength(4);
  for (const group of groups) {
    expect(group.className).toContain("h-control-xl");
    expect(group.className).toContain("p-(--border-width-medium)");
    const selected = group.querySelector('[aria-checked="true"]')!;
    expect(selected.className).toContain("bg-primary-muted");
    expect(selected.className).toContain("text-label-small");
    expect(selected.className).not.toContain("h-full");
  }
  await userEvent.click(
    within(screen.getByRole("radiogroup", { name: "Content width" })).getByRole(
      "radio",
      { name: "Wide" },
    ),
  );
  expect(width).toHaveBeenCalledWith("wide");
  await userEvent.click(
    screen.getByRole("button", { name: "Select language" }),
  );
  await userEvent.click(
    await screen.findByRole("menuitemradio", { name: /French/ }),
  );
  expect(locale).toHaveBeenCalledWith("fr");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("keeps width optional and requires its callback", () => {
  const props = {
    locale: "en",
    theme: "system" as const,
    onLocaleChange: vi.fn(),
    onThemeChange: vi.fn(),
  };
  const view = render(<ShellPreferencePanel {...props} />);
  expect(screen.getAllByRole("radiogroup")).toHaveLength(3);
  view.rerender(<ShellPreferencePanel {...props} contentWidth="wide" />);
  expect(screen.getAllByRole("radiogroup")).toHaveLength(3);
});
