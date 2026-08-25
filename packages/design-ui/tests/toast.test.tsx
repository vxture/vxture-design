/**
 * Toast 的行为回归。
 *
 * 03 §2 的契约：**Toast 说「刚才那一下成了没有」，说完就走**；`danger` 档以
 * assertive 播报，其余 polite。播报强度是无障碍行为，看不见也点不着——
 * 只有断言得到。
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ToastProvider, useToast } from "../src/components/base/feedback/Toast";
import { Button } from "../src/components/base/form/Button";
import type { Tone } from "../src/components/tone";

function Trigger({ tone, title }: { tone?: Tone; title: string }) {
  const { toast } = useToast();
  return (
    <Button onClick={() => toast(tone ? { tone, title } : { title })}>
      发一条
    </Button>
  );
}

async function fire(tone: Tone | undefined, title: string) {
  const user = userEvent.setup();
  render(
    <ToastProvider>
      <Trigger {...(tone ? { tone } : {})} title={title} />
    </ToastProvider>,
  );
  await user.click(screen.getByRole("button", { name: "发一条" }));
  return user;
}

describe("Toast · 播报强度", () => {
  /**
   * `role="alert"` 会**打断**屏幕阅读器，只有 danger 需要这种强度。
   * 其余档打断用户正在听的内容，是无谓的骚扰。
   */
  it("danger 档 assertive", async () => {
    await fire("danger", "删除失败");
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-live",
      "assertive",
    );
  });

  it("success / info / warning 一律 polite", async () => {
    for (const tone of ["success", "info", "warning"] as const) {
      const { unmount } = render(
        <ToastProvider>
          <Trigger tone={tone} title={`t-${tone}`} />
        </ToastProvider>,
      );
      const user = userEvent.setup();
      await user.click(screen.getByRole("button", { name: "发一条" }));
      expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
      unmount();
    }
  });

  it("不给 tone 也是 polite，不会误升级", async () => {
    await fire(undefined, "已保存");
    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});

describe("Toast · 通知区与关闭", () => {
  it("通知区的可访问名可覆盖", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider regionLabel="通知" dismissLabel="关闭通知">
        <Trigger title="t" />
      </ToastProvider>,
    );
    expect(screen.getByRole("region", { name: "通知" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "发一条" }));
    expect(
      screen.getByRole("button", { name: "关闭通知" }),
    ).toBeInTheDocument();
  });

  it("点关闭把那一条撤下来", async () => {
    const user = await fire("info", "已保存");
    expect(screen.getByText("已保存")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Dismiss notification" }),
    );
    expect(screen.queryByText("已保存")).not.toBeInTheDocument();
  });
});
