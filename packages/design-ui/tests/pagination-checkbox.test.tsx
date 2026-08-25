/**
 * Pagination 与 Checkbox 的行为回归。
 *
 * 两个件的共同点：都有一处**相对上游的必要偏离**，而偏离最容易在下一次跟版时
 * 被"顺手改回去"。
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "../src/components/base/navigation/Pagination";
import { Checkbox } from "../src/components/base/form/Checkbox";

const base = {
  page: 1,
  pageCount: 5,
  onPageChange: () => undefined,
};

describe("Pagination · 边界", () => {
  it("第一页时上一页不可点", () => {
    render(<Pagination {...base} page={1} />);
    expect(
      screen.getByRole("button", { name: "Previous page" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeEnabled();
  });

  it("最后一页时下一页不可点", () => {
    render(<Pagination {...base} page={5} />);
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  /** 越界入参要夹回合法区间，而不是渲染出一个不存在的页码。 */
  it("页码越界时夹回区间", () => {
    render(<Pagination {...base} page={99} />);
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled();
  });
});

describe("Pagination · 计数语与逃生口", () => {
  it("给了 total 出条数，没给 total 出页码", () => {
    const { rerender } = render(<Pagination {...base} total={42} />);
    expect(screen.getByText("42 records")).toBeInTheDocument();

    rerender(<Pagination {...base} page={2} />);
    expect(screen.getByText("Page 2 of 5")).toBeInTheDocument();
  });

  it("筛选生效时补一段", () => {
    render(<Pagination {...base} total={42} filteredTotal={7} />);
    expect(screen.getByText("42 records / 7 filtered")).toBeInTheDocument();
  });

  /**
   * `countLabel` 是逃生口：数的不是一样东西时（admin 服务套餐页要同时报
   * 「N 个方案、M 个套餐」），total / filteredTotal 都表达不了。
   */
  it("countLabel 压过内建计数语", () => {
    render(
      <Pagination {...base} total={42} countLabel="3 个方案 · 12 个套餐" />,
    );
    expect(screen.getByText("3 个方案 · 12 个套餐")).toBeInTheDocument();
    expect(screen.queryByText("42 records")).not.toBeInTheDocument();
  });

  it("每页条数各档的可访问名走模板", () => {
    render(
      <Pagination
        {...base}
        pageSize={20}
        pageSizeOptions={["auto", 20]}
        onPageSizeChange={() => undefined}
        pageSizeOptionTemplate="每页 {size} 条"
        pageSizeAutoLabel="每页条数自适应"
      />,
    );
    expect(
      screen.getByRole("radio", { name: "每页 20 条" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "每页条数自适应" }),
    ).toBeInTheDocument();
  });
});

describe("Checkbox · 半选是相对上游的必要偏离", () => {
  /**
   * 上游只认 checked：`checked="indeterminate"` 时框不填色、却照样画勾，
   * 看上去像个坏掉的选中态。DS 的偏离是：半选画**短横**、同样填色。
   *
   * 这条钉的就是「画短横不画勾」。谁在跟版时把这段删掉，这里会红。
   */
  it("半选时画短横，不画勾", () => {
    const { container } = render(<Checkbox checked="indeterminate" />);
    expect(screen.getByRole("checkbox")).toHaveAttribute(
      "data-state",
      "indeterminate",
    );
    // 勾在半选态下被隐藏，短横显示——两个图标都在 DOM 里，靠 data-state 切
    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThanOrEqual(2);
  });

  it("勾选与未勾选的状态各自正确", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Checkbox onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole("checkbox");
    expect(box).toHaveAttribute("data-state", "unchecked");
    await user.click(box);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});
