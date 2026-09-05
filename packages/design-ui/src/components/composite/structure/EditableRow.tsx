/**
 * EditableRow.tsx - 可编辑字段行：展示态是文字，点「修改」才变成控件。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 收录依据（owner 2026-09-05 走查 console 账号信息页 / 租户信息页）：详情页里
 * "能改的字段"此前用**禁用的输入框**当展示——禁用态在视觉语义上是"这个控件
 * 不能用"，字是淡的，整页读起来就是一页灰字。这不是调颜色的事，是用错了状态。
 * 定的规则覆盖整个网站：**展示即文本，激活修改才变成输入框**。四个门户凡是
 * "详情页里能改的字段"都换用本件，各门户不再各写一遍。
 *
 * 长在 `DetailList` 里（它就是一个带编辑态的 `DetailRow`，`<dt>`/`<dd>` 语义
 * 照旧），所以字段名列宽、行间虚线、窄屏堆叠都与只读行一致——同一张卡里只读行
 * 与可改行混排，看不出两套。
 *
 * 状态由调用方持有（`editing` + `onEdit` / `onCancel`）：一页里哪几行在改、
 * 改动怎么随页底"保存"一起提交，是页面的事；本件只管"这一行现在长什么样"。
 * 文案（修改 / 取消）也由调用方传——DS 零文案，各门户走各自的 i18n。
 *
 * 两条易退化的细节在这里钉死：
 * - **高度不跳**：文本行按控件高度（`min-h-control-md`）撑住，切换到输入框时
 *   行的位置不动。
 * - **空值有占位**：`value` 为空时画 `emptyText`（默认 "—"），不留一个空行。
 *
 * `action` 可以整体替换默认的修改 / 取消（例如已认证的名称，操作是"重新认证"
 * 而不是修改）；`readOnly` 则连操作都不出，只剩展示态——没权限的人看到的就是
 * 一行文字。提示文字（`hint`）放在值 / 控件的**后面**而不是下面。
 */

import * as React from "react";
import { cn } from "../../../utils/cn";
import { Button } from "../../base/form/Button";
import { Icon } from "../../../icons";
import { DetailRow } from "./DetailList";

export interface EditableRowLabels {
  /** 「修改」按钮文案。 */
  readonly edit: string;
  /** 「取消」按钮文案。 */
  readonly cancel: string;
}

export interface EditableRowProps {
  /** 字段名。与 DetailRow 一样收为 string。 */
  readonly label: string;
  /** 展示态内容。为 null / undefined / 空串时画 `emptyText`。 */
  readonly value: React.ReactNode;
  /** 空值占位，默认 "—"。 */
  readonly emptyText?: string;
  /** 是否处于编辑态。 */
  readonly editing: boolean;
  /** 点「修改」。 */
  readonly onEdit?: () => void;
  /** 点「取消」。 */
  readonly onCancel?: () => void;
  /** 修改 / 取消的文案（DS 零文案，由门户传入）。 */
  readonly labels: EditableRowLabels;
  /** 编辑态内容：输入框、下拉、分段控件……由调用方给。 */
  readonly children: React.ReactNode;
  /** 整体替换默认的修改 / 取消（如「重新认证」）；传 null 表示这一行没有操作。 */
  readonly action?: React.ReactNode;
  /** 只读：不出任何操作，只有展示态。 */
  readonly readOnly?: boolean;
  /** 「修改」按钮禁用（如页面加载中）。 */
  readonly disabled?: boolean;
  /** 放在值 / 控件后面的提示文字。 */
  readonly hint?: React.ReactNode;
  readonly className?: string;
}

function isEmpty(value: React.ReactNode): boolean {
  return (
    value === null ||
    value === undefined ||
    value === false ||
    (typeof value === "string" && value.trim() === "")
  );
}

export function EditableRow({
  label,
  value,
  emptyText = "—",
  editing,
  onEdit,
  onCancel,
  labels,
  children,
  action,
  readOnly = false,
  disabled = false,
  hint,
  className,
}: EditableRowProps) {
  let actions: React.ReactNode = null;
  if (!readOnly) {
    if (action !== undefined) {
      actions = action;
    } else if (editing) {
      actions = (
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {labels.cancel}
        </Button>
      );
    } else {
      actions = (
        <Button variant="ghost" size="sm" disabled={disabled} onClick={onEdit}>
          <Icon name="edit" size="xs" fallback="placeholder" />
          <span>{labels.edit}</span>
        </Button>
      );
    }
  }

  return (
    <DetailRow
      label={label}
      actions={actions}
      data-editing={editing ? "true" : undefined}
      {...(className !== undefined ? { className } : {})}
    >
      <span
        className={cn(
          "flex min-h-control-md w-full flex-wrap items-center gap-md",
        )}
      >
        {editing ? (
          children
        ) : (
          <span
            className={cn(
              "text-body-md",
              isEmpty(value) ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {isEmpty(value) ? emptyText : value}
          </span>
        )}
        {hint ? (
          <span className="text-body-sm text-muted-foreground">{hint}</span>
        ) : null}
      </span>
    </DetailRow>
  );
}
