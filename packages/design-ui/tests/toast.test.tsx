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
import {
  OVERLAY_POSITIONS,
  overlayStackClass,
  type OverlayPosition,
} from "../src/components/overlayPosition";

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

/**
 * 落点（owner 2026-09-22：「位置不能 DS 写死，应该可配置，默认右上角，支持业务
 * 平台传参定位」）。
 *
 * 原先写死 `inset-x-0 bottom-0 ... sm:items-end`。右下角是**操作动线的终点**——
 * 主按钮、分页器、抽屉确认键都在那一带，通知弹出来正好盖住人刚要点的东西。
 *
 * 位置是看不见摸不着的类名组合：改坏了页面照常渲染、测试照常绿，只有人眼在某个
 * 分辨率下才发现提示跑到了奇怪的地方。所以逐档断言。
 */
describe("ToastProvider 的落点", () => {
  function regionOf(position?: OverlayPosition) {
    render(
      <ToastProvider {...(position ? { position } : {})}>
        <span>x</span>
      </ToastProvider>,
    );
    return screen.getByRole("region", { name: "Notifications" });
  }

  it("默认右上角", () => {
    const cls = regionOf().className;
    expect(cls).toContain("top-0");
    expect(cls).toContain("items-end");
    expect(cls).not.toContain("bottom-0");
  });

  it.each(OVERLAY_POSITIONS)("%s 档产出成套的落点类", (position) => {
    const cls = regionOf(position).className;
    expect(cls).toContain(overlayStackClass[position]);
    // 视口本身的固定与层级不随挡位变
    expect(cls).toContain("fixed");
    expect(cls).toContain("z-toast");

    /*
     * 堆叠方向跟着落点走：贴顶时新的在下，贴底时新的在上——两种都让新的那条离
     * 屏幕边最远。贴底却用 flex-col，会让已有的提示被新的顶着往上跳。
     *
     * 注意 `flex-col-reverse` 里含有 `flex-col` 这个子串，所以贴顶那几档要用
     * 「不含 reverse」来判，不能只判「含 flex-col」——后者对两边都成立。
     */
    if (position.startsWith("bottom-")) {
      expect(cls).toContain("flex-col-reverse");
    } else {
      expect(cls).toContain("flex-col");
      expect(cls).not.toContain("flex-col-reverse");
    }
  });
});
