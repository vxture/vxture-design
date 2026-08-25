/**
 * FilterBar 与 EntryCard 的行为回归。
 */

import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FilterBar } from "../src/components/composite/data/FilterBar";
import { EntryCard } from "../src/components/composite/data/EntryCard";

/** 按 DOM 先后取出这几个标记的出现次序。 */
function orderOf(labels: readonly string[]) {
  const all = [...document.querySelectorAll("*")];
  return labels
    .map((t) => ({ t, i: all.findIndex((el) => el.textContent === t) }))
    .filter((x) => x.i >= 0)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.t);
}

describe("FilterBar · 右段顺序是契约", () => {
  /**
   * 文件头写死的一条：**右段顺序是契约，不是建议**——search / onReset /
   * children（筛选组）/ actions 四个槽按此顺序渲染，调用方给什么都改不了先后。
   *
   * 由来是实据：此前右段只有 children 与 actions 两段自由拼，于是 22 个列表页的
   * 搜索框、重置、下拉各排各的顺序。
   *
   * 这条只在**四个槽同时给**时才验得出来——少给一个都看不出顺序被换了。
   */
  it("四个槽同时给：search → 重置 → 筛选组 → 操作区", () => {
    render(
      <FilterBar
        search={<span>SEARCH</span>}
        onReset={() => undefined}
        resetLabel="RESET"
        actions={<span>ACTIONS</span>}
      >
        <span>FILTERS</span>
      </FilterBar>,
    );
    expect(orderOf(["SEARCH", "FILTERS", "ACTIONS"])).toEqual([
      "SEARCH",
      "FILTERS",
      "ACTIONS",
    ]);
    // 重置夹在 search 与筛选组之间
    const reset = screen.getByRole("button", { name: "RESET" });
    const all = [...document.querySelectorAll("*")];
    const iSearch = all.findIndex((el) => el.textContent === "SEARCH");
    const iFilters = all.findIndex((el) => el.textContent === "FILTERS");
    expect(all.indexOf(reset)).toBeGreaterThan(iSearch);
    expect(all.indexOf(reset)).toBeLessThan(iFilters);
  });

  it("调用方把 actions 写在最前面也改不了顺序", () => {
    render(
      <FilterBar actions={<span>ACTIONS</span>} search={<span>SEARCH</span>}>
        <span>FILTERS</span>
      </FilterBar>,
    );
    expect(orderOf(["SEARCH", "FILTERS", "ACTIONS"])).toEqual([
      "SEARCH",
      "FILTERS",
      "ACTIONS",
    ]);
  });

  /**
   * 切面（scope）与筛选组刻意分列两段：筛选是「在同一份数据里少看几行」，
   * 切面是「换一份数据」。混在右段那串下拉里，换轴的控件会读成又一个筛选条件，
   * 而它一动整张表的列都会变。
   */
  it("切面在左段，排在筛选组之前", () => {
    render(
      <FilterBar scope={<span>SCOPE</span>} search={<span>SEARCH</span>}>
        <span>FILTERS</span>
      </FilterBar>,
    );
    expect(orderOf(["SCOPE", "SEARCH", "FILTERS"])).toEqual([
      "SCOPE",
      "SEARCH",
      "FILTERS",
    ]);
  });

  it("左段三槽都不给时也不塌，右段照常靠右", () => {
    render(
      <FilterBar search={<span>SEARCH</span>}>
        <span>FILTERS</span>
      </FilterBar>,
    );
    expect(screen.getByText("SEARCH")).toBeInTheDocument();
    expect(screen.getByText("FILTERS")).toBeInTheDocument();
  });

  it("不给 onReset 就不出重置钮", () => {
    render(
      <FilterBar search={<span>SEARCH</span>}>
        <span>FILTERS</span>
      </FilterBar>,
    );
    expect(
      screen.queryByRole("button", { name: "Reset filters" }),
    ).not.toBeInTheDocument();
  });

  it("重置钮是图标按钮，文案走可访问名而不是可见文字", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(<FilterBar onReset={onReset}>x</FilterBar>);
    const reset = screen.getByRole("button", { name: "Reset filters" });
    // 一个「清空」的动作不该占掉与筛选项同等的横向宽度
    expect(reset).not.toHaveTextContent("Reset filters");
    await user.click(reset);
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});

describe("EntryCard · 它是一张链接卡，不是按钮卡", () => {
  /**
   * 与 MetricCard 的分工：MetricCard 报数，EntryCard **引路**——所以它整卡可点，
   * 渲染成 <a>。正确用法是给 href：那样它才有 link 角色、才在 Tab 序里、
   * Enter 才触发。
   */
  it("给了 href：是链接、可聚焦、Enter 能进", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn((e: React.MouseEvent) => e.preventDefault());
    render(
      <EntryCard
        icon="database"
        title="模型服务"
        description="d"
        href="/services"
        onClick={onClick}
      />,
    );
    const card = screen.getByRole("link", { name: /模型服务/ });
    card.focus();
    expect(card).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalled();
  });

  /**
   * ⚠ 已知陷阱，本条钉的是**现状**不是理想：只给 onClick 不给 href 时，
   * <a> 没有 link 角色、不在 Tab 序里——**鼠标点得到，键盘进不去**，而卡片
   * 的样式是 cursor-pointer + interactive，看上去完全就是个可点的东西。
   *
   * 这条测试存在的意义是：将来若给 EntryCard 补上「无 href 时降级成 button」
   * 或加运行时警告，这里会红，提醒改测试的人这是**有意的行为变更**。
   */
  it("只给 onClick 不给 href：没有角色、进不了 Tab 序（现状）", () => {
    render(
      <EntryCard
        icon="database"
        title="模型服务"
        description="d"
        onClick={() => undefined}
      />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("模型服务")).toBeInTheDocument();
  });

  /** 色块底的图标是**记号**不是信息——读屏念它只会多一句噪声。 */
  it("图标块对读屏隐藏", () => {
    const { container } = render(
      <EntryCard icon="database" title="模型服务" href="/x" />,
    );
    const iconBox = container.querySelector('[aria-hidden="true"]');
    expect(iconBox).not.toBeNull();
    expect(iconBox?.querySelector("svg")).not.toBeNull();
  });
});
