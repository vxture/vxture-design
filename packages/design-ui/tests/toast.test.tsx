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

/**
 * id 的唯一性。
 *
 * 2026-08-26 把 id 从 `Date.now()` + `Math.random()` 换成单调计数器（SonarCloud
 * 报的那条 vulnerability，理由不适用但结论可取——见件内注释）。这一节钉的是
 * **换法没有换坏**：
 *
 *   · 同一次交互里连发多条，id 不许重复。重复的表现是两条通知共用一个 React
 *     key，后一条把前一条顶掉——而随机数版本这只是**大概率**不发生，写不成断言
 *   · 调用方显式给了 id 就用它，别偷偷替换
 *   · 计数器是模块级的，跨 Provider、跨重挂载都不重复；否则上一次挂载残留的
 *     自动消失定时器会误伤新通知
 */
describe("Toast · id 的唯一性", () => {
  function Burst() {
    const { toast } = useToast();
    return (
      <Button
        onClick={() => {
          setIds([
            toast({ title: "第一条", duration: 0 }),
            toast({ title: "第二条", duration: 0 }),
            toast({ title: "第三条", duration: 0 }),
          ]);
        }}
      >
        连发三条
      </Button>
    );
  }

  let captured: string[] = [];
  const setIds = (v: string[]) => {
    captured = v;
  };

  it("同一次交互连发三条，三个 id 互不相同", async () => {
    captured = [];
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Burst />
      </ToastProvider>,
    );
    await user.click(screen.getByRole("button", { name: "连发三条" }));

    expect(captured).toHaveLength(3);
    expect(new Set(captured).size).toBe(3);
    // 三条都还在屏上——id 撞了的话 React 会用同一个 key，只剩两条
    expect(screen.getAllByRole("status")).toHaveLength(3);
  });

  it("跨两个 Provider 也不重复", async () => {
    captured = [];
    const user = userEvent.setup();
    const first = render(
      <ToastProvider>
        <Burst />
      </ToastProvider>,
    );
    await user.click(screen.getByRole("button", { name: "连发三条" }));
    const roundOne = [...captured];
    first.unmount();

    captured = [];
    render(
      <ToastProvider>
        <Burst />
      </ToastProvider>,
    );
    await user.click(screen.getByRole("button", { name: "连发三条" }));

    expect(new Set([...roundOne, ...captured]).size).toBe(6);
  });

  it("调用方给了 id 就用它", async () => {
    function Fixed() {
      const { toast } = useToast();
      return (
        <Button
          onClick={() => setIds([toast({ id: "my-own", title: "自带 id" })])}
        >
          发一条
        </Button>
      );
    }
    captured = [];
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Fixed />
      </ToastProvider>,
    );
    await user.click(screen.getByRole("button", { name: "发一条" }));
    expect(captured[0]).toBe("my-own");
  });
});
