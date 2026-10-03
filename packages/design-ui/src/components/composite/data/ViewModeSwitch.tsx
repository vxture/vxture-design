/**
 * ViewModeSwitch.tsx - 列表 / 卡片 视图切换。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 只有两个目的地、图标固定、语义固定的开关。做成一件而不是让每个列表页自己
 * 摆一组 ToggleGroup，是因为"自己摆"要同时摆对四件事：图标选哪两个、用不用
 * 正方档、组的无障碍名、以及**空值处理**——Radix 的单选组允许取消选中，会回
 * 空串，而视图必须始终有一个。少写最后那一句，用户点两下当前项就会把列表切
 * 成"没有视图"。
 *
 * 外层是一块无描边的页面底色槽，当前项用半透明品牌面标出。刻意**不**用
 * SegmentedControl（描边凹槽 + 托起滑块）：它仍然是工具条里的轻量图标开关，
 * 不是文字分段控件。
 *
 * 图标必须走 `icon-*` 正方档：只装图标的开关用带横向内距的档会被压成
 * "宽 28 高 20"的扁片（2026-08-04 实测）。
 *
 * 零业务语义：它不知道列表里装的是租户还是订单，只知道"两种排布"。
 */

import { Icon } from "../../../icons";
import { cn } from "../../../utils/cn";
import { ToggleGroup, ToggleGroupItem } from "../../base/form/ToggleGroup";

export type ViewModeSwitchValue = "list" | "cards";

/* Figma：selected/hover 半透明面 + primary/hover 图标；未选中仍用 muted 图标。 */
const ITEM = [
  "text-muted-foreground",
  "data-[state=on]:bg-surface-selected-hover",
  "data-[state=on]:text-primary-hover",
  "data-[state=on]:hover:bg-surface-selected-hover",
].join(" ");

export interface ViewModeSwitchProps {
  readonly value: ViewModeSwitchValue;
  readonly onChange: (value: ViewModeSwitchValue) => void;
  /** 整组的无障碍名，例如"账单展示方式"。 */
  readonly ariaLabel?: string;
  /** 两个选项各自的无障碍名。默认中文，做 i18n 的消费方传入。 */
  readonly labels?: { list?: string; cards?: string };
  /**
   * 停用卡片档，并说明原因。
   *
   * 入口保留、但不假装它还会响应——**一个永远按不动又不说为什么的按钮，比没有
   * 这个按钮更糟**。原因会挂在 `title` 与 `aria-description` 上，鼠标停留和读屏
   * 器都拿得到（owner 2026-08-07 判：卡片视图退役，切换按钮保留禁用）。
   */
  readonly cardsDisabledReason?: string;
  readonly className?: string;
}

export function ViewModeSwitch({
  value,
  onChange,
  ariaLabel = "View mode",
  labels,
  cardsDisabledReason,
  className,
}: ViewModeSwitchProps) {
  return (
    <ToggleGroup
      type="single"
      size="icon-xl"
      aria-label={ariaLabel}
      value={value}
      // Radix 的单选组允许"取消选中"，会回空串；视图必须始终有一个，空值
      // 直接忽略而不是把 value 设成 undefined。
      onValueChange={(next) => {
        if (next) onChange(next as ViewModeSwitchValue);
      }}
      className={cn("inline-flex rounded-lg bg-background", className)}
    >
      <ToggleGroupItem
        value="list"
        aria-label={labels?.list ?? "List view"}
        className={ITEM}
      >
        <Icon name="list" size="lg" />
      </ToggleGroupItem>
      <ToggleGroupItem
        value="cards"
        aria-label={labels?.cards ?? "Card view"}
        className={ITEM}
        {...(cardsDisabledReason
          ? {
              disabled: true,
              title: cardsDisabledReason,
              "aria-description": cardsDisabledReason,
            }
          : {})}
      >
        <Icon name="squares-four" size="lg" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
