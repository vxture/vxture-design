/**
 * Drawer 的行为回归。
 *
 * 两条都来自文件头注释里写下的教训——**注释记住了，但注释拦不住下一个人**。
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Drawer } from "../src/components/base/overlay/Drawer";

describe("Drawer · 宽度两条路不能混", () => {
  /**
   * 挡位走类名，数字/裸串走内联样式。混了会**同时**出现 class 与 style，
   * 而 style 永远赢——挡位就成了摆设，且不报错。
   *
   * 挡位必须走类名的原因：Tailwind 扫的是完整字面量，拼接出来的类名扫不到，
   * 同样不报错。
   */
  it("给挡位：出类名，不出内联宽度", () => {
    render(
      <Drawer open onClose={() => undefined} width="md" title="t">
        x
      </Drawer>,
    );
    const panel = screen.getByRole("dialog");
    expect(panel).toHaveClass("w-panel-md");
    expect(panel.style.width).toBe("");
  });

  it("给数字：出内联宽度，不出挡位类名", () => {
    render(
      <Drawer open onClose={() => undefined} width={520} title="t">
        x
      </Drawer>,
    );
    const panel = screen.getByRole("dialog");
    expect(panel.style.width).toBe("520px");
    for (const cls of ["w-panel-sm", "w-panel-md", "w-panel-lg"]) {
      expect(panel).not.toHaveClass(cls);
    }
  });

  it("不给宽度：两条路都不走", () => {
    render(
      <Drawer open onClose={() => undefined} title="t">
        x
      </Drawer>,
    );
    const panel = screen.getByRole("dialog");
    expect(panel.style.width).toBe("");
    expect(panel).not.toHaveClass("w-panel-md");
  });
});

describe("Drawer · 可访问名", () => {
  /**
   * Radix 要求 Content 内必须有可访问名。无标题时给一个隐藏兜底——**读屏能听见
   * 它**，所以它是文案不是占位符，双语产品得能改。
   */
  it("无标题时用兜底标题，且可覆盖", () => {
    const { rerender } = render(
      <Drawer open onClose={() => undefined}>
        x
      </Drawer>,
    );
    expect(screen.getByRole("dialog", { name: "Drawer" })).toBeInTheDocument();

    rerender(
      <Drawer open onClose={() => undefined} fallbackTitle="抽屉">
        x
      </Drawer>,
    );
    expect(screen.getByRole("dialog", { name: "抽屉" })).toBeInTheDocument();
  });

  it("有标题时用标题，且关闭钮文案可覆盖", () => {
    render(
      <Drawer open onClose={() => undefined} title="通道详情" closeLabel="关闭">
        x
      </Drawer>,
    );
    expect(
      screen.getByRole("dialog", { name: "通道详情" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭" })).toBeInTheDocument();
  });

  it("无标题时不出关闭钮——没有标题栏可挂", () => {
    render(
      <Drawer open onClose={() => undefined}>
        x
      </Drawer>,
    );
    expect(
      screen.queryByRole("button", { name: "Close" }),
    ).not.toBeInTheDocument();
  });
});
