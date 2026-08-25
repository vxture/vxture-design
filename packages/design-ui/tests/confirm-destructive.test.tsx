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

  /**
   * 失败不关——用户得看见自己按的那一下没成。
   * 这条只有跑起来才验得了：类型上 onConfirm 返回 Promise，成功失败一个样。
   *
   * 错误**不吞**：件在 rejection handler 里重新抛出，于是它变成一个未处理的
   * Promise 拒绝，落到应用自己的上报里。这里用 Node 的 process 钩子接住它——
   * 不接的话 vitest 会把它算成用例失败，那反而证明了它确实没被吞掉。
   */
  it("落锤失败时不关，且把错误抛出去而不是吞掉", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const boom = new Error("upstream refused");
    const seen: unknown[] = [];
    const onRejection = (reason: unknown) => seen.push(reason);
    process.on("unhandledRejection", onRejection);
    try {
      render(
        <ConfirmDestructive
          {...base}
          onOpenChange={onOpenChange}
          onConfirm={() => Promise.reject(boom)}
        />,
      );
      await user.click(screen.getByRole("button", { name: "Delete" }));
      await waitFor(() => expect(seen).toContain(boom));
      // 关键：抛了错，但**没有关**
      expect(onOpenChange).not.toHaveBeenCalledWith(false);
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    } finally {
      process.off("unhandledRejection", onRejection);
    }
  });
});
