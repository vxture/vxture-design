/**
 * FilterPopover：贴着按钮弹出的勾选气泡。
 *
 * 钉 owner 2026-09-15 那次否掉 FilterPanel 时提的几件事：
 *   1. 勾一下就生效——不经「应用」，onChange 立即回调。
 *   2. 「确定」只收起气泡，不再交出什么。
 *   3. 数字跟在名称后面；每行多项（网格）。
 *   4. 清空立即回调空值。
 *   5. 触发钮带已选数。
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import {
  FilterPopover,
  countFilterValue,
  type FilterValue,
} from "../src/components/composite/data/FilterPopover";

const FACETS = [
  {
    id: "providerId",
    label: "Provider",
    options: [
      { value: "github", label: "github", count: 432 },
      { value: "slack", label: "slack", count: 31 },
    ],
  },
  { id: "tag", label: "Tag", description: "all must match", options: [] },
];

function Harness({
  initial = {},
  onChange = () => {},
  columns,
}: {
  initial?: FilterValue;
  onChange?: (v: FilterValue) => void;
  columns?: 2 | 3;
}) {
  const [value, setValue] = React.useState<FilterValue>(initial);
  return (
    <FilterPopover
      facets={FACETS}
      value={value}
      {...(columns ? { columns } : {})}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

async function open() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /More filters/ }));
  return user;
}

describe("FilterPopover · 即时生效", () => {
  it("勾一下立即回调，不需要应用", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const user = await open();

    await user.click(screen.getByRole("checkbox", { name: /github/ }));

    expect(onChange).toHaveBeenLastCalledWith({ providerId: ["github"] });
    expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
  });

  it("确定只收起气泡", async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const user = await open();

    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("checkbox", { name: /github/ })).toBeNull();
  });

  it("清空立即回调空值", async () => {
    const onChange = vi.fn();
    render(<Harness initial={{ providerId: ["slack"] }} onChange={onChange} />);
    const user = await open();

    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(onChange).toHaveBeenLastCalledWith({});
  });
});

describe("FilterPopover · 版面", () => {
  it("数字跟在名称后面", async () => {
    render(<Harness />);
    await open();
    const label = screen
      .getByRole("checkbox", { name: /github/ })
      .closest("label")!;
    const spans = [...label.querySelectorAll("span")].map((s) => s.textContent);
    expect(spans.indexOf("github")).toBeLessThan(spans.indexOf("432"));
  });

  it("选项少时两列、气泡 overlay xl", async () => {
    render(<Harness />);
    await open();
    const group = screen.getByRole("group", { name: /Provider/ });
    expect(within(group).getByRole("list").className).toContain("grid-cols-2");
    expect(
      document.querySelector('[data-slot="filter-popover"]')?.className,
    ).not.toContain("w-panel-md");
  });

  it("选项多于 12 个时三列、气泡加宽到 panel-md", async () => {
    const many = Array.from({ length: 13 }, (_, i) => ({
      value: `p${i}`,
      label: `p${i}`,
      count: i,
    }));
    const user = userEvent.setup();
    render(
      <FilterPopover
        facets={[{ id: "providerId", label: "Provider", options: many }]}
        value={{}}
        onChange={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: /More filters/ }));
    const group = screen.getByRole("group", { name: /Provider/ });
    expect(within(group).getByRole("list").className).toContain("grid-cols-3");
    expect(
      document.querySelector('[data-slot="filter-popover"]')?.className,
    ).toContain("w-panel-md");
  });

  it("显式 columns 优先于 auto", async () => {
    render(<Harness columns={3} />);
    await open();
    expect(
      within(screen.getByRole("group", { name: /Provider/ })).getByRole("list")
        .className,
    ).toContain("grid-cols-3");
  });

  it("没有可选值的维度显示空态，说明跟在维度名后", async () => {
    render(<Harness />);
    await open();
    const tag = screen.getByRole("group", { name: /Tag/ });
    expect(within(tag).getByText("No options")).toBeInTheDocument();
    expect(within(tag).getByText("all must match")).toBeInTheDocument();
  });

  it("触发钮带已选数", () => {
    render(<Harness initial={{ providerId: ["github", "slack"] }} />);
    const button = screen.getByRole("button", { name: "More filters (2)" });
    expect(
      button.querySelector('[data-slot="filter-popover-count"]')?.textContent,
    ).toBe("2");
    expect(countFilterValue({ a: ["1"], b: [], c: ["2", "3"] })).toBe(3);
  });
});
