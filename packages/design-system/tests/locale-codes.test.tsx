import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import {
  ShellPreferencePanel,
  ShellLocaleSwitcher,
  LocaleSelectPanel,
} from "../src/components/shell/ShellChrome";

it("products supply only supported codes while DS supplies marks and names", async () => {
  const change = vi.fn();
  render(
    <ShellPreferencePanel
      locale="zh-CN"
      locales={["zh-CN", "en-US"]}
      theme="system"
      onLocaleChange={change}
      onThemeChange={() => {}}
    />,
  );
  const trigger = screen.getByRole("button", { name: "Select language" });
  expect(trigger).toHaveTextContent("CN");
  expect(trigger).toHaveTextContent("\u7b80\u4f53\u4e2d\u6587");
  await userEvent.click(trigger);
  expect(screen.getAllByRole("menuitemradio")).toHaveLength(2);
  await userEvent.click(
    screen.getByRole("menuitemradio", { name: /English/ }),
  );
  expect(change).toHaveBeenCalledWith("en-US");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
it("code list is authoritative, deduplicated and supports display overrides", async () => {
  render(
    <ShellLocaleSwitcher
      variant="field"
      currentLocale="zh-CN"
      locales={["zh-CN", "zh-CN"]}
      options={[
        { locale: "zh-CN", nativeName: "Custom", flag: "Z" },
        { locale: "en-US", nativeName: "Unexpected" },
      ]}
      onLocaleChange={() => {}}
    />,
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Select language" }),
  );
  expect(screen.getAllByRole("menuitemradio")).toHaveLength(1);
  expect(screen.getByRole("menuitemradio")).toHaveTextContent("ZCustom");
});
it("unknown languages fall back to the code without inventing a country", () => {
  render(
    <LocaleSelectPanel
      activeLocale="xx"
      locales={["xx"]}
      onSelect={() => {}}
    />,
  );
  expect(screen.getByRole("menuitemradio")).toHaveTextContent("xx");
});
