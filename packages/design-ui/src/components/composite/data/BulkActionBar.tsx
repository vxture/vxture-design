/**
 * BulkActionBar.tsx - 列表多选后出现的批量操作条。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 数据驱动：调用方给 `count` 与 `actions`，不给 markup。计数文案、清除入口、危险
 * 动作配色由本件固定，各处不会长得不一样。`count` 为 0 时返回 null——它只在有选中
 * 项时存在。
 *
 * 相对原实现：删 `primaryActions`（无选中时也显示的动作属于 `FilterBar`，两件各管
 * 一段）、`selectionClassName` / `primaryClassName`；`selectedLabel` 由调用方拼
 * 文案改为 `count` + `noun`。
 *
 * ## danger 必须带确认（4.0 起）
 *
 * 与 `ActionMenu` 同一份契约、同一个理由，只是这里更狠一档：行菜单误删一条，
 * 批量条误删的是当前选中的全部。`danger: true` 必须给 `confirm` 或写明
 * `confirmExempt` 理由；给了 `confirm` 就由本件弹 `ConfirmDestructive`，
 * 落锤走 `confirm.onConfirm`。
 *
 * `confirm.target` 由调用方拼（「选中的 12 个模型服务」）——只有调用方知道
 * 选中的是什么、有几个，而确认框的标题必须说出这两样。
 */

import * as React from "react";
import { cn } from "../../../utils/cn";
import { Icon, type IconName } from "../../../icons";
import { Button } from "../../base/form/Button";
import {
  ConfirmDestructive,
  type DestructiveConfirm,
} from "../overlay/ConfirmDestructive";

interface BulkActionBarItemBase {
  readonly id: string;
  readonly label: React.ReactNode;
  readonly icon?: IconName;
  readonly disabled?: boolean;
}

/** 常规批量动作：不染红，点了直接生效。 */
interface BulkActionBarItemPlain extends BulkActionBarItemBase {
  readonly danger?: false;
  readonly onSelect?: () => void;
  readonly confirm?: never;
  readonly confirmExempt?: never;
}

/** 危险批量动作，带拦截：落锤走 `confirm.onConfirm`，本件负责弹确认框。 */
interface BulkActionBarItemGuarded extends BulkActionBarItemBase {
  readonly danger: true;
  readonly confirm: DestructiveConfirm;
  readonly onSelect?: never;
  readonly confirmExempt?: never;
}

/**
 * 危险批量动作，显式豁免确认。理由必填，见 `ActionMenu` 同名字段的说明。
 * 批量动作用这个豁免口应当比行菜单更少：一次动 N 条的动作，可撤销性得更强
 * 才谈得上不拦。
 */
interface BulkActionBarItemExempt extends BulkActionBarItemBase {
  readonly danger: true;
  readonly confirmExempt: string;
  readonly onSelect?: () => void;
  readonly confirm?: never;
}

export type BulkActionBarItem =
  BulkActionBarItemPlain | BulkActionBarItemGuarded | BulkActionBarItemExempt;

export interface BulkActionBarProps {
  readonly count: number;
  readonly actions: readonly BulkActionBarItem[];
  /** 计数单位，默认"项"。 */
  readonly noun?: string;
  readonly onClear?: () => void;
  readonly className?: string;
}

function BulkActionBar({
  count,
  actions,
  noun = "项",
  onClear,
  className,
}: BulkActionBarProps) {
  /** 当前正在确认哪个动作（null = 没有确认框开着）。 */
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);

  const activeConfirm = actions.find(
    (action) => action.id === confirmingId,
  )?.confirm;
  /** 同 ActionMenu：留住上一份契约，让退场动画跑完再让内容消失。 */
  const lastConfirmRef = React.useRef<DestructiveConfirm | undefined>(
    undefined,
  );
  if (activeConfirm) lastConfirmRef.current = activeConfirm;
  const renderedConfirm = activeConfirm ?? lastConfirmRef.current;

  if (count <= 0) return null;

  return (
    <>
      <div
        role="toolbar"
        aria-label="批量操作"
        className={cn(
          "flex flex-wrap items-center justify-between gap-md",
          "rounded-xl bg-card px-lg py-sm shadow-raised ring-1 ring-foreground/10",
          className,
        )}
      >
        <div className="flex min-w-0 items-center gap-sm">
          <span className="text-label-md">
            已选择 {count} {noun}
          </span>
          {onClear ? (
            <Button variant="ghost" size="md" onClick={onClear}>
              清除
            </Button>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-sm">
          {actions.map((action) => (
            <Button
              key={action.id}
              size="md"
              variant={action.danger ? "destructive" : "outline"}
              {...(action.disabled !== undefined
                ? { disabled: action.disabled }
                : {})}
              {...(action.confirm !== undefined
                ? { onClick: () => setConfirmingId(action.id) }
                : action.onSelect !== undefined
                  ? { onClick: action.onSelect }
                  : {})}
            >
              {action.icon ? (
                <Icon name={action.icon} size={16} aria-hidden="true" />
              ) : null}
              {action.label}
            </Button>
          ))}
        </div>
      </div>
      {renderedConfirm ? (
        <ConfirmDestructive
          {...renderedConfirm}
          open={activeConfirm !== undefined}
          onOpenChange={(next) => {
            if (!next) setConfirmingId(null);
          }}
        />
      ) : null}
    </>
  );
}

export { BulkActionBar };
