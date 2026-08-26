/**
 * MetricGrid 与 BarChart —— 两件都是**零覆盖但分支密**的典型。
 *
 * 这一批的挑件口径换了：不再按「件名」排，按**未覆盖分支**排。这两件在
 * 覆盖率里各是 24/24 与 12/12——4 行 24 分支、8 行 12 分支，按行数看都是
 * 「薄封装」，按分支看是全仓密度最高的几个。而前几轮修掉的缺陷（Drawer 挡位
 * 失效、两处键盘陷阱、Provider 清理时机）**全是分支缺陷**。
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MetricGrid } from "../src/components/composite/data/MetricGrid";
import { BarChart } from "../src/components/composite/data/BarChart";

/* ── MetricGrid ───────────────────────────────────────────────────────────── */

const ITEMS = [
  { id: "a", label: "账号总数", value: 105, trend: "+12", tags: ["本月"] },
  { id: "b", label: "活跃", value: 87, trend: "-3", tags: ["本月"] },
] as const;

describe("MetricGrid · loading 是为了不说谎", () => {
  /**
   * **这一条是本件存在的理由**（2026-08-06 登录态走查）。
   *
   * 读数由页面从数组算出，加载中那个数组是空的，于是界面在数据到达前斩钉截铁
   * 地写着「账号总数 0」，几百毫秒后跳成 105。**断言一个错误的事实，比什么都
   * 不说更糟**——用户会照着那个 0 做判断。
   *
   * 占位用横杠不用 0：「还不知道」和「是零」是两件事。
   */
  it("loading 时读数换成横杠，而不是显示 0", () => {
    render(<MetricGrid items={ITEMS} loading />);
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.queryByText("105")).not.toBeInTheDocument();
    expect(screen.queryByText("87")).not.toBeInTheDocument();
  });

  /** 趋势和标签同样是从数据算的，加载中一并压掉——否则读数是横杠、旁边挂着「+12」。 */
  it("loading 时趋势与标签一并压掉", () => {
    render(<MetricGrid items={ITEMS} loading />);
    expect(screen.queryByText("+12")).not.toBeInTheDocument();
    expect(screen.queryByText("本月")).not.toBeInTheDocument();
  });

  it("不 loading 时读数、趋势、标签都在", () => {
    render(<MetricGrid items={ITEMS} />);
    expect(screen.getByText("105")).toBeInTheDocument();
    expect(screen.getByText("+12")).toBeInTheDocument();
    expect(screen.getAllByText("本月")).toHaveLength(2);
  });

  /** 标签是「这一格叫什么」，不是数据——加载中也得留着，否则整排卡认不出谁是谁。 */
  it("loading 时标签文字仍在", () => {
    render(<MetricGrid items={ITEMS} loading />);
    expect(screen.getByText("账号总数")).toBeInTheDocument();
    expect(screen.getByText("活跃")).toBeInTheDocument();
  });
});

describe("MetricGrid · 组名与列数", () => {
  /**
   * 一排读数对读屏器是一堆无名数字。给了 aria-label 才连同 role="group" 一起挂——
   * 没有组名就只能逐张听过去，听到第三张已经忘了这一排是讲什么的。
   */
  it("给了 aria-label 才有 group 角色", () => {
    const { rerender } = render(
      <MetricGrid items={ITEMS} aria-label="订单管理统计" />,
    );
    expect(
      screen.getByRole("group", { name: "订单管理统计" }),
    ).toBeInTheDocument();

    rerender(<MetricGrid items={ITEMS} />);
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });

  /** columns 只决定宽屏那一档；窄屏单列、中屏两列由本件固定，各处不会长得不一样。 */
  it.each([
    [2, "lg:grid-cols-2"],
    [3, "lg:grid-cols-3"],
    [4, "lg:grid-cols-4"],
    [5, "lg:grid-cols-5"],
    [6, "lg:grid-cols-6"],
  ] as const)("columns=%i 挂 %s", (columns, cls) => {
    const { container } = render(
      <MetricGrid items={ITEMS} columns={columns} />,
    );
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.className).toContain(cls);
    // 断点由本件固定，不随 columns 变
    expect(grid.className).toContain("sm:grid-cols-2");
  });

  it("不给 columns 时是 4 列", () => {
    const { container } = render(<MetricGrid items={ITEMS} />);
    expect((container.firstElementChild as HTMLElement).className).toContain(
      "lg:grid-cols-4",
    );
  });

  /**
   * key 走 `id` 而不是 `String(label)`：label 是 ReactNode 时会撞。
   * 两张卡同名不同 id，两张都得在。
   */
  it("同名不同 id 的两张卡都渲染得出来", () => {
    render(
      <MetricGrid
        items={[
          { id: "x", label: "总数", value: 1 },
          { id: "y", label: "总数", value: 2 },
        ]}
      />,
    );
    expect(screen.getAllByText("总数")).toHaveLength(2);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("空 items 也渲染得出容器，不炸", () => {
    const { container } = render(<MetricGrid items={[]} />);
    expect(container.firstElementChild).not.toBeNull();
    expect(container.firstElementChild?.children).toHaveLength(0);
  });
});

/* ── BarChart ─────────────────────────────────────────────────────────────── */

const bars = (root: HTMLElement) =>
  [...root.querySelectorAll("[title]")].map(
    (slot) => slot.firstElementChild as HTMLElement,
  );

describe("BarChart · 高度按组内最大值归一", () => {
  it("最高的那根是 100%，其余按比例", () => {
    const { container } = render(
      <BarChart
        data={[
          { key: "a", label: "1 日", value: 50 },
          { key: "b", label: "2 日", value: 100 },
          { key: "c", label: "3 日", value: 25 },
        ]}
      />,
    );
    const [a, b, c] = bars(container);
    expect(b?.style.height).toBe("100%");
    expect(a?.style.height).toBe("50%");
    expect(c?.style.height).toBe("25%");
  });

  /**
   * **零值不是矮柱子，是基线刻度。**「这天没有数据」和「这天数据很小」是两件事，
   * 画成一根一像素的柱子分不出来——零值走 `bg-accent` 的基线，非零走 `bg-primary`。
   */
  it("零值画成基线刻度，不是柱子", () => {
    const { container } = render(
      <BarChart
        data={[
          { key: "a", label: "1 日", value: 10 },
          { key: "b", label: "2 日", value: 0 },
        ]}
      />,
    );
    const [a, b] = bars(container);
    expect(a?.className).toContain("bg-primary");
    expect(b?.className).toContain("bg-accent");
    expect(b?.className).toContain("h-px");
    expect(b?.style.height).toBe("");
  });

  /** 全零时没有「最大值」可归一。整排都得是基线，不能除以 0 得出 NaN%。 */
  it("全零时整排都是基线，没有 NaN", () => {
    const { container } = render(
      <BarChart
        data={[
          { key: "a", label: "1 日", value: 0 },
          { key: "b", label: "2 日", value: 0 },
        ]}
      />,
    );
    for (const bar of bars(container)) {
      expect(bar.className).toContain("bg-accent");
      expect(bar.style.height).not.toContain("NaN");
    }
  });

  /**
   * 极小的非零值有下限 2%——否则它和零值在屏上一样高，而两者含义完全不同
   * （见上一条）。下限存在的意义就是让「有一点」看得见。
   */
  it("极小的非零值仍有 2% 下限", () => {
    const { container } = render(
      <BarChart
        data={[
          { key: "a", label: "1 日", value: 10000 },
          { key: "b", label: "2 日", value: 1 },
        ]}
      />,
    );
    const [, b] = bars(container);
    // 1 / 10000 = 0.01% → 抬到 2%
    expect(b?.style.height).toBe("2%");
    expect(b?.className).toContain("bg-primary");
  });
});

describe("BarChart · 横轴标签是刻度不是数据", () => {
  const many = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      key: String(i),
      label: `${i + 1} 日`,
      value: i + 1,
    }));

  const labelSpans = (root: HTMLElement) =>
    [...(root.lastElementChild?.children ?? [])] as HTMLElement[];

  it("不超过 12 根时标签全显", () => {
    const { container } = render(<BarChart data={many(12)} />);
    const visible = labelSpans(
      container.firstElementChild as HTMLElement,
    ).filter((s) => !s.className.includes("invisible"));
    expect(visible).toHaveLength(12);
  });

  /**
   * 超过 12 根自动抽样到 ~6 个：标签挤成一排反而不可读。未抽中的槽位用
   * `invisible` **占位**而不是不渲染——占位保持网格对齐，不占位则标签与柱子错位。
   */
  it("30 根时抽样到 6 个，未抽中的仍占位", () => {
    const { container } = render(<BarChart data={many(30)} />);
    const all = labelSpans(container.firstElementChild as HTMLElement);
    expect(all).toHaveLength(30); // 槽位一个不少
    const visible = all.filter((s) => !s.className.includes("invisible"));
    expect(visible).toHaveLength(6); // ceil(30/6)=5 → 0,5,10,15,20,25
  });

  it("显式 labelEvery 压过自动抽样", () => {
    const { container } = render(<BarChart data={many(30)} labelEvery={10} />);
    const visible = labelSpans(
      container.firstElementChild as HTMLElement,
    ).filter((s) => !s.className.includes("invisible"));
    expect(visible).toHaveLength(3); // 0, 10, 20
  });
});

describe("BarChart · 报数走 title", () => {
  /** 逐柱数值不上图（挤），悬停以原生 title 报数；精确数字归下方配套的表。 */
  it("title 是「标签: 格式化后的值」", () => {
    render(
      <BarChart data={[{ key: "a", label: "3 月 1 日", value: 12345 }]} />,
    );
    expect(screen.getByTitle("3 月 1 日: 12,345")).toBeInTheDocument();
  });

  it("formatValue 可覆盖", () => {
    const fmt = vi.fn((v: number) => `${v} 次`);
    render(
      <BarChart
        data={[{ key: "a", label: "3 月 1 日", value: 7 }]}
        formatValue={fmt}
      />,
    );
    expect(screen.getByTitle("3 月 1 日: 7 次")).toBeInTheDocument();
    expect(fmt).toHaveBeenCalledWith(7);
  });

  /** 整张图对读屏器是一个图形，不是一堆 div。 */
  it("整体带 img 角色", () => {
    render(
      <BarChart
        data={[{ key: "a", label: "1 日", value: 1 }]}
        aria-label="30 天用量"
      />,
    );
    expect(screen.getByRole("img", { name: "30 天用量" })).toBeInTheDocument();
  });
});
