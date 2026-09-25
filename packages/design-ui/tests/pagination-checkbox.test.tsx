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
import { Icon } from "../src/icons";

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

describe("Pagination · 图标翻页按钮", () => {
  /**
   * 翻页按钮只画图标（|< ‹ › >|），不带字：文字版在中英文下宽度差一倍，会把
   * 整排页码推来推去。名字进 aria-label 与 title。
   */
  it("四个翻页按钮只有图标，没有可见文字，名字在 aria-label 与 title 上", () => {
    render(<Pagination {...base} page={3} />);
    for (const name of [
      "First page",
      "Previous page",
      "Next page",
      "Last page",
    ]) {
      const btn = screen.getByRole("button", { name });
      expect(btn).toHaveTextContent("");
      expect(btn).toHaveAttribute("title", name);
      expect(btn.querySelectorAll("svg")).toHaveLength(1);
    }
  });

  it("顺序是 |< ‹ 页码 › >|", () => {
    render(<Pagination {...base} page={3} />);
    const names = screen
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label") ?? b.textContent);
    expect(names).toEqual([
      "First page",
      "Previous page",
      "1",
      "2",
      "3",
      "4",
      "5",
      "Next page",
      "Last page",
    ]);
  });

  /** 首页 / 末页是 |< >|（caret-line），不是 « »（caret-double）。 */
  it("首页与末页用 caret-line 图标", () => {
    const glyph = (name: "caret-line-left" | "caret-line-right") => {
      const probe = render(<Icon name={name} />);
      const html = probe.container.querySelector("svg")!.innerHTML;
      probe.unmount();
      return html;
    };
    const first = glyph("caret-line-left");
    const last = glyph("caret-line-right");
    render(<Pagination {...base} page={3} />);
    expect(
      screen.getByRole("button", { name: "First page" }).querySelector("svg")!
        .innerHTML,
    ).toBe(first);
    expect(
      screen.getByRole("button", { name: "Last page" }).querySelector("svg")!
        .innerHTML,
    ).toBe(last);
  });

  it("首页跳到 1，末页跳到最后一页", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination {...base} page={3} onPageChange={onPageChange} />);
    await user.click(screen.getByRole("button", { name: "First page" }));
    await user.click(screen.getByRole("button", { name: "Last page" }));
    expect(onPageChange.mock.calls).toEqual([[1], [5]]);
  });

  it("首页 / 末页与上一页 / 下一页同步禁用", () => {
    const { rerender } = render(<Pagination {...base} page={1} />);
    expect(screen.getByRole("button", { name: "First page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Last page" })).toBeEnabled();

    rerender(<Pagination {...base} page={5} />);
    expect(screen.getByRole("button", { name: "Last page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "First page" })).toBeEnabled();
  });

  it("四个名字都可本地化", () => {
    render(
      <Pagination
        {...base}
        page={3}
        firstLabel="首页"
        previousLabel="上一页"
        nextLabel="下一页"
        lastLabel="末页"
      />,
    );
    for (const name of ["首页", "上一页", "下一页", "末页"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
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
        pageSizeOptions={[10, 20]}
        onPageSizeChange={() => undefined}
        pageSizeOptionTemplate="每页 {size} 条"
      />,
    );
    expect(
      screen.getByRole("radio", { name: "每页 10 条" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "每页 20 条" }),
    ).toBeInTheDocument();
  });

  /** "auto" 档已全面删除（owner 2026-09-25）：缺省档位只有具体条数。 */
  it("缺省档位是 10 / 20 / 50 / 100，没有 auto", () => {
    render(
      <Pagination {...base} pageSize={20} onPageSizeChange={() => undefined} />,
    );
    expect(screen.getAllByRole("radio").map((r) => r.textContent)).toEqual([
      "10",
      "20",
      "50",
      "100",
    ]);
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
