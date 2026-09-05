/**
 * FormPageTemplate.tsx - 整页表单骨架。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Template
 *
 * 页头 → 表单区（children，建议每组字段一个 Section）→ 可选动作条（footer，
 * 放提交 / 取消）。字段本身是业务形状，模板一概不管——这里只保证任何表单页
 * 的行长、节奏与动作条位置长得一样。
 *
 * 表单区不限宽（2026-08-12 撤掉原先的 `max-w-content-narrow-lg`）：与
 * `ListPageTemplate`（同样套 `ViewLayout`，不设 maxWidth，宽度交给外壳）
 * 满宽一致是明确要求的——原先"限宽利于阅读"的理由没错，但代价是同一个应用
 * 里表单页和列表页在同一侧栏下露出两种内容宽度，读者会当成两套系统。字段
 * 本身该多宽由调用方通过 grid/flex 自己控制（如 `products` 表单里的
 * `grid-cols-2`），不再由模板兜底限死。
 *
 * 动作条左右带 `px-lg` 内距：它与上方 Section（raised 档 `p-lg`）的内容左右
 * 对齐，按钮不再顶到内容区边缘（2026-09-05 owner 走查：账号页 / 租户页动作条
 * "左右没有缩进，直接顶头"）。
 *
 * 非粘底：动作条与表单区之间是虚线上边框（hairline.field）：060 的线型语义——
 * 实线开区块，虚线分行 / 分字段；动作条属于表单的收束行，不是新板块。
 *
 * `sticky` 打开时动作条粘底：长表单滚到哪里都能提交。粘底条**是一个浮起的
 * 表面**而不是页面底色的延续：`bg-card + ring-1 ring-foreground/10 +
 * shadow-sticky`，与 Section raised 档同一套高度语汇（`--shadow-sticky` 就是
 * 为粘住的条留的那一档）。此前只补 `bg-background`，条与页面同色，滚动时
 * 看不出它是浮着的（2026-09-05 owner 走查）。不做"贴底才变色"的滚动侦测：
 * 页面短到不滚时它本来就落在内容末尾，浮起的样子同样成立，省掉一个观察者。
 *
 * 响应式：动作条 flex-wrap，窄屏按钮多时折行。
 */

import * as React from "react";
import { cn } from "../../utils/cn";
import { hairline } from "../../styles/recipes";
import { ViewLayout } from "../layout/ViewLayout";

export interface FormPageTemplateProps {
  /** 页头槽，通常是 ViewHeader。 */
  readonly header?: React.ReactNode;
  /** 表单区，建议每组字段一个 Section。 */
  readonly children: React.ReactNode;
  /** 动作条槽：提交 / 取消一类的按钮。 */
  readonly footer?: React.ReactNode;
  /** 动作条粘底，长表单用。 */
  readonly sticky?: boolean;
  readonly className?: string;
}

export function FormPageTemplate({
  header,
  children,
  footer,
  sticky = false,
  className,
}: FormPageTemplateProps) {
  return (
    <ViewLayout {...(className !== undefined ? { className } : {})}>
      {header}
      <div className="flex w-full flex-col gap-xl">
        {children}
        {footer ? (
          <div
            className={cn(
              "flex flex-wrap items-center justify-end gap-sm px-lg pt-lg",
              sticky
                ? "sticky bottom-0 rounded-t-xl bg-card pb-lg shadow-sticky ring-1 ring-foreground/10"
                : cn("border-t", hairline.field),
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </ViewLayout>
  );
}
