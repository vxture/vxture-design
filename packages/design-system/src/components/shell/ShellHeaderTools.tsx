/**
 * ShellHeaderTools.tsx - 顶栏的标准工具箱：六件工具、固定顺序、各自的交互已接好。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - Shell
 *
 * owner 2026-09-26 定的顺序与交互（**顺序不由调用方决定**）：
 *
 * | # | 工具 | 交互 |
 * |---|------|------|
 * | 1 | 主题 | 点击直接切换亮 / 暗 |
 * | 2 | 语言 | 弹出面板选择 |
 * | 3 | 全屏 | 点击直接切换 |
 * | 4 | 帮助 | 新标签页打开，定位到**当前页面**的帮助主题 |
 * | 5 | 消息 | 侧边抽屉面板 |
 * | 6 | 配置 | 跳转到后台配置 |
 *
 * 为什么单独成件而不是让各门户用 `ShellToolbox` 自己排：`ShellToolbox` 按调用方
 * 给的顺序摆，六个门户各排一遍，顺序与交互迟早各不相同——这正是本件要收口的
 * 东西。本件只收「放哪几件」（不给就不出现），不收「按什么顺序、怎么交互」。
 *
 * 不给的工具不渲染、不占位：访客（官网未登录）只给前三件，登录后给全部六件。
 *
 * 与业务无关：语言目录、帮助地址、配置地址、消息列表都由调用方给；本件只负责
 * 摆放、外观与交互骨架（弹层 / 抽屉 / 新标签页 / 全屏状态）。
 *
 * 全屏依赖 `FullscreenProvider`（同 `ShellFullscreenToggle`）。
 */

import * as React from "react";
import type { ReactNode } from "react";
import {
  Drawer,
  Popover,
  PopoverContent,
  PopoverTrigger,
  useFullscreen,
} from "@vxture/design-ui";
import type { DrawerWidth, FullscreenMode } from "@vxture/design-ui";
import type { ThemeMode } from "../../theme/theme.types";
import { LocaleSelectPanel } from "./ShellChrome";
import type { LocaleSelectOption } from "./ShellChrome";
import {
  ShellToolbox,
  ShellToolboxButton,
  ShellToolboxLink,
} from "./ShellToolbox";

export interface ShellHeaderThemeTool {
  /** 当前主题。`system` 按亮色处理图标（点一下就切到暗色）。 */
  current: ThemeMode;
  onChange: (next: "light" | "dark") => void;
  /** 当前为亮色时按钮的可访问名，即「切到暗色」。 */
  toDarkLabel: string;
  /** 当前为暗色时按钮的可访问名，即「切到亮色」。 */
  toLightLabel: string;
}

export interface ShellHeaderLocaleTool {
  current: string;
  /** 语言目录由平台给，设计包不拥有（见 `LocaleSelectOption`）。 */
  options: LocaleSelectOption[];
  onChange: (locale: string) => void;
  label: string;
  /** 弹出面板的可访问名，缺省同 `label`。 */
  panelLabel?: string | undefined;
}

export interface ShellHeaderFullscreenTool {
  enterLabel: string;
  exitLabel: string;
  /** 同 `ShellFullscreenToggle`：区分多个全屏目标。缺省 `app`。 */
  targetId?: string | undefined;
  mode?: FullscreenMode | undefined;
  /** 全屏哪个元素，缺省整页（documentElement）。 */
  getTargetElement?: (() => HTMLElement | null) | undefined;
}

export interface ShellHeaderLinkTool {
  label: string;
  href: string;
}

export interface ShellHeaderNotificationsTool {
  label: string;
  /** 有未读：图标右上角小圆点。 */
  unread?: boolean | undefined;
  /** 抽屉标题，缺省同 `label`。 */
  title?: ReactNode;
  /** 抽屉内容（消息列表），由产品给。 */
  children: ReactNode;
  /** 抽屉宽度挡位，缺省 `sm`。 */
  width?: DrawerWidth | undefined;
  /** 抽屉关闭钮的可访问名。 */
  closeLabel?: string | undefined;
  /** 抽屉开合时通知调用方（比如打开即标为已读）。 */
  onOpenChange?: ((open: boolean) => void) | undefined;
}

export interface ShellHeaderToolsProps {
  /** 整组的可访问名（「工具」）。 */
  label: string;
  /** 1 主题：点击切换。 */
  theme?: ShellHeaderThemeTool | undefined;
  /** 2 语言：弹出面板选择。 */
  locale?: ShellHeaderLocaleTool | undefined;
  /** 3 全屏：点击切换。 */
  fullscreen?: ShellHeaderFullscreenTool | undefined;
  /**
   * 4 帮助：**新标签页**打开。`href` 应指向当前页面对应的帮助主题（由调用方按
   * 当前路由算出），不要一律指向帮助中心首页——用户点帮助时问的是「这一页怎么用」。
   */
  help?: ShellHeaderLinkTool | undefined;
  /** 5 消息：打开侧边抽屉。 */
  notifications?: ShellHeaderNotificationsTool | undefined;
  /** 6 配置：跳转到后台配置（当前标签页）。 */
  settings?: ShellHeaderLinkTool | undefined;
  /** 渲染链接的元素，默认原生 <a>；产品侧有路由库时传自己的 Link。 */
  linkComponent?: React.ElementType | undefined;
  className?: string | undefined;
}

export function ShellHeaderTools({
  label,
  theme,
  locale,
  fullscreen,
  help,
  notifications,
  settings,
  linkComponent,
  className,
}: Readonly<ShellHeaderToolsProps>) {
  if (!theme && !locale && !fullscreen && !help && !notifications && !settings)
    return null;
  return (
    <ShellToolbox label={label} className={className}>
      {theme ? <ThemeTool {...theme} /> : null}
      {locale ? <LocaleTool {...locale} /> : null}
      {fullscreen ? <FullscreenTool {...fullscreen} /> : null}
      {help ? (
        <ShellToolboxLink
          icon="help"
          label={help.label}
          href={help.href}
          newTab
          linkComponent={linkComponent}
        />
      ) : null}
      {notifications ? <NotificationsTool {...notifications} /> : null}
      {settings ? (
        <ShellToolboxLink
          icon="settings"
          label={settings.label}
          href={settings.href}
          linkComponent={linkComponent}
        />
      ) : null}
    </ShellToolbox>
  );
}

/**
 * 图标表示**当前**主题（亮色是太阳、暗色是月亮，照 Figma HeaderToolbar），
 * 可访问名说的是**点下去会怎样**。
 */
function ThemeTool({
  current,
  onChange,
  toDarkLabel,
  toLightLabel,
}: Readonly<ShellHeaderThemeTool>) {
  const dark = current === "dark";
  return (
    <ShellToolboxButton
      icon={dark ? "moon" : "sun"}
      label={dark ? toLightLabel : toDarkLabel}
      onClick={() => onChange(dark ? "light" : "dark")}
    />
  );
}

function LocaleTool({
  current,
  options,
  onChange,
  label,
  panelLabel,
}: Readonly<ShellHeaderLocaleTool>) {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ShellToolboxButton icon="globe" label={label} active={open} />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        aria-label={panelLabel ?? label}
        className="w-auto min-w-media-2xl p-xs"
      >
        <LocaleSelectPanel
          activeLocale={current}
          options={options}
          onSelect={(next) => {
            setOpen(false);
            onChange(next);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function FullscreenTool({
  enterLabel,
  exitLabel,
  targetId = "app",
  mode = "native",
  getTargetElement,
}: Readonly<ShellHeaderFullscreenTool>) {
  const { enter, exit, isFullscreen, ...state } = useFullscreen();
  const active =
    isFullscreen && state.targetId === targetId && state.mode === mode;
  return (
    <ShellToolboxButton
      icon={active ? "corners-in" : "corners-out"}
      label={active ? exitLabel : enterLabel}
      active={active}
      onClick={() => {
        if (active) {
          exit();
          return;
        }
        const target =
          getTargetElement?.() ??
          (typeof document === "undefined" ? null : document.documentElement);
        if (target) enter(targetId, target, { mode });
      }}
    />
  );
}

function NotificationsTool({
  label,
  unread = false,
  title,
  children,
  width = "sm",
  closeLabel,
  onOpenChange,
}: Readonly<ShellHeaderNotificationsTool>) {
  const [open, setOpen] = React.useState(false);
  const change = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };
  return (
    <>
      <ShellToolboxButton
        icon="bell"
        label={label}
        badge={unread}
        active={open}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => change(true)}
      />
      <Drawer
        open={open}
        onClose={() => change(false)}
        side="right"
        width={width}
        title={title ?? label}
        {...(closeLabel ? { closeLabel } : {})}
      >
        {children}
      </Drawer>
    </>
  );
}
