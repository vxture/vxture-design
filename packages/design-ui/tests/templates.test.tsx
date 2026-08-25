/**
 * 模板五件。
 *
 * 03 §7：模板只定**结构与区块占位**，零新样式、零文案默认值——「长什么样」在
 * 模板，「放什么」永远在产品侧。所以这一组测的全是**顺序与槽位**，不是内容。
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListPageTemplate } from "../src/components/templates/ListPageTemplate";
import { DetailPageTemplate } from "../src/components/templates/DetailPageTemplate";
import { FormPageTemplate } from "../src/components/templates/FormPageTemplate";
import { DashboardTemplate } from "../src/components/templates/DashboardTemplate";

/** 按 DOM 先后取出这几个标记的出现次序。 */
function orderOf(labels: readonly string[]) {
  const all = [...document.querySelectorAll("*")];
  return labels
    .map((t) => ({ t, i: all.findIndex((el) => el.textContent === t) }))
    .filter((x) => x.i >= 0)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.t);
}

/** 沿祖先找带某个类名的元素。**不用 CSS 选择器**：Tailwind 的 `lg:` 与任意值
 *  语法都带需要转义的字符，而 jsdom 的选择器实现对这类转义并不友好。 */
function ancestorWith(el: HTMLElement | null, cls: string) {
  for (let n = el; n; n = n.parentElement) {
    if (typeof n.className === "string" && n.className.includes(cls)) return n;
  }
  return null;
}

describe("DashboardTemplate · 阅读顺序焊死", () => {
  /**
   * 工作台的阅读顺序是固定的：**先看数、再选路、最后处理具体事项**。
   * 模板把这个顺序焊死，摆什么数、开什么入口是产品的事。
   *
   * 调用方按什么顺序写 props 都改不了先后——这条只在三个槽同时给时验得出来。
   */
  it("页头 → 指标 → 入口 → 其余板块，调用方改不了", () => {
    render(
      <DashboardTemplate
        children={<span>REST</span>}
        entries={<span>ENTRIES</span>}
        metrics={<span>METRICS</span>}
        header={<span>HEADER</span>}
      />,
    );
    expect(orderOf(["HEADER", "METRICS", "ENTRIES", "REST"])).toEqual([
      "HEADER",
      "METRICS",
      "ENTRIES",
      "REST",
    ]);
  });

  /** 槽位为空时对应板块连同间距一起消失，不留空行。 */
  it("不给的槽不占位", () => {
    const { container } = render(
      <DashboardTemplate metrics={<span>METRICS</span>} />,
    );
    expect(screen.getByText("METRICS")).toBeInTheDocument();
    expect(container.textContent).toBe("METRICS");
  });
});

describe("ListPageTemplate · 列表区三段收紧", () => {
  it("页头 → 筛选 → 批量条 → 表格", () => {
    render(
      <ListPageTemplate
        table={<span>TABLE</span>}
        bulkBar={<span>BULK</span>}
        filters={<span>FILTERS</span>}
        header={<span>HEADER</span>}
      />,
    );
    expect(orderOf(["HEADER", "FILTERS", "BULK", "TABLE"])).toEqual([
      "HEADER",
      "FILTERS",
      "BULK",
      "TABLE",
    ]);
  });

  /**
   * 筛选行 / 批量条 / 表格三者是**同一个板块的三段**，收紧到 gap-sm——
   * 与板块之间的 gap-xl 拉开差别，否则一页读起来是四个平级的块。
   */
  it("三段共处一个 gap-sm 的容器里", () => {
    const { container } = render(
      <ListPageTemplate
        table={<span>TABLE</span>}
        filters={<span>FILTERS</span>}
      />,
    );
    const table = screen.getByText("TABLE");
    const group = table.closest(".gap-sm");
    expect(group).not.toBeNull();
    expect(group?.contains(screen.getByText("FILTERS"))).toBe(true);
    expect(container.querySelector(".gap-sm")).not.toBeNull();
  });

  it("table 是必填槽，其余都可缺", () => {
    render(<ListPageTemplate table={<span>TABLE</span>} />);
    expect(screen.getByText("TABLE")).toBeInTheDocument();
  });
});

describe("DetailPageTemplate · 摘要栏塌到主列之下", () => {
  /**
   * 窄屏（<lg）塌单列时 **aside 落到主列之下**：详情主体是页面的主对象，
   * 摘要是快照——塌到上面会把主体挤出首屏。
   *
   * 这条靠 DOM 顺序 + lg: 断点实现：默认纵向排、主列在前，`lg:flex-row` 才并列。
   */
  it("DOM 里主列在前、摘要在后，宽屏才并排", () => {
    render(
      <DetailPageTemplate aside={<span>ASIDE</span>}>
        <span>MAIN</span>
      </DetailPageTemplate>,
    );
    expect(orderOf(["MAIN", "ASIDE"])).toEqual(["MAIN", "ASIDE"]);

    const row = ancestorWith(screen.getByText("MAIN"), "lg:flex-row");
    expect(row).not.toBeNull();
    // 默认纵向、主列在前；宽屏才转成并排
    expect((row as HTMLElement).className).toContain("flex-col");
  });

  it("不给 aside 就是单列，不留空栏", () => {
    render(
      <DetailPageTemplate>
        <span>MAIN</span>
      </DetailPageTemplate>,
    );
    expect(ancestorWith(screen.getByText("MAIN"), "lg:flex-row")).toBeNull();
  });
});

describe("FormPageTemplate · 表单区不限宽", () => {
  /**
   * 2026-08-12 撤掉了原先的 `max-w-content-narrow-lg`：与 ListPageTemplate 满宽
   * 一致是明确要求的——「限宽利于阅读」的理由没错，但代价是同一个应用里表单页
   * 和列表页在同一侧栏下露出**两种内容宽度**，读者会当成两套系统。
   *
   * 这条钉的是「撤掉」。谁把限宽加回来，这里会红。
   */
  it("不自己限宽", () => {
    const { container } = render(
      <FormPageTemplate>
        <span>FORM</span>
      </FormPageTemplate>,
    );
    expect(container.innerHTML).not.toContain("max-w-content");
  });

  /** 动作条与表单区之间是虚线上边框：实线开区块，虚线分行 / 分字段。 */
  it("动作条带上边框，且 sticky 才粘底", () => {
    const { unmount } = render(
      <FormPageTemplate footer={<span>ACTIONS</span>}>
        <span>FORM</span>
      </FormPageTemplate>,
    );
    const footer = screen.getByText("ACTIONS").parentElement as HTMLElement;
    expect(footer.className).toContain("border-t");
    expect(footer.className).not.toContain("sticky");
    unmount();

    render(
      <FormPageTemplate sticky footer={<span>ACTIONS</span>}>
        <span>FORM</span>
      </FormPageTemplate>,
    );
    const sticky = screen.getByText("ACTIONS").parentElement as HTMLElement;
    expect(sticky.className).toContain("sticky");
    // 粘底条延续页面底色，不引入新表面
    expect(sticky.className).toContain("bg-background");
  });

  it("不给 footer 就没有动作条", () => {
    const { container } = render(
      <FormPageTemplate>
        <span>FORM</span>
      </FormPageTemplate>,
    );
    expect(container.querySelector(".border-t")).toBeNull();
  });
});
