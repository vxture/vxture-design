/**
 * ShellLayout / FieldTier / ContextMenu —— 同一批「按分支排」的第二组。
 *
 * 三件的共同点是**状态机**：外壳的侧栏三态与专注模式、分档的折叠、右键菜单的
 * 开合。状态机的分支是最容易写对一条、写漏另一条的地方，而漏掉的那一条通常
 * 只在某个不常走的组合下露头。
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import {
  ShellHeader,
  ShellPageContainer,
  ShellSidebarFrame,
  ShellViewport,
} from "../src/components/layout/ShellLayout";
import { FieldTier } from "../src/components/composite/form/FieldTier";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "../src/components/base/overlay/ContextMenu";

const cls = (el: Element | null | undefined) =>
  (el as HTMLElement)?.className ?? "";

/* ── ShellHeader ──────────────────────────────────────────────────────────── */

describe("ShellHeader · 三个插槽与中槽对齐", () => {
  /**
   * 中槽**不给就不渲染那一层**，而不是渲染一个空的 flex-1。空的 flex-1 会把
   * trailing 顶到最右——看起来一样，但 leading 与 trailing 之间的间距关系变了，
   * 而 header 是每一页都在的东西，差一点到处都差。
   */
  it("不给 center 就不渲染中间那一层", () => {
    const { container, rerender } = render(
      <ShellHeader leading={<span>品牌</span>} trailing={<span>头像</span>} />,
    );
    expect(container.querySelector("header")?.children).toHaveLength(2);

    rerender(
      <ShellHeader
        leading={<span>品牌</span>}
        center={<span>搜索</span>}
        trailing={<span>头像</span>}
      />,
    );
    expect(container.querySelector("header")?.children).toHaveLength(3);
    expect(screen.getByText("搜索")).toBeInTheDocument();
  });

  /**
   * `centerAlign="end"` 把 header 读成「标识在左、工具在右」两极，中槽归到右极；
   * 缺省 `center` 是把中槽当视觉焦点（如全局搜索）。两种都合法，选错不报错。
   */
  it.each([
    [undefined, "justify-center"],
    ["center" as const, "justify-center"],
    ["end" as const, "justify-end"],
  ])("centerAlign=%s → %s", (align, expected) => {
    const { container } = render(
      <ShellHeader
        center={<span>搜索</span>}
        {...(align ? { centerAlign: align } : {})}
      />,
    );
    const mid = container.querySelector("header")?.children[1];
    expect(cls(mid)).toContain(expected);
  });

  it.each([
    ["sm", "h-header-sm"],
    ["md", "h-header-md"],
    ["lg", "h-header-lg"],
    ["xl", "h-header-xl"],
  ] as const)("height=%s 挂 %s", (height, expected) => {
    const { container } = render(<ShellHeader height={height} />);
    expect(cls(container.querySelector("header"))).toContain(expected);
  });

  it("不给 height 时是 md", () => {
    const { container } = render(<ShellHeader />);
    expect(cls(container.querySelector("header"))).toContain("h-header-md");
  });
});

/* ── ShellPageContainer ───────────────────────────────────────────────────── */

describe("ShellPageContainer · 行宽四档", () => {
  it.each([
    ["narrow-lg", "max-w-content-narrow-lg"],
    ["base-xl", "max-w-content-base-xl"],
    ["wide-2xl", "max-w-content-wide-2xl"],
    ["ultra-3xl", "max-w-content-ultra-3xl"],
  ] as const)("width=%s 挂 %s", (width, expected) => {
    const { container } = render(
      <ShellPageContainer width={width}>内容</ShellPageContainer>,
    );
    expect(cls(container.firstElementChild)).toContain(expected);
  });

  /**
   * 缺省 `wide-2xl`（数据密集型面板）。这个缺省值本身有历史：迁移前 console 与
   * opera 的内容区宽度对不上（1480 vs 1536），就是因为各门户各写一串类。
   */
  it("不给 width 时是 wide-2xl", () => {
    const { container } = render(<ShellPageContainer>内容</ShellPageContainer>);
    expect(cls(container.firstElementChild)).toContain(
      "max-w-content-wide-2xl",
    );
  });

  /** 底部单独放大：内容滚到底时最后一行不该贴着视口下沿。 */
  it("四周留白走 page-inset，底部另有安全区", () => {
    const { container } = render(<ShellPageContainer>内容</ShellPageContainer>);
    const c = cls(container.firstElementChild);
    expect(c).toContain("px-page-inset");
    expect(c).toContain("pt-page-inset");
    expect(c).toContain("pb-6xl");
  });
});

/* ── ShellSidebarFrame ────────────────────────────────────────────────────── */

describe("ShellSidebarFrame · 隐藏态是卸载，不是宽度归零", () => {
  /**
   * **这条是产品决策，不是实现细节**：隐藏态 = 专注模式 = 不加载不消耗资源。
   * 宽度归零的话导航照样挂载、照样跑它的副作用与请求，只是看不见——那不是
   * 「隐藏」，是「藏起来继续跑」。
   */
  it("hidden 时 children 根本不在 DOM 里", () => {
    const { container } = render(
      <ShellSidebarFrame mode="hidden">
        <nav>导航</nav>
      </ShellSidebarFrame>,
    );
    expect(container.firstElementChild).toBeNull();
    expect(screen.queryByText("导航")).not.toBeInTheDocument();
  });

  it.each([
    ["expanded", "w-sidebar-expanded"],
    ["collapsed", "w-sidebar-collapsed"],
  ] as const)("mode=%s 挂 %s", (mode, expected) => {
    const { container } = render(
      <ShellSidebarFrame mode={mode}>
        <nav>导航</nav>
      </ShellSidebarFrame>,
    );
    expect(cls(container.firstElementChild)).toContain(expected);
    expect(screen.getByText("导航")).toBeInTheDocument();
  });

  /** 收起态在最窄的屏上再收一档到轨宽，否则收起的侧栏在手机上仍占掉小半屏。 */
  it("收起态在窄屏再收一档到轨宽", () => {
    const { container } = render(
      <ShellSidebarFrame mode="collapsed">
        <nav>导航</nav>
      </ShellSidebarFrame>,
    );
    expect(cls(container.firstElementChild)).toContain("max-sm:w-sidebar-rail");
  });

  /** 宽度是动画的，但用户要求减少动效时不能动。 */
  it("尊重 prefers-reduced-motion", () => {
    const { container } = render(
      <ShellSidebarFrame mode="collapsed">
        <nav>导航</nav>
      </ShellSidebarFrame>,
    );
    expect(cls(container.firstElementChild)).toContain(
      "motion-reduce:transition-none",
    );
  });
});

/* ── ShellViewport ────────────────────────────────────────────────────────── */

describe("ShellViewport · 专注模式让 dock 接管整个视口", () => {
  const parts = {
    header: <header>顶栏</header>,
    sidebar: <nav>导航</nav>,
    dock: <aside>停靠面板</aside>,
  };

  it("常规态：顶栏、侧栏、正文、dock 都在", () => {
    render(
      <ShellViewport {...parts} sidebarMode="expanded">
        <p>正文</p>
      </ShellViewport>,
    );
    for (const t of ["顶栏", "导航", "正文", "停靠面板"]) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
  });

  /**
   * `focusMode` 下 **header / sidebar / children 三样都不挂载**，只剩 dock。
   * 「不渲染」而不是「隐藏」——同侧栏 hidden 态是同一个判据。
   */
  it("focusMode：只剩 dock，其余三样都不挂载", () => {
    render(
      <ShellViewport {...parts} sidebarMode="expanded" focusMode>
        <p>正文</p>
      </ShellViewport>,
    );
    expect(screen.getByText("停靠面板")).toBeInTheDocument();
    for (const t of ["顶栏", "导航", "正文"]) {
      expect(screen.queryByText(t)).not.toBeInTheDocument();
    }
  });

  /** 专注模式下侧栏本来就不渲染，sidebarMode 是什么都不该改变这一点。 */
  it("focusMode 压过 sidebarMode", () => {
    render(
      <ShellViewport {...parts} sidebarMode="collapsed" focusMode>
        <p>正文</p>
      </ShellViewport>,
    );
    expect(screen.queryByText("导航")).not.toBeInTheDocument();
  });

  it("侧栏 hidden 时正文与 dock 仍在", () => {
    render(
      <ShellViewport {...parts} sidebarMode="hidden">
        <p>正文</p>
      </ShellViewport>,
    );
    expect(screen.queryByText("导航")).not.toBeInTheDocument();
    expect(screen.getByText("正文")).toBeInTheDocument();
    expect(screen.getByText("停靠面板")).toBeInTheDocument();
  });

  /** 正文区自己滚，不是整个视口滚——否则顶栏会跟着滚走。 */
  it("正文区是可滚的那一层", () => {
    const { container } = render(
      <ShellViewport {...parts} sidebarMode="expanded">
        <p>正文</p>
      </ShellViewport>,
    );
    expect(cls(container.querySelector("main"))).toContain("overflow-y-auto");
  });
});

/* ── FieldTier ────────────────────────────────────────────────────────────── */

describe("FieldTier · 只有 advanced 折叠", () => {
  /**
   * `advanced` 默认折叠**是它存在的信号**——「这里的东西你多半不用碰」。默认
   * 展开就把这个信号抹掉了，还让前两档被挤到视线之外。
   */
  it("advanced 默认收起，identity / details 默认展开", () => {
    // 各自独立渲染，不用 rerender 换 tier：`useState` 只读一次初始值，同一个实例
    // 换 tier 不会重置 open——而一个分档在运行时从 identity 变成 advanced 本就
    // 不是真实场景，用 rerender 测等于在测一个不存在的用法。
    const a = render(
      <FieldTier tier="advanced">
        <input aria-label="重试次数" />
      </FieldTier>,
    );
    expect(screen.queryByLabelText("重试次数")).not.toBeInTheDocument();
    a.unmount();

    const b = render(
      <FieldTier tier="identity">
        <input aria-label="名称" />
      </FieldTier>,
    );
    expect(screen.getByLabelText("名称")).toBeInTheDocument();
    b.unmount();

    render(
      <FieldTier tier="details">
        <input aria-label="备注" />
      </FieldTier>,
    );
    expect(screen.getByLabelText("备注")).toBeInTheDocument();
  });

  it("只有 advanced 是可折叠的（其余没有按钮）", () => {
    const { rerender } = render(
      <FieldTier tier="advanced">
        <span>内容</span>
      </FieldTier>,
    );
    expect(screen.getByRole("button")).toBeInTheDocument();

    rerender(
      <FieldTier tier="identity">
        <span>内容</span>
      </FieldTier>,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  /**
   * **`type="button"` 不能少。** 这一件基本只出现在 `<form>` 里，不写死类型的话
   * 按钮默认就是 submit——用户点一下「展开高级选项」，表单当场交了出去。
   */
  it("折叠钮是 type=button，不会把表单提交出去", async () => {
    const user = userEvent.setup();
    let submitted = false;
    render(
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitted = true;
        }}
      >
        <FieldTier tier="advanced">
          <input aria-label="重试次数" />
        </FieldTier>
      </form>,
    );
    const toggle = screen.getByRole("button");
    expect(toggle).toHaveAttribute("type", "button");

    await user.click(toggle);
    expect(submitted).toBe(false);
    expect(screen.getByLabelText("重试次数")).toBeInTheDocument();
  });

  it("展开收起来回，aria-expanded 跟着走", async () => {
    const user = userEvent.setup();
    render(
      <FieldTier tier="advanced">
        <input aria-label="重试次数" />
      </FieldTier>,
    );
    const toggle = screen.getByRole("button");
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("重试次数")).not.toBeInTheDocument();
  });

  it("defaultOpen 可两头覆盖缺省", () => {
    const a = render(
      <FieldTier tier="advanced" defaultOpen>
        <input aria-label="重试次数" />
      </FieldTier>,
    );
    expect(screen.getByLabelText("重试次数")).toBeInTheDocument();
    a.unmount();

    render(
      <FieldTier tier="identity" defaultOpen={false}>
        <input aria-label="名称" />
      </FieldTier>,
    );
    expect(screen.queryByLabelText("名称")).not.toBeInTheDocument();
  });

  /** 缺省用档位的标准名——跨页面同一档同一个词，才是分档的意义。 */
  it.each([
    ["identity", "Identity"],
    ["details", "Details"],
    ["advanced", "Advanced"],
  ] as const)("tier=%s 的标准名是 %s", (tier, label) => {
    render(
      <FieldTier tier={tier}>
        <span>内容</span>
      </FieldTier>,
    );
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("title 可覆盖档名，hint 给一句话", () => {
    render(
      <FieldTier tier="details" title="展示设置" hint="影响列表里怎么显示">
        <span>内容</span>
      </FieldTier>,
    );
    expect(screen.getByText("展示设置")).toBeInTheDocument();
    expect(screen.queryByText("Details")).not.toBeInTheDocument();
    expect(screen.getByText("影响列表里怎么显示")).toBeInTheDocument();
  });

  it("不给 hint 就不渲染那一行", () => {
    const { container } = render(
      <FieldTier tier="details">
        <span>内容</span>
      </FieldTier>,
    );
    // 档名一行 + children 一层，没有第三行
    const head = container.querySelector("section > div") as HTMLElement;
    expect(head.children).toHaveLength(1);
  });
});

/* ── ContextMenu ──────────────────────────────────────────────────────────── */

describe("ContextMenu · 右键才开", () => {
  function Menu() {
    return (
      <ContextMenu>
        <ContextMenuTrigger>右键这里</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>重命名</ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem>删除</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  it("初始不开，右键才开", async () => {
    const user = userEvent.setup();
    render(<Menu />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await user.pointer({
      keys: "[MouseRight]",
      target: screen.getByText("右键这里"),
    });
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    expect(
      screen.getByRole("menuitem", { name: "重命名" }),
    ).toBeInTheDocument();
  });

  /** 左键不该开——它和 DropdownMenu 的区别就在触发方式，混了就是两件重了。 */
  it("左键不开", async () => {
    const user = userEvent.setup();
    render(<Menu />);
    await user.click(screen.getByText("右键这里"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("分隔线是装饰，不进无障碍树", async () => {
    const user = userEvent.setup();
    render(<Menu />);
    await user.pointer({
      keys: "[MouseRight]",
      target: screen.getByText("右键这里"),
    });
    await screen.findByRole("menu");
    expect(screen.getAllByRole("menuitem")).toHaveLength(2);
  });
});
