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
 *   glass   —— 与 `Card` 同一张卡面：`cardVeil` 的半透明渐变 + `veil` 骨架。
 *
 * 名字用 raised 不用 muted：它对应视觉高度阶梯上的那一档，与 `shadow-raised`
 * 同源。muted 在色彩语义里已经表示"弱化"，两处同名不同义会互相污染。
 *
 * ── glass 补的是什么 ──
 * raised 的底色是纯 `--card`（浅色档就是纯白）。一页上叠四五张这样的卡，就是
 * 一块接一块的死白，只靠一条细边框与背景区分——"非常难看"（owner 2026-09-20
 * 实看 console 的账号页与租户页）。
 *
 * ── 它必须复用 cardVeil，不能自己配一份渐变 ──
 * 12.16.0 的首版自己写了 `bg-gradient-to-b from-card to-accent`，并在这里论证
 * 了一通"为什么另一端得是 accent 不是 surface-1"。**两个选项都错**：卡面本来
 * 就有唯一的一份配方——`recipes.cardVeil()`（`--gradient-card-from/to` 配
 * `--opacity-veil-*` 三档），`Card` / `EntryCard` 用的都是它。
 *
 * `from-card` 是**不透明**的卡色，盖住了底下的页面色，于是同一页上 Section 比
 * 邻近的 Card 深一档、且色相不同（owner 2026-09-21 实看："我的账号、租户信息是
 * 另一套颜色，而且太深了"）。recipes 里早有一条一模一样的教训：那三档曾各带一个
 * `bg-card/58|68|72`，把 cardVeil 的品牌调冲掉，opera 的卡片因此看不出底纹
 * （2026-08-05 实测）。同一个坑踩了第二次。
 *
 * 所以 glass 现在 = `cardVeil("base")` + `veil.base`，与 `Card surface="base"`
 * 逐像素相同。要调浓淡改 `--opacity-veil-*`，一处生效。
 *
 * 不把它做成 raised 的新样子：raised 用在危险操作区那类"要明确切开"的块上，
 * 切得干脆才对；glass 用在信息陈列的长页面上。两种诉求不同，各占一档。
 */

import * as React from "react";
import { cardVeil, veil } from "../../../styles/recipes";
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
    style,
    ...props
  },
  ref,
) {
  const hasHeader = Boolean(title || description || action);

  return (
    <section
      ref={ref}
      // 底纹与 Card 同一份配方。调用方的 style 后写，需要盖掉时仍然盖得掉。
      style={tone === "glass" ? { ...cardVeil("base"), ...style } : style}
      className={cn(
        "flex flex-col gap-md",
        tone === "raised" &&
          "rounded-xl bg-card p-lg shadow-raised ring-1 ring-foreground/10",
        // 骨架也取 veil，圆角与描边才和同页的 Card 对得上；底纹走上面的 style。
        tone === "glass" && [veil.base, "p-lg"],
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
