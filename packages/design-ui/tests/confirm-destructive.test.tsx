/**
 * ConfirmDestructive 的行为回归。
 *
 * 判别联合能保证「必须给 confirm」，保证不了「给了之后行为对不对」。这一份测的
 * 全是类型钉不住的那部分：门闩生效没有、三态画得对不对、失败时关不关。
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDestructive } from "../src/components/composite/overlay/ConfirmDestructive";

const base = {
  open: true,
  onOpenChange: () => undefined,
  verb: "Delete",
  target: "model service",
  consequence: "This cannot be undone.",
};

describe("ConfirmDestructive · 前置条件是门闩", () => {
  it("任一条 met: false，确认钮禁用", () => {
    render(
      <ConfirmDestructive
        {...base}
        preconditions={[
          { label: "Offline", met: true },
          { label: "No references", met: false },
        ]}
        onConfirm={() => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  it("全部 met: true，确认钮可按", () => {
    render(
      <ConfirmDestructive
        {...base}
        preconditions={[{ label: "Offline", met: true }]}
        onConfirm={() => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
  });

  /**
   * 三态的意义全在这一条：`unknown` 只管显示，**不参与门闩**。
   * 「读不到检查单时挡住还是放行」是产品的风险判断，DS 收下就等于把风险偏好
   * 焊进来。所以调用方判「放行」时，件不许自作主张拦住。
   */
  it("unknown 不参与门闩——调用方判 met: true 就放行", () => {
    render(
      <ConfirmDestructive
        {...base}
        preconditions={[
          {
            label: "No references",
            met: true,
            unknown: true,
            note: "读不到，按通过处理",
          },
        ]}
        onConfirm={() => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
    expect(screen.getByText("读不到，按通过处理")).toBeInTheDocument();
  });
});

describe("ConfirmDestructive · 落锤与失败", () => {
  it("成功才关", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <ConfirmDestructive
        {...base}
        onOpenChange={onOpenChange}
        onConfirm={() => Promise.resolve()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it.each(["async", "sync"])(
    "keeps %s failure visible and allows retry",
    async (mode) => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      const onConfirm = vi.fn((): Promise<void> => {
        if (mode === "sync") throw new Error("upstream refused");
        return Promise.reject(new Error("upstream refused"));
      });
      render(
        <ConfirmDestructive
          {...base}
          onOpenChange={onOpenChange}
          onConfirm={onConfirm}
        />,
      );
      await user.click(screen.getByRole("button", { name: "Delete" }));
      expect(await screen.findByText("upstream refused")).toBeVisible();
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
      expect(screen.getByRole("alertdialog")).toContainElement(
        screen.getByText("upstream refused"),
      );
      onConfirm.mockImplementation(() => Promise.resolve());
      await user.click(screen.getByRole("button", { name: "Delete" }));
      await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    },
  );

  it("locks cancellation and duplicate submission while pending", async () => {
    const user = userEvent.setup();
    let resolve!: () => void;
    const onConfirm = vi.fn(
      () =>
        new Promise<void>((done) => {
          resolve = done;
        }),
    );
    const onOpenChange = vi.fn();
    render(
      <ConfirmDestructive
        {...base}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Working…" })).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(onOpenChange).not.toHaveBeenCalled();
    resolve();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
