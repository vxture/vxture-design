/**
 * `ShellSidebarNav` —— 侧栏导航内容。
 *
 * 这件的三处判断写错都不报错：**品牌段染色**（认分隔符不认品牌名，猜错的表现
 * 只是一段文字莫名变色）、**分组开合的持久化**（首帧必须与服务端一致，读早了
 * 是水合不匹配）、**收起态**（标签不渲染、每项挂 tooltip——而 Radix 的
 * Tooltip 没有 Provider 会直接抛，那个雷只在用户点「收起」的那一下才炸）。
 *
 * 63 条分支，此前 0%。
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ShellSidebarNav,
  type ShellNavSection,
} from "../src/components/shell/ShellSidebarNav";

const SECTIONS: ShellNavSection[] = [
  {
    title: "概览",
    items: [{ href: "/", label: "首页", icon: "home" }],
  },
  {
    title: "管理 · 某某",
    brandPosition: "suffix",
    dividerBefore: true,
    items: [
      { href: "/a", label: "甲", icon: "settings" },
      { href: "/b", label: "乙", icon: "list", subLabel: "beta" },
    ],
  },
];

const base = {
  domainName: "某某控制台",
  sections: SECTIONS,
  collapsed: false,
  onToggleCollapsed: () => {},
  isActive: (href: string) => href === "/a",
  storageKeyPrefix: "vx-test",
};

const renderNav = (
  props: Partial<React.ComponentProps<typeof ShellSidebarNav>> = {},
) => render(<ShellSidebarNav {...base} {...props} />);

const hasClass = (el: Element | null, token: string) =>
  ((el as HTMLElement)?.className ?? "")
    .split(" ")
    .filter(Boolean)
    .includes(token);

const STORAGE_KEY = "vx-test-groups-closed";

beforeEach(() => {
  window.localStorage.clear();
});

/* ── 收起态 ───────────────────────────────────────────────────────────────── */

describe("收起态", () => {
  /**
   * **收起态每一项都要挂 tooltip，而 tooltip 得自带 Provider。**
   *
   * Radix 的 `Tooltip.Root` 没有 Provider 会直接抛错。这个组件在展开态一切
   * 正常、用户点一下「收起导航」整页崩溃——只在特定交互下才现形。所以
   * Provider 由本件自己带，不指望每个消费方记得在外壳上包一层。
   */
  it("收起态渲染得出来，不靠外层包 Provider", () => {
    expect(() => renderNav({ collapsed: true })).not.toThrow();
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  /**
   * **收起态每一项都真的挂上 tooltip。**
   *
   * 只剩图标的那一列，tooltip 是唯一能问出「这个图标是什么」的地方。
   * 「渲染不抛」这一条抓不到它——把 Tooltip 整个拿掉同样不抛。
   */
  it("收起态每个导航项与分组标题都挂了 tooltip", () => {
    renderNav({ collapsed: true });
    const described = [
      ...screen.getAllByRole("link"),
      ...screen.getAllByRole("button"),
    ].filter((el) => el.hasAttribute("data-state"));
    // 3 个导航项 + 2 个分组标题；侧栏开合按钮不挂
    expect(described).toHaveLength(5);
  });

  it("展开态不挂 tooltip（标签就在眼前）", () => {
    renderNav();
    const described = [
      ...screen.getAllByRole("link"),
      ...screen.getAllByRole("button"),
    ].filter((el) => el.hasAttribute("data-state"));
    expect(described).toHaveLength(0);
  });

  /** 标签是**条件渲染**不是 opacity 隐藏——收起后文字必须真的不在 DOM 里。 */
  it("收起后标签与域名称都不在 DOM 里", () => {
    renderNav({ collapsed: true });
    expect(screen.queryByText("某某控制台")).not.toBeInTheDocument();
    expect(screen.queryByText("首页")).not.toBeInTheDocument();
    expect(screen.queryByText("beta")).not.toBeInTheDocument();
  });

  it("展开态标签都在", () => {
    renderNav();
    expect(screen.getByText("某某控制台")).toBeInTheDocument();
    expect(screen.getByText("首页")).toBeInTheDocument();
  });

  /** 侧栏开合按钮的无障碍名要跟着状态翻——名字不翻，读屏器永远只听见一种。 */
  it("侧栏开合按钮的名字跟着状态翻", () => {
    const a = renderNav();
    expect(
      screen.getByRole("button", { name: "Collapse navigation" }),
    ).toBeInTheDocument();
    a.unmount();

    renderNav({ collapsed: true });
    expect(
      screen.getByRole("button", { name: "Expand navigation" }),
    ).toBeInTheDocument();
  });

  /** 「全部收合」按钮在收起态没有意义——那时连分组标题的文字都看不见。 */
  it("收起态不出「全部收合」按钮", () => {
    renderNav({ collapsed: true });
    expect(
      screen.queryByRole("button", { name: /groups/i }),
    ).not.toBeInTheDocument();
  });

  it("点侧栏开合按钮回调", async () => {
    const user = userEvent.setup();
    const onToggleCollapsed = vi.fn();
    renderNav({ onToggleCollapsed });
    await user.click(
      screen.getByRole("button", { name: "Collapse navigation" }),
    );
    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);
  });
});

/* ── 品牌段染色 ───────────────────────────────────────────────────────────── */

describe("复合标题的品牌段", () => {
  const brandSpan = (root: ParentNode) =>
    [...root.querySelectorAll("span")].find(
      (s) => hasClass(s, "font-mono") && hasClass(s, "text-primary-text"),
    );

  const one = (section: Partial<ShellNavSection> & { title: string }) =>
    renderNav({
      sections: [{ items: [], ...section } as ShellNavSection],
    });

  /** 分组标题行——按它自己的字号类认，页面上还有另外两个按钮。 */
  const headerText = (root: ParentNode) =>
    [...root.querySelectorAll("button")].find((b) =>
      hasClass(b, "text-overline"),
    )?.textContent;

  /**
   * `"<子域> · <品牌>"` 读作**这块管理该品牌**——染色的是**后**半段。
   *
   * ⚠ 除了「哪段被染色」，还要断**整行读起来是原话**。只断前者的话，把两个
   * 分支的渲染顺序对调（`Atlas · 模型管理`）照样通过——被染色的仍是 Atlas，
   * 只是这句话的意思反了过来。
   */
  it("suffix 染最后一段，且不改变原文顺序", () => {
    const { container } = one({
      title: "模型管理 · Atlas",
      brandPosition: "suffix",
    });
    expect(brandSpan(container)?.textContent).toBe("Atlas");
    expect(headerText(container)).toBe("模型管理 · Atlas");
  });

  /** `"<品牌> · <子域>"` 读作**这块属于该品牌**——染色的是**前**半段。 */
  it("prefix 染第一段，且不改变原文顺序", () => {
    const { container } = one({
      title: "Atlas · 模型管理",
      brandPosition: "prefix",
    });
    expect(brandSpan(container)?.textContent).toBe("Atlas");
    expect(headerText(container)).toBe("Atlas · 模型管理");
  });

  /** 缺省是 prefix——不传这个字段的老调用方行为不变。 */
  it("不传 brandPosition 时按 prefix 处理", () => {
    const { container } = one({ title: "Atlas · 模型管理" });
    expect(brandSpan(container)?.textContent).toBe("Atlas");
  });

  /**
   * 三段以上的标题：prefix 取**第一个**分隔符之前，suffix 取**最后一个**之后。
   * 两边都用 `indexOf` 的话 `A · B · C` 在 suffix 下会染成 `B · C`。
   */
  it("三段标题在两种写法下切在不同的分隔符上", () => {
    const a = one({ title: "A · B · C", brandPosition: "prefix" });
    expect(brandSpan(a.container)?.textContent).toBe("A");
    a.unmount();

    const { container } = one({ title: "A · B · C", brandPosition: "suffix" });
    expect(brandSpan(container)?.textContent).toBe("C");
  });

  it("显式关掉高亮时整条原样渲染", () => {
    const { container } = one({
      title: "Atlas · 模型管理",
      brandPosition: "none",
    });
    expect(brandSpan(container)).toBeUndefined();
    expect(screen.getByText("Atlas · 模型管理")).toBeInTheDocument();
  });

  /** 没有分隔符就没有品牌段——不做「哪段更短」之类的启发式猜测。 */
  it("不含分隔符的标题不染色", () => {
    const { container } = one({ title: "安全审计" });
    expect(brandSpan(container)).toBeUndefined();
  });

  /**
   * 只认 `" · "`（两侧带空格）。不带空格的 `A·B` 是一个词，不是复合标题——
   * 放宽成裸分隔符会把 `甲·乙商城` 这种品牌名自己切成两半。
   */
  it("不带空格的间隔号不算分隔符", () => {
    const { container } = one({
      title: "Atlas·模型管理",
      brandPosition: "suffix",
    });
    expect(brandSpan(container)).toBeUndefined();
  });

  it("收起态不渲染标题文字，也就没有品牌段", () => {
    const { container } = renderNav({ collapsed: true });
    expect(brandSpan(container)).toBeUndefined();
  });
});

/* ── 分组开合与持久化 ─────────────────────────────────────────────────────── */

describe("分组开合", () => {
  const groupBtn = (name: string | RegExp) =>
    screen.getByRole("button", { name });

  it("缺省全部展开", () => {
    renderNav();
    expect(groupBtn("概览")).toHaveAttribute("aria-expanded", "true");
  });

  it("点标题收起该组，再点展开", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(groupBtn("概览"));
    expect(groupBtn("概览")).toHaveAttribute("aria-expanded", "false");
    await user.click(groupBtn("概览"));
    expect(groupBtn("概览")).toHaveAttribute("aria-expanded", "true");
  });

  /**
   * 收起的组用**网格行高**收，不是 `display:none`——0fr→1fr 可以过渡，
   * `hidden` 不能。导航项因此始终在 DOM 里（键盘搜索仍找得到）。
   */
  it("收起用行高而不是从 DOM 里拿掉", async () => {
    const user = userEvent.setup();
    const { container } = renderNav();
    const grid = () =>
      [...container.querySelectorAll("div")].find(
        (d) => hasClass(d, "grid-rows-[1fr]") || hasClass(d, "grid-rows-[0fr]"),
      );
    expect(hasClass(grid() ?? null, "grid-rows-[1fr]")).toBe(true);
    await user.click(groupBtn("概览"));
    expect(hasClass(grid() ?? null, "grid-rows-[0fr]")).toBe(true);
    expect(screen.getByRole("link", { name: /首页/ })).toBeInTheDocument();
  });

  /** 开合状态存进 localStorage，key 带调用方给的前缀——两个产品不串状态。 */
  it("收起的组写进带前缀的 key", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(groupBtn("概览"));
    expect(
      JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]"),
    ).toEqual(["概览"]);
  });

  it("前缀由调用方给，不同前缀各写各的", async () => {
    const user = userEvent.setup();
    renderNav({ storageKeyPrefix: "other" });
    await user.click(groupBtn("概览"));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem("other-groups-closed")).not.toBeNull();
  });

  it("挂载时读回上次的收合状态", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(["概览"]));
    renderNav();
    expect(groupBtn("概览")).toHaveAttribute("aria-expanded", "false");
  });

  /**
   * **存坏了不能崩。** localStorage 里的东西可能被别的版本、别的标签页、
   * 甚至用户自己改过；一条读不回来的记录只该退回缺省，不该让整个侧栏白屏。
   */
  it.each([
    ["不是 JSON", "{{{"],
    ["是 JSON 但不是数组", '{"概览":true}'],
    ["是 null", "null"],
  ])("存的东西 %s 时退回全部展开", (_name, raw) => {
    window.localStorage.setItem(STORAGE_KEY, raw);
    expect(() => renderNav()).not.toThrow();
    expect(groupBtn("概览")).toHaveAttribute("aria-expanded", "true");
  });

  /**
   * **存成一个字符串时不能按字符拆。**
   *
   * `new Set("甲")` 得到的是 `{"甲"}`——一个恰好叫「甲」的分组就这么被收起来了。
   * 上面那三条坏数据都会在 `JSON.parse` 或 `new Set` 上抛、被 catch 兜住，
   * 只有「合法 JSON、可迭代、但不是数组」这一种能走到 `Array.isArray` 那道闸
   * 面前。少了它，这条闸就是摆设。
   */
  it("存的是字符串时不按字符拆成组名", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify("甲"));
    renderNav({
      sections: [{ title: "甲", items: [] }],
    });
    expect(groupBtn("甲")).toHaveAttribute("aria-expanded", "true");
  });

  /**
   * 每组的导航项包在自己的 `nav` 里并以组名命名——读屏器的地标列表里
   * 才分得出「概览」和「管理」，否则是一长串没有归属的链接。
   */
  it("每组的项在一个以组名命名的地标里", () => {
    renderNav();
    const group = screen.getByRole("navigation", { name: "概览" });
    expect(within(group).getAllByRole("link")).toHaveLength(1);
  });
});

/* ── 全部收合 / 全部展开 ──────────────────────────────────────────────────── */

describe("全部收合按钮", () => {
  it("一键收合全部，再点一键展开", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole("button", { name: /Collapse all/i }));
    expect(
      JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]").sort(),
    ).toEqual(["概览", "管理 · 某某"].sort());

    await user.click(screen.getByRole("button", { name: /Expand all/i }));
    expect(
      JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]"),
    ).toEqual([]);
  });

  /** 按钮的图标与名字都要跟着「现在是不是全收着」翻。 */
  it("全收着时变成「全部展开」", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole("button", { name: /Collapse all/i }));
    expect(
      screen.getByRole("button", { name: /Expand all/i }),
    ).toBeInTheDocument();
  });

  /** 只收了一部分时还不算「全收着」。 */
  it("收了一组还不算全收", async () => {
    const user = userEvent.setup();
    renderNav();
    await user.click(screen.getByRole("button", { name: "概览" }));
    expect(
      screen.getByRole("button", { name: /Collapse all/i }),
    ).toBeInTheDocument();
  });

  /**
   * **一个分组都没有时不能显示「全部展开」**——`closedGroups.size >= 0` 恒真，
   * 少了 `sections.length > 0` 这道闸，空侧栏会摆出一个「全部展开」的按钮，
   * 点下去什么也不会发生。
   */
  it("没有分组时不摆出「全部展开」", () => {
    renderNav({ sections: [] });
    expect(
      screen.getByRole("button", { name: /Collapse all/i }),
    ).toBeInTheDocument();
  });

  /** 常态透明、hover 或键盘 focus 才现身——常驻会变成视觉噪音。 */
  it("常态不占视觉，focus 时现身", () => {
    renderNav();
    const btn = screen.getByRole("button", { name: /Collapse all/i });
    expect(hasClass(btn, "opacity-0")).toBe(true);
    expect(hasClass(btn, "group-hover:opacity-100")).toBe(true);
    expect(hasClass(btn, "focus-visible:opacity-100")).toBe(true);
  });
});

/* ── 导航项 ───────────────────────────────────────────────────────────────── */

describe("导航项", () => {
  it("当前项报 aria-current=page，其余不报", () => {
    renderNav();
    expect(screen.getByRole("link", { name: /甲/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: /首页/ })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("当前项换一套颜色", () => {
    renderNav();
    expect(
      hasClass(screen.getByRole("link", { name: /甲/ }), "text-primary-text"),
    ).toBe(true);
    expect(
      hasClass(screen.getByRole("link", { name: /首页/ }), "text-primary-text"),
    ).toBe(false);
  });

  /** 缺省用原生 `<a>`：本包不依赖任何路由库，产品侧有就自己传进来。 */
  it("缺省渲染原生 a", () => {
    renderNav();
    expect(screen.getByRole("link", { name: /首页/ }).tagName).toBe("A");
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
    renderNav({ linkComponent: Link });
    expect(screen.getByRole("link", { name: /首页/ })).toHaveAttribute(
      "data-router",
      "1",
    );
  });

  /** 副名是**注解**不是标题：恒 muted，选中态也不跟着提主色。 */
  it("副名渲染成第二行，且不跟着选中变色", () => {
    renderNav();
    const sub = screen.getByText("beta");
    expect(hasClass(sub, "text-muted-foreground")).toBe(true);
    expect(hasClass(sub, "font-mono")).toBe(true);
  });

  it("不传 subLabel 就是单行", () => {
    renderNav();
    const link = screen.getByRole("link", { name: /首页/ });
    expect(link.textContent).toBe("首页");
  });
});

/* ── 分隔线与底部块 ───────────────────────────────────────────────────────── */

describe("分组分隔线", () => {
  const dividers = (root: ParentNode) =>
    [...root.querySelectorAll("div")].filter((d) => hasClass(d, "border-t"));

  it("dividerBefore 的组画一条上缘线", () => {
    const { container } = renderNav();
    expect(dividers(container)).toHaveLength(1);
  });

  /** **首组即使传 true 也不画**——顶上没有要分隔的东西，只会多一条贴边的线。 */
  it("首组传了也不画", () => {
    const { container } = renderNav({
      sections: [{ ...SECTIONS[0]!, dividerBefore: true }],
    });
    expect(dividers(container)).toHaveLength(0);
  });

  it("不传就不画", () => {
    const { container } = renderNav({
      sections: SECTIONS.map((s) => ({ ...s, dividerBefore: false })),
    });
    expect(dividers(container)).toHaveLength(0);
  });
});

describe("底部块", () => {
  /** 高度恒定：传不传 footer 都占同一格，否则导航项会因为底部有没有东西而上下跳。 */
  it("不传 footer 时是空占位并对读屏器隐藏", () => {
    const { container } = renderNav();
    const foot = container.querySelector(".h-header-xl") as HTMLElement;
    expect(foot).not.toBeNull();
    expect(foot).toHaveAttribute("aria-hidden", "true");
  });

  it("传了 footer 就不再 aria-hidden", () => {
    const { container } = renderNav({ footer: <button>退出</button> });
    const foot = container.querySelector(".h-header-xl") as HTMLElement;
    expect(foot).not.toHaveAttribute("aria-hidden");
    expect(screen.getByRole("button", { name: "退出" })).toBeInTheDocument();
  });
});

/* ── 无障碍名 ─────────────────────────────────────────────────────────────── */

describe("无障碍名", () => {
  /** 默认英文；做 i18n 的消费方必须传，否则中文档下这两个按钮会显英文。 */
  it("可以只覆盖其中一项，其余仍用默认", () => {
    renderNav({ labels: { collapseNav: "收起导航" } });
    expect(
      screen.getByRole("button", { name: "收起导航" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Collapse all groups" }),
    ).toBeInTheDocument();
  });

  it("四项都可覆盖", async () => {
    const user = userEvent.setup();
    renderNav({
      labels: {
        collapseNav: "收起导航",
        expandNav: "展开导航",
        collapseAllGroups: "全部收合",
        expandAllGroups: "全部展开",
      },
    });
    await user.click(screen.getByRole("button", { name: "全部收合" }));
    expect(
      screen.getByRole("button", { name: "全部展开" }),
    ).toBeInTheDocument();
  });
});
