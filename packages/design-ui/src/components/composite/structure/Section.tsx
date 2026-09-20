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
 * glass 让卡自己有一点纵向的明暗变化：从 `--card` 到 `--surface-1`（两者都是
 * 既有令牌，**不新造颜色**，因而暗色主题自动成立——暗色档它们是 neutral-800 →
 * neutral-900，方向一致）。再配 `backdrop-blur` 与不透明度，卡与底之间有层次
 * 而不是一刀切。
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
          "rounded-xl p-lg shadow-raised ring-1 ring-foreground/10",
          // 渐变两端都取既有语义令牌,暗色主题因此自动成立(那边是
          // neutral-800 → neutral-900,同样是"上浅下深"的方向)。
          "bg-gradient-to-b from-card/90 to-surface-1/70",
          // 背景模糊让半透明有实感;不支持的浏览器退化成纯半透明,仍然可读。
          "backdrop-blur-sm",
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
