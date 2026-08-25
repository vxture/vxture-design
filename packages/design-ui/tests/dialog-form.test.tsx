/**
 * DialogForm 的行为回归。
 *
 * 按「出过事的件」排，它是记录在案两次的那个：
 *   3.2.1  字段区滚动上限 60vh → 70vh
 *   3.2.0  页脚上方补 Separator（对话框骨架定稿）
 *
 * 两条都是**结构约定**——写错不报错，只是长得不一样，而且要有人在 1080p 上排
 * 一张双栏长表单才看得出来。正是没有测试就会悄悄回流的那一类。
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DialogForm } from "../src/components/composite/form/DialogForm";

describe("DialogForm · 骨架", () => {
  /**
   * 3.2.1 的回归。60vh 在 1080p 只给 648px，紧凑密度排完（实测 617px）几乎贴顶，
   * 笔记本高度必出滚动条——而 xl 档的目标恰是「整表可见、滚动只是兜底」。
   *
   * 这条钉的是那个 70：谁改回 60，或者把滚动整个挪走，这里会红。
   */
  it("字段区自带滚动，上限 70vh，且给滚动条留出聚焦环的位置", () => {
    render(
      <DialogForm open title="t">
        <input aria-label="field" />
      </DialogForm>,
    );
    const field = screen.getByLabelText("field");
    const scroller = field.parentElement;
    expect(scroller).toHaveClass("max-h-[70vh]");
    expect(scroller).toHaveClass("overflow-y-auto");
    // pr-2xs 不是装饰：不留这一格，聚焦环会被裁掉半圈
    expect(scroller).toHaveClass("pr-2xs");
  });

  it("没有 children 就不渲染滚动容器", () => {
    render(<DialogForm open title="t" />);
    /* 不用 querySelector：Tailwind 的任意值语法带方括号，做成 CSS 选择器要转义，
       而 jsdom 的选择器实现对这种转义并不友好。直接遍历更稳。 */
    const scrollers = [...document.querySelectorAll("div")].filter((d) =>
      d.className.includes("max-h-[70vh]"),
    );
    expect(scrollers).toHaveLength(0);
  });

  /** 3.2.0 定稿的骨架：标题 / 内容区 / 分割线 / 操作区。 */
  it("操作区上方有一条分割线", () => {
    render(
      <DialogForm open title="t">
        <input aria-label="field" />
      </DialogForm>,
    );
    const submit = screen.getByRole("button", { name: "Save" });
    const footer = submit.parentElement;
    /* Radix 的 Separator 默认 decorative，渲染成 role="none" 的分隔元素，
       靠 data-orientation 认它。 */
    expect(footer?.previousElementSibling).toHaveAttribute(
      "data-orientation",
      "horizontal",
    );
  });
});

describe("DialogForm · 危险两档", () => {
  /**
   * 03 §3：落锤用 destructive-strong（实心），入口才是 destructive（淡底）。
   * 两个挡位都存在、都合法、都能编译——挡位选错**没有任何东西会报错**，
   * 这一轮迁移时就在预览面里逮到过一处。
   */
  it("danger 时提交按钮走落锤档，不是入口档", () => {
    render(<DialogForm open title="t" danger />);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
      "data-variant",
      "destructive-strong",
    );
  });

  it("不给 danger 就是默认档", () => {
    render(<DialogForm open title="t" />);
    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
      "data-variant",
      "default",
    );
  });
});

describe("DialogForm · 提交中", () => {
  it("提交中：文案换成 pendingLabel，两个按钮都不许再点", () => {
    render(<DialogForm open title="t" submitting />);
    expect(screen.getByRole("button", { name: "Working…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("submitDisabled 只锁提交，不锁取消——用户永远要能退出去", () => {
    render(<DialogForm open title="t" submitDisabled />);
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  });
});
