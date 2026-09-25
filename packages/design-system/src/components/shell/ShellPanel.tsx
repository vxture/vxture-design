/**
 * ShellPanel.tsx - 外壳弹层面板的**结构语法**（零业务语义）。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - Shell
 *
 * 为什么单独成族：外壳上的弹层面板（当前范围切换、账户菜单、任何产品自定义
 * 面板）在多个产品里反复出现，视觉语法完全一致——头部一个标识 + 标题 + 若干
 * meta 行，往下按发丝线分段，每段一个小标题带若干行，行有三种形态（可点导航
 * 行 / 只读信息行 / 带进度条的度量行），外加一排槽位徽章。变的从来只是**内容**。
 *
 * 所以这里只收语法不收内容：本文件不认识"租户""配额""账单""等级"，也不
 * 应该认识（DS 零业务属性，见 03-patterns-guide.md §8）。产品侧拿这些件拼出
 * 自己的面板，业务词汇全部由 props 传入，各产品可以任意定制段落顺序、行数、
 * 文案，而彼此的排版/间距/字号/分隔线保持逐像素一致。
 *
 * 放 design-system 而不是 design-ui：`ShellPanelHeader` 复用同目录 `ShellChrome`
 * 的头像件，依赖方向是单向 design-system → design-ui。
 *
 * 与 `ShellUserPanel` / `ShellUserMenu` 的关系：那两个是**装配好的**用户面板
 * （前者是面板本体，后者是头像按钮 + 弹层，弹层里装前者），这里是**散件**。
 * 用户面板的分段语法就是 ShellPanelSection，两处共用同一组常量，改一处等于
 * 改两处。
 */

import * as React from "react";
import type { ReactNode } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Icon,
  PopoverContent,
  Progress,
  Separator,
  cn,
} from "@vxture/design-ui";
import { panel } from "@vxture/design-ui/styles";
import type { IconName } from "@vxture/design-ui";

/** 面板内的段落分隔：虚线发丝线（02-visual-spec.md §3）。ShellUserMenu 同款。 */
export const SHELL_PANEL_HAIRLINE =
  "border-t border-dashed border-primary/10 dark:border-primary/20";

/**
 * 面板行的统一列定义。**这些是内部实现，不导出**——对齐靠"用本文件的行组件"
 * 保证，不靠调用方记得引用一组类名常量。曾经把它们导出过：那等于把规范写成
 * 了一份需要人去遵守的约定，而约定的执行率就是这轮返工的由来。
 *
 * 列的算术：`px-sm` + 图标 `size-icon-sm` + `gap-md` = 内容列起点。
 */
const ROW_INSET = "px-sm";
const ROW_LEAD_WIDTH = "w-icon-sm";
const ROW_GAP = "gap-md";
/** 行高统一档：与 `Button size="sm"`（h-control-md）同值。 */
const ROW_HEIGHT = "h-control-md";
/** 行内图标一律走弱化色，与文字拉开层级——各行自己染色是不一致的来源。 */
const ROW_ICON_TONE = "text-muted-foreground";
/**
 * 面板头部标识块（头像 / 图标）的尺寸档。它比行内图标大得多，自成一列。
 */
const IDENTITY_SIZE = "size-media-sm";
const IDENTITY_WIDTH = "w-media-sm";

/**
 * 读数 + 单位：`ShellPanelMeterRow` 的读数与 `ShellPanelRow` 的 `strong` 档
 * **共用这一份**——额度、存储、账户余额、本月账单同在一块面板里，数字的高度、
 * 单位的大小与对齐必须一模一样（owner 2026-09-25）。各写一份就会各自漂移：
 * 此前余额是 16px 数字套浅蓝底块，存储是 18px 纯数字。
 *
 * 纯数字，不套底色块：读数本身就是这一行的重点，字号已经把它拎出来了。
 */
function RowReadout({
  value,
  unit,
}: {
  value: ReactNode;
  unit?: ReactNode | undefined;
}) {
  return (
    /* 底对齐：读数比单位高一截，顶对齐会让单位浮在半空。 */
    <span className="flex shrink-0 items-end gap-2xs">
      <span className="text-label-xl tabular-nums">{value}</span>
      {unit !== undefined && unit !== null ? (
        <span className="text-label-sm text-muted-foreground">{unit}</span>
      ) : null}
    </span>
  );
}

/**
 * 行首图标格。**无图标也渲染**：同一段里有的行带图标、有的不带时，缺格的那
 * 行文字会左窜一格，整段左缘就毛了。
 */
function RowLead({
  icon,
  width,
  danger = false,
}: Readonly<{
  icon?: IconName | undefined;
  width?: "row" | "identity" | undefined;
  danger?: boolean | undefined;
}>) {
  return (
    <span
      className={cn(
        "inline-grid h-full shrink-0 place-items-center",
        danger ? "text-destructive-text" : ROW_ICON_TONE,
        width === "identity" ? IDENTITY_WIDTH : ROW_LEAD_WIDTH,
      )}
      aria-hidden="true"
    >
      {icon ? <Icon name={icon} size="sm" /> : null}
    </span>
  );
}

/* ─────────────────────────── 面板外壳 ─────────────────────────── */

export interface ShellPanelContentProps extends React.ComponentPropsWithoutRef<
  typeof PopoverContent
> {}

/**
 * 面板的浮层外壳：固定宽度、四周留白、段间距、以及**打开时不抢焦点**。
 *
 * 单独成件而不是让每个面板各写一串 className：这几样是"面板长什么样"的
 * 定义，散在调用点就等于每加一个面板都要抄一遍，抄漏一项就出现一个宽度或
 * 内距不同的异类（本轮之前 ShellUserMenu 与 TenantPanel 正是各写各的）。
 *
 * `onOpenAutoFocus` 拦掉：Radix 默认把焦点移进浮层的第一个可聚焦元素，对
 * **菜单**是对的（用户就是来选一项的），但这类面板是"看一眼当前状态、顺手
 * 点个入口"，一打开就有个下拉被套上焦点环，读起来像是它已经被选中、正等着
 * 输入。触发器保持焦点，Tab 仍可正常进入面板，键盘可达性不受影响。
 */
export const ShellPanelContent = React.forwardRef<
  React.ComponentRef<typeof PopoverContent>,
  Readonly<ShellPanelContentProps>
>(function ShellPanelContent(
  { className, sideOffset = 8, onOpenAutoFocus, ...props },
  ref,
) {
  return (
    <PopoverContent
      ref={ref}
      sideOffset={sideOffset}
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        onOpenAutoFocus?.(event);
      }}
      className={cn(
        /* w-80(320px) 是**组件尺寸**，不进 T2 刻度（01-usage.md §3，
           PopoverContent 自己的 w-72 同理）。

           **必须写成字面量**，不能抽成常量再模板拼接：类名由消费方的 Tailwind
           扫描本包源码生成，扫描器只认源码里出现过的完整串——拼出来的 `w-80`
           它看不见，于是那条规则根本不会被 emit，运行时表现为"宽度设了没生效"。
           ShellScopeButton 的 `w-80` 同理，两处刻意重复。 */
        "flex w-80 flex-col gap-md p-md",
        className,
      )}
      {...props}
    />
  );
});

export interface ShellPanelSurfaceProps extends React.HTMLAttributes<HTMLDivElement> {}

/**
 * 面板的**平铺外壳**：`ShellPanelContent` 的不弹层版本。
 *
 * 面板不一定装在弹层里——抽屉、设置页、移动端账户页、预览面都会直接平铺。
 * 此前平铺时没有可用的外壳，调用方只能手写一个 div，宽度、留白、边线各写
 * 各的（本仓预览就曾把边线写成 `border border-border`，与弹层的
 * `ring-1 ring-foreground/10` 颜色与画法都不同）。外壳归组件，业务系统拼出来
 * 的面板才能与弹层里的逐像素一致。
 *
 * 与 `ShellPanelContent` 同宽、同留白、同段间距、同表面（`panel.base` +
 * 圆角）；**不带阴影**——阴影是「浮在上面」的信号，平铺的面板没有浮起来。
 */
export function ShellPanelSurface({
  className,
  ...props
}: Readonly<ShellPanelSurfaceProps>) {
  return (
    <div
      className={cn(
        panel.base,
        "rounded-md",
        /* 与 ShellPanelContent 的 `flex w-80 flex-col gap-md p-md` **刻意重复**、
           不抽常量：类名由消费方的 Tailwind 扫描本包源码生成，拼出来的串它
           看不见（理由同 ShellPanelContent 的注释）。 */
        "flex w-80 flex-col gap-md p-md",
        className,
      )}
      {...props}
    />
  );
}

/* ─────────────────────────── 段落 ─────────────────────────── */

export interface ShellPanelSectionProps {
  /** 段落小标题；不传则只有分隔线，没有标题行。 */
  title?: ReactNode | undefined;
  /** 是否画上缘分隔线。面板第一段传 false，否则弹层顶部会多一条线。 */
  divided?: boolean | undefined;
  children: ReactNode;
  className?: string | undefined;
}

export function ShellPanelSection({
  title,
  divided = true,
  children,
  className,
}: Readonly<ShellPanelSectionProps>) {
  return (
    <div
      className={cn(
        // 段内行距 gap-xs、段与分隔线之间 pt-md。原来是 gap-2xs(4) / pt-sm(10)：
        // 行本身没有边框也没有底色，靠留白分界，4px 不足以把两行读成两件事，
        // 整段糊成一片；分隔线上方那一档同理，线贴着上一段的最后一行。
        "flex flex-col gap-xs",
        divided && cn("pt-md", SHELL_PANEL_HAIRLINE),
        className,
      )}
    >
      {title ? <ShellPanelSectionTitle>{title}</ShellPanelSectionTitle> : null}
      {children}
    </div>
  );
}

/**
 * 段落小标题。单独导出是因为不是每处分段都由 `ShellPanelSection` 渲染
 * （`ShellPreferencePanel` 自己就是一段），标题样式仍需同源——左内距与行的
 * 左内距同档，标题左缘对齐各行图标左缘。
 */
export function ShellPanelSectionTitle({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <p className={cn(ROW_INSET, "text-label-sm text-muted-foreground")}>
      {children}
    </p>
  );
}

/* ─────────────────────────── 头部 ─────────────────────────── */

export interface ShellPanelHeaderProps {
  /** 标识：图标名（走 Icon）或图片地址（走 Avatar）二选一，都不传则不渲染。 */
  icon?: IconName | undefined;
  avatarSrc?: string | undefined;
  avatarAlt?: string | undefined;
  /** 头像加载失败/未设置时的占位内容；不传则回落到 `icon`。 */
  avatarFallback?: ReactNode | undefined;
  /**
   * 标识块的画法：
   * - `"avatar"`（默认）——圆形头像位，**主体是人**时用（用户面板）。
   * - `"icon"`——不画圆、只放一个图标，**主体是组织/项目**时用（租户、工作区）。
   *   给一个组织画头像圈会让它看起来像个人。
   *
   * 两档占同一列宽，所以同一面板里混用也不会错行。
   */
  lead?: "avatar" | "icon" | undefined;
  /**
   * 紧凑档：只对 `lead="icon"` 生效。图标（24px）不再占 48px 的标识列，贴着内距
   * 排，标题随之左移到与下方列表项的文字大致同列。
   *
   * 用在**列表里的组标题**（`ShellScopePanel` 的租户行）：标识列是给面板顶部
   * 那种大头部用的，放进列表会把组名推得比它下面的子项还靠右，层级读反
   * （owner 2026-09-25）。缺省 false，面板顶部的头部不受影响。
   */
  compact?: boolean | undefined;
  title: ReactNode;
  /** 标题右侧的贴标（认证状态之类），由调用方直接给节点——DS 不判断"什么算已认证"。 */
  titleAside?: ReactNode | undefined;
  /**
   * 标题下的若干 meta 行。每行可带自己的前置图标；行内容是节点，产品侧爱放
   * 什么放什么。传空数组或不传则没有 meta 区。
   */
  /**
   * 语气。`"muted"` 把标题降到副文级——用在「这一组不是你当前所在的那一组」
   * 的场合（范围切换面板里的非当前租户）。meta 行本来就是副文级，不受影响。
   */
  tone?: "default" | "muted" | undefined;
  metaRows?: ReadonlyArray<{
    key: string;
    icon?: IconName | undefined;
    content: ReactNode;
  }>;
  className?: string | undefined;
}

export function ShellPanelHeader({
  icon,
  avatarSrc,
  avatarAlt,
  avatarFallback,
  lead = "avatar",
  compact = false,
  title,
  titleAside,
  tone = "default",
  metaRows = [],
  className,
}: Readonly<ShellPanelHeaderProps>) {
  /* 只放图标时也占满标识列宽——否则同一面板里两种头部会错开一格。
     紧凑档例外：列表里的组标题不与面板顶部的头部同列，不必占这一列。 */
  const bareIcon =
    lead === "icon" && icon ? (
      <span
        className={cn(
          !compact && IDENTITY_WIDTH,
          "flex shrink-0 justify-center text-muted-foreground",
        )}
      >
        <Icon name={icon} size="lg" />
      </span>
    ) : null;
  return (
    // items-center：标识块 48px 比它右侧的两三行文字高，items-start 会让头像
    // 顶着第一行、下方留一截空白，看起来像掉了一行内容。
    <div className={cn("flex items-center", ROW_INSET, ROW_GAP, className)}>
      {bareIcon}
      {lead === "avatar" && (avatarSrc || icon || avatarFallback) ? (
        <Avatar
          // key on src：头像换/清空时强制重挂，否则 Radix 会留着上一次的
          // "已加载"状态，占位内容再也不显示。
          key={avatarSrc ?? "__default__"}
          className={cn(IDENTITY_SIZE, "shrink-0 text-muted-foreground")}
        >
          {avatarSrc ? (
            <AvatarImage src={avatarSrc} alt={avatarAlt ?? ""} />
          ) : null}
          <AvatarFallback delayMs={0} aria-label={avatarAlt ?? undefined}>
            {avatarFallback ??
              (icon ? <Icon name={icon} className="size-icon-xl" /> : null)}
          </AvatarFallback>
        </Avatar>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-2xs">
        <div className="flex items-center justify-between gap-sm">
          <p
            className={cn(
              "truncate text-label-lg",
              tone === "muted" ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {title}
          </p>
          {titleAside}
        </div>
        {metaRows.map((row) => (
          <p
            key={row.key}
            className="flex min-w-0 items-center gap-2xs text-body-sm text-muted-foreground"
          >
            {row.icon ? (
              <Icon name={row.icon} size="xs" className="shrink-0" />
            ) : null}
            <span className="min-w-0 truncate">{row.content}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── 行 ─────────────────────────── */

export interface ShellPanelRowProps {
  icon?: IconName | undefined;
  label: ReactNode;
  /** 副行文案（label 下方一行小字）。 */
  description?: ReactNode | undefined;
  /** 右侧值（数量、金额、当前选中项…）。 */
  value?: ReactNode | undefined;
  /**
   * 值的单位（RMB、分、MB…）。单独一个槽位而不是让调用方拼进 `value`：
   * 单位要比数值轻一档，拼成一个字符串就只能同色同字重。
   */
  unit?: ReactNode | undefined;
  /**
   * 值的语气：
   * - `"muted"`（默认）——小一号的灰字，用在「顺带说一下」的值上（当前语言、
   *   已选项）。
   * - `"strong"`——大号纯数字读数（label-xl），用在「这一行就是为了让人看这个数」
   *   的行上（账户余额、本月账单）。与 `ShellPanelMeterRow` 的读数**同一份渲染**，
   *   同一块面板里余额与存储的数字高度、单位、对齐一模一样。不套底色块
   *   （owner 2026-09-25）。
   *
   * 不做成 `danger` 那样的语义色档：这里区分的是**轻重**不是吉凶，余额为负该由
   * 调用方换文案或换行，不是把块染红。
   */
  valueTone?: "muted" | "strong" | undefined;
  /** 右端是否画一个"可进入"的角标。有 onClick/href 时默认为 true。 */
  chevron?: boolean | undefined;
  /**
   * 右端角标改用指定图标（给 chevron 之外的去向语义用，例如"新开页面"用
   * `external-link`）。传了就替代 chevron。
   */
  trailingIcon?: IconName | undefined;
  /** 在新标签页打开（仅 href 生效），自动补 rel。 */
  newTab?: boolean | undefined;
  /**
   * 危险动作（登出、删除…），destructive 语义色——与 ActionMenu 的 danger
   * 同一判断：文字与图标着色、hover 淡红底，不做实心红（危险项常与常规项
   * 挨着，实心底会让整个面板看起来在报警）。
   */
  danger?: boolean | undefined;
  /** 选中/展开态——用 secondary 底色标注，跟 hover 区分。 */
  active?: boolean | undefined;
  disabled?: boolean | undefined;
  href?: string | undefined;
  /** 渲染链接时用的组件（Next 的 Link 之类）；不传走原生 a。 */
  linkComponent?: React.ElementType | undefined;
  onClick?: (() => void) | undefined;
  className?: string | undefined;
}

/**
 * 面板里的一行。三态由 props 组合决定，不另开变体：
 * - 有 `onClick`/`href` → 可点，带 chevron，hover 有反馈
 * - 只有 `label`/`value` → 只读信息行（渲染成 div，不进 tab 序）
 * - `disabled` → 保留结构与文案，去掉交互（"功能在这里，但现在不可用"）
 */
export function ShellPanelRow({
  icon,
  label,
  description,
  value,
  unit,
  valueTone = "muted",
  chevron,
  trailingIcon,
  newTab = false,
  active = false,
  disabled = false,
  danger = false,
  href,
  linkComponent,
  onClick,
  className,
}: Readonly<ShellPanelRowProps>) {
  const interactive = Boolean(onClick || href) && !disabled;
  const trailing =
    trailingIcon ??
    ((chevron ?? Boolean(onClick || href)) ? "chevron-right" : undefined);

  const inner = (
    <>
      <RowLead icon={icon} danger={danger} />
      <span className="flex min-w-0 flex-1 flex-col items-start gap-0 text-left">
        <span className="w-full truncate text-label-md">{label}</span>
        {description ? (
          <span className="w-full truncate text-body-sm text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      {value !== undefined && value !== null ? (
        valueTone === "strong" ? (
          <RowReadout value={value} unit={unit} />
        ) : (
          /* 底对齐：数值比单位高一截，顶对齐会让单位浮在半空。 */
          <span className="flex shrink-0 items-end gap-2xs">
            <span className="text-body-sm text-muted-foreground tabular-nums">
              {value}
            </span>
            {unit !== undefined && unit !== null ? (
              <span className="text-label-sm text-muted-foreground">
                {unit}
              </span>
            ) : null}
          </span>
        )
      ) : null}
      {trailing ? (
        <Icon
          name={trailing}
          size="xs"
          className={cn("shrink-0", ROW_ICON_TONE)}
        />
      ) : null}
    </>
  );

  // 行高走统一档而不是 h-auto：同一个面板里"只有一行文字"的行和"文字+副行"
  // 的行若各按内容撑高，段落里就会出现两三种行高。带副行时才放开高度。
  const shared = cn(
    "w-full items-center justify-start",
    description ? "h-auto py-xs" : ROW_HEIGHT,
    ROW_INSET,
    ROW_GAP,
    "flex",
    danger &&
      "text-destructive-text hover:bg-destructive-muted hover:text-destructive-muted-foreground",
    className,
  );

  return (
    <RowFrame
      interactive={interactive}
      href={href}
      linkComponent={linkComponent}
      onClick={onClick}
      newTab={newTab}
      active={active}
      disabled={disabled}
      className={shared}
    >
      {inner}
    </RowFrame>
  );
}

/**
 * 行的外框：不可点是 `div`，有 `href` 是链接，只有 `onClick` 是按钮。
 * `ShellPanelRow` 与 `ShellPanelMeterRow` **共用这一份**——同一块面板里的行，
 * 悬停底色、焦点环、选中态、禁用态必须一样（owner 2026-09-25：TenantPanel 六个
 * 条目都要能点）。
 */
function RowFrame({
  interactive,
  href,
  linkComponent,
  onClick,
  newTab,
  active,
  disabled,
  className,
  children,
}: {
  interactive: boolean;
  href?: string | undefined;
  linkComponent?: React.ElementType | undefined;
  onClick?: (() => void) | undefined;
  newTab: boolean;
  active: boolean;
  disabled: boolean;
  className: string;
  children: ReactNode;
}) {
  if (!interactive) {
    return (
      <div
        className={cn(
          className,
          "rounded-md",
          disabled && "opacity-disabled",
          active && "bg-secondary",
        )}
      >
        {children}
      </div>
    );
  }

  if (href) {
    const Link = linkComponent ?? "a";
    return (
      <Button
        asChild
        variant={active ? "secondary" : "ghost"}
        size="md"
        className={className}
      >
        <Link
          href={href}
          onClick={onClick}
          {...(newTab ? { target: "_blank", rel: "noreferrer noopener" } : {})}
        >
          {children}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="md"
      className={className}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

/* ─────────────────────────── 控件行 ─────────────────────────── */

export interface ShellPanelControlRowProps {
  icon?: IconName | undefined;
  /** 无障碍名 / tooltip；这一行通常没有可见文字标签，靠图标 + 控件自解释。 */
  label?: ReactNode | undefined;
  /** 控件本体（下拉、分段控件、开关…）占满内容列。 */
  children: ReactNode;
  className?: string | undefined;
}

/**
 * 装控件的一行：左边图标格，右边控件铺满内容列。与 `ShellPanelRow` 共用同一
 * 套列/高，所以偏好设置那几行的图标与上下的链接行、动作行严格同列——这件事
 * 由组件保证，不由调用方拼 flex 时自觉对齐。
 */
export function ShellPanelControlRow({
  icon,
  label,
  children,
  className,
}: Readonly<ShellPanelControlRowProps>) {
  return (
    <div
      className={cn(
        "flex items-center",
        ROW_HEIGHT,
        ROW_INSET,
        ROW_GAP,
        className,
      )}
      title={typeof label === "string" ? label : undefined}
    >
      <RowLead icon={icon} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/* ─────────────────────────── 度量行 ─────────────────────────── */

export interface ShellPanelMeterRowProps {
  icon?: IconName | undefined;
  label: ReactNode;
  /** 副行文案（label 下方一行小字），与 `ShellPanelRow.description` 同义。 */
  description?: ReactNode | undefined;
  /**
   * 当前读数（`300`）。与 `valueLabel` 分工不同：这个是**一眼要看到的数**，
   * 排在进度条上方、大一号；`valueLabel` 是条下方那句把数讲清楚的话。
   */
  value?: ReactNode | undefined;
  /** 读数的单位（分、MB…）。比读数轻一档，见 `ShellPanelRow.unit`。 */
  unit?: ReactNode | undefined;
  /**
   * 进度条**下方**的用量文案，**成品字符串**由调用方给——单位、进制、小数位、
   * 货币全是业务判断（字节按 1024、额度按千分位、金额按币种），DS 不做这些决定。
   */
  valueLabel?: ReactNode | undefined;
  /** 0–100。超出范围会被夹紧，避免进度条溢出容器。 */
  percent: number;
  /**
   * 可点：与 `ShellPanelRow` 同一套参数、同一个外框（`RowFrame`）——同一块面板里
   * 读数行与普通行的悬停、焦点、角标一致。去向（控制台里的额度页、存储页…）由
   * 调用方给，DS 不认识任何控制台地址。
   */
  href?: string | undefined;
  /** 见 `ShellPanelRow.linkComponent`。 */
  linkComponent?: React.ElementType | undefined;
  onClick?: (() => void) | undefined;
  /** 在新标签页打开（仅 href 生效），自动补 rel。 */
  newTab?: boolean | undefined;
  /** 右端"可进入"角标。有 onClick/href 时默认为 true，与 `ShellPanelRow` 一致。 */
  chevron?: boolean | undefined;
  className?: string | undefined;
}

export function ShellPanelMeterRow({
  icon,
  label,
  description,
  value,
  unit,
  valueLabel,
  percent,
  href,
  linkComponent,
  onClick,
  newTab = false,
  chevron,
  className,
}: Readonly<ShellPanelMeterRowProps>) {
  const safe = Number.isFinite(percent)
    ? Math.max(0, Math.min(100, percent))
    : 0;
  const interactive = Boolean(onClick || href);
  const showChevron = chevron ?? interactive;
  return (
    /*
     * 两栏：左边是「这是什么」，右边是「现在多少」。
     *
     * 进度条排在**右栏**而不是横跨整行：同一段里相邻的几条（额度、存储）右缘
     * 对齐、长度可比，读的人扫一眼就知道哪个更满。横跨整行时每条的起点被各自
     * 标签的长度推着走，比不了。
     *
     * 右栏取一半宽而不是定死像素：面板宽度本身有 sm/md/lg 三档，写死的块在窄档
     * 里会把标签挤没。
     *
     * 内部一律用 span：可点时外框是 <a> / <button>，里面放 div 不合法。
     */
    <RowFrame
      interactive={interactive}
      href={href}
      linkComponent={linkComponent}
      onClick={onClick}
      newTab={newTab}
      active={false}
      disabled={false}
      className={cn(
        "flex h-auto w-full items-center justify-start py-xs",
        ROW_INSET,
        ROW_GAP,
        className,
      )}
    >
      <RowLead icon={icon} />
      <span className="flex min-w-0 flex-1 flex-col items-start text-left">
        <span className="w-full truncate text-label-md">{label}</span>
        {description ? (
          <span className="w-full truncate text-body-sm text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      <span className="flex w-1/2 shrink-0 flex-col items-end gap-2xs">
        {value !== undefined && value !== null ? (
          <RowReadout value={value} unit={unit} />
        ) : null}
        <Progress value={safe} className="w-full" />
        {valueLabel !== undefined && valueLabel !== null ? (
          <span className="text-body-sm text-muted-foreground tabular-nums">
            {valueLabel}
          </span>
        ) : null}
      </span>
      {showChevron ? (
        <Icon
          name="chevron-right"
          size="xs"
          className={cn("shrink-0", ROW_ICON_TONE)}
        />
      ) : null}
    </RowFrame>
  );
}

/* ─────────────────────────── 槽位排 ─────────────────────────── */

export interface ShellPanelSlot {
  key: string;
  icon: IconName;
  /** 悬停说明；同时作为无障碍名。 */
  label: string;
  /** 已获得 = 实心高亮；未获得 = 灰底轮廓（"这里还有位置，但没解锁"）。 */
  earned?: boolean | undefined;
}

export interface ShellPanelSlotsProps {
  /** 整排的无障碍名，例如"账户标识"。 */
  label: string;
  /** 排首的引导图标（可选）。 */
  leadIcon?: IconName | undefined;
  /**
   * 导引列宽度：
   * - `"row"`（默认）与其余各行的图标同宽，槽位落在行内容列上；
   * - `"identity"` 与面板头部的标识块同宽，槽位落在**头部标题文字**那一列上。
   *
   * 槽位排通常紧跟在头部之后、讲的是同一个主体（谁的徽章），排在标题正下方
   * 比排在行内容列更说得通——所以头部下面第一排一般用 `"identity"`。
   */
  lead?: "row" | "identity" | undefined;
  slots: ReadonlyArray<ShellPanelSlot>;
  className?: string | undefined;
}

/**
 * 一排徽章槽位：固定数量的位置，已获得的点亮、未获得的留灰。DS 只认识
 * "槽位有没有点亮"，不认识槽位代表什么（等级、角色、成就都行）。
 */
export function ShellPanelSlots({
  label,
  leadIcon,
  lead = "row",
  slots,
  className,
}: Readonly<ShellPanelSlotsProps>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex items-center",
        ROW_HEIGHT,
        ROW_INSET,
        ROW_GAP,
        className,
      )}
    >
      <RowLead icon={leadIcon} width={lead} />
      {/* 槽位是一串同形同色的圆，间距太小会读成一条连续的色带，数不清有几个。 */}
      <span className="flex flex-1 items-center gap-md">
        {slots.map((slot) => (
          <span
            key={slot.key}
            title={slot.label}
            aria-label={slot.label}
            className={cn(
              // icon-lg（24px）而非 icon-xl（32px）：槽位要塞进统一的 32px 行高，
              // 32px 的圆会顶满整行、上下没有呼吸。
              "inline-grid size-icon-lg place-items-center rounded-full transition-colors duration-fast",
              slot.earned
                ? "bg-primary/10 text-primary dark:bg-primary/20"
                : "bg-muted text-muted-foreground opacity-muted",
            )}
          >
            <Icon name={slot.icon} size="sm" />
          </span>
        ))}
      </span>
    </div>
  );
}

/* ─────────────────────────── 范围触发器 ─────────────────────────── */

/* ─────────────────────────── 范围切换面板 ─────────────────────────── */

export interface ShellScopeOption {
  key: string;
  icon?: IconName | undefined;
  label: ReactNode;
  /** 副行小字（说明、用途…）。 */
  description?: ReactNode | undefined;
  disabled?: boolean | undefined;
}

export interface ShellScopeGroup {
  key: string;
  /** 组标识图标（组织、项目…）。 */
  icon?: IconName | undefined;
  title: ReactNode;
  /** 标题右侧的附加块，通常是一枚类型标记（`<Badge>`）。 */
  titleAside?: ReactNode | undefined;
  /** 标题下一行的小字，通常是编号或标识码。 */
  meta?: ReactNode | undefined;
  options: ReadonlyArray<ShellScopeOption>;
}

export interface ShellScopePanelProps {
  groups: ReadonlyArray<ShellScopeGroup>;
  /**
   * 当前所在项的 key。**跨组唯一**——人一次只在一个范围里，所以选中态由这一个
   * 值决定，而不是每个 option 自带一个 `active`。后者允许"两个组各自选中一项"
   * 这种画得出来但讲不通的状态。
   */
  value?: string | undefined;
  onSelect?: ((key: string) => void) | undefined;
  /** 整个菜单的无障碍名（"切换租户与工作区"）。 */
  ariaLabel: string;
  className?: string | undefined;
}

/**
 * 范围切换面板：`ShellScopeButton` 点开后的那一层。
 *
 * 两级——**组**与**项**。DS 不认识"租户"和"工作区"，只认识"若干组、每组若干项、
 * 全局选中其中一项"（与 `ShellScopeButton` 同一句话：范围是什么由调用方定）。
 *
 * 语义照本仓既有的两处单选面板（`ShellLauncher` / `LocaleSelectPanel`）：
 * `role="menu"` + `menuitemradio` + `aria-checked`，选中项尾部补一个对勾。
 * 没有改用 `listbox`——那套要求方向键在选项间移动，而这里每一项都是原生按钮、
 * 靠 Tab 走；只把角色名换成 listbox 而不实现方向键，读屏器会承诺一个不存在的
 * 操作方式。
 *
 * **非当前组整体降调**（组标题走 `tone="muted"`）：面板里同时列着好几个组，
 * 不降调的话「我在哪」要靠找那个对勾，而对勾在一屏之外。
 */
export function ShellScopePanel({
  groups,
  value,
  onSelect,
  ariaLabel,
  className,
}: Readonly<ShellScopePanelProps>) {
  return (
    <div
      role="menu"
      aria-label={ariaLabel}
      className={cn("flex flex-col gap-md", className)}
    >
      {groups.map((group, index) => {
        const current = group.options.some((o) => o.key === value);
        return (
          <React.Fragment key={group.key}>
            {index > 0 ? <Separator /> : null}
            {/*
             * 组用 role="group" 而不是靠视觉分隔表达：读屏器线性念下来时，
             * 分隔线与缩进都不存在，没有 group 就是一长串选项。
             */}
            <div role="group" className="flex flex-col gap-2xs">
              {/* 紧凑头部：组名与下方项的文字大致同列，项的图标比组图标缩进
                  一档——层级靠缩进读出来，而不是靠组名被标识列推到最右。 */}
              <ShellPanelHeader
                lead="icon"
                compact
                {...(group.icon ? { icon: group.icon } : {})}
                title={group.title}
                {...(group.titleAside ? { titleAside: group.titleAside } : {})}
                tone={current ? "default" : "muted"}
                metaRows={
                  group.meta
                    ? [{ key: `${group.key}-meta`, content: group.meta }]
                    : []
                }
              />
              {/* 项比组缩进一档（pl-md）：它们从属于上面那个组，项的图标落在
                  组图标右侧。

                  **项的文字与组名同列**（owner 2026-09-25）。默认密度下：
                    组名起点 = px-sm 10 + 组图标 24 + gap-md 16          = 50
                    项文字起点 = pl-md 16 + px-sm 10 + 项图标 16 + gap-xs 8 = 50
                  所以项图标取 sm（16px）、图标与文字间距取 gap-xs。等式成立的
                  条件是 24 = 16 + xs，只在默认密度精确；紧凑 / 宽松密度下
                  xs 为 4 / 10，差 4 / 2px。 */}
              <div className="flex flex-col gap-2xs pl-md">
                {group.options.map((option) => {
                  const selected = option.key === value;
                  return (
                    <Button
                      key={option.key}
                      variant="ghost"
                      role="menuitemradio"
                      aria-checked={selected}
                      disabled={option.disabled ?? false}
                      onClick={
                        onSelect ? () => onSelect(option.key) : undefined
                      }
                      className={cn(
                        /*
                         * 统一行高：有没有副行都占同一档（control-2xl，默认
                         * 密度 48px）。按内容撑高时，同一组里单行项与双行项
                         * 忽高忽低。min-h 而非 h：大字号 + 紧凑密度下双行放不
                         * 进时让它撑开，而不是截掉一行字。
                         */
                        "h-auto min-h-control-2xl w-full justify-start gap-xs px-sm py-2xs text-left",
                        /*
                         * 只有当前所在项突出显示，其余一律浅灰底（owner
                         * 2026-09-25）——不分是不是当前租户下的。
                         *
                         * 选中走 accent 而不是 secondary：与 ShellScopeButton
                         * 展开态同一个底色，点开前点开后是同一件事的两头。
                         * hover 也钉住，否则划过选中项时它会先变灰再变回来。
                         */
                        selected
                          ? "bg-accent text-primary-text hover:bg-accent"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {option.icon ? (
                        <Icon
                          name={option.icon}
                          size="sm"
                          className="shrink-0"
                        />
                      ) : null}
                      <span className="flex min-w-0 flex-1 flex-col items-start gap-0">
                        <span className="w-full truncate text-label-md">
                          {option.label}
                        </span>
                        {option.description ? (
                          <span
                            className={cn(
                              "w-full truncate text-body-sm",
                              selected
                                ? "opacity-subtle"
                                : "text-muted-foreground",
                            )}
                          >
                            {option.description}
                          </span>
                        ) : null}
                      </span>
                      {selected ? (
                        <Icon
                          name="check-circle"
                          size="md"
                          className="shrink-0"
                        />
                      ) : null}
                    </Button>
                  );
                })}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export interface ShellScopeButtonProps {
  icon?: IconName | undefined;
  label: ReactNode;
  /** 无障碍名/tooltip；label 是节点时必须给。 */
  ariaLabel: string;
  active?: boolean | undefined;
  /** 是否画下拉角标。只作展示、不可点的场合传 false。 */
  caret?: boolean | undefined;
  onClick?: (() => void) | undefined;
  className?: string | undefined;
}

/**
 * header 上的"当前范围"触发器：图标 + 名称 + 下拉角标。哪个产品的"范围"是
 * 什么由调用方决定（租户、业务域、项目、环境……），组件只管这个形状。
 *
 * forwardRef + props 透传是给 Radix `PopoverTrigger asChild` 用的，跟
 * `ShellIconButton` 同一个理由：不透传则弹层永远打不开。
 */
export const ShellScopeButton = React.forwardRef<
  HTMLButtonElement,
  Readonly<ShellScopeButtonProps>
>(function ShellScopeButton(
  { icon, label, ariaLabel, active = false, caret = true, onClick, ...rest },
  ref,
) {
  const { className, ...passthrough } = rest as ShellScopeButtonProps & {
    className?: string;
  };
  return (
    <Button
      ref={ref}
      variant="ghost"
      size="md"
      title={ariaLabel}
      aria-label={ariaLabel}
      aria-expanded={active}
      onClick={onClick}
      className={cn(
        // media-3xl = 192px。名称过长时截断，但要留得下一个可读的名字——
        // media 刻度前几档是**图标级**尺寸（xs=32px），拿来当宽度上限会把
        // 整个按钮压成只剩图标。
        "max-w-media-3xl justify-start gap-2xs text-muted-foreground hover:text-foreground",
        /* 悬停 / 展开时撑到**与弹出面板同宽**（owner 2026-09-10）。
           常态维持 192px 上限——header 上还有搜索、通知、头像，
           让它长期占 320px 是拿别人的空间换一个多数时候用不上的完整名字。
           想看全名的那一刻恰恰就是要展开面板的那一刻，所以两件事绑在一起。

           `w-80` 与 ShellPanelContent 那处**刻意重复**、不抽常量：类名由消费方的
           Tailwind 扫描源码生成，模板拼接出来的串扫描器看不见，规则不会被 emit，
           症状是"设了宽度没生效"。

           过渡加在 max-width 上：宽度突变会把右边那几个图标一格一格弹开。 */
        "transition-[max-width] duration-150 hover:w-80 hover:max-w-none",
        active && "w-80 max-w-none bg-accent text-foreground",
        className,
      )}
      {...passthrough}
    >
      {icon ? <Icon name={icon} size="sm" className="shrink-0" /> : null}
      {/* `flex-1`：撑满图标与角标之间的余量，**把角标顶到右端**。
          只写 `min-w-0 truncate` 时,名称只占自身宽度,而按钮在 hover/展开态被
          撑到 320px——三个元素全挤在左端(justify-start),右边空出百来像素,
          下拉角标落在控件中部(owner 2026-09-20 实看)。
          常态 192px 上限下行为不变:那时余量为 0,truncate 照旧生效。 */}
      <span className="min-w-0 flex-1 truncate text-left text-label-md">
        {label}
      </span>
      {caret ? (
        <Icon name="chevron-down" size="xs" className="shrink-0" />
      ) : null}
    </Button>
  );
});

ShellScopeButton.displayName = "ShellScopeButton";
