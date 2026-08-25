/**
 * MetricCard / MetricListCard 的行为回归。
 *
 * 指标卡的契约几乎全是**视觉判断的固化**——它们不改变功能，所以改坏了不会有
 * 任何东西报错，只是一排卡看起来不对劲，而且要成排出现才看得出来。
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MetricCard } from "../src/components/composite/data/MetricCard";
import { MetricListCard } from "../src/components/composite/data/MetricListCard";
import { TONES, toneEdgeClasses } from "../src/components/tone";

describe("MetricCard · 读数不是标题", () => {
  /**
   * 读数 20px（title-xl）而非展示体大字——指标卡成排出现，36px 的读数会让四张卡
   * 各自都在喊。而且**读数不是标题**，落在 span 上：一页四张卡不该产生四个
   * 标题层级。
   */
  it("读数落在 span 上，不产生标题层级", () => {
    render(<MetricCard label="调用量" value="1,284" />);
    expect(screen.getByText("1,284").tagName).toBe("SPAN");
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});

describe("MetricCard · 语气只染顶缘，不染底", () => {
  /**
   * 整块染色会把读数本身盖过去（`toneSurfaceClasses` 给标与提示条那种小件用，
   * 指标卡占一整块）。所以这一族走 `toneEdgeClasses`——只染一条边。
   */
  it.each([...TONES])("%s 档取的是顶缘色条那一套", (tone) => {
    const { container } = render(
      <MetricCard label="l" value="1" tone={tone} />,
    );
    const card = container.firstElementChild as HTMLElement;
    // toneEdgeClasses 的每一条类都应在卡上
    for (const cls of toneEdgeClasses[tone].split(" ")) {
      expect(card.className).toContain(cls);
    }
  });
});

describe("MetricCard · 底纹是装饰", () => {
  /**
   * 右侧那枚柱状图底纹说明「这里是统计数字」，**装饰而已**：对读屏隐藏、
   * 不接指针事件。少了 aria-hidden，读屏会念出一串无意义的图形描述；
   * 少了 pointer-events-none，它会挡住卡上的交互。
   */
  it("底纹对读屏隐藏且不接指针事件", () => {
    const { container } = render(<MetricCard label="l" value="1" />);
    const decorative = [...container.querySelectorAll('[aria-hidden="true"]')];
    const watermark = decorative.find((el) =>
      el.className.includes("pointer-events-none"),
    );
    expect(watermark).toBeDefined();
  });

  /**
   * 带图标的卡用静图、不带图标的用动图——底纹与图标是同一个位置上的视觉符号，
   * 两个都动就会互相抢。这条只有把两种卡摆在一起才比得出来。
   */
  it("有无图标决定底纹用静图还是动图", () => {
    const withIcon = render(<MetricCard label="l" value="1" icon="database" />);
    const a = withIcon.container.innerHTML;
    withIcon.unmount();

    const without = render(<MetricCard label="l" value="1" />);
    const b = without.container.innerHTML;

    expect(a).not.toBe(b);
  });
});

describe("MetricListCard · 行操作不冒泡到整卡", () => {
  /**
   * 点「更多」是要开菜单，不是进详情。这条在鼠标与键盘两条路上都要成立——
   * 键盘 Enter 在内层按钮上同样**产生一个冒泡的 click**，所以拦的是同一个事件。
   */
  it("点操作区不触发整卡的 onClick", async () => {
    const user = userEvent.setup();
    const onCardClick = vi.fn();
    const onActionClick = vi.fn();
    render(
      <MetricListCard
        title="主力推理通道"
        onClick={onCardClick}
        actions={
          <button type="button" onClick={onActionClick}>
            更多
          </button>
        }
      />,
    );
    await user.click(screen.getByRole("button", { name: "更多" }));
    expect(onActionClick).toHaveBeenCalledTimes(1);
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it("键盘在操作按钮上按 Enter 同样不触发整卡", async () => {
    const user = userEvent.setup();
    const onCardClick = vi.fn();
    const onActionClick = vi.fn();
    render(
      <MetricListCard
        title="主力推理通道"
        onClick={onCardClick}
        actions={
          <button type="button" onClick={onActionClick}>
            更多
          </button>
        }
      />,
    );
    screen.getByRole("button", { name: "更多" }).focus();
    await user.keyboard("{Enter}");
    expect(onActionClick).toHaveBeenCalledTimes(1);
    expect(onCardClick).not.toHaveBeenCalled();
  });

  /** 修「不该触发」时别把「该触发」也修没了：卡本身聚焦时 Enter 与 Space 都要响应。 */
  it.each(["{Enter}", " "])("卡本身聚焦时 %s 仍触发整卡", async (key) => {
    const user = userEvent.setup();
    const onCardClick = vi.fn();
    render(<MetricListCard title="主力推理通道" onClick={onCardClick} />);
    screen.getByRole("button", { name: /主力推理通道/ }).focus();
    await user.keyboard(key);
    expect(onCardClick).toHaveBeenCalledTimes(1);
  });

  it("点卡片本体照常进详情", async () => {
    const user = userEvent.setup();
    const onCardClick = vi.fn();
    render(<MetricListCard title="主力推理通道" onClick={onCardClick} />);
    await user.click(screen.getByText("主力推理通道"));
    expect(onCardClick).toHaveBeenCalledTimes(1);
  });
});
