import { act, render } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AgentAvatar } from "../src/components/shell/AgentAvatar";
import { ShellAgentButton } from "../src/components/shell/ShellChrome";

it("uses static default, animates only running, and reacts to reduced motion", () => {
  let change: (() => void) | undefined;
  const media = {
    matches: false,
    addEventListener: vi.fn((_event, listener) => {
      change = listener;
    }),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("matchMedia", () => media);
  const view = render(
    <AgentAvatar staticSrc="/still.png" animatedSrc="/run.gif" />,
  );
  const image = view.container.querySelector("img")!;
  expect(image.src).toContain("/still.png");
  view.rerender(
    <AgentAvatar running staticSrc="/still.png" animatedSrc="/run.gif" />,
  );
  expect(image.src).toContain("/run.gif");
  act(() => {
    media.matches = true;
    change?.();
  });
  expect(image.src).toContain("/still.png");
  view.unmount();
  expect(media.removeEventListener).toHaveBeenCalled();
  vi.unstubAllGlobals();
});

it("ships defaults without host paths and preserves legacy custom button assets", () => {
  const view = render(<ShellAgentButton label="Agent" />);
  expect(view.container.querySelector("img")!.src).toMatch(
    /^data:image\/png;base64,/,
  );
  view.rerender(
    <ShellAgentButton label="Agent" iconSrc="/legacy.gif" size="2xl" />,
  );
  expect(view.container.querySelector("img")!.src).toContain("/legacy.gif");
  expect(view.container.querySelector("img")!.width).toBe(48);
});
