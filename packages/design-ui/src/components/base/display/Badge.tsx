/**
 * Badge.tsx - 徽标（shadcn 惯例 + cva）。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Display
 *
 * 结构承 shadcn 官方 Badge，取值全部绑 T2 语义层。相对上游的定制：
 * - 增 `asChild`，使 Badge 能直接渲染成 <a>（上游 2024 后的版本已有此能力）。
 * - 保留 `forwardRef`：上游新版把它去掉是因为面向 React 19（ref 作为普通 prop
 *   传递），本包的 peer 范围仍含 React 18，去掉会让 StatusBadge 这类包装件拿不到 ref。
 * - 尺度走 T2（min-h-control-2xs / px-sm / text-label-sm），跟随密度与字号三档；
 *   上游的裸数值 px-2.5 / py-0.5 / text-xs 不跟随，故不用。
 * - **缺省是 `outline` 而非 `default`**（2026-08-05 owner 定，理由见下）。
 * - 增 `size`：`md`（缺省，即此前唯一的尺寸）与 `sm`（紧凑，挂在标题上的角标用，
 *   见下「两档尺寸」）。
 *
 * ## 缺省是描边
 *
 * 变体的名字与值域仍与上游一致（default/secondary/destructive/outline），只有
 * `defaultVariants` 换了——`variant="default"` 依旧是实心品牌底，它只是不再是
 * 缺省值。
 *
 * 起因：仓内 191 处 `<Badge>` 不带 variant，于是全都渲染成实心品牌蓝 + 白字。
 * 而它们说的几乎全是"这是个标签"——探针名、时间戳、分类、计数。实心品牌底是
 * **强调**手段，一屏几十个强调就等于没有强调，只剩满页跳眼的蓝。
 *
 * 上游那个缺省合理是因为上游的 Badge 通常一屏一两个。到我们这个量级，缺省必须
 * 是最安静的那一档，强调改成显式索取（`variant="default"`）。
 *
 * 与 `StatusBadge` 的分工也因此清楚了：Badge 是中性标签，StatusBadge 才带语气
 * 底色——后者本就建在 `outline` 之上再叠 `toneSurfaceClasses`，两件现在同源。
 *
 * ## 两档尺寸
 *
 * - `md`：下限 `control-2xs`（标准密度 20px），高度随文字行盒长，左右 `px-sm`。
 * - `sm`：下限 `control-3xs`（16px），行高收成 1、左右 `px-2xs`——给挂在标题上的
 *   角标用（Figma Header_product 的 Pro 等级，2026-09-26 owner：tag 高度要压缩）。
 *   标准尺寸的徽章放在 20px 品牌标题旁边块头太大，读起来像并列的第二个名字。
 *   **只用于一两个字的短标**：行高收成 1 之后多行文字会挤在一起。
 *
 * 原实现用对象式 cn 手写变体，且挂了一个已随遗留样式层退役的 .vx-badge。
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../../utils/cn";
import { iconInset, interactive, invalid } from "../../../styles/recipes";

const badgeVariants = cva(
  cn(
    // control-2xs 是下限，不是裁切框：密度与字号是独立轴，文字行盒更高时徽章
    // 必须随字体长高。无垂直 padding，实际高度由 max(control-2xs, line box + border)
    // 决定；同一字号下仍然等高，Large 字体档也不会被 Compact 密度裁掉。
    "inline-flex w-fit shrink-0 items-center justify-center gap-2xs",
    "overflow-hidden rounded-4xl border border-transparent",
    "text-label-sm whitespace-nowrap",
    interactive,
    invalid,
    iconInset,
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "[&_svg:not([class*='size-'])]:size-icon-xs",
  ),
  {
    variants: {
      variant: {
        // hover 只在徽章本身是链接时才给——不可点的徽章有悬停反馈是在说谎。
        default:
          "bg-primary text-primary-foreground [a&]:hover:bg-primary-hover",
        secondary: cn(
          "bg-primary-muted text-primary-muted-foreground",
          "[a&]:hover:bg-primary-muted-hover",
        ),
        // 与 Button 同一判断：危险用淡底。徽章更需要如此——它常成片出现，
        // 满屏实心红会把整页的视觉重心压到异常状态上。
        destructive: cn(
          "bg-destructive-muted text-destructive-muted-foreground",
          "[a&]:hover:bg-destructive-muted-hover",
        ),
        outline: "border-border text-foreground [a&]:hover:bg-accent",
      },
      size: {
        md: "min-h-control-2xs px-sm",
        // leading-none 必须跟在 text-label-sm 之后（base 里），才压得住角色自带的行高。
        sm: "min-h-control-3xs px-2xs leading-none",
      },
    },
    defaultVariants: {
      // 不是 `default`——见文件头"缺省是描边"。
      variant: "outline",
      size: "md",
    },
  },
);

/**
 * 变体的**运行时数组**，类型由它推导（同 Button.types 的写法）。
 * 预览面要遍历全部档位时引这里，不再手抄。
 */
export const BADGE_VARIANTS = [
  "default",
  "secondary",
  "destructive",
  "outline",
] as const;

export type BadgeVariant = (typeof BADGE_VARIANTS)[number];

/** 尺寸的运行时数组，同 `BADGE_VARIANTS`。 */
export const BADGE_SIZES = ["md", "sm"] as const;

export type BadgeSize = (typeof BADGE_SIZES)[number];

/** cva 的变体键必须与数组一致——两处各写一份必然漂移，此处编译期对账。 */
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

export type _BadgeVariantKeysMatch = Expect<
  Equal<
    NonNullable<VariantProps<typeof badgeVariants>["variant"]>,
    BadgeVariant
  >
>;

export type _BadgeSizeKeysMatch = Expect<
  Equal<NonNullable<VariantProps<typeof badgeVariants>["size"]>, BadgeSize>
>;

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  readonly asChild?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, variant, size, asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "span";
  return (
    <Comp
      ref={ref}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
});

Badge.displayName = "Badge";

export { Badge, badgeVariants };
