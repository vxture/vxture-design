/**
 * 数据展示族：DetailList / FactList / LabeledValue / ListCard。
 *
 * 这一族的共同点：**视觉上做得出来，语义上不一定对**。用 div 拼出一模一样的
 * 外观毫无难度，差别只有非视觉用户遇得到。
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  DetailList,
  DetailRow,
} from "../src/components/composite/structure/DetailList";
import { FactList } from "../src/components/composite/data/FactList";
import { LabeledValue } from "../src/components/composite/data/LabeledValue";
import { ListCard } from "../src/components/composite/data/ListCard";

describe("DetailList · 名与值必须是一对", () => {
  /**
   * 文件头写死的一条：**语义元素用 `<dl>` / `<dt>` / `<dd>`**——这就是 HTML 给
   * 「名—值对列表」准备的元素，读屏会把两者**作为一对**播报。
   *
   * 用 div 拼同样的视觉毫无难度，代价是名与值的关联**只存在于视觉里**，
   * 非视觉用户读到的是两串互不相干的文本。这条测试拦的正是「改样式时顺手把
   * dl 换成 div」。
   */
  it("外层是 dl，字段名是 dt，字段值是 dd", () => {
    const { container } = render(
      <DetailList>
        <DetailRow label="租户 ID">t-00417</DetailRow>
      </DetailList>,
    );
    const dl = container.querySelector("dl");
    expect(dl).not.toBeNull();
    /* 文字包在内层 span 里，所以断言的是**语义祖先**——「名与值成对」这个契约
       说的本来就是它们各自挂在哪个元素下，不是文字节点自己是什么标签。 */
    const scope = within(dl as HTMLElement);
    expect(scope.getByText("租户 ID").closest("dt")).not.toBeNull();
    expect(scope.getByText("t-00417").closest("dd")).not.toBeNull();
    expect(scope.getByText("租户 ID").closest("dd")).toBeNull();
  });

  it("多行时每对都各自成对，不是一堆平铺的文本", () => {
    const { container } = render(
      <DetailList>
        <DetailRow label="租户 ID">t-00417</DetailRow>
        <DetailRow label="创建时间">2026-08-01</DetailRow>
      </DetailList>,
    );
    expect(container.querySelectorAll("dt")).toHaveLength(2);
    expect(container.querySelectorAll("dd")).toHaveLength(2);
  });

  it("行操作槽不打断名值配对", () => {
    const { container } = render(
      <DetailList>
        <DetailRow label="密钥" actions={<button type="button">轮换</button>}>
          sk-live-…f21a
        </DetailRow>
      </DetailList>,
    );
    expect(container.querySelectorAll("dt")).toHaveLength(1);
    expect(container.querySelectorAll("dd")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "轮换" })).toBeInTheDocument();
  });
});

describe("FactList · 两级键值，且各行可独立带语气", () => {
  /**
   * 与 `MetricCard.tags` 的分工：tags 与读数同行、彼此并列、无层级；本件是**两级**
   * 的键值对，且**各行可独立带语气**——「逾期 3」要能自己变红。塞进 tags 会把
   * 键值压成一串文字。
   */
  it("每条都渲染出键与值", () => {
    render(
      <FactList
        facts={[
          { label: "订阅", value: "12" },
          { label: "逾期", value: "3", tone: "danger" },
        ]}
      />,
    );
    expect(screen.getByText("订阅")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("逾期")).toBeInTheDocument();
  });

  /** 一行带语气不该把别行也染上——「各行可独立」正是它相对 tags 的存在理由。 */
  it("带语气的那一行与不带的长得不一样，且不互相传染", () => {
    const { container } = render(
      <FactList
        facts={[
          { label: "订阅", value: "12" },
          { label: "逾期", value: "3", tone: "danger" },
        ]}
      />,
    );
    const html = container.innerHTML;
    expect(html).toContain("destructive");
    // 只有一行染上：把 danger 去掉后整段不该再出现该语气类
    const plain = render(<FactList facts={[{ label: "订阅", value: "12" }]} />);
    expect(plain.container.innerHTML).not.toContain("destructive");
  });
});

describe("LabeledValue · 主角是数字", () => {
  /**
   * 与 `TableTitleCell` 是一对**相反的朝向**：那件是标题大、补充小（主角是名字），
   * 本件是标签小、读数大（主角是数字）。朝向搞反了不会报错，只是面板里的重点
   * 整个错位。
   */
  it("读数比标签重：标签走 label 族，读数走 title 族", () => {
    const { container } = render(
      <LabeledValue label="本月用量" value="1,284" />,
    );
    const label = screen.getByText("本月用量");
    const value = screen.getByText("1,284");
    expect(label.closest("[class*='text-label']")).not.toBeNull();
    expect(value.className).toContain("text-title");
    expect(container.querySelector("h1,h2,h3,h4")).toBeNull();
  });

  /** 它只是两行文字——放进面板里的项，卡壳会变成卡中卡。 */
  it("不自带卡壳", () => {
    const { container } = render(<LabeledValue label="l" value="1" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).not.toContain("bg-card");
    expect(root.className).not.toContain("shadow-raised");
    expect(root.className).not.toContain("border");
  });
});

describe("ListCard · 行卡的语法是固定的", () => {
  it("四个槽各就各位：主列 / 状态 / 操作 / meta", () => {
    render(
      <ListCard
        title="主力推理通道"
        description="gpt-4o-mini"
        status={<span>STATUS</span>}
        actions={<span>ACTIONS</span>}
        meta={<span>META</span>}
      />,
    );
    for (const t of [
      "主力推理通道",
      "gpt-4o-mini",
      "STATUS",
      "ACTIONS",
      "META",
    ]) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
  });

  it("给了 onTitleClick 标题才可点，且点的是标题不是整卡", async () => {
    const user = userEvent.setup();
    const onTitleClick = vi.fn();
    render(<ListCard title="主力推理通道" onTitleClick={onTitleClick} />);
    await user.click(screen.getByText("主力推理通道"));
    expect(onTitleClick).toHaveBeenCalledTimes(1);
  });

  it("不给 onTitleClick 就没有可点的标题控件", () => {
    render(<ListCard title="主力推理通道" />);
    expect(
      screen.queryByRole("button", { name: /主力推理通道/ }),
    ).not.toBeInTheDocument();
  });
});
