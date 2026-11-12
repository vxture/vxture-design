/**
 * ShellSidebarNav.tsx - 侧栏导航内容（token 化的通用导航壳）。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - Shell
 *
 * 与业务无关：不读任何业务配置，导航结构（sections）、域名称都由调用方（产品层）
 * 以 props 传入；本文件只拥有 ShellNavItem / ShellNavSection 的形状契约，不认识
 * 任何具体菜单数据——菜单内容永远由产品侧组装。状态持久化的 localStorage key
 * 前缀（storageKeyPrefix）也是必填 prop，不在组件里内置任何产品名——这是跨产品
 * 复用的前提，多个消费方各自传自己的命名空间，不会读写同一个 key 串状态。
 *
 * 与 `ShellSidebarFrame`（design-ui）配对：**Frame 拥有宽度/显隐状态机**
 * （expanded/collapsed/hidden、过渡动画），**Nav 是装进 Frame 里的内容**。本文件
 * 不管外壳，只管内容；hidden 态下 ShellSidebarFrame 直接不渲染 children，本组件
 * 根本不会挂载。
 *
 * 放在 design-system（不是 design-ui）：要复用同目录 `ShellChrome.tsx` 里的
 * `ShellIconButton`，依赖方向是单向 design-system → design-ui，design-ui 不能
 * 反过来引 design-system 的导出（仓库守卫组硬门）——跟 `ShellLauncher`
 * 落在这个包的理由一致。
 *
 * 路由无关：导航项的链接元素由 `linkComponent` 注入，默认原生 `<a>`。本包不依赖
 * `next`（package.json 里没有），因此不能 import `next/link`；产品侧有路由库时把
 * 自己的 Link 传进来即可。
 *
 * Geometry contract:
 * - ShellSidebarFrame owns width; sidebar.css owns its responsive icon anchor.
 * - Nav outer/section insets follow density. Main rails derive their width from
 *   the responsive collapsed width minus both inset pairs (sidebar.css).
 * - Main icons and the collapse control share that anchor in
 *   both states; collapsed group arrows also use the same column.
 * - At default density: frame 64px, insets 12px per side, main rail 40px,
 *   group row 32px and menu row 40px. The small-screen 48px frame is measured
 *   with the same responsive variant as the frame.
 * - Never center the entire row during width transitions. Only its rail centers
 *   the icon. External-action padding is reserved only when expanded.
 *
 * 复合标题按 " · " 拆出**品牌段**单独染
 * text-primary-text（品牌主色）+ font-mono（等宽——品牌名长短不一，比例字体
 * 下几个分组标题的对齐基线参差不齐，等宽消除这个视觉噪音），不含分隔符的
 * 标题原样渲染——见 splitBrandTitle，认分隔符不认具体品牌名，不把业务名称
 * 写死进组件。品牌段在前还是在后由 section 的 `brandPosition` 显式声明（缺省
 * `"prefix"`）：`<品牌> · <子域>` 读作"这块属于该品牌"，`<子域> · <品牌>` 读作
 * "这块管理该品牌"——opera 用后者。**不做启发式猜测**：靠"哪段更短/是否全 ASCII"
 * 之类判断，会在 `安全审计 · RBAC` 这种两段都非品牌的标题上误判，而误判的表现是
 * 一段文字莫名变色，没人会想到去查一个字符串拆分函数。
 *
 * 导航项可带 `subLabel`，渲染成主名下方的小字第二行（中文主名 + 英文原词）。
 * 不传就是单行，行高与只有单行时完全一致。
 *
 * 颜色：图标维持 muted-foreground 不变；标签文字单独提一级到
 * foreground（NavLabel 上单独盖一层 text-foreground，不影响图标的颜色，
 * 因为图标走的是容器上的 text-muted-foreground 被 currentColor 继承，
 * 标签是显式覆盖）——item 的 active 态例外，走 primary-text，不叠加。
 *
 * title 区域的全局分组收合按钮：常态 opacity-0，hover 或键盘 focus 命中
 * title 整行（group/group-hover）才显示并可点击，避免常驻占视觉噪音。
 *
 * 图标导轨的宽度由 sidebar.css 根据侧栏轨宽和密度内边距计算，不能借用控件
 * 高度作为宽度。默认桌面图标轴线为 32px，窄屏为 24px；展开时保持同一轴线。
 * 菜单行高 40px，分组行高 32px。收合按钮使用 20px 图标，其余图标为 16px。
 * 展开态的分组按钮与全局收合按钮居右；收起态的分组按钮回到主图标轴线。
 *
 * 收起态：没有任何文字占位符——标签直接不渲染（条件渲染，不是 opacity
 * 隐藏），图标导轨盒保持响应式锚点不受影响，图标横坐标因此在两态间不跳动；
 * 分组标题行本身（连同它的 chevron）仍然渲染，保证收起/展开切换时所有
 * 导航项的纵向位置不因为"标题行消失"而跳动。
 *
 * 不设背景、不设边线：与内容区同底色，仅靠留白分界。滚动发生在 content
 * 块内部（title/footer 常驻不滚动）；滚动条视觉隐藏但滚动行为保留。
 */

import { useEffect, useState, type ReactNode } from "react";
import * as React from "react";
import {
  Button,
  Icon,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  cn,
} from "@vxture/design-ui";
import type { IconName } from "@vxture/design-ui";
import { interactive } from "@vxture/design-ui/styles";
import { ShellIconButton } from "./ShellChrome";

export interface ShellNavItem {
  href: string;
  label: string;
  icon: IconName;
  /**
   * 副名，渲染成 `label` 下方的小字第二行。**可选，不传就是单行**——五个门户共用
   * 本件，不传新字段时行为与加这个字段之前完全一致。
   *
   * 用途是让一个导航项同时给出两套词汇：中文主名给人读，英文原词给人对上游。
   * opera 的判断（`portals/opera/docs/opera-navigation-design.md` 规则一）是——
   * 运营者在审计事件里看到的是 `mgmt.grant.create`，界面得让他从中文标签直接找到
   * 那个词，否则"与 API 分叉的词表在控制台这头买到的清晰，会在两者相接的每一个点
   * 上还回去"。
   *
   * 收起态两行都不渲染（只剩图标），tooltip 里也只给主名——副名是给"扫一眼对上
   * 概念"用的，不是标识，挤进 tooltip 只会让那一行变长。
   */
  subLabel?: string;
  /**
   * 行尾外链。给了才渲染一个小外链图标，**独立于主链接**：点图标去这个地址
   * （新标签页），点行本身仍走 `href`。可选，不传即原行为。
   *
   * 用途是把「读物」引到它该在的渠道而不占掉导航位：console 的
   * 「模型服务 / 技能工具」在工作台只答「你有什么」，能力说明与用法在文档站
   * （owner 2026-09-08）。图标而不是整行跳转，是因为两个目的地都要保留——
   * 整行跳走的话，「你有什么」就没地方看了。
   *
   * 收起态不渲染（只剩图标，没有位置放第二个可点区）。
   */
  /**
   * 行尾的**纯指示图标**——只渲染，不可点。
   *
   * 用途是标出这一项的**去向语义**：整行本身就是那个跳转（`href` 指向站外），
   * 需要一个记号让人在点之前知道会离开当前站点。与 `PanelItem.trailingIcon`
   * 同名同义，不发明新概念。
   *
   * ── 与 `external` 的区别，别混用 ──
   * `external` 是**第二个目的地**：点行去 A，点图标去 B，两个都能点。
   * `trailingIcon` 只有一个目的地，图标是它的标记。
   * 两个都传时以 `external` 为准——它是可交互的那个，把可点的东西挤掉更糟。
   *
   * 收起态不渲染：只剩主图标，没有位置放第二个。
   */
  trailingIcon?: IconName;
  external?: {
    href: string;
    /** 图标的可访问名，如「查看模型文档」。必给——纯图标按钮没有可读名等于对读屏隐身。 */
    label: string;
  };
}

/**
 * 复合标题里品牌段的位置，决定 `" · "` 哪一侧染品牌色。
 *
 * `"prefix"` 是历史默认（`<品牌> · <子域>` = 这块属于该品牌）；`"suffix"` 用于
 * opera 的 `<子域> · <品牌>`（= 这块管理该品牌）；`"none"` 显式关掉高亮。
 */
export type BrandPosition = "prefix" | "suffix" | "none";

export interface ShellNavSection {
  title: string;
  items: ShellNavItem[];
  /** 缺省 `"prefix"`——不传时行为与加这个字段之前完全一致。 */
  brandPosition?: BrandPosition;
  /**
   * 在本组**之前**画一条分隔线，用来把分组再聚成层。
   *
   * 分隔线要表达的是**层级**而不是装饰：opera 用它切出「概览 / 四个管理域 / 两个
   * 通用面」三层，没有这条线时七个分组读起来是七个并列项，那张真实的分层图就丢了。
   * 因此它挂在 section 上而不是由调用方在 sections 数组里插入哨兵元素——哨兵会污染
   * `sections.map` 的每一处消费（分组展开状态用 `title` 做 key）。
   *
   * 缺省 `false`；首组即使传 `true` 也不画（顶上没有要分隔的东西）。
   */
  dividerBefore?: boolean;
}

export interface ShellSidebarNavProps {
  /**
   * 侧栏顶部的域名称（title 行的文字）。**可选**——不传就不渲染那行文字，
   * 只剩两个按钮。
   *
   * 三个运营门户（admin / opera / arche）此前各传各的「运营平台」「Opera」
   * 「Arche」：三处措辞不一致，且与 header 第 4 槽的当前域名重复显示
   * （owner 2026-09-18）。域身份由 header 负责，侧栏不必再说一遍。
   *
   * 保留这个 prop 而不是删掉：它对**只有侧栏、没有 header** 的消费方仍然
   * 有意义（design-preview 的独立演示就是这种）。
   */
  readonly domainName?: string;
  sections: ShellNavSection[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  isActive: (href: string) => boolean;
  /** 状态持久化 key 前缀——调用方各自传自己的命名空间，组件不假设产品名。 */
  storageKeyPrefix: string;
  /** 渲染导航项的链接元素。默认原生 <a>（整页导航）；产品侧有路由库时传入
   *  自己的 Link（opera 传 next/link，console 传 next-intl 的 locale 感知
   *  Link），组件因此不依赖任何路由实现。 */
  readonly linkComponent?: React.ElementType;
  /**
   * 底部固定块（h-header-xl=64）的内容。**不传就整块不渲染**——底部安全区
   * 已由 content 自己的 `pb-sidebar-safe` 提供，不再需要一个空块去占位。
   */
  readonly footer?: React.ReactNode;
  /**
   * 两个控件的无障碍名。默认值是英文——本件从产品里提炼出来时把默认值一并
   * 去了业务语言，保留默认可以让不做 i18n 的消费方零配置接入；做 i18n 的
   * 消费方（console 是双语）必须传入，否则中文档下这两个按钮会显英文。
   *
   * 只覆盖其中一两个也可以，`Partial` 与默认值逐项合并。
   */
  readonly labels?: Partial<ShellSidebarNavLabels>;
}

export interface ShellSidebarNavLabels {
  expandNav: string;
  collapseNav: string;
  expandAllGroups: string;
  collapseAllGroups: string;
}

const DEFAULT_LABELS: ShellSidebarNavLabels = {
  expandNav: "Expand navigation",
  collapseNav: "Collapse navigation",
  expandAllGroups: "Expand all groups",
  collapseAllGroups: "Collapse all groups",
};

function readClosedGroups(storageKey: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeClosedGroups(storageKey: string, closed: Set<string>) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify([...closed]));
  } catch {
    /* ignore */
  }
}

/** Main rails inherit frame geometry; small rails are reserved for trailing controls. */
function NavRail({
  size = "main",
  className,
  children,
}: {
  size?: "main" | "small";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      data-slot="shell-sidebar-rail"
      data-rail={size}
      className={cn(
        "flex shrink-0 items-center justify-center",
        size === "main" ? "h-sidebar-menu" : "h-sidebar-group",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** 标签：只在展开态渲染（调用方条件渲染），本身不含 collapsed 逻辑。 */
function NavLabel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "min-w-0 flex-1 overflow-hidden whitespace-nowrap text-left",
        className,
      )}
    >
      {children}
    </span>
  );
}

function NavItemRow({
  item,
  collapsed,
  active,
  linkComponent: LinkComponent,
}: {
  item: ShellNavItem;
  collapsed: boolean;
  active: boolean;
  linkComponent: React.ElementType;
}) {
  const link = (
    <LinkComponent
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        interactive,
        /* 两行项比单行高，所以行高由内容撑（min-h 而非固定 h）。不传 subLabel
           时内容仍是一行，min-h 与原来的 h-control-xl 等值——单行项的高度、
           图标位置、间距全部不变，这是"纯增量"的具体含义。 */
        "flex min-h-sidebar-menu items-center gap-sidebar rounded-md",
        /* 有外链图标时右侧留位，否则长标签会钻到图标底下。 */
        item.external && !collapsed ? "pr-2xl" : undefined,
        "text-label-md transition-colors duration-fast ease-standard",
        active
          ? "bg-surface-selected text-primary-text"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <NavRail>
        <Icon name={item.icon} size="sm" />
      </NavRail>
      {!collapsed && (
        <NavLabel className={cn(!active && "text-foreground")}>
          {item.subLabel ? (
            <span className="flex flex-col justify-center py-2xs">
              <span className="truncate leading-tight">{item.label}</span>
              {/* 副名恒 muted，选中态也不跟着变主色——它是注解不是标题，两行
                  一起高亮会让主名失去重音。 */}
              <span className="truncate font-mono text-label-sm leading-tight text-muted-foreground">
                {item.subLabel}
              </span>
            </span>
          ) : (
            item.label
          )}
        </NavLabel>
      )}
      {/* 纯指示图标：**放在主链接内部**是对的——它不可点，不构成「链接里的链接」。
          （行尾外链 `external` 那个不同：它是第二个可点区，必须在外面。）
          `external` 在场时不渲染本图标：那时右侧位置归可交互的那个。
          `ml-auto` 把它推到右端；收起态整块不渲染。 */}
      {!collapsed && item.trailingIcon && !item.external ? (
        <Icon
          name={item.trailingIcon}
          size="xs"
          className="ml-auto shrink-0 text-muted-foreground"
          aria-hidden
        />
      ) : null}
    </LinkComponent>
  );

  /* 行尾外链（可选）。**必须在主链接之外**——嵌进 <LinkComponent> 里就成了
     「链接里的链接」：HTML 不允许，浏览器会把它拆开，点击落到外层，图标等于失效。
     所以外面套一层 relative 容器，图标绝对定位压在右侧。
     主链接右侧留出 pr 让文字不钻到图标底下。 */
  const withExternal =
    !collapsed && item.external ? (
      <div className="relative">
        {link}
        <a
          href={item.external.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.external.label}
          title={item.external.label}
          className={cn(
            "absolute right-2xs top-1/2 -translate-y-1/2",
            "inline-flex size-icon-lg items-center justify-center rounded-sm",
            "text-muted-foreground transition-colors duration-fast ease-standard",
            "hover:bg-accent hover:text-foreground",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
          )}
        >
          <Icon name="external-link" size="xs" />
        </a>
      </div>
    ) : null;

  /* 收起态**只回主链接**（下面那条 return）——只剩图标，没有位置放第二个可点区。
     所以 withExternal 里那个 `!collapsed &&` 现在是双保险：把它去掉也不改变
     收起态行为，因为收起态压根走不到这里（2026-09-08 变异测试实测）。
     两道都留着：哪天有人把下面那条 return 也改成用 withExternal，
     少了这个条件就会在 rail 宽度里挤出一个够不着的图标。 */
  if (!collapsed) return withExternal ?? link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * 复合标题里的**品牌段**高亮：按 " · " 分隔，不认具体品牌名。
 *
 * 两种写法，语义相反，都要支持：
 *
 * - `"<品牌> · <子域>"` —— 品牌在前，读作**这块属于该品牌**。
 * - `"<子域> · <品牌>"` —— 品牌在后，读作**这块管理该品牌**。
 *
 * opera 用的是后者（`模型管理 · Atlas`）：Atlas 与 Runos 是独立产品，opera 是它们的
 * 管理平面，前缀写法会把从属关系读反（`opera-top-level-design.md` §11：
 * 「Opera 不属于 Atlas。Opera 管理 Atlas。」）。
 *
 * 靠什么分辨谁是品牌？**不猜**——由调用方在 section 上显式声明 `brandPosition`。
 * 曾考虑按"哪一段更短 / 是否全 ASCII"之类启发式判断，那会在
 * `安全审计 · RBAC` 这种两段都非品牌的标题上误判，而误判的表现是一段文字莫名
 * 变色，没人会想到去查一个字符串拆分函数。
 */
function splitBrandTitle(
  title: string,
  position: BrandPosition,
): { brand: string; rest: string; brandFirst: boolean } | null {
  const sep = " · ";
  if (position === "none") return null;
  const idx =
    position === "prefix" ? title.indexOf(sep) : title.lastIndexOf(sep);
  if (idx === -1) return null;
  return position === "prefix"
    ? { brand: title.slice(0, idx), rest: title.slice(idx), brandFirst: true }
    : {
        brand: title.slice(idx + sep.length),
        rest: title.slice(0, idx + sep.length),
        brandFirst: false,
      };
}

/**
 * 分组标题行：恒占一行（h-control-md=32），标题在左、开合图标在行尾
 * （右侧）；不受 collapsed 影响行数——行和它的 chevron 收起态也照常渲染，
 * 只是标题文字不渲染，图标落回与导航项同一左侧列。
 *
 * 用 DS 的 `Button variant="ghost" size="sm"`（原生 <button> 违反
 * ds/no-native-primitive）。size="sm" 已经是 h-control-md(32)，圆角
 * radiusClamp 在默认基数下等值于 rounded-md；其余三处配方默认值必须显式
 * 抵消，否则会改变既有视觉：
 * - `px-0` 抵消 size="sm" 的 px-sm——本行零内边距，缩进由 NavLabel 的
 *   pl-sidebar-outer 与共享的 chevron 导轨负责。
 * - `justify-start` 抵消 Button 基类的 justify-center——见头部"图标行容器
 *   一律不用 justify-center"那段，收起态会在宽度过渡中途跳一下。
 * - `border-none` 抵消基类的 1px 透明描边，内容盒回到整 32×32，chevron
 *   导轨不被挤掉 1px。
 * - `aria-expanded:*` 抵消 ghost 变体里的 expandable 配方：那是给"展开时
 *   保持高亮"的菜单触发器用的，本行的 aria-expanded 表达的是分组开合，
 *   展开的分组不该常驻一层底色。
 */
function NavGroupHeader({
  title,
  brandPosition,
  open,
  collapsed,
  onToggle,
}: {
  title: string;
  brandPosition: BrandPosition;
  open: boolean;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const brandTitle = splitBrandTitle(title, brandPosition);
  const trigger = (
    <Button
      variant="ghost"
      size="md"
      onClick={onToggle}
      aria-expanded={open}
      className={cn(
        // 焦点环与 outline-none 不在此重复：Button 基类已含配方 `interactive`。
        "flex h-sidebar-group w-full items-center justify-start gap-sidebar px-0 border-none",
        "text-overline transition-colors duration-fast ease-standard",
        "text-muted-foreground hover:bg-accent hover:text-foreground",
        "aria-expanded:bg-transparent aria-expanded:text-muted-foreground",
      )}
    >
      {!collapsed && (
        <NavLabel className="pl-sidebar-outer text-muted-foreground">
          {brandTitle ? (
            /* 品牌段恒用等宽 + 主色，位置由 brandFirst 决定谁先渲染——
               两种写法共用同一套样式，只是顺序不同。 */
            brandTitle.brandFirst ? (
              <>
                <span className="font-mono text-primary-text">
                  {brandTitle.brand}
                </span>
                {brandTitle.rest}
              </>
            ) : (
              <>
                {brandTitle.rest}
                <span className="font-mono text-primary-text">
                  {brandTitle.brand}
                </span>
              </>
            )
          ) : (
            title
          )}
        </NavLabel>
      )}
      {/* Group arrows share the main icon anchor at every density. */}
      <NavRail size={collapsed ? "main" : "small"} className="h-sidebar-group">
        <Icon name={open ? "chevron-down" : "chevron-right"} size="sm" />
      </NavRail>
    </Button>
  );

  if (!collapsed) return trigger;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent side="right">{title}</TooltipContent>
    </Tooltip>
  );
}

export function ShellSidebarNav({
  domainName,
  sections,
  collapsed,
  onToggleCollapsed,
  isActive,
  storageKeyPrefix,
  linkComponent = "a",
  footer,
  labels,
}: ShellSidebarNavProps) {
  const text = { ...DEFAULT_LABELS, ...labels };
  const groupsStorageKey = `${storageKeyPrefix}-groups-closed`;

  const [closedGroups, setClosedGroups] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    // 只在挂载后读一次：localStorage 在 SSR 不存在，首帧必须与服务端一致
    // （全部展开），水合完成后再补上持久化状态。故意不依赖 groupsStorageKey。
    setClosedGroups(readClosedGroups(groupsStorageKey));
  }, []);

  const toggleGroup = (title: string) =>
    setClosedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      writeClosedGroups(groupsStorageKey, next);
      return next;
    });

  const allClosed = sections.length > 0 && closedGroups.size >= sections.length;
  const toggleAllGroups = () =>
    setClosedGroups((prev) => {
      const next =
        prev.size >= sections.length
          ? new Set<string>()
          : new Set(sections.map((section) => section.title));
      writeClosedGroups(groupsStorageKey, next);
      return next;
    });

  return (
    /* Provider 由**用得着它的组件自己带**，不指望每个消费方记得在外壳上包一层。
     * 收起态下每个导航项与分组标题都要挂 Tooltip，而 Radix 的 Tooltip.Root
     * 没有 Provider 会直接抛错——于是这个组件在展开态一切正常、用户点一下
     * "收起导航"整页崩溃，是个只在特定交互下才现形的雷（2026-08-04 console
     * 实测踩到：console 全仓没有第二处 Tooltip 用法，外壳自然没包 Provider）。
     * Radix 的 Provider 可嵌套，已经在外层包过的消费方（opera）不受影响。 */
    <TooltipProvider delayDuration={300}>
      <div
        data-slot="shell-sidebar-nav"
        className="flex h-full flex-col p-sidebar-outer"
      >
        {/* title */}
        <div className="shrink-0 p-sidebar-inner">
          <div className="group flex h-header-sm items-center gap-sidebar">
            <NavRail>
              <ShellIconButton
                icon="sidebar"
                className="size-sidebar-group"
                label={collapsed ? text.expandNav : text.collapseNav}
                onClick={onToggleCollapsed}
              >
                <Icon name="sidebar" size="md" />
              </ShellIconButton>
            </NavRail>
            {!collapsed &&
              (domainName ? (
                <NavLabel className="text-label-md font-medium text-foreground">
                  {domainName}
                </NavLabel>
              ) : (
                /* 没有域名文字时仍然占住中间这一格。NavLabel 自带 min-w-0
                   flex-1，右侧的「全部展开/收起」按钮一直是**靠它撑开**才居右
                   的；直接不渲染会让两个按钮贴到一起缩在左边。居右是这一行的
                   版面契约，不该因为少了一段文字就变。 */
                <span className="min-w-0 flex-1" aria-hidden="true" />
              ))}
            {!collapsed && (
              <NavRail size="small">
                <ShellIconButton
                  icon={allClosed ? "caret-double-down" : "caret-double-up"}
                  label={
                    allClosed ? text.expandAllGroups : text.collapseAllGroups
                  }
                  onClick={toggleAllGroups}
                  className={cn(
                    "size-sidebar-group opacity-0 transition-opacity duration-fast ease-standard",
                    "group-hover:opacity-100 focus-visible:opacity-100",
                  )}
                />
              </NavRail>
            )}
          </div>
        </div>

        {/* content */}
        <div
          className={cn(
            /* Match the Console sidebar's safe inset at each density. Keep the
               last item away from the bottom without mounting an empty footer. */
            "min-h-0 flex-1 overflow-y-auto pt-sidebar-inner pb-sidebar-safe",
            "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          <nav className="flex flex-col">
            {sections.map((section, sectionIndex) => {
              const open = !closedGroups.has(section.title);
              return (
                <div
                  key={section.title}
                  className={cn(
                    "flex flex-col gap-sidebar p-sidebar-inner",
                    /* 首组不画：顶上没有要分隔的东西，画了只是一条贴着容器边的线。 */
                    section.dividerBefore &&
                      sectionIndex > 0 &&
                      "mt-sidebar-inner border-t border-border pt-sidebar-outer",
                  )}
                >
                  <NavGroupHeader
                    title={section.title}
                    brandPosition={section.brandPosition ?? "prefix"}
                    open={open}
                    collapsed={collapsed}
                    onToggle={() => toggleGroup(section.title)}
                  />
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows] duration-base ease-standard motion-reduce:transition-none",
                      open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                  >
                    <div className="overflow-hidden">
                      <nav
                        className="flex flex-col gap-sidebar"
                        aria-label={section.title}
                      >
                        {section.items.map((item) => (
                          <NavItemRow
                            key={item.href}
                            item={item}
                            collapsed={collapsed}
                            active={isActive(item.href)}
                            linkComponent={linkComponent}
                          />
                        ))}
                      </nav>
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* footer — 只在产品侧真的注入了内容时才存在；底部安全区由 content
            自己的 pb-sidebar-safe 负责，不再用一个空块去占 */}
        {footer ? <div className="h-header-xl shrink-0">{footer}</div> : null}
      </div>
    </TooltipProvider>
  );
}
