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
 * 两根独立的轴：
 * - **尺寸** `size`：`md`（默认，control-md 见方，表单行里与其他控件同高）/
 *   `lg`（control-3xl 见方，「整屏只干这一件事」的验证弹窗用）。
 * - **形态** `variant`：`joined`（连体——相邻格共用边框，首尾收圆角）/
 *   `separate`（独立方格——每格四边框、自带圆角，格间 gap-xs）。不传时按尺寸取
 *   缺省：md 连体、lg 独立（两档加入时的原样）。
 *
 * 两轴分开是因为出现了「md 也要独立方格」的实据：8 位验证码按 4-4 分组，组内
 * 格子不能连着，组间用「-」隔开（owner 2026-09-25）。此前形态绑死在尺寸上，
 * md 只能连体。
 *
 * 独立方格的格间距 gap-xs（默认密度 8px）照 Figma（2232:10415 / 2232:10450）；
 * lg 此前是 gap-md（16px）。
 *
 * 档位定在 `InputOTP` 上、经 context 下发给 Group / Slot / Separator（与
 * ToggleGroup 同一机制）——一组格子里混搭两种形态没有任何正当场景。
 */

"use client";

import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { cn } from "../../../utils/cn";
import { invalid } from "../../../styles/recipes";

export type InputOTPSize = "md" | "lg";
export type InputOTPVariant = "joined" | "separate";

interface InputOTPLook {
  readonly size: InputOTPSize;
  readonly variant: InputOTPVariant;
}

/*
 * 与上游的 `OTPInputContext` 分开两个 context：那个装的是取值状态（每格的字符、
 * 谁是活动格），由 input-otp 自己维护；这个只装外观档。合在一起就得去改上游的
 * provider，而档位是 DS 的事，与取值无关。
 */
const InputOTPLookContext = React.createContext<InputOTPLook>({
  size: "md",
  variant: "joined",
});

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
  variant: variantProp,
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
  /** 形态，见文件头注释。不传时 md 连体、lg 独立。 */
  readonly variant?: InputOTPVariant;
}) {
  const variant = variantProp ?? (size === "lg" ? "separate" : "joined");
  const look = React.useMemo(() => ({ size, variant }), [size, variant]);
  return (
    /*
     * Provider 包在 OTPInput **外面**，children 仍由 props 透传，不在这里拦。
     * 上游的 children 允许是渲染函数，那个函数在 OTPInput 内部被调用，Provider
     * 在外层照样是它的祖先，两种写法都取得到档位。
     */
    <InputOTPLookContext.Provider value={look}>
      <OTPInput
        data-slot="input-otp"
        data-size={size}
        data-variant={variant}
        containerClassName={cn(
          "flex items-center gap-xs has-[:disabled]:opacity-disabled",
          containerClassName,
        )}
        className={cn("disabled:cursor-not-allowed", className)}
        {...props}
      />
    </InputOTPLookContext.Provider>
  );
}

export function InputOTPGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { size, variant } = React.useContext(InputOTPLookContext);
  return (
    <div
      data-slot="input-otp-group"
      data-size={size}
      data-variant={variant}
      /* 连体靠格子相邻拼成一条，组内不能留缝；独立方格组内同样要留白。 */
      className={cn(
        "flex items-center",
        variant === "separate" && "gap-xs",
        className,
      )}
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
  const { size, variant } = React.useContext(InputOTPLookContext);

  return (
    <div
      data-slot="input-otp-slot"
      data-size={size}
      data-variant={variant}
      data-active={slot?.isActive}
      className={cn(
        "relative flex items-center justify-center",
        "border-control-border text-foreground shadow-raised",
        "outline-none transition-all duration-fast ease-standard",
        size === "lg"
          ? "h-control-3xl w-control-3xl text-body-xl"
          : "h-control-md w-control-md text-body-md",
        variant === "separate"
          ? // 独立方格：四边自带框、自带圆角，不参与 first/last 的连体收边。
            ["border", size === "lg" ? "rounded-xl" : "rounded-md"]
          : // 连体格子：只画上下与右框，靠相邻格子补左框；首尾各收一边圆角。
            [
              "border-y border-r first:border-l",
              size === "lg"
                ? "first:rounded-l-xl last:rounded-r-xl"
                : "first:rounded-l-md last:rounded-r-md",
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

/**
 * 分组连接符（1234-5678 中间那一杠）。字号跟随档位：lg 的格子里是 body-xl 的
 * 数字，一杠还是正文字号就会细得像没画。
 */
export function InputOTPSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { size } = React.useContext(InputOTPLookContext);
  return (
    <div
      role="separator"
      data-slot="input-otp-separator"
      className={cn(
        "px-2xs text-muted-foreground",
        size === "lg" ? "text-body-xl" : "text-body-md",
        className,
      )}
      {...props}
    >
      -
    </div>
  );
}
