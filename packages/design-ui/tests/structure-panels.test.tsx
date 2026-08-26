/**
 * 结构族：`SectionHeader` / `PanelCard` / `SectionNav` / `ViewHeader` /
 * `PanelList` / `PanelItem`。
 *
 * 第四批换了打包方式。前三批一件顶几十条分支，到这里尾部已经变平——头一名只剩
 * 10 条，之后是一长串 8~9 条的。**再一件一件排，排的是名字不是风险**；按族打
 * 才对得上这几件真正共享的东西：它们都在回答「这一块在页面结构里是第几层」。
 *
 * 六件加起来 46 条未覆盖分支，绝大多数是同一个形状：**某个可选槽给不给**。
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SectionHeader } from "../src/components/composite/structure/SectionHeader";
import { PanelCard } from "../src/components/composite/structure/PanelCard";
import { PanelList } from "../src/components/composite/structure/PanelList";
import { PanelItem } from "../src/components/composite/structure/PanelItem";
import { SectionNav } from "../src/components/composite/structure/SectionNav";
import { ViewHeader } from "../src/components/composite/structure/ViewHeader";

/* ── SectionHeader ────────────────────────────────────────────────────────── */

describe("SectionHeader · level 同时定语义元素与排版角色", () => {
  /**
   * 层级不是「多大的字」，是**语义元素**：读屏器靠 h1–h4 建立文档大纲，
   * 用对了字号但用错了标签，视觉上一样、结构上是平的。
   */
  it.each([
    [1, "h1", "text-title-lg"],
    [2, "h2", "text-title-md"],
    [3, "h3", "text-title-sm"],
    [4, "h4", "text-label-md"],
  ] as const)("level=%i → <%s> + %s", (level, tag, type) => {
    const { container } = render(<SectionHeader level={level} title="标题" />);
    const el = container.querySelector(tag) as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.textContent).toBe("标题");
    expect(el.className).toContain(type);
  });

  it("不给 level 时是 2", () => {
    const { container } = render(<SectionHeader title="标题" />);
    expect(container.querySelector("h2")).not.toBeNull();
  });

  /**
   * **虚线的缺省跟着 level 走**：板块开始的记号只属于板块标题（level 2），
   * 三四级标题挂虚线会把一段内容切成好几块，读起来像并列的板块而不是同一块的
   * 子层。虚线分字段、实线开区块（V4）。
   */
  it("虚线缺省：只有 level 2 有", () => {
    const two = render(<SectionHeader title="标题" />);
    expect(
      (two.container.firstElementChild as HTMLElement).className,
    ).toContain("border-b");
    two.unmount();

    for (const level of [1, 3, 4] as const) {
      const other = render(<SectionHeader level={level} title="标题" />);
      expect(
        (other.container.firstElementChild as HTMLElement).className,
      ).not.toContain("border-b");
      other.unmount();
    }
  });

  it("divider 可两头覆盖缺省", () => {
    const on = render(<SectionHeader level={3} title="标题" divider />);
    expect((on.container.firstElementChild as HTMLElement).className).toContain(
      "border-b",
    );
    on.unmount();

    const off = render(
      <SectionHeader level={2} title="标题" divider={false} />,
    );
    expect(
      (off.container.firstElementChild as HTMLElement).className,
    ).not.toContain("border-b");
  });

  /**
   * `titleSuffix` 贴着标题（是标题的一部分），`action` 靠右（是板块的动作）。
   * 两个槽都给时必须各就各位——admin 总览的四个面板头里，「详情」在右端而
   * `?` 紧贴标题。
   */
  it("titleSuffix 与 action 分属两处", () => {
    const { container } = render(
      <SectionHeader
        title="经营指标"
        titleSuffix={<span>口径</span>}
        action={<button>详情</button>}
      />,
    );
    const h2 = container.querySelector("h2") as HTMLElement;
    // titleSuffix 与标题同在一个内联容器里
    expect(h2.parentElement?.textContent).toContain("口径");
    // action 不在
    expect(h2.parentElement?.textContent).not.toContain("详情");
    expect(screen.getByRole("button", { name: "详情" })).toBeInTheDocument();
  });

  it("不给 titleSuffix 时标题不套额外一层", () => {
    const { container } = render(<SectionHeader title="标题" />);
    const h2 = container.querySelector("h2") as HTMLElement;
    expect(h2.parentElement?.tagName).not.toBe("SPAN");
  });

  /**
   * ⚠ 这几条断言的是**结构**（那一层在不在），不是内容（有没有文字）。
   *
   * 第一版写的是「`queryByRole("button")` 找不到」——把 `{action ? …}` 改成
   * `{true ? …}` 之后**照样绿**：渲染出来的是一个**空壳** div，既没有文字也没有
   * 角色，从内容上分辨不出。而空壳是有代价的：它带着 `gap` 与 `self-end`，
   * 会在标题块右边留出一段说不清来路的空白。
   *
   * 「不给就不渲染那一层」这类分支，一律数元素，不数文字。
   */
  it("description 与 action 不给就不渲染那一层", () => {
    const { container } = render(<SectionHeader title="标题" />);
    const root = container.firstElementChild as HTMLElement;
    // 只剩中间那个标题块，没有图标层、没有 action 层
    expect(root.children).toHaveLength(1);
    expect(container.querySelector("p")).toBeNull();
  });

  it("给了就各自多出一层", () => {
    const { container } = render(
      <SectionHeader
        title="标题"
        description="一句话说清这一块收了什么"
        action={<button>详情</button>}
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.children).toHaveLength(2); // 标题块 + action 层
    expect(screen.getByText("一句话说清这一块收了什么")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "详情" })).toBeInTheDocument();
  });

  /**
   * 图标是装饰——标题已经念过了，读屏器再念一遍图标名是重复。
   * 断言**包着图标的那一层**带 aria-hidden，而不是「页面里存在某个 aria-hidden」——
   * 后者被内层 svg 自带的属性满足，把这一层拿掉也不变红。
   */
  it("图标那一层对读屏器隐藏", () => {
    const { container } = render(<SectionHeader title="标题" icon="gear" />);
    const wrap = container.firstElementChild?.firstElementChild as HTMLElement;
    expect(wrap.querySelector("svg")).not.toBeNull();
    expect(wrap).toHaveAttribute("aria-hidden", "true");
  });
});

/* ── PanelCard ────────────────────────────────────────────────────────────── */

describe("PanelCard · 语气只染顶缘", () => {
  /**
   * 一排面板靠顶缘色条区分归属。**底色染满会盖过内容本身**，与 `MetricCard`
   * 同一判断；**标题也不染**——主标题深色，不走彩色链接模式（owner 2026-08-05）。
   */
  it("顶缘加粗，语气类落在卡上", () => {
    const { container } = render(
      <PanelCard title="产品排行" tone="warning">
        <p>内容</p>
      </PanelCard>,
    );
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain("border-t-medium");
  });

  it("不同 tone 落不同的类", () => {
    const a = render(
      <PanelCard title="x" tone="danger">
        <p>c</p>
      </PanelCard>,
    );
    const danger = (a.container.firstElementChild as HTMLElement).className;
    a.unmount();

    const b = render(
      <PanelCard title="x" tone="success">
        <p>c</p>
      </PanelCard>,
    );
    expect((b.container.firstElementChild as HTMLElement).className).not.toBe(
      danger,
    );
  });

  it("不给 tone 时是 brand", () => {
    const explicit = render(
      <PanelCard title="x" tone="brand">
        <p>c</p>
      </PanelCard>,
    );
    const brandCls = (explicit.container.firstElementChild as HTMLElement)
      .className;
    explicit.unmount();

    const implicit = render(
      <PanelCard title="x">
        <p>c</p>
      </PanelCard>,
    );
    expect(
      (implicit.container.firstElementChild as HTMLElement).className,
    ).toBe(brandCls);
  });

  /** 头部复用 `SectionHeader` level 3，不自己再渲染一遍 h3。 */
  it("标题是 h3，并带虚线", () => {
    const { container } = render(
      <PanelCard title="产品排行">
        <p>内容</p>
      </PanelCard>,
    );
    const h3 = container.querySelector("h3") as HTMLElement;
    expect(h3.textContent).toBe("产品排行");
    expect(h3.closest("div[class*='border-b']") as HTMLElement).not.toBeNull();
  });

  it("四个可选槽都透传得下去", () => {
    render(
      <PanelCard
        title="产品排行"
        titleSuffix={<span>口径</span>}
        description="近 30 天"
        icon="gear"
        action={<button>详情</button>}
      >
        <p>内容</p>
      </PanelCard>,
    );
    expect(screen.getByText("口径")).toBeInTheDocument();
    expect(screen.getByText("近 30 天")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "详情" })).toBeInTheDocument();
    expect(screen.getByText("内容")).toBeInTheDocument();
  });

  it("一个都不给也渲染得出来", () => {
    render(
      <PanelCard title="只有标题">
        <p>内容</p>
      </PanelCard>,
    );
    expect(
      screen.getByRole("heading", { name: "只有标题" }),
    ).toBeInTheDocument();
    expect(screen.getByText("内容")).toBeInTheDocument();
  });
});

/* ── SectionNav ───────────────────────────────────────────────────────────── */

describe("SectionNav · 当前项与停用项", () => {
  const ITEMS = [
    { key: "basic", label: "基本信息" },
    {
      key: "quota",
      label: "配额",
      description: "按月重置",
      meta: <span>3</span>,
    },
    { key: "danger", label: "危险操作", disabled: true },
  ];

  /**
   * `aria-current="true"` **只挂当前那一项**。挂多了读屏器会念出好几个「当前」，
   * 而它本来是回答「我在哪」的唯一线索。
   */
  it("aria-current 只在当前项", () => {
    render(<SectionNav items={ITEMS} activeKey="quota" />);
    expect(screen.getByRole("button", { name: /配额/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "基本信息" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("activeKey 对不上任何项时谁都不是当前", () => {
    render(<SectionNav items={ITEMS} activeKey="不存在" />);
    for (const b of screen.getAllByRole("button")) {
      expect(b).not.toHaveAttribute("aria-current");
    }
  });

  it("点一项回传它的 key", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SectionNav items={ITEMS} activeKey="basic" onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: /配额/ }));
    expect(onSelect).toHaveBeenCalledWith("quota");
  });

  it("停用项按不动", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SectionNav items={ITEMS} activeKey="basic" onSelect={onSelect} />);
    const danger = screen.getByRole("button", { name: "危险操作" });
    expect(danger).toBeDisabled();
    await user.click(danger);
    expect(onSelect).not.toHaveBeenCalled();
  });

  /** 不给 `onSelect` 也不该炸——只读的导航是合法用法。 */
  it("不给 onSelect 时点了也不炸", async () => {
    const user = userEvent.setup();
    render(<SectionNav items={ITEMS} activeKey="basic" />);
    await user.click(screen.getByRole("button", { name: /配额/ }));
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  /**
   * 同 `SectionHeader` 那几条：断言**层数**不是文字。空的 `<span>` 既没有文字
   * 也没有角色，用「文字不在」分辨不出「不渲染」与「渲染一个空壳」。
   */
  it("description 与 meta 给了才多出那一层", () => {
    render(<SectionNav items={ITEMS} activeKey="basic" />);
    expect(screen.getByText("按月重置")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    // 基本信息那一项：只有一个「标签 + 描述」容器，没有 meta 层
    const basic = screen.getByRole("button", { name: "基本信息" });
    expect(basic.children).toHaveLength(1);
    expect(basic.firstElementChild?.children).toHaveLength(1); // 只有 label

    // 配额那一项：容器 + meta 两层，容器里 label + description 两层
    const quota = screen.getByRole("button", { name: /配额/ });
    expect(quota.children).toHaveLength(2);
    expect(quota.firstElementChild?.children).toHaveLength(2);
  });

  it("整组有默认可访问名，可覆盖", () => {
    const a = render(<SectionNav items={ITEMS} activeKey="basic" />);
    expect(
      screen.getByRole("navigation", { name: "Section navigation" }),
    ).toBeInTheDocument();
    a.unmount();

    render(
      <SectionNav items={ITEMS} activeKey="basic" aria-label="设置分区" />,
    );
    expect(
      screen.getByRole("navigation", { name: "设置分区" }),
    ).toBeInTheDocument();
  });

  /** 每一项都是 `type="button"`——它常出现在设置页的表单里。 */
  it("每一项都是 type=button，不会顺手提交表单", () => {
    render(<SectionNav items={ITEMS} activeKey="basic" />);
    for (const b of screen.getAllByRole("button")) {
      expect(b).toHaveAttribute("type", "button");
    }
  });
});

/* ── ViewHeader ───────────────────────────────────────────────────────────── */

describe("ViewHeader · 页面级标题", () => {
  it("标题是 h1", () => {
    render(<ViewHeader title="租户详情" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "租户详情" }),
    ).toBeInTheDocument();
  });

  it("三个可选槽不给就不渲染那一层", () => {
    const { container } = render(<ViewHeader title="租户详情" />);
    const root = container.firstElementChild as HTMLElement;
    // 只剩中间那个标题块：没有图标层、没有 action 层
    expect(root.children).toHaveLength(1);
    expect(container.querySelector("p")).toBeNull();
  });

  it("给了就各就各位", () => {
    const { container } = render(
      <ViewHeader
        title="租户详情"
        description="一句话"
        icon="gear"
        secondary={<span>运行中</span>}
        action={<button>编辑</button>}
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.children).toHaveLength(3); // 图标层 + 标题块 + action 层
    expect(screen.getByText("一句话")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "编辑" })).toBeInTheDocument();
    // secondary 与标题同行
    const h1 = container.querySelector("h1") as HTMLElement;
    expect(h1.parentElement?.textContent).toContain("运行中");
  });

  /** 图标是装饰，不进无障碍树——标题已经把这一页是什么说清楚了。 */
  it("图标对读屏器隐藏", () => {
    const { container } = render(<ViewHeader title="租户详情" icon="gear" />);
    const wrap = container.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(wrap.querySelector("svg")).not.toBeNull();
  });
});

/* ── PanelList / PanelItem ────────────────────────────────────────────────── */

describe("PanelList · 空态接管", () => {
  /**
   * `empty` 给了才在无内容时接管。**两个条件缺一不可**：没给 `empty` 时渲染
   * 一个空的分隔容器（调用方自己处理），给了 `empty` 但有内容时当然走正常路。
   */
  it("无内容且给了 empty → 出说明，不出分隔容器", () => {
    const { container } = render(
      <PanelList empty="还没有数据">{[]}</PanelList>,
    );
    expect(screen.getByText("还没有数据")).toBeInTheDocument();
    expect(container.querySelector("div")).toBeNull();
  });

  it("无内容但没给 empty → 出空的分隔容器", () => {
    const { container } = render(<PanelList>{[]}</PanelList>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.tagName).toBe("DIV");
    expect(el.className).toContain("divide-y");
  });

  it("有内容时 empty 不接管", () => {
    render(
      <PanelList empty="还没有数据">
        <span>一条</span>
      </PanelList>,
    );
    expect(screen.queryByText("还没有数据")).not.toBeInTheDocument();
    expect(screen.getByText("一条")).toBeInTheDocument();
  });
});

describe("PanelItem · 前后两个槽各自可选", () => {
  it("只给 main 时前后都不渲染", () => {
    const { container } = render(<PanelItem main={<span>主体</span>} />);
    expect(container.firstElementChild?.children).toHaveLength(1);
  });

  it("lead 走定宽轨，与上下项对齐", () => {
    const { container } = render(
      <PanelItem lead={<span>1</span>} main={<span>主体</span>} />,
    );
    const first = container.firstElementChild?.firstElementChild as HTMLElement;
    expect(first.className).toContain("w-control-md");
  });

  it("trail 右对齐、按内容收缩", () => {
    const { container } = render(
      <PanelItem main={<span>主体</span>} trail={<span>99</span>} />,
    );
    const last = container.firstElementChild?.lastElementChild as HTMLElement;
    expect(last.className).toContain("text-right");
    expect(last.className).toContain("shrink-0");
  });

  it("三个都给时顺序是 lead / main / trail", () => {
    const { container } = render(
      <PanelItem
        lead={<span>L</span>}
        main={<span>M</span>}
        trail={<span>T</span>}
      />,
    );
    const kids = [...(container.firstElementChild?.children ?? [])];
    expect(kids.map((k) => k.textContent)).toEqual(["L", "M", "T"]);
  });
});
