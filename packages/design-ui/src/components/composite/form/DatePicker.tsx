"use client";

/**
 * DatePicker.tsx - 日期选择。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 上游把 date picker 当组合示例（Button + Popover + Calendar）不出成品件，
 * 这里落成 pattern。展示格式用 Intl.DateTimeFormat("zh-CN")——格式化是平台
 * 自带的能力，不为一行日期引 date-fns。
 *
 * onValueChange 会收到 undefined：再点已选中的那天是取消选择，这是日历的
 * 原生语义，吞掉它调用方就做不出"可清空"的字段。
 */

import * as React from "react";
import { cn } from "../../../utils/cn";
import { Icon } from "../../../icons";
import { Button } from "../../base/form/Button";
import { Calendar } from "../../base/display/Calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../base/overlay/Popover";

export interface DatePickerProps {
  readonly value?: Date;
  readonly onValueChange?: (value?: Date) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly className?: string;
}

const formatter = new Intl.DateTimeFormat("zh-CN", { dateStyle: "long" });

export function DatePicker({
  value,
  onValueChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn("justify-start", className)}
        >
          <Icon name="calendar" size={16} data-icon="inline-start" />
          {value ? (
            formatter.format(value)
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          /* `defaultMonth` 与 `selected` 必须同时给:只给 selected 时
             react-day-picker 把显示月份落在**今天**,于是选了 8 月 20 日的人
             下次打开看到的是当月,得自己往回翻(2026-09-07 实测)。这条此前有
             测试覆盖却一直是绿的——它把值写死成"今天所在的月",判据跟着系统
             时钟走,跨月才现形。 */
          {...(value !== undefined
            ? { selected: value, defaultMonth: value }
            : {})}
          onSelect={(next) => {
            onValueChange?.(next);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
