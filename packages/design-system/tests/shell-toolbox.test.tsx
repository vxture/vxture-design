/**
 * `ShellToolbox` —— 外壳工具箱（Figma HeaderToolbar 123:43）。
 *
 * 三条契约写错都不报错：**显隐**（hidden 的项必须不渲染也不占位，全部隐藏时整只
 * 胶囊不出）、**去向**（有 href 是链接、否则是按钮，二者不能混）、**可组合**
 * （ShellToolboxButton 要能塞进 PopoverTrigger asChild——不转发 ref 弹层打不开）。
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Popover, PopoverContent, PopoverTrigger } from "@vxture/design-ui";
import {
  ShellToolbox,
  ShellToolboxButton,
  type ShellToolboxItem,
} from "../src/components/shell/ShellToolbox";

const hasClass = (el: Element | null, token: string) =>
  ((el as HTMLElement)?.className ?? "")
    .split(" ")
    .filter(Boolean)
    .includes(token);

const ITEMS: ShellToolboxItem[] = [
  { key: "help", icon: "help", label: "帮助", href: "/help" },
  { key: "bell", icon: "bell", label: "通知", onClick: () => {} },
  { key: "settings", icon: "settings", label: "设置", href: "/settings" },
];

describe("ShellToolbox · 外观", () => {
  /**
   * 常态透明（owner 2026-09-26：常驻灰底是 bug）。只在悬停 / 键盘焦点落进组内
   * 时整组亮底——常态挂着任何 bg-* 都算回归。
   */
  it("胶囊：常态透明，hover / focus-within 才亮 bg-accent", () => {
    render(<ShellToolbox label="工具" items={ITEMS} />);
    const bar = screen.getByRole("toolbar", { name: "工具" });
    for (const c of [
      "rounded-lg",
      "gap-md",
      "hover:bg-accent",
      "focus-within:bg-accent",
    ]) {
      expect(hasClass(bar, c)).toBe(true);
    }
    const idle = bar.className.split(" ").filter((c) => c.startsWith("bg-"));
    expect(idle).toEqual([]);
  });

  it("单个工具 20px 图标格，平时弱化色、无底；悬停亮 bg-card", () => {
    render(<ShellToolbox label="工具" items={ITEMS} />);
    const bell = screen.getByRole("button", { name: "通知" });
    expect(hasClass(bell, "size-icon-md")).toBe(true);
    expect(hasClass(bell, "text-muted-foreground")).toBe(true);
    expect(hasClass(bell, "hover:bg-card")).toBe(true);
    const idle = bell.className.split(" ").filter((c) => c.startsWith("bg-"));
    expect(idle).toEqual([]);
    expect(bell).toHaveAttribute("title", "通知");
  });

  /** 悬停底外扩 4px，再用等量负外边距抵掉：胶囊尺寸与图标间距不变。 */
  it("悬停底外扩与负外边距成对出现", () => {
    render(<ShellToolbox label="工具" items={ITEMS} />);
    const help = screen.getByRole("link", { name: "帮助" });
    for (const c of ["box-content", "p-2xs", "-m-2xs"]) {
      expect(hasClass(help, c)).toBe(true);
    }
  });
});

describe("ShellToolbox · 按定义导入", () => {
  it("有 href 是链接，没有是按钮", () => {
    render(<ShellToolbox label="工具" items={ITEMS} />);
    expect(screen.getByRole("link", { name: "帮助" })).toHaveAttribute(
      "href",
      "/help",
    );
    expect(screen.getByRole("button", { name: "通知" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "帮助" }),
    ).not.toBeInTheDocument();
  });

  it("按定义顺序排列", () => {
    render(<ShellToolbox label="工具" items={ITEMS} />);
    const names = [
      ...screen.getByRole("toolbar").querySelectorAll("a, button"),
    ].map((el) => el.getAttribute("aria-label"));
    expect(names).toEqual(["帮助", "通知", "设置"]);
  });

  it("newTab 新开并补 rel", () => {
    render(
      <ShellToolbox
        label="工具"
        items={[
          {
            key: "docs",
            icon: "help",
            label: "文档",
            href: "https://docs.example.com",
            newTab: true,
          },
        ]}
      />,
    );
    const link = screen.getByRole("link", { name: "文档" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("点按钮回调", async () => {
    const onClick = vi.fn();
    render(
      <ShellToolbox
        label="工具"
        items={[{ key: "bell", icon: "bell", label: "通知", onClick }]}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "通知" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("linkComponent 可换成产品自己的 Link", () => {
    const Link = ({
      href,
      children,
      ...rest
    }: {
      href: string;
      children: React.ReactNode;
    }) => (
      <a href={href} data-router="1" {...rest}>
        {children}
      </a>
    );
    render(<ShellToolbox label="工具" items={ITEMS} linkComponent={Link} />);
    expect(screen.getByRole("link", { name: "帮助" })).toHaveAttribute(
      "data-router",
      "1",
    );
  });

  /** 禁用的链接不能还是一个可点的 <a>——退成禁用按钮。 */
  it("disabled 的项不可点，带 href 也退成禁用按钮", () => {
    render(
      <ShellToolbox
        label="工具"
        items={[
          {
            key: "s",
            icon: "settings",
            label: "设置",
            href: "/s",
            disabled: true,
          },
        ]}
      />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "设置" })).toBeDisabled();
  });

  it("active 报 aria-pressed 并提到前景色", () => {
    render(
      <ShellToolbox
        label="工具"
        items={[
          { key: "fs", icon: "corners-out", label: "全屏", active: true },
        ]}
      />,
    );
    const btn = screen.getByRole("button", { name: "全屏" });
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(hasClass(btn, "aria-pressed:text-foreground")).toBe(true);
  });

  it("badge 画一个对读屏隐藏的小圆点", () => {
    render(
      <ShellToolbox
        label="工具"
        items={[{ key: "bell", icon: "bell", label: "通知", badge: true }]}
      />,
    );
    const dot = screen
      .getByRole("button", { name: "通知" })
      .querySelector(".bg-destructive");
    expect(dot).not.toBeNull();
    expect(dot).toHaveAttribute("aria-hidden", "true");
  });
});

describe("ShellToolbox · 显示 / 隐藏", () => {
  it("hidden 的项不渲染", () => {
    render(
      <ShellToolbox
        label="工具"
        items={[ITEMS[0]!, { ...ITEMS[1]!, hidden: true }, ITEMS[2]!]}
      />,
    );
    expect(
      screen.queryByRole("button", { name: "通知" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("toolbar").children).toHaveLength(2);
  });

  /** 全部隐藏时整只胶囊不出——一条空的灰底比什么都没有更奇怪。 */
  it("一项都不可见时整个工具箱不渲染", () => {
    const { container } = render(
      <ShellToolbox
        label="工具"
        items={ITEMS.map((i) => ({ ...i, hidden: true }))}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("items 为空但有 children 时照常渲染", () => {
    render(
      <ShellToolbox label="工具">
        <ShellToolboxButton icon="sun" label="主题" />
      </ShellToolbox>,
    );
    expect(screen.getByRole("button", { name: "主题" })).toBeInTheDocument();
  });
});

describe("ShellToolbox · 自己组合", () => {
  /** 不转发 ref 的话 PopoverTrigger asChild 挂不上，弹层永远打不开。 */
  it("ShellToolboxButton 可以做 PopoverTrigger，点开弹层", async () => {
    render(
      <ShellToolbox label="工具">
        <Popover>
          <PopoverTrigger asChild>
            <ShellToolboxButton icon="globe" label="语言" />
          </PopoverTrigger>
          <PopoverContent>语言面板</PopoverContent>
        </Popover>
      </ShellToolbox>,
    );
    await userEvent.click(screen.getByRole("button", { name: "语言" }));
    expect(await screen.findByText("语言面板")).toBeInTheDocument();
  });

  it("定义的项在前，组合的项在后", () => {
    render(
      <ShellToolbox label="工具" items={[ITEMS[0]!]}>
        <ShellToolboxButton icon="sun" label="主题" />
      </ShellToolbox>,
    );
    const names = [
      ...screen.getByRole("toolbar").querySelectorAll("a, button"),
    ].map((el) => el.getAttribute("aria-label"));
    expect(names).toEqual(["帮助", "主题"]);
  });
});
