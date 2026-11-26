import { act, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import {
  ContentWidthProvider,
  ContentWidthContainer,
  useContentWidth,
} from "../src/theme/contentWidth";
import { ShellPreferencePanel } from "../src/components/shell/ShellChrome";
function Probe() {
  const width = useContentWidth();
  return (
    <>
      <button onClick={() => width.setValue("wide")}>Wide choice</button>
      <ContentWidthContainer>
        <span>{width.value}</span>
      </ContentWidthContainer>
    </>
  );
}
beforeEach(() => localStorage.clear());
it("restores saved defaults and synchronizes independent same-origin providers", () => {
  localStorage.setItem("vx-content-width", "narrow");
  const view = render(
    <>
      <ContentWidthProvider>
        <Probe />
      </ContentWidthProvider>
      <ContentWidthProvider>
        <Probe />
      </ContentWidthProvider>
    </>,
  );
  expect(screen.getAllByText("narrow")).toHaveLength(2);
  expect(view.container.querySelector("[data-content-width]")).toHaveStyle({
    maxWidth: "1200px",
  });
  act(() => screen.getAllByText("Wide choice")[0]!.click());
  expect(screen.getAllByText("wide")).toHaveLength(2);
  expect(localStorage.getItem("vx-content-width")).toBe("wide");
  act(() => {
    localStorage.setItem("vx-content-width", "default");
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "vx-content-width",
        newValue: "default",
      }),
    );
  });
  expect(screen.getAllByText("default")).toHaveLength(2);
});
it("controlled product value and limits outrank saved state", () => {
  const change = vi.fn();
  localStorage.setItem("custom", "wide");
  const view = render(
    <ContentWidthProvider
      value="narrow"
      storageKey="custom"
      limits={{ narrow: 1100 }}
      onValueChange={change}
    >
      <Probe />
    </ContentWidthProvider>,
  );
  expect(view.container.querySelector("[data-content-width]")).toHaveStyle({
    maxWidth: "1100px",
  });
  act(() => screen.getByText("Wide choice").click());
  expect(change).toHaveBeenCalledWith("wide");
  expect(screen.getByText("narrow")).toBeInTheDocument();
  expect(localStorage.getItem("custom")).toBe("wide");
});
it("continues in memory when persistence is blocked", () => {
  const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw Error("blocked");
  });
  render(
    <ContentWidthProvider>
      <Probe />
    </ContentWidthProvider>,
  );
  act(() => screen.getByText("Wide choice").click());
  expect(screen.getByText("wide")).toBeInTheDocument();
  set.mockRestore();
});
it("preference panel enables the provider-owned optional width row", () => {
  render(
    <ContentWidthProvider>
      <ShellPreferencePanel
        locale="en"
        theme="system"
        onLocaleChange={() => {}}
        onThemeChange={() => {}}
        showContentWidth
        labels={{ contentWidth: "Content width" }}
      />
    </ContentWidthProvider>,
  );
  expect(
    screen.getByRole("radiogroup", { name: "Content width" }),
  ).toBeInTheDocument();
});
