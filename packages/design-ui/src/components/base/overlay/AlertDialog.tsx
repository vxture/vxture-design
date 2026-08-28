/**
 * AlertDialog.tsx - 阻断式确认对话框。
 * @package @vxture/design-ui
 *
 * @copyright Vxture Team
 * @layer Presentation
 * @category Components - Floating
 *
 * 结构照 shadcn 官方 AlertDialog，取值换成 T2 语义类。与 Dialog 的分工：
 * Dialog 是可以随手关掉的容器，AlertDialog 要求用户**表态**。两处差别：
 *
 *   · **没有 X 关闭钮**——顺手一点就溜走的出口不该存在
 *   · **点遮罩不关**（Radix AlertDialog 原语自身的行为）——误点不该等于放弃
 *
 * ⚠ **Esc 仍然关得掉**，这是有意的，不是漏网。原注写的「Esc 与点遮罩也不关」
 * 错了一半（2026-08-26 写浮层族回归测试时实测：Esc 触发 onOpenChange，外点不
 * 触发）。而这个行为是**对的**：没有键盘出路的模态是键盘陷阱，读屏与纯键盘
 * 用户会被锁死在里面。「要求表态」靠的是拿掉随手可点的出口，不是堵死所有出口。
 *
 * Action / Cancel 不重写按钮样式，直接引 Button 的 `buttonVariants`——上游同款
 * 做法。落锤动作若不可撤销，调用方给 Action 传
 * `buttonVariants({ variant: "destructive-strong" })`。
 */

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "../../../utils/cn";
import { overlayMotion, panel } from "../../../styles/recipes";
import { buttonVariants } from "../form/Button";

export interface AlertDialogProps extends React.ComponentPropsWithoutRef<
  typeof AlertDialogPrimitive.Root
> {}

export interface AlertDialogTriggerProps extends React.ComponentPropsWithoutRef<
  typeof AlertDialogPrimitive.Trigger
> {}

export interface AlertDialogPortalProps extends React.ComponentPropsWithoutRef<
  typeof AlertDialogPrimitive.Portal
> {}

export interface AlertDialogOverlayProps extends React.ComponentPropsWithoutRef<
  typeof AlertDialogPrimitive.Overlay
> {}

export interface AlertDialogContentProps extends React.ComponentPropsWithoutRef<
  typeof AlertDialogPrimitive.Content
> {}

export interface AlertDialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface AlertDialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface AlertDialogTitleProps extends React.ComponentPropsWithoutRef<
  typeof AlertDialogPrimitive.Title
> {}

export interface AlertDialogDescriptionProps extends React.ComponentPropsWithoutRef<
  typeof AlertDialogPrimitive.Description
> {}

export interface AlertDialogActionProps extends React.ComponentPropsWithoutRef<
  typeof AlertDialogPrimitive.Action
> {}

export interface AlertDialogCancelProps extends React.ComponentPropsWithoutRef<
  typeof AlertDialogPrimitive.Cancel
> {}

const AlertDialog = AlertDialogPrimitive.Root;

const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = React.forwardRef<
  HTMLDivElement,
  AlertDialogOverlayProps
>(function AlertDialogOverlay({ className, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Overlay
      ref={ref}
      className={cn(
        "fixed inset-0 z-modal bg-scrim",
        // 同 Dialog：虚化传达"下层已失效"，不支持的浏览器只是少一层虚化。
        "supports-backdrop-filter:backdrop-blur-xs",
        "duration-fast data-[state=open]:animate-in data-[state=open]:fade-in-0",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className,
      )}
      {...props}
    />
  );
});

const AlertDialogContent = React.forwardRef<
  HTMLDivElement,
  AlertDialogContentProps
>(function AlertDialogContent({ className, ...props }, ref) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        ref={ref}
        className={cn(
          // 同 Dialog：`max-w-lg` 会命中 --spacing-lg 而非面板宽，必须走 panel 族。
          "fixed left-[50%] top-[50%] z-modal grid w-full max-w-panel-md",
          "translate-x-[-50%] translate-y-[-50%] gap-lg p-xl outline-none",
          panel.base,
          panel.dialog,
          overlayMotion,
          className,
        )}
        {...props}
      />
    </AlertDialogPortal>
  );
});

const AlertDialogHeader = ({ className, ...props }: AlertDialogHeaderProps) => (
  <div
    className={cn(
      "flex flex-col space-y-xs text-center sm:text-left",
      className,
    )}
    {...props}
  />
);

const AlertDialogFooter = ({ className, ...props }: AlertDialogFooterProps) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-sm",
      className,
    )}
    {...props}
  />
);

const AlertDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  AlertDialogTitleProps
>(function AlertDialogTitle({ className, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Title
      ref={ref}
      className={cn(
        // `leading-none` 在 Tailwind 里就是 `line-height: 1`，这里是上游原样。
        // 2026-08-28 之前它被解析成 0（tokens 把字面词 `none` 注册进了 spacing
        // 命名空间，见 design-tokens `theme.css`），标题高度归零、与下面的
        // `DialogDescription` 叠字；三个门户 18 处标题受影响。那一档已摘掉，
        // 这行现在按原义生效——**不要**改写成 `leading-[1]` 之类来"绕开"，
        // 那会把问题重新藏进调用点。
        "text-lg font-semibold leading-none tracking-tight",
        className,
      )}
      {...props}
    />
  );
});

const AlertDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  AlertDialogDescriptionProps
>(function AlertDialogDescription({ className, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Description
      ref={ref}
      className={cn("text-body-sm text-muted-foreground", className)}
      {...props}
    />
  );
});

const AlertDialogAction = React.forwardRef<
  HTMLButtonElement,
  AlertDialogActionProps
>(function AlertDialogAction({ className, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Action
      ref={ref}
      className={cn(buttonVariants(), className)}
      {...props}
    />
  );
});

const AlertDialogCancel = React.forwardRef<
  HTMLButtonElement,
  AlertDialogCancelProps
>(function AlertDialogCancel({ className, ...props }, ref) {
  return (
    <AlertDialogPrimitive.Cancel
      ref={ref}
      className={cn(buttonVariants({ variant: "outline" }), className)}
      {...props}
    />
  );
});

AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;
AlertDialogHeader.displayName = "AlertDialogHeader";
AlertDialogFooter.displayName = "AlertDialogFooter";
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;
AlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName;
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
