/**
 * Banner 与 StatusBadge：语气六档共用一份刻度。
 *
 * 两个件的图标**都不开 prop 的默认口**（StatusBadge 可换但不必配），一律取自
 * `toneIcons`——「同一个语气在两处有两套名字迟早对不上」是它们合并刻度的理由。
 * 这条约定没有任何类型能表达，只有断言得到。
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Banner } from "../src/components/base/feedback/Banner";
import { StatusBadge } from "../src/components/base/display/StatusBadge";
import { TONES, toneIcons } from "../src/components/tone";
import { Icon, type IconName } from "../src/icons";

/**
 * Icon 不落任何标识属性（它直接把 Phosphor 组件渲染出来），所以认图只能**比对
 * 渲染出的图形本身**——把 svg 的内部标记取出来当指纹。
 *
 * 这比断言一个 data-* 属性更可靠：属性可能漂，而图形就是用户看到的东西。
 */
function shapesIn(root: HTMLElement) {
  return [...root.querySelectorAll("svg")].map((el) => el.innerHTML);
}

/** 某个图名单独渲染出来长什么样——用作对照指纹。 */
function shapeOf(name: IconName) {
  const { container, unmount } = render(<Icon name={name} />);
  const shape = container.querySelector("svg")?.innerHTML ?? "";
  unmount();
  return shape;
}

describe("语气六档 · 图标由语气决定", () => {
  it.each([...TONES])("Banner 的 %s 档取 toneIcons 里那一张", (tone) => {
    const { container } = render(<Banner tone={tone} title="t" />);
    expect(shapesIn(container)).toContain(shapeOf(toneIcons[tone]));
  });

  it.each([...TONES])("StatusBadge 的 %s 档取同一张", (tone) => {
    const { container } = render(<StatusBadge tone={tone}>状态</StatusBadge>);
    expect(shapesIn(container)).toContain(shapeOf(toneIcons[tone]));
  });

  /**
   * 六档只表达**严重度**，不表达业务状态——所以两个件必须映射到同一张图。
   * 这条断言在「有人给其中一个件单独换图」时会红。
   */
  it("同一档在两个件里是同一张图", () => {
    for (const tone of TONES) {
      const a = render(<Banner tone={tone} title="t" />);
      const b = render(<StatusBadge tone={tone}>状态</StatusBadge>);
      const want = shapeOf(toneIcons[tone]);
      expect(shapesIn(a.container)).toContain(want);
      expect(shapesIn(b.container)).toContain(want);
      a.unmount();
      b.unmount();
    }
  });
});

describe("StatusBadge · 三件一体", () => {
  /**
   * 表意图标 + 语气底色 + 文字，少哪一件都退化：只有底色 = 得靠记颜色；
   * 只有文字 = 一屏扫不出来；只有图标 = 同一张图在不同业务里含义不同。
   */
  it("默认三件齐：有图标、有语气底色类、有文字", () => {
    const { container } = render(
      <StatusBadge tone="success">已上线</StatusBadge>,
    );
    expect(shapesIn(container)).toHaveLength(1);
    expect(screen.getByText("已上线")).toBeInTheDocument();
    expect(container.firstElementChild?.className).toContain("success");
  });

  it("业务态比语气细时可换图，但换的是图不是有无", () => {
    const { container } = render(
      <StatusBadge tone="warning" icon="timer">
        即将到期
      </StatusBadge>,
    );
    expect(shapesIn(container)).toContain(shapeOf("timer"));
    expect(shapesIn(container)).not.toContain(shapeOf(toneIcons.warning));
  });

  it("icon={false} 明确关掉图标", () => {
    const { container } = render(
      <StatusBadge tone="success" icon={false}>
        已上线
      </StatusBadge>,
    );
    expect(shapesIn(container)).toHaveLength(0);
  });

  /** `dot` 是**密集场景的降级**：一行并排四五个标时圆点比图标省宽。 */
  it("dot 档用圆点替下图标，不是两者都上", () => {
    const { container } = render(
      <StatusBadge tone="danger" dot>
        已停用
      </StatusBadge>,
    );
    expect(shapesIn(container)).toHaveLength(0);
    expect(screen.getByText("已停用")).toBeInTheDocument();
  });
});

describe("Banner · 常驻，不自动消失", () => {
  it("不给 onDismiss 就没有关闭钮——不是所有状态都允许用户消掉", () => {
    render(<Banner tone="warning" title="配额将满" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("给了 onDismiss 才出关闭钮，且点了走回调", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<Banner tone="info" title="t" onDismiss={onDismiss} />);
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("描述与动作槽都是可选的", () => {
    render(
      <Banner
        tone="info"
        title="t"
        description="d"
        action={<span>ACT</span>}
      />,
    );
    expect(screen.getByText("d")).toBeInTheDocument();
    expect(screen.getByText("ACT")).toBeInTheDocument();
  });
});
