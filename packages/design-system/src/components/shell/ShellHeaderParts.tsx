/**
 * ShellHeaderParts.tsx - 页面顶栏（ShellHeader）左侧的标识类零件。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - Shell
 *
 * 对应 Figma 的 Header 四种页面（owner 2026-09-25）：官网 Header_website
 * （2226:10298）、租户工作台 Header_console（682:2224）、平台管理工作台
 * Header_admin（682:2225）、单产品 Header_product（682:2226）。四种 header
 * **不做成四个写死的组件**——都是 `ShellHeader` 三个槽位里拼零件，区别只在放
 * 哪些零件（见 03-patterns-guide 的「页面 Header 四种视角」与 preview 示例）。
 *
 * 本文件只收 header 左侧**此前没有对应件**的四样：
 * - `ShellHeaderMark`：平台标识，32px 版位里放 24px 图形
 * - `ShellHeaderTitle`：品牌字体 24px 的标题（vxture.ai / Workspace Console），
 *   可带一枚徽标（管理员视角）
 * - `ShellHeaderDivider`：20px 高的竖线，分隔「平台」与「范围 / 产品 / 域」
 * - `ShellHeaderDomain`：当前域名（弱化色 label-lg）
 * - `ShellProductTitle`：单产品视角的产品标题组（标识 + 名称 + 类型 + 等级）
 *
 * 其余零件沿用既有：九宫格 `ShellLauncher`、范围 `ShellScopeButton`、侧栏开关
 * `ShellIconButton icon="sidebar"`、右侧 `ShellSearchBox` / `ShellAgentButton` /
 * `ShellToolbox` / `ShellUserMenu`。
 *
 * 与业务无关：名称、徽标文案、链接全部由调用方给。
 */

import type { ReactNode } from "react";
import { cn } from "@vxture/design-ui";

export interface ShellHeaderMarkProps {
  /** 标识图片地址（平台品牌母本由产品侧引入）。 */
  src: string;
  /** 替代文本。纯装饰时留空（旁边通常就是品牌名）。 */
  alt?: string | undefined;
  /** 给了就是回首页的链接。 */
  href?: string | undefined;
  className?: string | undefined;
}

/** 平台标识：32px 版位（与九宫格、侧栏开关同列高）里放 24px 图形。 */
export function ShellHeaderMark({
  src,
  alt = "",
  href,
  className,
}: ShellHeaderMarkProps) {
  const img = (
    <img
      src={src}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      width={24}
      height={24}
      draggable={false}
      className="size-icon-lg"
    />
  );
  const box = cn(
    "inline-flex size-icon-xl shrink-0 items-center justify-center",
    className,
  );
  return href ? (
    <a href={href} className={cn(box, "rounded-md")} data-slot="header-mark">
      {img}
    </a>
  ) : (
    <span className={box} data-slot="header-mark">
      {img}
    </span>
  );
}

export interface ShellHeaderTitleProps {
  children: ReactNode;
  /**
   * 标题后的一枚徽标。平台管理工作台用它标出**管理员视角**——同一套外壳下，
   * 管理台与租户工作台一眼要分得开（owner 2026-09-25）。
   */
  badge?: ReactNode;
  className?: string | undefined;
}

/** 品牌字体 24px 粗体标题：官网的站名、工作台的控制台名。 */
export function ShellHeaderTitle({
  children,
  badge,
  className,
}: ShellHeaderTitleProps) {
  return (
    <span
      data-slot="header-title"
      className={cn("flex min-w-0 items-center gap-xs", className)}
    >
      <span className="truncate whitespace-nowrap text-heading-3 font-bold text-foreground">
        {children}
      </span>
      {badge ? <span className="shrink-0">{badge}</span> : null}
    </span>
  );
}

/** 20px 高的竖线：分隔「平台」与其后的范围 / 产品 / 域。 */
export function ShellHeaderDivider({
  className,
}: {
  className?: string | undefined;
}) {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      data-slot="header-divider"
      className={cn("h-icon-md w-px shrink-0 bg-border", className)}
    />
  );
}

/**
 * 当前域名。弱化色（`content-tertiary`）：它说明「你在哪」，不是要点的东西。
 * 域身份由 header 负责，侧栏不再重复（见 ShellSidebarNav 的 domainName）。
 */
export function ShellHeaderDomain({
  children,
  className,
}: {
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <span
      data-slot="header-domain"
      className={cn(
        "min-w-0 truncate whitespace-nowrap px-2xs text-label-lg text-content-tertiary",
        className,
      )}
    >
      {children}
    </span>
  );
}

export interface ShellProductTitleProps {
  /** 产品标识图片（24px）。可省略。 */
  logoSrc?: string | undefined;
  logoAlt?: string | undefined;
  /** 产品名（品牌字体）。 */
  name: ReactNode;
  /** 产品类型（正文字体、弱化色），如「数据平台」。 */
  type?: ReactNode;
  /** 等级徽标，如 `<StatusBadge tone="brand">Pro</StatusBadge>`。 */
  tier?: ReactNode;
  className?: string | undefined;
}

/**
 * 单产品视角的产品标题组：标识 + 名称 + 类型 + 等级。名称与类型同为 20px，
 * 靠字体（品牌体 / 正文体）与颜色（前景 / 弱化）分主次。
 */
export function ShellProductTitle({
  logoSrc,
  logoAlt = "",
  name,
  type,
  tier,
  className,
}: ShellProductTitleProps) {
  return (
    <span
      data-slot="header-product"
      className={cn("flex min-w-0 items-center gap-xs", className)}
    >
      {logoSrc ? (
        <img
          src={logoSrc}
          alt={logoAlt}
          aria-hidden={logoAlt ? undefined : true}
          width={24}
          height={24}
          draggable={false}
          className="size-icon-lg shrink-0"
        />
      ) : null}
      <span className="truncate whitespace-nowrap font-brand text-title-xl font-semibold text-foreground">
        {name}
      </span>
      {type ? (
        <span className="truncate whitespace-nowrap text-title-xl font-semibold text-muted-foreground">
          {type}
        </span>
      ) : null}
      {tier ? <span className="shrink-0">{tier}</span> : null}
    </span>
  );
}
