/**
 * DataTable 的行为回归。
 *
 * 它是 96 个件里最复杂的一个：三态 + 排序 + 选择 + 展开 + 序号 + 锁定操作列。
 * 03 §6 把「三态一次定齐」写成了契约——**契约写在散文里，就只对读过那一页的人
 * 生效**，这一份把它变成会红的东西。
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "../src/components/composite/data/DataTable";

interface Row {
  readonly id: string;
  readonly name: string;
}
const rows: Row[] = [
  { id: "a", name: "主力推理通道" },
  { id: "b", name: "备用通道" },
];
const columns = [{ id: "name", header: "名称", cell: (r: Row) => r.name }];
const base = { columns, rowKey: (r: Row) => r.id };

describe("DataTable · 三态一次定齐", () => {
  /**
   * 骨架行的意义是**撑住高度不让页面跳**——所以它必须真的出行，而不是把表体
   * 清空。数量由 loadingRows 决定，默认 5。
   */
  it("加载态出骨架行，行数就是 loadingRows，且对读屏隐藏", () => {
    render(<DataTable<Row> {...base} rows={[]} loading loadingRows={3} />);
    const body = screen.getAllByRole("rowgroup", { hidden: true })[1]!;
    const skeletons = within(body).getAllByRole("row", { hidden: true });
    expect(skeletons).toHaveLength(3);

    /* 骨架行**必须**对无障碍树隐藏：它是占位符，读屏把它念出来只会得到三行
       空白。所以上面查它必须带 hidden——查不到才是对的。 */
    for (const row of skeletons)
      expect(row).toHaveAttribute("aria-hidden", "true");
    expect(within(body).queryAllByRole("row")).toHaveLength(0);

    // 加载时不许把真实数据也画出来
    expect(screen.queryByText("主力推理通道")).not.toBeInTheDocument();
  });

  it("空态出调用方给的 empty，不是一张空表", () => {
    render(
      <DataTable<Row> {...base} rows={[]} empty={<p>还没有任何通道</p>} />,
    );
    expect(screen.getByText("还没有任何通道")).toBeInTheDocument();
  });

  it("不给 empty 就出默认空态，文案是英文托底", () => {
    render(<DataTable<Row> {...base} rows={[]} />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("有数据就出行", () => {
    render(<DataTable<Row> {...base} rows={rows} />);
    expect(screen.getByText("主力推理通道")).toBeInTheDocument();
    expect(screen.getByText("备用通道")).toBeInTheDocument();
  });

  /** 三态互斥：loading 优先于 empty，否则会同时看到骨架和空态。 */
  it("loading 与空数据同时成立时，出骨架不出空态", () => {
    render(<DataTable<Row> {...base} rows={[]} loading empty={<p>空</p>} />);
    expect(screen.queryByText("空")).not.toBeInTheDocument();
  });
});

describe("DataTable · 选择态受控", () => {
  it("给了 selectedKeys 才出选择列", () => {
    const { rerender } = render(<DataTable<Row> {...base} rows={rows} />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();

    rerender(
      <DataTable<Row>
        {...base}
        rows={rows}
        selectedKeys={[]}
        onSelectionChange={() => undefined}
      />,
    );
    expect(screen.getAllByRole("checkbox").length).toBeGreaterThan(0);
  });

  /**
   * 表头半选走 indeterminate。少了它，选了一部分时表头复选框要么全空要么全勾，
   * 两种都在说谎——而 Checkbox 的半选态正是 DS 相对 shadcn 的一处必要偏离。
   */
  it("选了一部分，表头是半选而不是全勾", () => {
    render(
      <DataTable<Row>
        {...base}
        rows={rows}
        selectedKeys={["a"]}
        onSelectionChange={() => undefined}
      />,
    );
    const header = screen.getAllByRole("checkbox")[0];
    expect(header).toHaveAttribute("data-state", "indeterminate");
  });

  it("全选后表头是勾选态", () => {
    render(
      <DataTable<Row>
        {...base}
        rows={rows}
        selectedKeys={["a", "b"]}
        onSelectionChange={() => undefined}
      />,
    );
    expect(screen.getAllByRole("checkbox")[0]).toHaveAttribute(
      "data-state",
      "checked",
    );
  });

  it("点表头复选框把本页全选进去", async () => {
    const user = userEvent.setup();
    const onSelectionChange = vi.fn();
    render(
      <DataTable<Row>
        {...base}
        rows={rows}
        selectedKeys={[]}
        onSelectionChange={onSelectionChange}
      />,
    );
    await user.click(screen.getAllByRole("checkbox")[0]!);
    expect(onSelectionChange).toHaveBeenCalledWith(["a", "b"]);
  });
});

describe("DataTable · 操作列", () => {
  it("给了 rowActions 才出操作列，表头文案可覆盖", () => {
    render(
      <DataTable<Row>
        {...base}
        rows={rows}
        rowActions={(row) => <button type="button">{`操作 ${row.id}`}</button>}
        labels={{ rowActions: "操作" }}
      />,
    );
    expect(
      screen.getByRole("columnheader", { name: "操作" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "操作 a" })).toBeInTheDocument();
  });

  it("不给 rowActions 就没有那一列", () => {
    render(<DataTable<Row> {...base} rows={rows} />);
    expect(
      screen.queryByRole("columnheader", { name: "Actions" }),
    ).not.toBeInTheDocument();
  });
});
