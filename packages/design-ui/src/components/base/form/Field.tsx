/**
 * Field.tsx - 表单行标准件（shadcn 惯例，取其核心子集）。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Form
 *
 * 一行表单的四件套一次定齐：Label + 控件 + Description + Error 的间距、字级、
 * 颜色不再各表单各写。这是 DialogForm / FormPageTemplate 底下缺的那一层。
 *
 * 刻意不引 react-hook-form（上游 Form 组件的路线）：UI 层零表单框架绑定，
 * Field 只出 markup 与视觉，校验框架产品侧自选——错误信息经 `<FieldError>`
 * 或控件的 `aria-invalid` 进来，两条路都走标准无障碍属性。
 *
 * 上游的 FieldSet / FieldLegend / responsive orientation 未收：产品尚无实据，
 * 等出现再补（收录看实据不看设想）。
 */

import * as React from "react";
import { cn } from "../../../utils/cn";
import { Icon } from "../../../icons";
import { interactive } from "../../../styles/recipes";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../overlay/Tooltip";
import { Label } from "./Label";

/** 方向档的**运行时数组**，类型由它推导。 */
export const FIELD_ORIENTATIONS = [
  "vertical",
  "horizontal",
  "labeled",
] as const;

export type FieldOrientation = (typeof FIELD_ORIENTATIONS)[number];

/** `labeled` 的标签轨道宽三档（token `--spacing-field-label-*`）。 */
export const FIELD_LABEL_WIDTHS = ["sm", "md", "lg"] as const;

export type FieldLabelWidth = (typeof FIELD_LABEL_WIDTHS)[number];

const LABEL_WIDTH_CLASS: Record<FieldLabelWidth, string> = {
  sm: "grid-cols-[var(--spacing-field-label-sm)_minmax(0,1fr)]",
  md: "grid-cols-[var(--spacing-field-label-md)_minmax(0,1fr)]",
  lg: "grid-cols-[var(--spacing-field-label-lg)_minmax(0,1fr)]",
};

const ORIENTATION_CLASS: Record<FieldOrientation, string> = {
  /** 默认：标签在上。 */
  vertical: "flex flex-col gap-xs",
  /** 开关行、复选行：控件与标签同行。**控件必须是窄的**（Switch / Checkbox）——
      `w-full` 的输入框会把中文标签在 flex 里压到 min-content，一字宽竖排。 */
  horizontal: "flex flex-row items-center gap-sm",
  /**
   * 标签左、控件右的**网格**行：轨道宽由 token 定，不由内容定，所以标签不会塌。
   *
   * 与 `horizontal` 的区别只有一个但很要紧：flex 的项会按内容收缩，grid 的轨道不会。
   * 说明文字与错误信息落在第二列（跟控件对齐，不跟标签对齐）——一行说明缩进到
   * 标签下方会读成「这是标签的注解」，而它注解的是控件。
   */
  labeled: "grid items-center gap-x-md gap-y-2xs",
};

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly orientation?: FieldOrientation;
  /** 仅 `labeled` 有意义：标签轨道宽。默认 md（9rem）。 */
  readonly labelWidth?: FieldLabelWidth;
  /**
   * 在两列的 `FieldGroup` 里占满整行。给长文本、JSON、说明性长控件用——它们塞进半列
   * 只会换行换到读不下去。单列编组里无效果。
   */
  readonly span?: "full";
}

export function Field({
  orientation = "vertical",
  labelWidth = "md",
  span,
  className,
  ...props
}: FieldProps) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(
        "w-full min-w-0",
        ORIENTATION_CLASS[orientation],
        orientation === "labeled" && LABEL_WIDTH_CLASS[labelWidth],
        /* labeled：标签占第一列并右对齐到轨道末尾（控件左缘成一条竖线）；
           说明 / 错误跳过标签列，落在控件正下方。 */
        orientation === "labeled" &&
          "[&>[data-slot=field-label]]:col-start-1 [&>[data-slot=field-label]]:justify-end",
        orientation === "labeled" &&
          "[&>[data-slot=field-description]]:col-start-2 [&>[data-slot=field-error]]:col-start-2",
        // 失效态经 data-invalid 从 Field 下发：标签随控件一起变色，
        // 只红输入框会让用户找不到是哪一行错了。
        "data-[invalid=true]:[&_[data-slot=field-label]]:text-destructive-text",
        // 带帮助图标时标签文字在内层（外层 span 才是 field-label），颜色要落到文字上。
        "data-[invalid=true]:[&_[data-slot=field-label-text]]:text-destructive-text",
        span === "full" && "col-span-full",
        className,
      )}
      {...props}
    />
  );
}

export interface FieldGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * 一行几个字段。默认 1。
   *
   * `2` 是注册 / 编辑类表单的常态（owner 2026-09-15：「一行两条，保持足够的 gap」），
   * 只在 `DialogForm` 的 `lg` / `xl` 挡里用——`sm` 面板半列放不下一个输入框。
   * 行距与列距同为 `lg`：两列之间比一列之内的行距更窄，眼睛会把左右两个字段读成一个。
   * 需要占满整行的字段给 `<Field span="full">`。
   */
  readonly columns?: 1 | 2;
}

/** 多行表单的编组：行距一次定齐（表单密度只在这里调，不散落在行间）。 */
export function FieldGroup({
  columns = 1,
  className,
  ...props
}: FieldGroupProps) {
  return (
    <div
      data-slot="field-group"
      data-columns={columns}
      className={cn(
        columns === 2
          ? "grid w-full grid-cols-2 gap-x-lg gap-y-lg"
          : "flex w-full flex-col gap-lg",
        className,
      )}
      {...props}
    />
  );
}

export interface FieldLabelProps extends React.ComponentProps<typeof Label> {
  /**
   * 必填：标签后一个星号，读屏念 `requiredLabel`。
   *
   * 此前各表单把「（必填）」写进标签文字里——有的写有的不写，而且看不出哪些是选填
   * （owner 2026-09-15：「同时体现必填项」）。只标必填、不标选填：必填是少数时标出少数。
   */
  readonly required?: boolean;
  /** 星号的读屏文案。默认 `Required`。 */
  readonly requiredLabel?: string;
  /**
   * 字段说明，收进标签后的帮助图标，悬停或聚焦时出现。
   *
   * 常驻在控件下方的 `FieldDescription` 会把一张表单拉高一倍，于是对话框常态就要滚
   * （owner 2026-09-15：「把提示信息收进帮助 icon」）。**会随输入变化的提示**（剩余
   * 字数、校验结果）不属于这里，仍用 `FieldDescription` / `FieldError`。
   */
  readonly hint?: React.ReactNode;
  /** 帮助图标的可访问名。默认 `More information`。 */
  readonly hintLabel?: string;
}

export function FieldLabel({
  className,
  required = false,
  requiredLabel = "Required",
  hint,
  hintLabel = "More information",
  children,
  ...props
}: FieldLabelProps) {
  const text = (
    <Label
      data-slot={hint ? "field-label-text" : "field-label"}
      className={cn("w-fit", className)}
      {...props}
    >
      {children}
      {required ? (
        <>
          <span aria-hidden="true" className="text-destructive-text">
            *
          </span>
          <span className="sr-only">{requiredLabel}</span>
        </>
      ) : null}
    </Label>
  );

  if (!hint) return text;

  /* 帮助钮不能放进 <label> 里：点它会把焦点交给控件，而读屏会把钮的名字念进标签。
     所以外层 span 接过 `field-label` 这个槽（labeled 方向的网格定位认的是它）。
     自带 TooltipProvider：不是每个消费方都在根上挂了一个，缺了它 Tooltip 直接抛。 */
  return (
    <span data-slot="field-label" className="flex w-fit items-center gap-2xs">
      {text}
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={hintLabel}
              data-slot="field-hint"
              className={cn(
                interactive,
                "inline-flex size-control-2xs shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon name="help" size="sm" aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{hint}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </span>
  );
}

export function FieldDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="field-description"
      className={cn("text-body-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

/**
 * 错误信息。有内容才渲染；`role="alert"` 让读屏在错误出现的当下播报，
 * 而不是等用户巡航到这一行。
 */
export function FieldError({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  if (children === undefined || children === null || children === false) {
    return null;
  }
  return (
    <p
      role="alert"
      data-slot="field-error"
      className={cn("text-body-sm text-destructive-text", className)}
      {...props}
    >
      {children}
    </p>
  );
}
