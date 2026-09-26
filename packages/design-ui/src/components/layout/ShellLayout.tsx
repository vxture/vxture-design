/**
 * ShellLayout.tsx - 应用外壳的视口级布局（header 容器 / 侧栏外壳 / 顶层组合）。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Layout
 *
 * 零 context、零额外依赖，纯结构组件——按 01-usage.md §4 的分工判据，这类
 * 组件属于 design-ui，不进 design-system 伞包（伞包自持只留需要 React context
 * 或额外依赖的例外，`@vxture/design-system` 的 `ShellChrome` 因为需要额外依赖
 * 才留在那边，本文件没有这个依赖）。
 *
 * 与 `@vxture/design-system` 的 `ShellChrome.tsx` 部件族互补：那边是"外壳里
 * 装什么"（品牌/主题/用户菜单/…），这里是"外壳怎么摆"（尺寸、层级、显隐状态
 * 机）。两者都不带业务语义——导航内容、dock 插槽里放什么（AI 助手、帮助面板、
 * 任何东西）全部由产品侧决定，本文件不认识、也不应该认识"助手"这个概念，只
 * 提供布局结构。
 *
 * 三个组件对应三层职责，产品侧可以整体用 ShellViewport，也可以只挑 ShellHeader
 * 或 ShellSidebarFrame 单独组装：
 * - ShellHeader：顶栏容器，只管三个插槽（leading/center/trailing）与高度/材质
 *   （`shadow-sticky` 阴影分区 + `bg-card` 实底——跟页面主体的 `bg-background`
 *   是两层：header/弹层/卡片同用 `--card`（light 下纯白），页面主体底色略深
 *   一档，靠色差 + 阴影做分层，不用发丝线边框，也不叠透明度）。
 * - ShellSidebarFrame：侧栏外壳，只管宽度状态机（expanded/collapsed/hidden），
 *   不渲染任何导航数据——hidden 态直接不渲染 children（条件卸载，不是宽度归零），
 *   对应"隐藏态=专注模式，不加载不消耗资源"的产品决策。
 * - ShellViewport：顶层视口组合，focusMode=true 时 header 与 sidebar 整体不渲染，
 *   只剩 dock 插槽接管全视口——触发它的可以是任何东西（某个面板请求全屏、
 *   某种沉浸式视图），产品侧决定何时置位，本组件只负责按位切换区域。
 */

import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

export type ShellHeaderHeight = "sm" | "md" | "lg" | "xl";

/**
 * 横向布局：`full`（缺省）铺满视口宽，工作台用；`centered` 内容居中封顶
 * （`max-w-page-2xl`，左右 `px-xl`），官网用——官网的标识与工具要和正文同列，
 * 超宽屏上贴着两边会离内容太远（owner 2026-09-25，Figma Header_website 2226:10298）。
 */
export type ShellHeaderLayout = "full" | "centered";

/**
 * 材质：`card`（缺省）白底 + sticky 阴影；`background` 与页面同底的浅灰 +
 * 阴影（Figma 工作台 Header_console 682:2224 的画法）；`transparent` 无底无影，
 * 贴在页面上（官网）。
 */
export type ShellHeaderSurface = "card" | "background" | "transparent";

export interface ShellHeaderProps {
  leading?: ReactNode;
  center?: ReactNode;
  trailing?: ReactNode;
  /**
   * 中槽内容的横向对齐。默认 `center`（居中，如全局搜索作为视觉焦点）；
   * `end` 让它靠向右侧工具区（把 header 读成"标识在左、工具在右"两极，
   * 中槽内容归到右极）。
   */
  centerAlign?: "center" | "end" | undefined;
  /**
   * 高度档。缺省 `md`（48px）：三种工作台（租户 / 平台管理 / 单产品）都用它；
   * 官网用 `xl`（64px）——官网顶栏是页面门面，工作台顶栏要把纵向空间让给内容
   * （Figma Header_console / Header_product 48px、Header_website 64px，
   * owner 2026-09-26）。
   */
  height?: ShellHeaderHeight;
  /** 见 `ShellHeaderLayout`。缺省 `full`，与加这个参数之前一致。 */
  layout?: ShellHeaderLayout | undefined;
  /** 见 `ShellHeaderSurface`。缺省 `card`，与加这个参数之前一致。 */
  surface?: ShellHeaderSurface | undefined;
  className?: string | undefined;
}

const HEADER_SURFACE_CLASS: Record<ShellHeaderSurface, string> = {
  card: "bg-card shadow-sticky",
  background: "bg-background shadow-sticky",
  transparent: "bg-transparent",
};

const HEADER_HEIGHT_CLASS: Record<ShellHeaderHeight, string> = {
  sm: "h-header-sm",
  md: "h-header-md",
  lg: "h-header-lg",
  xl: "h-header-xl",
};

export function ShellHeader({
  leading,
  center,
  trailing,
  centerAlign = "center",
  height = "md",
  layout = "full",
  surface = "card",
  className,
}: ShellHeaderProps) {
  /* 槽内、槽间统一 `gap-xs`（标准密度 8px）：Figma 四种 Header 的左 / 中 / 右三组
     与组内零件都是 8px 一格（owner 2026-09-26 重排）。此前左槽 10px、右槽 4px、
     槽间 16px 是各自沿用的旧值，拼在一起节奏不齐。 */
  const slots = (
    <>
      <div className="flex min-w-0 items-center gap-xs">{leading}</div>
      {center ? (
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center gap-xs",
            centerAlign === "end" ? "justify-end" : "justify-center",
          )}
        >
          {center}
        </div>
      ) : null}
      <div className="flex shrink-0 items-center gap-xs">{trailing}</div>
    </>
  );
  const row = "flex items-center justify-between gap-xs";
  return (
    <header
      data-layout={layout}
      data-surface={surface}
      className={cn(
        "shrink-0",
        HEADER_SURFACE_CLASS[surface],
        HEADER_HEIGHT_CLASS[height],
        layout === "full" && [row, "px-lg"],
        className,
      )}
    >
      {layout === "centered" ? (
        <div className={cn(row, "mx-auto h-full w-full max-w-page-2xl px-xl")}>
          {slots}
        </div>
      ) : (
        slots
      )}
    </header>
  );
}

export type ShellContentWidth =
  "narrow-lg" | "base-xl" | "wide-2xl" | "ultra-3xl";

const CONTENT_WIDTH_CLASS: Record<ShellContentWidth, string> = {
  "narrow-lg": "max-w-content-narrow-lg",
  "base-xl": "max-w-content-base-xl",
  "wide-2xl": "max-w-content-wide-2xl",
  "ultra-3xl": "max-w-content-ultra-3xl",
};

export interface ShellPageContainerProps {
  children: ReactNode;
  /** 内容最大行宽档。默认 `wide-2xl`（数据密集型面板）。 */
  width?: ShellContentWidth | undefined;
  className?: string | undefined;
}

/**
 * 内容区容器：居中、封顶行宽、四周流体留白。
 *
 * 留白走 `--space-page-inset`（clamp，随视口连续变化，且上下界随密度轴走），
 * 不是固定档——页面四周是全屏最大的一块留白，用断点切档会在拖窗口时阵变
 * 一两次，正好最显眼。底部单独放大到 `pb-6xl`：内容滚到底时最后一行不该贴
 * 着视口下沿，需要一段安全区。
 *
 * 单独成件而不是让每个门户各写一串类：这几样合起来就是"页面内容区长什么样"
 * 的定义，散在各门户的外壳文件里必然漂移——迁移前 console 是遗留 CSS 的
 * `.content-inner`（1480px + 自己的一组 clamp），opera 是组件里手写的
 * `max-w-content-wide-2xl p-xl`（1536px + 固定 32px），两个门户的内容区宽度
 * 与呼吸感对不上，就是这么来的。
 */
export function ShellPageContainer({
  children,
  width = "wide-2xl",
  className,
}: ShellPageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col",
        CONTENT_WIDTH_CLASS[width],
        "px-page-inset pt-page-inset pb-6xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export type ShellSidebarMode = "expanded" | "collapsed" | "hidden";

export interface ShellSidebarFrameProps {
  mode: ShellSidebarMode;
  children: ReactNode;
  className?: string | undefined;
}

/**
 * 侧栏外壳：只管宽度状态机与显隐，不知道自己装的是什么导航。hidden 态不渲染
 * children——不是 CSS 宽度归零，是真正的条件卸载，满足"不加载不消耗资源"。
 */
export function ShellSidebarFrame({
  mode,
  children,
  className,
}: ShellSidebarFrameProps) {
  if (mode === "hidden") return null;

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col",
        "transition-[width] duration-slow ease-standard motion-reduce:transition-none will-change-[width]",
        mode === "collapsed"
          ? "w-sidebar-collapsed max-sm:w-sidebar-rail"
          : "w-sidebar-expanded",
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface ShellViewportProps {
  header: ReactNode;
  sidebar: ReactNode;
  sidebarMode: ShellSidebarMode;
  /**
   * true 时 header 与 sidebar 整体不渲染，`dock` 接管全视口，`children` 也不
   * 渲染。产品侧决定什么状态触发这个值——本组件不关心原因，只按位切换。
   */
  focusMode?: boolean | undefined;
  /**
   * 与 content 同一行渲染的停靠插槽，内容完全由产品侧决定（可以是任何面板，
   * 不是特指某种功能）；`focusMode=true` 时它是视口里唯一渲染的东西。
   */
  dock?: ReactNode;
  children: ReactNode;
  className?: string | undefined;
}

export function ShellViewport({
  header,
  sidebar,
  sidebarMode,
  focusMode = false,
  dock,
  children,
  className,
}: ShellViewportProps) {
  if (focusMode) {
    // 全屏接管：dock 是视口里唯一渲染的东西，header/sidebar/content 都不挂载。
    return (
      <div
        className={cn(
          "flex h-dvh flex-col bg-background text-foreground",
          className,
        )}
      >
        {dock}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-dvh flex-col bg-background text-foreground",
        className,
      )}
    >
      {header}

      <div className="flex min-h-0 flex-1">
        <ShellSidebarFrame mode={sidebarMode}>{sidebar}</ShellSidebarFrame>

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </main>

        {dock}
      </div>
    </div>
  );
}
