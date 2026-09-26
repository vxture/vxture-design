/**
 * `ShellHeaderParts` —— 页面顶栏左侧的标识类零件（四种页面视角共用）。
 *
 * 这几件都很薄，写错的表现是**版面不一致**而不是报错：标识版位不是 32px 就和
 * 九宫格 / 侧栏开关错开一截；竖线有语义没语义读屏器念法不同；域名与产品类型
 * 的弱化色一丢，「你在哪」就和「点这里」一样重。
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ShellHeaderDivider,
  ShellHeaderDomain,
  ShellHeaderMark,
  ShellHeaderTitle,
  ShellProductTitle,
} from "../src/components/shell/ShellHeaderParts";

const tokens = (el: Element | null) =>
  ((el as HTMLElement)?.className ?? "").split(" ").filter(Boolean);

describe("ShellHeaderMark", () => {
  it("32px 版位里放 24px 图形", () => {
    const { container } = render(<ShellHeaderMark src="/logo.svg" />);
    const box = container.firstElementChild!;
    expect(tokens(box)).toContain("size-icon-xl");
    expect(tokens(box.querySelector("img"))).toContain("size-icon-lg");
  });

  it("没有 alt 时对读屏隐藏；给了 href 是链接", () => {
    const a = render(<ShellHeaderMark src="/logo.svg" />);
    expect(a.container.querySelector("img")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(a.container.querySelector("a")).toBeNull();
    a.unmount();

    render(<ShellHeaderMark src="/logo.svg" href="/" alt="Vxture" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/");
    expect(screen.getByAltText("Vxture")).not.toHaveAttribute("aria-hidden");
  });
});

describe("ShellHeaderTitle", () => {
  /**
   * `text-heading-3` 只带字号 / 行高 / 字距 / 字重，**不带字体族**——品牌字体要
   * 单独挂 `font-brand`，漏了就落回正文体（2026-09-26 owner 实页发现）。
   */
  it("品牌字体 24px 粗体：font-brand 必须单独挂", () => {
    render(<ShellHeaderTitle>Workspace Console</ShellHeaderTitle>);
    const t = tokens(screen.getByText("Workspace Console"));
    expect(t).toContain("font-brand");
    expect(t).toContain("text-heading-3");
    expect(t).toContain("font-bold");
  });

  /** 管理员视角靠这枚徽标与租户工作台分开。 */
  it("badge 跟在标题后，不给就没有", () => {
    const a = render(
      <ShellHeaderTitle badge={<span>平台管理员</span>}>
        Admin Console
      </ShellHeaderTitle>,
    );
    expect(screen.getByText("平台管理员")).toBeInTheDocument();
    a.unmount();
    const { container } = render(<ShellHeaderTitle>Console</ShellHeaderTitle>);
    expect(container.firstElementChild!.children).toHaveLength(1);
  });

  /** Figma BrandTitle 文字自带左右 8px，与标识、徽标各拉开 16px。 */
  it("标题文字自带 px-xs", () => {
    render(<ShellHeaderTitle>Console</ShellHeaderTitle>);
    expect(tokens(screen.getByText("Console"))).toContain("px-xs");
  });

  /**
   * 徽标读作上标（Figma 09-26 重排）：32px 版位里顶端对齐，比标题略高。
   * 居中对齐会让它读成与标题并列的第二个名字。
   */
  it("徽标放在顶端对齐的 32px 上标位里", () => {
    render(
      <ShellHeaderTitle badge={<span>平台管理员</span>}>
        Admin Console
      </ShellHeaderTitle>,
    );
    const slot = screen.getByText("平台管理员").parentElement!;
    expect(slot).toHaveAttribute("data-slot", "header-superscript");
    expect(tokens(slot)).toEqual(
      expect.arrayContaining(["h-icon-xl", "items-start", "shrink-0"]),
    );
  });
});

describe("ShellHeaderDivider", () => {
  it("是一条竖向分隔线，高 20px", () => {
    render(<ShellHeaderDivider />);
    const sep = screen.getByRole("separator");
    expect(sep).toHaveAttribute("aria-orientation", "vertical");
    expect(tokens(sep)).toContain("h-icon-md");
    expect(tokens(sep)).toContain("w-px");
  });
});

describe("ShellHeaderDomain", () => {
  it("label-lg、弱化色", () => {
    render(<ShellHeaderDomain>Domain Name</ShellHeaderDomain>);
    const t = tokens(screen.getByText("Domain Name"));
    expect(t).toContain("text-label-lg");
    expect(t).toContain("text-content-tertiary");
    // Figma 09-26：域名不再自带内距，与前面竖线的距离全由槽间距 8px 决定。
    expect(t.some((c) => c.startsWith("px-"))).toBe(false);
  });
});

describe("ShellProductTitle", () => {
  it("名称品牌体、类型正文体弱化色，同为 title-xl", () => {
    render(<ShellProductTitle name="产品" type="产品类型" />);
    const name = tokens(screen.getByText("产品"));
    const type = tokens(screen.getByText("产品类型"));
    expect(name).toContain("font-brand");
    expect(name).toContain("text-title-xl");
    expect(type).toContain("text-title-xl");
    expect(type).toContain("text-muted-foreground");
    expect(type).not.toContain("font-brand");
  });

  it("标识、类型、等级都可省", () => {
    const { container } = render(<ShellProductTitle name="产品" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.firstElementChild!.children).toHaveLength(1);
  });

  it("全给时顺序：标识、名称、类型、等级", () => {
    const { container } = render(
      <ShellProductTitle
        logoSrc="/p.svg"
        name="产品"
        type="数据平台"
        tier={<span>Pro</span>}
      />,
    );
    const kids = [...container.firstElementChild!.children];
    expect(kids[0]!.tagName).toBe("IMG");
    expect(kids.slice(1).map((k) => k.textContent)).toEqual([
      "产品",
      "数据平台",
      "Pro",
    ]);
    // 等级与标题徽标同为上标位。
    expect(kids[3]).toHaveAttribute("data-slot", "header-superscript");
    expect(tokens(kids[3]!)).toContain("items-start");
  });
});
