/**
 * InputOTP.tsx - 一次性验证码输入（shadcn 惯例，底层 input-otp）。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Form
 *
 * 结构承上游四件：InputOTP / Group / Slot / Separator。取值差异：
 * - 槽位尺寸绑控件刻度（md 档 control-md、lg 档 control-3xl），跟随密度三档；
 *   上游的 size-9 裸数值不跟随。
 * - 假光标用 `animate-pulse`：上游的 caret-blink 是自定义 keyframes，
 *   DS 不为单个组件开全局 keyframes（060 判据），脉动表达"此处待输入"已够。
 * - 激活槽的高亮走 interactive 同款 ring 三件，与全体控件的焦点语言一致。
 *
 * 两个尺寸档，形态不同而不只是大小不同：
 * - `md`（默认）——control-md 见方的**连体**格子，靠 first/last 收圆角，
 *   表单行里与其他控件同高。
 * - `lg`——control-3xl 见方的**独立**方格，每格自带四边框与 radius-xl，格间留白。
 *   用在「整屏只干这一件事」的验证弹窗里：那里没有别的控件要对齐，格子大、
 *   分得开，六位数字一眼能数清。
 *
 * 档位定在 `InputOTP` 上、经 context 下发给 Group 与 Slot（与 ToggleGroup 同一
 * 机制）——一组格子里混搭两种形态没有任何正当场景。
 */

"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { cn } from "../../../utils/cn";
import { invalid } from "../../../styles/recipes";

export type InputOTPSize = "md" | "lg";

/*
 * 与上游的 `OTPInputContext` 分开两个 context：那个装的是取值状态（每格的字符、
 * 谁是活动格），由 input-otp 自己维护；这个只装外观档。合在一起就得去改上游的
 * provider，而档位是 DS 的事，与取值无关。
 */
const InputOTPSizeContext = React.createContext<InputOTPSize>("md");

/*
 * 分配式 Omit。
 *
 * 上游的 `OTPInputProps` 是个**判别联合**：要么 `{ render: fn; children?: never }`，
 * 要么 `{ render?: never; children: ReactNode }`。直接写 `Omit<联合, "size">` 会把
 * 两支**塌成一个对象类型**，`render` 与 `children` 同时变成可选——于是两支都不
 * 匹配，spread 回去报 `Type 'InputOTPRenderFn' is not assignable to type 'never'`。
 *
 * `T extends unknown ? ... : never` 让 Omit 逐支分配，联合的判别性保住。
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

export function InputOTP({
  className,
  containerClassName,
  size = "md",
  ...props
}: DistributiveOmit<React.ComponentProps<typeof OTPInput>, "size"> & {
  readonly containerClassName?: string;
  /**
   * 外观档，见文件头注释。默认 `md`。
   *
   * 这里要 `Omit` 掉上游的 `size`：它是原生 input 的 `size` 属性（number），
   * 与本档同名不同义。不 Omit 两者会交成 `never`，传什么都编译不过。而那个
   * 原生属性对 OTP 毫无意义——真正的 input 是隐藏的，宽度由格子决定。
   */
  readonly size?: InputOTPSize;
}) {
  return (
    /*
     * Provider 包在 OTPInput **外面**，children 仍由 props 透传，不在这里拦。
     * 上游的 children 允许是渲染函数，那个函数在 OTPInput 内部被调用，Provider
     * 在外层照样是它的祖先，两种写法都取得到档位。
     */
    <InputOTPSizeContext.Provider value={size}>
      <OTPInput
        data-slot="input-otp"
        data-size={size}
        containerClassName={cn(
          "flex items-center has-[:disabled]:opacity-disabled",
          size === "lg" ? "gap-md" : "gap-xs",
          containerClassName,
        )}
        className={cn("disabled:cursor-not-allowed", className)}
        {...props}
      />
    </InputOTPSizeContext.Provider>
  );
}

export function InputOTPGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const size = React.useContext(InputOTPSizeContext);
  return (
    <div
      data-slot="input-otp-group"
      data-size={size}
      /* md 档靠格子相邻拼成连体，组内不能留缝；lg 档每格独立，组内同样要留白。 */
      className={cn("flex items-center", size === "lg" && "gap-md", className)}
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
  const size = React.useContext(InputOTPSizeContext);

  return (
    <div
      data-slot="input-otp-slot"
      data-size={size}
      data-active={slot?.isActive}
      className={cn(
        "relative flex items-center justify-center",
        "border-control-border text-foreground shadow-raised",
        "outline-none transition-all duration-fast ease-standard",
        size === "lg"
          ? // 独立方格：四边自带框、自带圆角，不参与 first/last 的连体收边。
            "h-control-3xl w-control-3xl border rounded-xl text-body-xl"
          : // 连体格子：只画上下与右框，靠相邻格子补左框；首尾各收一边圆角。
            [
              "h-control-md w-control-md text-body-md",
              "border-y border-r first:rounded-l-md first:border-l last:rounded-r-md",
            ],
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
