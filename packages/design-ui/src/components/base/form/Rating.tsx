/**
 * Rating.tsx - 星级评分。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Form
 *
 * 一个件管两态：`readOnly` 打开就是只读呈现，关着就是可交互输入。不拆成两个件——
 * 「同一份分数，一处能改一处只看」本来就是同一种呈现的两个模式，拆开会让实心/空心
 * 的取值、半星的取舍、尺寸档在两处各写一遍，迟早对不上。
 *
 * ── 为什么是 radiogroup 而不是一排按钮 ──
 * 评分是**在互斥选项里选一个**，这正是 radio 的语义。读屏软件因此会报
 * 「单选按钮组，5 项中的第 3 项」，而不是五个无关的按钮。键盘用左右/上下箭头移动，
 * 与原生 radio 一致。
 *
 * ── 可清空 ──
 * 再点一次当前分数即清空（`value` 变 `null`）。调用方的三项评分常常是各自可空的，
 * 「点错了想取消」如果没有出口，用户只能被迫留一个不想给的分。`allowClear={false}`
 * 可以关掉。
 *
 * ── 没有半星 ──
 * 取值是整数。半星要么让量表变成 10 档（那是另一套口径），要么让"4.5 星"在写入时
 * 被悄悄取整；呈现端的小数均分用 `readOnly` + `value` 取整后再配文字（如「4.3」）
 * 更诚实。
 */

import * as React from "react";
import { Icon } from "../../../icons/Icon";
import type { IconSize } from "../../../icons/icon.types";
import { cn } from "../../../utils/cn";
import { interactive } from "../../../styles/recipes";

export interface RatingProps {
  /** 当前分数，1..max；`null` = 未评。 */
  readonly value: number | null;
  /** 只读时不传。 */
  readonly onValueChange?: (value: number | null) => void;
  /** 档数，默认 5。 */
  readonly max?: number;
  /** 只读呈现：不可点、不进 Tab 序、无 hover 预览。 */
  readonly readOnly?: boolean;
  readonly disabled?: boolean;
  /** 星的尺寸档，默认 `lg`——可点的目标不该比正文小。 */
  readonly size?: IconSize;
  /** 再点当前分数是否清空，默认 true。 */
  readonly allowClear?: boolean;
  /** 整组的无障碍名，例如「产品评分」。 */
  readonly "aria-label"?: string;
  /**
   * 逐档的说明词，长度须等于 `max`，例如「很差 / 较差 / 一般 / 满意 / 很满意」。
   * 给了就用它当那一档的无障碍名；没给才落到 `labels.optionTemplate`。
   */
  readonly optionLabels?: readonly string[];
  /** 件内文案的覆盖出口，见 05-content-standard §3.1。 */
  readonly labels?: RatingLabels;
  readonly className?: string;
}

/**
 * 件内文案。默认值一律英文且只是托底——**英文默认出现在生产界面上说明有人忘了
 * 传**，不是一种受支持的配置（05 §3.1）。
 *
 * 三条里有两条是**模板不是词**：语序是语法。中文「3 分」与英文「3 out of 5」
 * 不是同一个句子结构，只开一个词的口子换不出那句话。
 */
export interface RatingLabels {
  /** 逐档无障碍名的模板。`{score}` / `{max}` 会被替换。默认 `"{score} out of {max}"`。 */
  readonly optionTemplate?: string;
  /** 只读态的 role 说明。默认 `"rating"`。 */
  readonly roleDescription?: string;
  /** 只读态标题模板。`{value}` / `{max}` 会被替换。默认 `"{value} out of {max}"`。 */
  readonly valueTemplate?: string;
  /** 未评时的标题。默认 `"Not rated"`。 */
  readonly emptyLabel?: string;
}

const DEFAULT_LABELS = {
  optionTemplate: "{score} out of {max}",
  roleDescription: "rating",
  valueTemplate: "{value} out of {max}",
  emptyLabel: "Not rated",
} as const satisfies Required<RatingLabels>;

const DEFAULT_MAX = 5;

function fill(template: string, values: Record<string, number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}

export function Rating({
  value,
  onValueChange,
  max = DEFAULT_MAX,
  readOnly = false,
  disabled = false,
  size = "lg",
  allowClear = true,
  optionLabels,
  labels,
  className,
  ...rest
}: RatingProps) {
  const text = { ...DEFAULT_LABELS, ...labels };
  // hover 预览只在可交互时有意义。只读态留着它会让鼠标划过时分数"变了"。
  const [hovered, setHovered] = React.useState<number | null>(null);
  const inert = readOnly || disabled;
  const shown = inert ? value : (hovered ?? value);

  const labelOf = (score: number) =>
    optionLabels?.[score - 1] ?? fill(text.optionTemplate, { score, max });

  const commit = (score: number) => {
    if (inert || !onValueChange) return;
    onValueChange(allowClear && value === score ? null : score);
  };

  /**
   * 左右/上下箭头在 1..max 之间移动，Home/End 到两端。
   *
   * 未评时按右箭头从 1 开始——不是从 0 或 max/2：用户按右箭头是想"开始给分"，
   * 落在最低档最符合"往上加"的预期。
   */
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (inert || !onValueChange) return;
    const current = value ?? 0;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      next = Math.min(current + 1, max);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      next = current <= 1 ? (allowClear ? null : 1) : current - 1;
    } else if (event.key === "Home") {
      next = 1;
    } else if (event.key === "End") {
      next = max;
    } else {
      return;
    }
    event.preventDefault();
    onValueChange(next);
  };

  return (
    <div
      role={readOnly ? "img" : "radiogroup"}
      aria-label={rest["aria-label"]}
      // 只读态把分数直接说出来，读屏不必去数五颗星各是什么状态。
      {...(readOnly
        ? {
            "aria-roledescription": text.roleDescription,
            title:
              value === null
                ? text.emptyLabel
                : fill(text.valueTemplate, { value, max }),
          }
        : {})}
      className={cn("inline-flex items-center gap-2xs", className)}
      onKeyDown={onKeyDown}
      onMouseLeave={() => setHovered(null)}
    >
      {Array.from({ length: max }, (_, index) => index + 1).map((score) => {
        const filled = shown !== null && score <= shown;
        const checked = value === score;
        return (
          <span
            key={score}
            // 只读态整组一个 role="img"，逐颗星不再各自成为可聚焦节点。
            {...(readOnly
              ? { "aria-hidden": true }
              : {
                  role: "radio",
                  "aria-checked": checked,
                  "aria-label": labelOf(score),
                  "aria-disabled": disabled || undefined,
                  // 单一 Tab 停靠点：选中的那一档可聚焦，都没选时停在第一档。
                  // 五颗星各占一个 Tab 位会让键盘用户为了跳过评分按五次。
                  tabIndex: disabled
                    ? -1
                    : checked || (value === null && score === 1)
                      ? 0
                      : -1,
                  onClick: () => commit(score),
                  onMouseEnter: () => setHovered(score),
                })}
            className={cn(
              "inline-flex",
              !inert && "cursor-pointer",
              !readOnly && interactive,
              !readOnly && "rounded-xs",
              disabled && "cursor-not-allowed opacity-disabled",
            )}
          >
            <Icon
              name="star"
              size={size}
              weight={filled ? "fill" : "regular"}
              className={cn(
                "transition-colors duration-fast ease-standard",
                // 实心用 warning 语气：星级是评价不是告警，但满色的琥珀是这一族
                // 控件的行业默认，换成 primary 反而认不出是评分。
                filled ? "text-warning" : "text-muted-foreground",
              )}
            />
          </span>
        );
      })}
    </div>
  );
}

Rating.displayName = "Rating";
