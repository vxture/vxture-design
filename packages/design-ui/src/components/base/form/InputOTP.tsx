/**
 * InputOTP.tsx - 一次性验证码输入（shadcn 惯例，底层 input-otp）。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Form
 *
 * 结构承上游四件：InputOTP / Group / Slot / Separator。取值差异：
 * - 槽位尺寸绑控件刻度（h-control-md / w-control-md），跟随密度三档；
 *   上游的 size-9 裸数值不跟随。
 * - 假光标用 `animate-pulse`：上游的 caret-blink 是自定义 keyframes，
 *   DS 不为单个组件开全局 keyframes（060 判据），脉动表达"此处待输入"已够。
 * - 激活槽的高亮走 interactive 同款 ring 三件，与全体控件的焦点语言一致。
 */

"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { cn } from "../../../utils/cn";
import { invalid } from "../../../styles/recipes";

export function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  readonly containerClassName?: string;
}) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        "flex items-center gap-xs has-[:disabled]:opacity-disabled",
        containerClassName,
      )}
      className={cn("disabled:cursor-not-allowed", className)}
      {...props}
    />
  );
}

export function InputOTPGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("flex items-center", className)}
      {...props}
    />
  );
}

export interface InputOTPSlotProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly index: number;
}

export function InputOTPSlot({
  index,
  className,
  ...props
}: InputOTPSlotProps) {
  const inputOTPContext = React.useContext(OTPInputContext);
  /*
   * `?.` 要一路点到底。
   *
   * 上游的 `OTPInputContext` 默认值是 `createContext({})`——一个**真值空对象**。
   * 于是 `inputOTPContext?.slots[index]` 里的 `?.` 永远不会短路，而 `.slots` 必然
   * 是 undefined，脱离 `<InputOTP>` 单独渲染一个格子当场抛
   * `Cannot read properties of undefined`。
   *
   * 那个 `?.` 写下来是想兜住「没有上下文」这一种情况的，但它兜住的是
   * context 为空，而这个 context 从来不为空。**看起来在防什么，实际没防住**——
   * 与本仓查过的 6 处死正则同一类（2026-08-26 由用例查到）。
   */
  const slot = inputOTPContext?.slots?.[index];

  return (
    <div
      data-slot="input-otp-slot"
      data-active={slot?.isActive}
      className={cn(
        "relative flex h-control-md w-control-md items-center justify-center",
        "border-y border-r border-input text-body-md text-foreground shadow-raised",
        "outline-none transition-all duration-fast ease-standard",
        "first:rounded-l-md first:border-l last:rounded-r-md",
        "data-[active=true]:z-10 data-[active=true]:border-ring",
        "data-[active=true]:ring-3 data-[active=true]:ring-ring/50",
        invalid,
        className,
      )}
      {...props}
    >
      {slot?.char}
      {slot?.hasFakeCaret ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div className="h-icon-sm w-px animate-pulse bg-foreground" />
        </div>
      ) : null}
    </div>
  );
}

/** 分组连接符（123-456 中间那一杠）。 */
export function InputOTPSeparator(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      data-slot="input-otp-separator"
      className="px-2xs text-muted-foreground"
      {...props}
    >
      -
    </div>
  );
}
