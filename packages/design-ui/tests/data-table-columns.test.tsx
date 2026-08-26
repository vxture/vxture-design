/**
 * DataTable 的其余四个面：**排序、可选性、序号与展开**。
 *
 * 全仓分支最多的一件（122 条），已有用例只走了三态、选择、操作列——主路径。
 * 这一批补的是「测了主路径」的那一半：50 条未覆盖分支里的大部分，都在这四个
 * 由 props 开关决定「出不出这一列」的地方。
 *
 * 这些开关有个共同点：**不给就不出那一列**。而「不出」是最容易写反又最不容易
 * 看出来的分支——多出一列空白，或者少一列功能，两种都不报错。
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "../src/components/composite/data/DataTable";

interface Row {
  readonly id: string;
  readonly name: string;
  readonly count: number;
  readonly kind?: "parent" | "child";
}

const ROWS: Row[] = [
  { id: "r1", name: "阿尔法", count: 12, kind: "parent" },
  { id: "r2", name: "贝塔", count: 7, kind: "child" },
  { id: "r3", name: "伽马", count: 3, kind: "parent" },
];

const COLUMNS = [
  { id: "name", header: "名称", cell: (r: Row) => r.name },
  { id: "count", header: "数量", cell: (r: Row) => r.count },
];

const key = (r: Row) => r.id;

const header = (name: string) => screen.getByRole("columnheader", { name });

/* ── 排序 ─────────────────────────────────────────────────────────────────── */

describe("DataTable · 排序只出控件与方向，排序本身归调用方", () => {
  const sortable = [
    { ...COLUMNS[0]!, sortable: true },
    { ...COLUMNS[1]!, sortable: true },
  ];

  /**
   * **`sortable` 一个人不够，还得有 `onSortChange`。**
   * 只标 sortable 却没人接的话，表头会变成一个点了什么都不发生的按钮——
   * 同展开列不给箭头是同一条判据。
   */
  it("只有 sortable 没有 onSortChange 时不出按钮", () => {
    render(<DataTable columns={sortable} rows={ROWS} rowKey={key} />);
    expect(
      screen.queryByRole("button", { name: /名称/ }),
    ).not.toBeInTheDocument();
    expect(header("名称")).toBeInTheDocument();
  });

  it("两个都给才出可点的表头", () => {
    render(
      <DataTable
        columns={sortable}
        rows={ROWS}
        rowKey={key}
        onSortChange={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /名称/ })).toBeInTheDocument();
  });

  it("没标 sortable 的列不出按钮", () => {
    render(
      <DataTable
        columns={[{ ...COLUMNS[0]!, sortable: true }, COLUMNS[1]!]}
        rows={ROWS}
        rowKey={key}
        onSortChange={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /名称/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /数量/ }),
    ).not.toBeInTheDocument();
  });

  /** `aria-sort` 只挂在当前排序的那一列上——挂多了读屏器会念出两个「已排序」。 */
  it("aria-sort 只在当前列，方向跟着走", () => {
    const { rerender } = render(
      <DataTable
        columns={sortable}
        rows={ROWS}
        rowKey={key}
        sort={{ columnId: "name", direction: "asc" }}
        onSortChange={() => {}}
      />,
    );
    expect(header("名称")).toHaveAttribute("aria-sort", "ascending");
    expect(header("数量")).not.toHaveAttribute("aria-sort");

    rerender(
      <DataTable
        columns={sortable}
        rows={ROWS}
        rowKey={key}
        sort={{ columnId: "name", direction: "desc" }}
        onSortChange={() => {}}
      />,
    );
    expect(header("名称")).toHaveAttribute("aria-sort", "descending");
  });

  it("没有 sort 时谁都不带 aria-sort", () => {
    render(
      <DataTable
        columns={sortable}
        rows={ROWS}
        rowKey={key}
        onSortChange={() => {}}
      />,
    );
    expect(header("名称")).not.toHaveAttribute("aria-sort");
    expect(header("数量")).not.toHaveAttribute("aria-sort");
  });

  /**
   * 方向的推进规则：**没排过 → asc；正 asc → desc；正 desc → 回 asc**。
   * 第三下回 asc 而不是「取消排序」——表格总得有个顺序，而「无序」在分页场景下
   * 意味着每次请求的顺序都可能不同。
   */
  it("点未排序的列 → asc", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(
      <DataTable
        columns={sortable}
        rows={ROWS}
        rowKey={key}
        onSortChange={onSortChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: /名称/ }));
    expect(onSortChange).toHaveBeenCalledWith({
      columnId: "name",
      direction: "asc",
    });
  });

  it("点正在 asc 的列 → desc", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(
      <DataTable
        columns={sortable}
        rows={ROWS}
        rowKey={key}
        sort={{ columnId: "name", direction: "asc" }}
        onSortChange={onSortChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: /名称/ }));
    expect(onSortChange).toHaveBeenCalledWith({
      columnId: "name",
      direction: "desc",
    });
  });

  it("点正在 desc 的列 → 回 asc", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(
      <DataTable
        columns={sortable}
        rows={ROWS}
        rowKey={key}
        sort={{ columnId: "name", direction: "desc" }}
        onSortChange={onSortChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: /名称/ }));
    expect(onSortChange).toHaveBeenCalledWith({
      columnId: "name",
      direction: "asc",
    });
  });

  /**
   * **换一列永远从 asc 开始**，不继承上一列的方向。继承的话，用户在 A 列点到
   * desc 之后点 B 列，会拿到一个自己没选过的降序。
   */
  it("换一列从 asc 开始，不继承上一列的方向", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(
      <DataTable
        columns={sortable}
        rows={ROWS}
        rowKey={key}
        sort={{ columnId: "name", direction: "desc" }}
        onSortChange={onSortChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: /数量/ }));
    expect(onSortChange).toHaveBeenCalledWith({
      columnId: "count",
      direction: "asc",
    });
  });
  /**
   * 上一条只覆盖了「当前是 desc」。**当前是 asc 时换列更容易写错**：
   * 若判据漏掉 columnId（只看 `sort.direction === "asc"`），换列会直接给 desc——
   * 用户点了一个没排过的列，拿到的是降序。
   *
   * 这一条是变异测试逼出来的：只有上一条时，把判据里的 columnId 去掉**不变红**。
   */
  it("当前列是 asc 时换一列，仍然从 asc 开始", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(
      <DataTable
        columns={sortable}
        rows={ROWS}
        rowKey={key}
        sort={{ columnId: "name", direction: "asc" }}
        onSortChange={onSortChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: /数量/ }));
    expect(onSortChange).toHaveBeenCalledWith({
      columnId: "count",
      direction: "asc",
    });
  });

  /**
   * 方向指示得**看得出来**。图标是内联 SVG、`aria-hidden`，没有可查询的名字——
   * 拿渲染出来的 SVG 内容当指纹比对：升序与降序必须不同，否则用户只能靠记忆
   * 判断当前是哪个方向。
   */
  it("升序与降序的箭头必须不同", () => {
    const svgOf = () =>
      (
        screen
          .getByRole("button", { name: /名称/ })
          .querySelector("svg") as SVGElement
      ).innerHTML;

    const asc = render(
      <DataTable
        columns={sortable}
        rows={ROWS}
        rowKey={key}
        sort={{ columnId: "name", direction: "asc" }}
        onSortChange={() => {}}
      />,
    );
    const ascIcon = svgOf();
    asc.unmount();

    render(
      <DataTable
        columns={sortable}
        rows={ROWS}
        rowKey={key}
        sort={{ columnId: "name", direction: "desc" }}
        onSortChange={() => {}}
      />,
    );
    expect(svgOf()).not.toBe(ascIcon);
  });

  /** 未排序的列用升序箭头 + 弱化——同当前是 asc 的那一列长得一样但更淡。 */
  it("未排序的列箭头是弱化的", () => {
    render(
      <DataTable
        columns={sortable}
        rows={ROWS}
        rowKey={key}
        sort={{ columnId: "name", direction: "asc" }}
        onSortChange={() => {}}
      />,
    );
    const idle = screen
      .getByRole("button", { name: /数量/ })
      .querySelector("svg") as SVGElement;
    const active = screen
      .getByRole("button", { name: /名称/ })
      .querySelector("svg") as SVGElement;
    expect(idle.getAttribute("class")).toContain("opacity-muted");
    expect(active.getAttribute("class") ?? "").not.toContain("opacity-muted");
  });
});

/* ── 可选性 ───────────────────────────────────────────────────────────────── */

describe("DataTable · isRowSelectable", () => {
  const onlyParents = (row: Row) => row.kind === "parent";

  /**
   * 不可选的行**不出复选框**，而不是出一个点了没反应的。
   * 一张表里混着两级行时（父行是对象、子行是它的附属明细），勾选一条明细没有意义。
   */
  it("不可选的行不出复选框", () => {
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={key}
        selectedKeys={[]}
        onSelectionChange={() => {}}
        isRowSelectable={onlyParents}
      />,
    );
    // 表头一个 + 两个 parent 行
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });

  /**
   * **不可选的行也不参与全选计数。**否则「全选」会因为几条永远选不上的行而
   * 永远显示半选——用户点几下都点不满，只能怀疑是坏了。
   */
  it("全选只数可选的行，不会永远半选", () => {
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={key}
        selectedKeys={["r1", "r3"]}
        onSelectionChange={() => {}}
        isRowSelectable={onlyParents}
      />,
    );
    const head = screen.getAllByRole("checkbox")[0]!;
    expect(head).toHaveAttribute("data-state", "checked");
  });

  it("点表头全选只加可选的那些", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={key}
        selectedKeys={[]}
        onSelectionChange={onSelectionChange}
        isRowSelectable={onlyParents}
      />,
    );
    await user.click(screen.getAllByRole("checkbox")[0]!);
    expect(onSelectionChange).toHaveBeenCalledWith(["r1", "r3"]);
  });

  /**
   * **页外的选中项原样留着。**本件拿到的 `rows` 只有当前页，把整个集合替换成
   * 本页的 keys（或清成 `[]`）会把用户在别页选的一并抹掉——而 `BulkActionBar`
   * 消费的正是这个跨页集合，抹掉了用户就是「明明选了 30 条，批量删只删了 10 条」。
   */
  it("全选与取消都只动本页，页外的选中项不受影响", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    const { rerender } = render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={key}
        selectedKeys={["页外-1", "页外-2"]}
        onSelectionChange={onSelectionChange}
      />,
    );
    await user.click(screen.getAllByRole("checkbox")[0]!);
    expect(onSelectionChange).toHaveBeenCalledWith([
      "页外-1",
      "页外-2",
      "r1",
      "r2",
      "r3",
    ]);

    // 全选态下再点一次是取消——同样只动本页
    onSelectionChange.mockClear();
    rerender(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={key}
        selectedKeys={["页外-1", "r1", "r2", "r3"]}
        onSelectionChange={onSelectionChange}
      />,
    );
    await user.click(screen.getAllByRole("checkbox")[0]!);
    expect(onSelectionChange).toHaveBeenCalledWith(["页外-1"]);
  });

  it("点单行复选框只切那一行", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={key}
        selectedKeys={["r1"]}
        onSelectionChange={onSelectionChange}
      />,
    );
    const boxes = screen.getAllByRole("checkbox");
    await user.click(boxes[2]!); // r2
    expect(onSelectionChange).toHaveBeenCalledWith(["r1", "r2"]);
  });

  it("再点一次是取消", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={key}
        selectedKeys={["r1", "r2"]}
        onSelectionChange={onSelectionChange}
      />,
    );
    await user.click(screen.getAllByRole("checkbox")[2]!);
    expect(onSelectionChange).toHaveBeenCalledWith(["r1"]);
  });
});

/* ── 序号列 ───────────────────────────────────────────────────────────────── */

describe("DataTable · 序号列不认分页", () => {
  it("不给 indexStart 就没有序号列", () => {
    render(<DataTable columns={COLUMNS} rows={ROWS} rowKey={key} />);
    expect(
      screen.queryByRole("columnheader", { name: "#" }),
    ).not.toBeInTheDocument();
  });

  /** 值由调用方递进（`(page-1)*pageSize+1`）——本件不认分页，只按给的起点往下数。 */
  it("给了就从那个起点往下数", () => {
    render(
      <DataTable columns={COLUMNS} rows={ROWS} rowKey={key} indexStart={21} />,
    );
    expect(screen.getByRole("columnheader", { name: "#" })).toBeInTheDocument();
    for (const n of ["21", "22", "23"]) {
      expect(screen.getByText(n)).toBeInTheDocument();
    }
  });

  /** `indexStart={0}` 是合法值，不能被当成「没给」。 */
  it("indexStart=0 也出列", () => {
    render(
      <DataTable columns={COLUMNS} rows={ROWS} rowKey={key} indexStart={0} />,
    );
    expect(screen.getByRole("columnheader", { name: "#" })).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});

/* ── 展开 ─────────────────────────────────────────────────────────────────── */

describe("DataTable · 展开行", () => {
  const sub = (row: Row) =>
    row.kind === "parent" ? <div>明细：{row.name}</div> : null;

  /** 三个属性要一起给才生效——少一个就不是可用的受控展开。 */
  it("只给 expandedContent 不给 onExpandedChange 时不出折叠列", () => {
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={key}
        expandedContent={sub}
        expandedKeys={[]}
      />,
    );
    expect(
      screen.queryByRole("button", { expanded: false }),
    ).not.toBeInTheDocument();
  });

  /**
   * **返回 `null` 的行不给箭头。**一个点了没反应的控件，比没有控件更让人怀疑
   * 是不是坏了——同 `sortable` 缺 `onSortChange` 是同一条判据。
   */
  it("返回 null 的行不出箭头", () => {
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={key}
        expandedContent={sub}
        expandedKeys={[]}
        onExpandedChange={() => {}}
      />,
    );
    // 三行里只有两个 parent 可展开
    expect(screen.getAllByRole("button", { expanded: false })).toHaveLength(2);
  });

  it("展开态渲染在那一行正下方，收起态不渲染", () => {
    const { rerender } = render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={key}
        expandedContent={sub}
        expandedKeys={[]}
        onExpandedChange={() => {}}
      />,
    );
    expect(screen.queryByText("明细：阿尔法")).not.toBeInTheDocument();

    rerender(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={key}
        expandedContent={sub}
        expandedKeys={["r1"]}
        onExpandedChange={() => {}}
      />,
    );
    expect(screen.getByText("明细：阿尔法")).toBeInTheDocument();
    expect(screen.queryByText("明细：伽马")).not.toBeInTheDocument();
  });

  it("aria-expanded 跟着受控值走", () => {
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={key}
        expandedContent={sub}
        expandedKeys={["r1"]}
        onExpandedChange={() => {}}
      />,
    );
    expect(screen.getAllByRole("button", { expanded: true })).toHaveLength(1);
    expect(screen.getAllByRole("button", { expanded: false })).toHaveLength(1);
  });

  it("点箭头是加，再点是减，其余展开项留着", async () => {
    const user = userEvent.setup();
    const onExpandedChange = vi.fn();
    const { rerender } = render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={key}
        expandedContent={sub}
        expandedKeys={["r3"]}
        onExpandedChange={onExpandedChange}
      />,
    );
    await user.click(screen.getAllByRole("button", { expanded: false })[0]!);
    expect(onExpandedChange).toHaveBeenCalledWith(["r3", "r1"]);

    onExpandedChange.mockClear();
    rerender(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={key}
        expandedContent={sub}
        expandedKeys={["r1", "r3"]}
        onExpandedChange={onExpandedChange}
      />,
    );
    await user.click(screen.getAllByRole("button", { expanded: true })[0]!);
    expect(onExpandedChange).toHaveBeenCalledWith(["r3"]);
  });
});

/* ── 行首空位、表尾、文案、列属性 ─────────────────────────────────────────── */

describe("DataTable · 行首空位是为了对齐，不是缩进", () => {
  /**
   * 二级表靠这一格与父表的行首对齐，于是「这些属于上面那一行」是从**列的对齐**
   * 读出来的，而不是靠一个缩进的盒子。二级表因此仍然是一张正常的表。
   */
  it("leadingSpacer 多出一格空表头，不带任何控件", () => {
    const withSpacer = render(
      <DataTable columns={COLUMNS} rows={ROWS} rowKey={key} leadingSpacer />,
    );
    const spaced = screen.getAllByRole("columnheader").length;
    withSpacer.unmount();

    render(<DataTable columns={COLUMNS} rows={ROWS} rowKey={key} />);
    expect(spaced).toBe(screen.getAllByRole("columnheader").length + 1);
  });
});

describe("DataTable · 表尾与文案", () => {
  it("footer 渲染在表下方", () => {
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={key}
        footer={<span>共 3 条</span>}
      />,
    );
    expect(screen.getByText("共 3 条")).toBeInTheDocument();
  });

  it("不给 footer 就没有那一块", () => {
    const { container } = render(
      <DataTable columns={COLUMNS} rows={ROWS} rowKey={key} />,
    );
    expect(container.querySelectorAll("table")).toHaveLength(1);
    expect(container.firstElementChild?.children).toHaveLength(1);
  });

  /** 四处文案都是英文托底，做 i18n 的消费方传参覆盖——只写要改的那几条。 */
  it("labels 逐条覆盖，没写的仍用英文托底", () => {
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={key}
        selectedKeys={[]}
        onSelectionChange={() => {}}
        rowActions={() => <button>更多</button>}
        labels={{ selectAll: "全选本页" }}
      />,
    );
    expect(
      screen.getByRole("checkbox", { name: "全选本页" }),
    ).toBeInTheDocument();
    // 没覆盖的仍是缺省
    expect(screen.getAllByRole("checkbox", { name: "Select row" }).length).toBe(
      3,
    );
    expect(
      screen.getByRole("columnheader", { name: "Actions" }),
    ).toBeInTheDocument();
  });

  it("全选后表头复选框换成「取消全选」那条文案", () => {
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={key}
        selectedKeys={["r1", "r2", "r3"]}
        onSelectionChange={() => {}}
      />,
    );
    expect(
      screen.getByRole("checkbox", {
        name: "Deselect all rows on this page",
      }),
    ).toBeInTheDocument();
  });
});

describe("DataTable · 列的对齐与宽度是词表，不是自由 CSS", () => {
  it.each([
    ["left", "text-left"],
    ["center", "text-center"],
    ["right", "text-right"],
  ] as const)("align=%s 落在数据格上", (align, cls) => {
    const { container } = render(
      <DataTable
        columns={[{ ...COLUMNS[0]!, align }]}
        rows={[ROWS[0]!]}
        rowKey={key}
      />,
    );
    const cell = container.querySelector("tbody td") as HTMLElement;
    expect(cell.className).toContain(cls);
  });

  it("不给 align 时是 left", () => {
    const { container } = render(
      <DataTable columns={[COLUMNS[0]!]} rows={[ROWS[0]!]} rowKey={key} />,
    );
    expect(
      (container.querySelector("tbody td") as HTMLElement).className,
    ).toContain("text-left");
  });

  /** 表头一律居中，**与列的 align 无关**——align 说的是数据。 */
  it("表头一律居中，不跟着 align 走", () => {
    render(
      <DataTable
        columns={[{ ...COLUMNS[0]!, align: "right" }]}
        rows={[ROWS[0]!]}
        rowKey={key}
      />,
    );
    expect(header("名称").className).toContain("text-center");
  });

  /** `width` 是**最小宽度**不是定宽：内容超出时列跟着撑开，暴露问题而不是掩盖。 */
  it.each(["xs", "sm", "md", "lg"] as const)(
    "width=%s 落在表头与数据格",
    (w) => {
      const { container } = render(
        <DataTable
          columns={[{ ...COLUMNS[0]!, width: w }]}
          rows={[ROWS[0]!]}
          rowKey={key}
        />,
      );
      const th = screen.getByRole("columnheader", { name: "名称" });
      const td = container.querySelector("tbody td") as HTMLElement;
      expect(th.className).toMatch(/min-w-/);
      expect(td.className).toMatch(/min-w-/);
    },
  );

  /**
   * 源码里那句 `column.width !== "auto"` 守的是**类型不是运行时**：`WIDTH` 没有
   * `auto` 键，去掉它运行时行为一模一样（`WIDTH["auto"]` 是 undefined），
   * 但 `tsc` 会当场报 TS7053。这一条因此钉的是结果，判据本身由类型层管着——
   * 变异测试对它留绿是**正常的**，不是断言太松。
   */
  it('width="auto" 与不给一样，不落宽度类', () => {
    const { container } = render(
      <DataTable
        columns={[{ ...COLUMNS[0]!, width: "auto" }]}
        rows={[ROWS[0]!]}
        rowKey={key}
      />,
    );
    expect(
      (container.querySelector("tbody td") as HTMLElement).className,
    ).not.toMatch(/min-w-/);
  });
});

/* ── 骨架与空态要占满所有列 ───────────────────────────────────────────────── */

describe("DataTable · 骨架与空态的 colSpan 要算上所有开出来的列", () => {
  /**
   * 空态那一格用 `colSpan` 横跨整表。算漏一列，空态就只占半张表、右边露出
   * 一块表格底色——而开了几列取决于调用方给了哪些 props，**最容易算漏的正是
   * 那几个可选列**。
   */
  it("开满可选列时，空态横跨全部列", () => {
    const { container } = render(
      <DataTable
        columns={COLUMNS}
        rows={[]}
        rowKey={key}
        selectedKeys={[]}
        onSelectionChange={() => {}}
        indexStart={1}
        leadingSpacer
        rowActions={() => <button>更多</button>}
        expandedContent={() => <div>x</div>}
        expandedKeys={[]}
        onExpandedChange={() => {}}
        empty={<div>没有数据</div>}
      />,
    );
    const cell = container.querySelector("tbody td") as HTMLElement;
    // 2 业务列 + 选择 + 序号 + 折叠 + 行首空位 + 操作
    expect(cell.getAttribute("colspan")).toBe("7");
  });

  it("骨架行的格数与表头列数一致", () => {
    const { container } = render(
      <DataTable
        columns={COLUMNS}
        rows={[]}
        rowKey={key}
        loading
        loadingRows={2}
        selectedKeys={[]}
        onSelectionChange={() => {}}
        indexStart={1}
      />,
    );
    const headCols = screen.getAllByRole("columnheader").length;
    const firstSkeletonRow = container.querySelector("tbody tr") as HTMLElement;
    // 走 DOM 而不是 role 查询：骨架行整行 aria-hidden，**本来就不该出现在无障碍
    // 树里**（占位块对读屏器只是噪音），所以 getAllByRole("cell") 一个都找不到。
    expect(firstSkeletonRow.querySelectorAll("td")).toHaveLength(headCols);
    expect(firstSkeletonRow).toHaveAttribute("aria-hidden", "true");
  });
});

describe("DataTable · 整行是展开热区，但行内控件要让路", () => {
  const sub = (row: Row) =>
    row.kind === "parent" ? <div>明细：{row.name}</div> : null;

  /**
   * 只有那个小箭头能点，等于把一个整行宽的动作压进 16px。整行都是热区之后，
   * 箭头保留作为「还有下一层」的标识，但不再是唯一入口（owner 2026-08-14）。
   */
  it("点行的空白处会展开", async () => {
    const user = userEvent.setup();
    const onExpandedChange = vi.fn();
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={key}
        expandedContent={sub}
        expandedKeys={[]}
        onExpandedChange={onExpandedChange}
      />,
    );
    await user.click(screen.getByText("阿尔法"));
    expect(onExpandedChange).toHaveBeenCalledWith(["r1"]);
  });

  /**
   * **行内的按钮 / 链接 / 菜单要让路。**点标题是进详情、点操作是执行动作，
   * 两者都不该顺手把行展开——用户点「更多」想开菜单，结果菜单开了、行也展开了，
   * 页面往下窜一大段。
   *
   * 这一条是全仓 DataTable 最后一条未覆盖分支（2026-08-26 补），而它属于
   * 「点了 A 却触发了 B」那一类——本仓已经在这一类上出过两次事
   * （MetricListCard 与 EntryCard 的键盘陷阱）。
   */
  it.each([
    [
      "按钮",
      <button key="b">更多</button>,
      () => screen.getByRole("button", { name: "更多" }),
    ],
    [
      "链接",
      <a key="a" href="#x">
        详情
      </a>,
      () => screen.getByRole("link", { name: "详情" }),
    ],
    [
      "输入框",
      <input key="i" aria-label="备注" />,
      () => screen.getAllByLabelText("备注")[0]!,
    ],
  ] as const)("点行内的%s不会把行展开", async (_label, node, target) => {
    const user = userEvent.setup();
    const onExpandedChange = vi.fn();
    render(
      <DataTable
        columns={[COLUMNS[0]!, { id: "op", header: "操作", cell: () => node }]}
        rows={[ROWS[0]!]}
        rowKey={key}
        expandedContent={sub}
        expandedKeys={[]}
        onExpandedChange={onExpandedChange}
      />,
    );
    await user.click(target());
    expect(onExpandedChange).not.toHaveBeenCalled();
  });

  /** 不可展开的行整行都不是热区——点哪都不该有反应。 */
  it("不可展开的行点了没反应", async () => {
    const user = userEvent.setup();
    const onExpandedChange = vi.fn();
    render(
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        rowKey={key}
        expandedContent={sub}
        expandedKeys={[]}
        onExpandedChange={onExpandedChange}
      />,
    );
    await user.click(screen.getByText("贝塔")); // kind: child → sub 为 null
    expect(onExpandedChange).not.toHaveBeenCalled();
  });
});
