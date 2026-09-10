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

const sections = (
  external?: { href: string; label: string },
  trailingIcon?: "external-link",
) =>
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
          ...(trailingIcon ? { trailingIcon } : {}),
        },
      ],
    },
  ] satisfies ShellNavSection[];

function renderNav(
  external?: { href: string; label: string },
  collapsed = false,
  trailingIcon?: "external-link",
) {
  return render(
    <ShellSidebarNav
      domainName=""
      sections={sections(external, trailingIcon)}
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

/**
 * `trailingIcon` —— 行尾的**纯指示图标**（2026-09-09 新增）。
 *
 * 它与 `external` 长得像，但意思相反：`external` 是第二个可点的目的地，
 * 本件只有一个目的地、图标是它的标记。做错的方式是把它也做成可点的——
 * 那样一行里就有两个指向同一处的链接，读屏器报两遍、Tab 多停一次。
 */
describe("trailingIcon —— 只渲染，不可点", () => {
  it("不新增第二个链接", () => {
    renderNav(undefined, false, "external-link");
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/atlas");
  });

  it("图标画在主链接**内部**（它不可点，不构成嵌套链接）", () => {
    renderNav(undefined, false, "external-link");
    const main = screen.getByRole("link", { name: /模型服务/ });
    expect(main.querySelector("svg")).not.toBeNull();
  });

  it("external 在场时不渲染它 —— 右侧位置归可交互的那个", () => {
    /* 初版这条断言的是「仍是两个链接」——**判据不动**：指示图标本来就不是链接，
       渲不渲染它链接数都是 2，变异（去掉 `!item.external` 这个条件）全过。
       改成数主链接里的 svg：主图标 1 个，多渲染一个指示图标就会变成 2。 */
    renderNav(DOCS, false, "external-link");
    const main = screen.getByRole("link", { name: /模型服务/ });
    expect(main.querySelectorAll("svg")).toHaveLength(1);
  });

  it("收起态不渲染", () => {
    renderNav(undefined, true, "external-link");
    const main = screen.getByRole("link");
    // 收起态只剩主图标一个 svg；多出来的那个就是没被挡住。
    expect(main.querySelectorAll("svg")).toHaveLength(1);
  });

  it("不传就是原行为", () => {
    renderNav();
    const main = screen.getByRole("link", { name: /模型服务/ });
    expect(main.querySelectorAll("svg")).toHaveLength(1);
  });
});
