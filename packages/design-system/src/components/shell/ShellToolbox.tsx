/**
 * ShellToolbox.tsx - 外壳工具箱：一排常驻底色的图标工具（主题、语言、全屏、
 * 帮助、通知、设置……）。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - Shell
 *
 * 外观照 Figma HeaderToolbar（123:43）：浅灰底（`bg-background`）圆角胶囊，
 * 图标 20px、图标间距 16px，单个工具没有自己的底色。与 `ShellIconGroup` 不同：
 * 那个平时透明、悬停才整组亮底，按钮是 32px 的幽灵按钮。
 *
 * 两种用法，可以混用（owner 2026-09-25：「支持显示 / 隐藏，链接导入定义」）：
 *
 * 1. **按定义导入**：`items` 是一组工具定义——图标、名字、去向（链接 `href` 或
 *    回调 `onClick`）、显隐（`hidden`）、状态（`active` / `disabled` / `badge`）。
 *    工具列表来自配置或接口时用这个，产品侧不必逐个写 JSX。
 * 2. **自己组合**：children 里放 `ShellToolboxButton`。它转发 ref 并透传 props，
 *    可以直接放进 `PopoverTrigger asChild`——主题、语言、通知这类要开弹层的工具
 *    这样接。本件**不绑定弹层**：弹不弹、弹什么由调用方组合（零件式组合）。
 *
 * 显隐：`hidden` 的项不渲染、不占位；一项都不可见时整只胶囊不渲染——留一条空的
 * 灰底比什么都没有更奇怪。
 *
 * 与业务无关：本件不认识「主题」「语言」这些工具是什么，只管摆放与外观。
 */

import * as React from "react";
import type { ReactNode } from "react";
import { Icon, cn } from "@vxture/design-ui";
import type { IconName } from "@vxture/design-ui";
import { interactive } from "@vxture/design-ui/styles";

/** 一条工具定义（`items` 的元素）。 */
export interface ShellToolboxItem {
  key: string;
  icon: IconName;
  /** 可访问名，同时是悬停提示。纯图标按钮没有可读名等于对读屏隐身，必给。 */
  label: string;
  /** 链接去向。给了就渲染成链接，否则是按钮。 */
  href?: string | undefined;
  /** 在新标签页打开（仅 href 生效），自动补 rel。 */
  newTab?: boolean | undefined;
  onClick?: (() => void) | undefined;
  /** 隐藏：不渲染、不占位。 */
  hidden?: boolean | undefined;
  /** 当前处于开启态（例如全屏中）。图标提到前景色，并报 aria-pressed。 */
  active?: boolean | undefined;
  disabled?: boolean | undefined;
  /** 右上角小圆点：有待处理的事（未读通知等）。只是提示，不带数字。 */
  badge?: boolean | undefined;
}

export interface ShellToolboxProps {
  /** 整组的可访问名（「工具」）。 */
  label: string;
  /** 按定义导入的工具，排在 children 之前。 */
  items?: ReadonlyArray<ShellToolboxItem> | undefined;
  /** 渲染链接的元素，默认原生 <a>；产品侧有路由库时传自己的 Link。 */
  linkComponent?: React.ElementType | undefined;
  /** 自己组合的工具（`ShellToolboxButton`，可包在 PopoverTrigger 里）。 */
  children?: ReactNode;
  className?: string | undefined;
}

/** 单个工具的外观：20px 图标格，无底色，悬停与开启时提到前景色。 */
const TOOL_CLASS = cn(
  interactive,
  "relative inline-flex size-icon-md shrink-0 items-center justify-center rounded-sm",
  "text-muted-foreground hover:text-foreground",
  "aria-pressed:text-foreground",
);

function ToolBadge() {
  return (
    <span
      aria-hidden="true"
      className="absolute -top-2xs -right-2xs size-2xs rounded-full bg-destructive ring-2 ring-background"
    />
  );
}

export interface ShellToolboxButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  /** 可访问名与悬停提示，必给。 */
  label: string;
  active?: boolean | undefined;
  badge?: boolean | undefined;
}

/**
 * 工具箱里的一个按钮。转发 ref、透传其余 props——放进 Radix 的
 * `PopoverTrigger asChild` / `TooltipTrigger asChild` 才打得开。
 */
export const ShellToolboxButton = React.forwardRef<
  HTMLButtonElement,
  ShellToolboxButtonProps
>(function ShellToolboxButton(
  { icon, label, active = false, badge = false, className, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      data-slot="shell-toolbox-button"
      className={cn(TOOL_CLASS, className)}
      {...rest}
    >
      <Icon name={icon} size="md" aria-hidden="true" />
      {badge ? <ToolBadge /> : null}
    </button>
  );
});

function ToolboxItem({
  item,
  linkComponent: Link,
}: {
  item: ShellToolboxItem;
  linkComponent: React.ElementType;
}) {
  if (item.href && !item.disabled) {
    return (
      <Link
        href={item.href}
        aria-label={item.label}
        title={item.label}
        onClick={item.onClick}
        data-slot="shell-toolbox-link"
        className={TOOL_CLASS}
        {...(item.newTab
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        <Icon name={item.icon} size="md" aria-hidden="true" />
        {item.badge ? <ToolBadge /> : null}
      </Link>
    );
  }
  return (
    <ShellToolboxButton
      icon={item.icon}
      label={item.label}
      active={item.active ?? false}
      badge={item.badge ?? false}
      disabled={item.disabled ?? false}
      onClick={item.onClick}
    />
  );
}

export function ShellToolbox({
  label,
  items = [],
  linkComponent = "a",
  children,
  className,
}: ShellToolboxProps) {
  const visible = items.filter((item) => !item.hidden);
  const hasChildren = React.Children.toArray(children).length > 0;
  if (visible.length === 0 && !hasChildren) return null;

  return (
    <div
      role="toolbar"
      aria-label={label}
      data-slot="shell-toolbox"
      className={cn(
        "inline-flex items-center gap-md rounded-lg bg-background px-xs py-2xs",
        className,
      )}
    >
      {visible.map((item) => (
        <ToolboxItem key={item.key} item={item} linkComponent={linkComponent} />
      ))}
      {children}
    </div>
  );
}
