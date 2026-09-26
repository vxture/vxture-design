/**
 * 结构族：SectionHeader / Section / ViewLayout。
 *
 * 这一族的契约几乎全是**层级与节奏**——写错不报错，只是整页的标题阶和留白
 * 悄悄乱掉，而且要整页排开才看得出来。
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SectionHeader } from "../src/components/composite/structure/SectionHeader";
import { Section } from "../src/components/composite/structure/Section";
import { ViewLayout } from "../src/components/layout/ViewLayout";

/**
 * owner 2026-09-26 定稿的标题阶梯：level 的数字就是 h 的数字。第 1 级是页头
 * ViewHeader（h1 · heading-3），本件只有 2 / 3 / 4，字级出自 title 族 18 / 16 / 14。
 * 图标间距与描述字级随档收。
 */
const LADDER = [
  {
    level: 2,
    tag: "H2",
    type: "text-title-lg",
    lead: "gap-md",
    description: "text-body-md",
  },
  {
    level: 3,
    tag: "H3",
    type: "text-title-md",
    lead: "gap-sm",
    description: "text-body-sm",
  },
  {
    level: 4,
    tag: "H4",
    type: "text-title-sm",
    lead: "gap-xs",
    description: "text-body-sm",
  },
] as const;

describe("SectionHeader · 语义元素与排版角色不许各说各话", () => {
  /**
   * 文件头写死的一条：**层级由 `level` 给出，同时决定语义元素与排版角色，两者
   * 不会各说各话**。分开写就会出现「看着是三级、读屏听着是一级」这种事——而这
   * 两处任何一处单独改动都不会报错。
   */
  it.each(LADDER)("level $level → $tag + $type", ({ level, tag, type }) => {
    render(<SectionHeader level={level} title="板块标题" />);
    const heading = screen.getByText("板块标题");
    expect(heading.tagName).toBe(tag);
    expect(heading.className).toContain(type);
  });

  /**
   * 原 level 4 借了 label-md，与 title-sm 取值完全相同，三、四级看上去一样
   * （owner 2026-09-26）。每档的排版角色必须两两不同。
   */
  it("三档排版角色两两不同——阶梯塌成一档就没有阶梯了", () => {
    const types = LADDER.map((l) => l.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it("字级全部出自 title 族", () => {
    for (const { type } of LADDER) expect(type).toMatch(/^text-title-/);
  });

  it("level 的数字就是 h 的数字", () => {
    for (const { level, tag } of LADDER) expect(tag).toBe(`H${level}`);
  });

  it("一页一个 h1：板块标题不出 h1", () => {
    for (const { level } of LADDER) {
      const { unmount } = render(<SectionHeader level={level} title="t" />);
      expect(screen.getByText("t").tagName).not.toBe("H1");
      unmount();
    }
  });

  it.each(LADDER)(
    "level $level：图标间距 $lead、描述 $description",
    ({ level, lead, description }) => {
      render(
        <SectionHeader
          level={level}
          icon="database"
          title="t"
          description="d"
        />,
      );
      const copy = screen.getByText("t").parentElement!;
      const leadBox = copy.parentElement!;
      expect(leadBox.className.split(" ")).toContain(lead);
      expect(screen.getByText("d").className).toContain(description);
    },
  );

  /** 三档的图标与标题行高同值，图标顶端对齐标题首行，不加偏移。 */
  it("图标不加上偏移", () => {
    const { container } = render(
      <SectionHeader level={3} icon="database" title="t" />,
    );
    const iconBox = container.querySelector("[aria-hidden=true]")!;
    expect(iconBox.className.split(" ").some((c) => c.startsWith("mt-"))).toBe(
      false,
    );
  });

  it("三档各不相同（元素 + 类名）", () => {
    const seen = new Set<string>();
    for (const { level } of LADDER) {
      const { unmount } = render(<SectionHeader level={level} title="t" />);
      const h = screen.getByText("t");
      seen.add(`${h.tagName}|${h.className}`);
      unmount();
    }
    expect(seen.size).toBe(LADDER.length);
  });

  /** 展示体 heading 族退出工作界面的标题阶——它是营销页的字体。 */
  it("不用展示体字级", () => {
    for (const { level } of LADDER) {
      const { unmount } = render(<SectionHeader level={level} title="t" />);
      expect(screen.getByText("t").className).not.toContain("text-display");
      expect(screen.getByText("t").className).not.toContain("text-heading");
      unmount();
    }
  });

  it("默认层级是 2——板块标题是最常见的那一档", () => {
    render(<SectionHeader title="t" />);
    expect(screen.getByText("t").tagName).toBe("H2");
    expect(screen.getByText("t").className).toContain("text-title-lg");
  });
});

describe("Section · 标题层级只有一个来源", () => {
  /**
   * 头部**复用 SectionHeader**，不自己再渲染一遍 h2——原实现各写各的，结果
   * 同为二级标题的两处排版并不一致。
   */
  it("给了 title 就走 SectionHeader 那套排版，不是自己画一个 h2", () => {
    render(
      <Section title="危险操作">
        <p>正文</p>
      </Section>,
    );
    const heading = screen.getByText("危险操作");
    expect(heading.tagName).toBe("H2");
    expect(heading.className).toContain("text-title-lg");
  });

  it("不给 title 就不出标题——板块不必都有名字", () => {
    render(
      <Section>
        <p>正文</p>
      </Section>,
    );
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  /**
   * 两种 tone 表达的是「这块要不要从背景里托起来」，不是重要程度。
   * raised = 描边 + 卡片底色 + 内边距。
   */
  it("raised 档托起来，default 档不托", () => {
    const { container: raised, unmount } = render(
      <Section tone="raised">
        <p>x</p>
      </Section>,
    );
    const r = raised.firstElementChild as HTMLElement;
    expect(r.className).toContain("bg-card");
    expect(r.className).toContain("shadow-raised");
    unmount();

    const { container } = render(
      <Section>
        <p>x</p>
      </Section>,
    );
    const d = container.firstElementChild as HTMLElement;
    expect(d.className).not.toContain("bg-card");
    expect(d.className).not.toContain("shadow-raised");
  });
});

describe("ViewLayout · 层级靠留白读出来", () => {
  /**
   * 板块**之间**的间距必须明显宽于板块**之内**：ViewLayout 走 gap-xl，
   * Section 内部走 gap-md。两者相等的话，一页板块就糊成一片。
   */
  it("板块之间用 gap-xl，比板块之内高一档", () => {
    const { container: outer, unmount } = render(
      <ViewLayout>
        <p>x</p>
      </ViewLayout>,
    );
    expect((outer.firstElementChild as HTMLElement).className).toContain(
      "gap-xl",
    );
    unmount();

    const { container: inner } = render(
      <Section>
        <p>x</p>
      </Section>,
    );
    const cls = (inner.firstElementChild as HTMLElement).className;
    expect(cls).toContain("gap-md");
    expect(cls).not.toContain("gap-xl");
  });

  /** 不设 maxWidth：内容区宽度是外壳的事，view 只管纵向。 */
  it("不自己限宽", () => {
    const { container } = render(
      <ViewLayout>
        <p>x</p>
      </ViewLayout>,
    );
    expect(
      (container.firstElementChild as HTMLElement).className,
    ).not.toContain("max-w-");
  });
});
