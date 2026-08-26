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

describe("EntryCard · 三种形态，判据是能不能点", () => {
  /**
   * 与 MetricCard 的分工：MetricCard 报数，EntryCard **引路**——所以它整卡可点。
   * 但「可点」有两种来源（href 与 onClick），此前只有第一种是真的可用。
   */
  it("给了 href：是链接、可聚焦、Enter 能进", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn((e: React.MouseEvent) => e.preventDefault());
    render(
      <EntryCard
        icon="database"
        title="模型服务"
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
   * 6.0.3 修的那条：`<a>` 没有 href 就**没有角色、不进 Tab 序**——鼠标点得到、
   * 键盘进不去，而卡的样式是 cursor-pointer，看上去完全就是个可点的东西。
   *
   * 修法是补上按钮语义。这条测试此前钉的是「现状」（查不到任何角色），现在
   * 钉的是修好之后。
   */
  it("只给 onClick：补上按钮语义，键盘进得去", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<EntryCard icon="database" title="模型服务" onClick={onClick} />);
    const card = screen.getByRole("button", { name: /模型服务/ });
    card.focus();
    expect(card).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("只给 onClick 时，鼠标那条路照旧", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<EntryCard icon="database" title="模型服务" onClick={onClick} />);
    await user.click(screen.getByRole("button", { name: /模型服务/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  /**
   * **卡内不该再嵌控件**，所以这里不测「嵌了会怎样」，只钉边界。
   *
   * EntryCard 整卡就是那个控件——在 `<a>` 里嵌 `<button>` 本身就是无效 HTML，
   * 读屏对嵌套控件的行为也没有统一约定。需要「一行数据 + 行内操作」的场景用
   * `ListCard` / `MetricListCard`，它们有明确的 actions 槽并且拦了冒泡。
   *
   * 与 MetricListCard 的区别正在这里：那件的契约里有 actions，所以它**必须**
   * 处理；本件没有，替一种它不支持的用法发明机制只会让契约变模糊。
   */
  it("children 是内容不是控件槽——卡本身就是那个控件", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <EntryCard icon="database" title="模型服务" onClick={onClick}>
        <span>附加说明</span>
      </EntryCard>,
    );
    const card = screen.getByRole("button", { name: /模型服务/ });
    expect(card).toHaveTextContent("附加说明");
    // 点内容区就是点卡
    await user.click(screen.getByText("附加说明"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  /** 两个都没有 → 它就不可点，**别再画成可点的样子**。 */
  it("既没 href 也没 onClick：没有角色，也不摆出可点的样子", () => {
    const { container } = render(
      <EntryCard icon="database" title="模型服务" description="d" />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toContain("cursor-pointer");
    expect(root.className).not.toContain("hover:bg-primary-muted");
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
