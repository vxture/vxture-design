/**
 * FilterPanel：勾选式筛选面板。
 *
 * 钉四件看不出来的事：
 *   1. 勾选先落草稿，**应用**才交出去；关掉面板丢草稿——每勾一下就重查，服务端分页的
 *      表会在用户还没选完时来回跳。
 *   2. 重新打开从已生效的值起草，上次丢弃的草稿不回来。
 *   3. 清空只清草稿，不替用户按「应用」。
 *   4. 触发钮的已选数：0 不出角标，可访问名带上个数。
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import {
  FilterPanel,
  FilterPanelTrigger,
  countFilterPanelValue,
  type FilterPanelValue,
} from "../src/components/composite/data/FilterPanel";

const FACETS = [
  {
    id: "providerId",
    label: "Provider",
    options: [
      { value: "github", label: "GitHub", count: 9 },
      { value: "slack", label: "Slack", count: 3 },
    ],
  },
  { id: "ownerRef", label: "Owner", options: [] },
];

function Harness({
  initial = {},
  onApply = () => {},
}: {
  initial?: FilterPanelValue;
  onApply?: (v: FilterPanelValue) => void;
}) {
  const [open, setOpen] = React.useState(true);
  const [value, setValue] = React.useState<FilterPanelValue>(initial);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        reopen
      </button>
      <FilterPanel
        open={open}
        onClose={() => setOpen(false)}
        facets={FACETS}
        value={value}
        onApply={(v) => {
          setValue(v);
          onApply(v);
        }}
      />
    </>
  );
}

describe("FilterPanel · 草稿与应用", () => {
  it("勾选不立刻生效，点应用才交出去，并关闭面板", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<Harness onApply={onApply} />);

    await user.click(screen.getByRole("checkbox", { name: "GitHub" }));
    expect(onApply).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Apply" }));
    expect(onApply).toHaveBeenCalledWith({ providerId: ["github"] });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("关掉面板丢弃草稿；重新打开从已生效的值起草", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<Harness initial={{ providerId: ["slack"] }} onApply={onApply} />);

    await user.click(screen.getByRole("checkbox", { name: "GitHub" }));
    await user.keyboard("{Escape}");
    expect(onApply).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "reopen" }));
    expect(screen.getByRole("checkbox", { name: "GitHub" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Slack" })).toBeChecked();
  });

  it("清空只清草稿，不替用户应用", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    render(<Harness initial={{ providerId: ["slack"] }} onApply={onApply} />);

    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(screen.getByRole("checkbox", { name: "Slack" })).not.toBeChecked();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("没有可选值的维度显示空态，计数只在给了时出现", () => {
    render(<Harness />);
    const owner = screen.getByRole("group", { name: "Owner" });
    expect(within(owner).getByText("No options")).toBeInTheDocument();
    const provider = screen.getByRole("group", { name: "Provider" });
    expect(within(provider).getByText("9")).toBeInTheDocument();
  });

  it("面板在左侧", () => {
    render(<Harness />);
    expect(screen.getByRole("dialog").className).toContain("left-0");
  });
});

describe("FilterPanelTrigger · 已选数", () => {
  it("0 不出角标", () => {
    render(<FilterPanelTrigger activeCount={0} />);
    const button = screen.getByRole("button", { name: "Filters" });
    expect(button.querySelector('[data-slot="filter-panel-count"]')).toBeNull();
  });

  it("有选中时出角标，可访问名带上个数", () => {
    render(<FilterPanelTrigger activeCount={3} label="筛选" />);
    const button = screen.getByRole("button", { name: "筛选 (3)" });
    expect(
      button.querySelector('[data-slot="filter-panel-count"]')?.textContent,
    ).toBe("3");
  });

  it("已选数跨维度累加", () => {
    expect(countFilterPanelValue({ a: ["1", "2"], b: [], c: ["3"] })).toBe(3);
  });
});
