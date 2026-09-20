/**
 * Section.tsx - view 内的板块容器。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 头部**复用 `SectionHeader`**，不自己再渲染一遍 h2——原实现（PageSection）就是
 * 各写各的，结果同为二级标题的两处排版并不一致。板块的标题层级只有一个来源。
 *
 * 三种 tone 表达的是"这块要不要从背景里托起来"，不是重要程度：
 *   default —— 不托起，靠留白与标题分层。绝大多数板块用这个。
 *   raised  —— 描边 + 卡片底色 + 内边距。用于需要与周围明确切开的块，
 *              例如危险操作区、或一组独立于上下文的设置。
 *   glass   —— 同 raised 的形状，底色换成**浅色渐变 + 半透明**。
 *
 * 名字用 raised 不用 muted：它对应视觉高度阶梯上的那一档，与 `shadow-raised`
 * 同源。muted 在色彩语义里已经表示"弱化"，两处同名不同义会互相污染。
 *
 * ── glass 补的是什么 ──
 * raised 的底色是纯 `--card`（浅色档就是纯白）。一页上叠四五张这样的卡，就是
 * 一块接一块的死白，只靠一条细边框与背景区分——"非常难看"（owner 2026-09-20
 * 实看 console 的账号页与租户页）。
 *
 * glass 保留 raised 的**形状**（圆角/内边距/投影/描边），只让卡面自己有纵向的
 * 明暗变化：从 `--card` 渐到 `--accent`。
 *
 * ── 为什么渐变的另一端必须是 accent，不能是 surface-1 ──
 * 首版用的是 `--surface-1`，实测（浅色档）又淡又脏：
 *   页面底色 `--background` = #f4f7fd —— 带蓝的**冷白**
 *   `--surface-1`           = lab(90.95%) —— **中性灰**
 * 往冷蓝底上叠一层中性灰，灰与蓝打架，看着是"蒙了层脏"而不是"有层次"。
 * 而 `--accent` 是品牌蓝的极淡态（浅色 alpha-08 / 暗色 alpha-15），**与页面
 * 底色同色系**——卡与底因此像"同一片天空里的深浅"。暗色档 accent 还重一档，
 * 在深底上照样看得出来，方向不用另调。
 *
 * 不把它做成 raised 的新样子：raised 用在危险操作区那类"要明确切开"的块上，
 * 切得干脆才对；glass 用在信息陈列的长页面上。两种诉求不同，各占一档。
 */

import * as React from "react";
import { cn } from "../../../utils/cn";
import { SectionHeader, type SectionHeaderLevel } from "./SectionHeader";
import type { IconName } from "../../../icons";

export type SectionTone = "default" | "raised" | "glass";

export interface SectionProps extends Omit<
  React.HTMLAttributes<HTMLElement>,
  "title"
> {
  readonly title?: React.ReactNode;
  readonly level?: SectionHeaderLevel;
  readonly description?: React.ReactNode;
  readonly action?: React.ReactNode;
  readonly icon?: IconName;
  readonly tone?: SectionTone;
  readonly children: React.ReactNode;
}

const Section = React.forwardRef<HTMLElement, SectionProps>(function Section(
  {
    className,
    title,
    level,
    description,
    action,
    icon,
    tone = "default",
    children,
    ...props
  },
  ref,
) {
  const hasHeader = Boolean(title || description || action);

  return (
    <section
      ref={ref}
      className={cn(
        "flex flex-col gap-md",
        tone === "raised" &&
          "rounded-xl bg-card p-lg shadow-raised ring-1 ring-foreground/10",
        tone === "glass" && [
          // 形状与 raised 一字不差,只换底色——「card 的样式要能看出来」。
          "rounded-xl p-lg shadow-raised ring-1 ring-foreground/10",
          // 顶端是实的卡色(不带透明度:半透明会让下面的底色透上来,
          // 卡顶就不是白的了,形状感反而更弱)。
          "bg-gradient-to-b from-card to-accent",
        ],
        className,
      )}
      {...props}
    >
      {hasHeader && title ? (
        <SectionHeader
          title={title}
          {...(level ? { level } : {})}
          {...(description ? { description } : {})}
          {...(action ? { action } : {})}
          {...(icon ? { icon } : {})}
        />
      ) : null}
      <div className="flex flex-col gap-md">{children}</div>
    </section>
  );
});

Section.displayName = "Section";

export { Section };
