"use client";

/**
 * FileTrigger.tsx - 选文件。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Base
 *
 * ── 为什么这件必须存在 ──
 * `<input type="file">` 是浏览器**唯一**的文件入口，而它的原生外观无法跟随设计
 * 系统——各平台各一个样，改不动。于是每个需要上传的页面都会做同一件事：把原生
 * input 藏起来、用一个自家按钮触发它。
 *
 * 那意味着每个应用仓里都会出现一个裸的 `<input>`，而 `ds/no-native-primitive`
 * 会拦它（这件的诞生原因正是被它拦了一次）。守卫是对的：这不是"应用的特殊需求"，
 * 是所有上传场景共有的形状，该由 DS 收掉。
 *
 * ── 藏法：`sr-only` 而不是 `display:none` ──
 * `display:none` 的表单控件在部分浏览器里**拿不到键盘焦点**，于是"用键盘打开文件
 * 选择器"这条路断掉。`sr-only` 把它移出视觉但留在可聚焦树里；触发按钮用
 * `<label htmlFor>` 关联——那是不靠 JS 就能让别的元素触发 input 的唯一方式。
 *
 * ── 为什么每次选完要清空 value ──
 * 同一个文件连选两次时 `change` **不会再触发**（值没变）。用户看到的是"第二次
 * 点了没反应"，而这恰恰发生在"上传失败了再试一次"的时候——最需要它工作的时刻。
 */

import * as React from "react";
import { cn } from "../../../utils/cn";
import { Button } from "./Button";
import type { ButtonSize, ButtonVariant } from "./Button/Button.types";

/**
 * **刻意不继承 `ButtonProps`。**
 *
 * `ButtonProps` 是判别联合（`ButtonPlain | ButtonExempt`），承载"染红就必须带确认"
 * 那条契约。对它做普通 `Omit` 会先把两支并成一个"什么都可选"的对象再删键，
 * `variant` 与 `confirmExempt` 的绑定当场丢失——`ActionButton` 踩过这个坑，那边
 * 换成了 `DistributiveOmit`。
 *
 * 而选文件**永远不是破坏性动作**：与其小心翼翼地把那个联合透传过来，不如只收本件
 * 真正要的三项。少一个绕开契约的口子。
 */
/**
 * 选文件用得上的那几档外观。
 *
 * **刻意排除 `destructive` 与 `destructive-strong`**：选一个文件永远不是破坏性
 * 动作，而那两档在 `ButtonProps` 的判别联合里要求同时给出确认或豁免理由。
 * 从类型上排掉，本件就不可能成为绕开那条契约的入口。
 */
export type FileTriggerVariant = Exclude<
  ButtonVariant,
  "destructive" | "destructive-strong"
>;

export interface FileTriggerProps {
  readonly variant?: FileTriggerVariant;
  readonly size?: ButtonSize;
  readonly disabled?: boolean;
  readonly className?: string;
  /** 接受的 MIME / 扩展名，直接落到原生 `accept`。 */
  readonly accept?: string;
  /** 允许多选。回调随之拿到多个文件。 */
  readonly multiple?: boolean;
  /** 选中之后。未选（点了取消）不会触发。 */
  readonly onSelect: (files: readonly File[]) => void;
  /** 按钮上的文字。 */
  readonly children: React.ReactNode;
}

function FileTrigger({
  accept,
  multiple,
  onSelect,
  disabled,
  children,
  className,
  variant,
  size,
}: FileTriggerProps) {
  const inputId = React.useId();

  return (
    <>
      <input
        id={inputId}
        type="file"
        className="sr-only"
        {...(accept !== undefined ? { accept } : {})}
        {...(multiple ? { multiple: true } : {})}
        {...(disabled ? { disabled: true } : {})}
        onChange={(event) => {
          const picked = Array.from(event.target.files ?? []);
          /* 先清空再回调：回调里可能同步抛，清空要在那之前发生，否则"再选同一个
             文件"就永远不触发了。 */
          event.target.value = "";
          if (picked.length > 0) onSelect(picked);
        }}
      />
      {/* 三项都给定值而不是条件展开：仓里开着 `exactOptionalPropertyTypes`，
          条件展开出来的「可选且可能是 undefined」与目标的「可选但一旦给出就必须
          有值」对不上。给默认值同时也让本件的外观有个确定起点。 */}
      <Button
        asChild
        variant={variant ?? "outline"}
        size={size ?? "md"}
        disabled={disabled ?? false}
        className={cn(disabled ? undefined : "cursor-pointer", className)}
      >
        <label htmlFor={inputId}>{children}</label>
      </Button>
    </>
  );
}

export { FileTrigger };
