/**
 * 侧栏导航项的行尾外链槽位（`ShellNavItem.external`，2026-09-08 新增）。
 *
 * ── 这一格为什么要测 ──
 * 它是**两个目的地共处一行**：点行本身走 `href`（应用内），点图标走
 * `external.href`（站外文档）。做错的方式有三种，屏幕上都不一定看得出来：
 *
 *  1. 把 `<a>` 嵌进主链接里 → HTML 不允许链接套链接，浏览器会把它拆开，
 *     点击落到外层。图标看着在、点了却去了应用内页面。
 *  2. 忘了 `rel="noopener"` → `target="_blank"` 打开的页面能拿到 `window.opener`，
 *     是一条已知的钓鱼路径。
 *  3. 纯图标按钮没有可访问名 → 对读屏器等于隐身。
 *
 * 另外必须钉住**不传就是原行为**：这个件五个门户共用，新字段是纯增量。
 */

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ShellSidebarNav } from "../src/components/shell/ShellSidebarNav";
import type { ShellNavSection } from "../src/components/shell/ShellSidebarNav";

const sections = (external?: { href: string; label: string }) =>
  [
    {
      title: "模型与能力",
      items: [
        {
          href: "/atlas",
          label: "模型服务",
          subLabel: "Atlas",
          icon: "database" as const,
          ...(external ? { external } : {}),
        },
      ],
    },
  ] satisfies ShellNavSection[];

function renderNav(
  external?: { href: string; label: string },
  collapsed = false,
) {
  return render(
    <ShellSidebarNav
      domainName=""
      sections={sections(external)}
      collapsed={collapsed}
      onToggleCollapsed={() => {}}
      isActive={() => false}
      storageKeyPrefix="test-nav"
    />,
  );
}

const DOCS = {
  href: "https://example.test/docs/models",
  label: "查看模型文档",
};

describe("不传 external —— 原行为", () => {
  it("只有主链接，没有第二个可点区", () => {
    renderNav();
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/atlas");
  });
});

describe("传了 external", () => {
  it("两个链接并存：行走应用内，图标走站外", () => {
    renderNav(DOCS);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/atlas",
      DOCS.href,
    ]);
  });

  it("外链**不在**主链接内部——嵌套 <a> 会被浏览器拆开，图标等于失效", () => {
    renderNav(DOCS);
    const main = screen.getByRole("link", { name: /模型服务/ });
    expect(within(main).queryByRole("link")).toBeNull();
  });

  it("新标签页打开，且带 noopener noreferrer", () => {
    // 少了 noopener，被打开的页面能拿到 window.opener——一条已知的钓鱼路径。
    renderNav(DOCS);
    const ext = screen.getByRole("link", { name: DOCS.label });
    expect(ext).toHaveAttribute("target", "_blank");
    const rel = ext.getAttribute("rel") ?? "";
    expect(rel).toContain("noopener");
    expect(rel).toContain("noreferrer");
  });

  it("图标有可访问名——纯图标按钮没有名字对读屏器就是隐身", () => {
    renderNav(DOCS);
    expect(screen.getByRole("link", { name: DOCS.label })).toBeTruthy();
  });

  it("主链接右侧留位，长标签不会钻到图标底下", () => {
    renderNav(DOCS);
    const main = screen.getByRole("link", { name: /模型服务/ });
    expect(main.className.split(/\s+/)).toContain("pr-2xl");
  });
});

describe("收起态", () => {
  it("不渲染外链——只剩图标，没有位置放第二个可点区", () => {
    renderNav(DOCS, true);
    expect(screen.queryByRole("link", { name: DOCS.label })).toBeNull();
  });
});
