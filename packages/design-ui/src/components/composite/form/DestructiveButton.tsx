/**
 * DestructiveButton.tsx - 带确认的危险动作按钮。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 「Button + ConfirmDestructive」的固定组合，与 `Dialog → DialogForm`、
 * `AlertDialog → ConfirmDestructive` 同一步棋：**原语只管形状，契约由组合件承担**。
 *
 * ── 为什么不把这件事放进 base 的 Button ──
 * 试过，被守卫挡了回来：`Button` 在 server-safe 子集里（`MetricCard` 引它），
 * 让它引 `ConfirmDestructive` 会把 Radix AlertDialog 的 `createContext` 拖进
 * `/server` 入口，在 react-server 下直接崩（2026-08-25 由
 * check-server-entry-safety 实测抓到）。**一个能弹模态的 base 原语就不是 base
 * 原语。** 所以分工是：
 *
 *   Button（base）        —— 只承担类型义务：`variant="destructive"` 必须写
 *                            `confirmExempt` 说明为什么不设防
 *   DestructiveButton     —— 承担拦截：收 `confirm` 契约，自己弹确认框
 *
 * 两者合起来，破坏性确认契约覆盖全部三个载体（`ActionMenuItem` /
 * `BulkActionBarItem` / 红按钮），`grep -rn confirmExempt` 因此是完整清单。
 *
 * 本件不开 `variant`：它按定义就是 destructive 入口档。也不开 `asChild`——渲染的
 * 是「按钮 + 对话框」两个节点，塞不进 `Slot` 的单子元素约束。
 */

import * as React from "react";
import { Icon, type IconName } from "../../../icons";
import { Button } from "../../base/form/Button";
import type { ButtonSize } from "../../base/form/Button";
import {
  ConfirmDestructive,
  type DestructiveConfirm,
} from "../overlay/ConfirmDestructive";

export interface DestructiveButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onClick" | "children"
> {
  readonly size?: ButtonSize;
  readonly children: React.ReactNode;
  /** 破坏性确认契约。落锤走 `confirm.onConfirm`——本件不再收第二个回调。 */
  readonly confirm: DestructiveConfirm;
  /** 可选前置图标，同 `ActionButton` 的排布（图标尺寸与内边距由件固定）。 */
  readonly icon?: IconName;
}

function DestructiveButton({
  children,
  confirm,
  icon,
  ...props
}: DestructiveButtonProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button
        {...props}
        variant="destructive"
        /* 拦截由本件承担,故内层按钮豁免。这句理由会被 `grep confirmExempt` 扫到,
           但它在 DS 自己的源码里、不在产品调用点,不影响产品那份清单的口径。 */
        confirmExempt="拦截由 DestructiveButton 承担：confirm 契约在本件上"
        onClick={() => setOpen(true)}
      >
        {icon ? <Icon name={icon} data-icon="inline-start" /> : null}
        {children}
      </Button>
      <ConfirmDestructive {...confirm} open={open} onOpenChange={setOpen} />
    </>
  );
}

export { DestructiveButton };
