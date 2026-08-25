/**
 * ConfirmDestructive.tsx - 破坏性动作的二次确认。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 这件存在的理由是：**「染红」和「拦一下」必须是同一个决定**。
 *
 * 在它之前，`danger: true` 是一个纯视觉开关——菜单项变红，点了照样立刻生效。
 * 红色让人以为「系统知道这很危险」，而系统其实什么都没做，这比不染红更糟。
 * 03 §3 早就写了「真正的拦截交给二次确认，不靠按钮颜色吓人」，05 §46 早就把
 * 确认文案钉成了三件套——但两条都只活在散文里，没有载体，于是只有读过文档的
 * 人写得出来。本件把那三条变成必填参数。
 *
 * 与 `AlertDialog` 的分工，照 `Dialog → DialogForm` 那一步：AlertDialog 是
 * 强制二选一的**容器**，本件是「破坏性确认」这个**契约**。契约共四项：
 * 动作名（verb）、对象（target）、后果一句（consequence）、前置条件
 * （preconditions）。标题与确认按钮的文案由前两项生成，调用方写不了「确定」
 * 这种没有动词的按钮。
 *
 * 前置条件带 `met` 而不只是文案（owner 2026-08-25 判）：opera 那几个删除框里
 * 写的「必须已下线、且没有入口或授权还在引用它」是**判据**，不是提示语；只把
 * 它渲染成文字等于把已经算出来的结论扔了。未满足即禁用确认按钮并标出是哪一
 * 条没过——到这一步「红」与「拦」才真的是同一个决定。
 */

import * as React from "react";
import { cn } from "../../../utils/cn";
import { Icon } from "../../../icons";
import { buttonVariants } from "../../base/form/Button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../base/overlay/AlertDialog";

/**
 * 一条前置条件。`met` 为假时确认按钮禁用——这一项不是提示语，是门闩。
 */
export interface DestructivePrecondition {
  /** 条件本身，正面陈述：「已下线」而不是「未下线」。未满足时由本件标红，
   *  文案不必自己变成否定句——同一条在满足与未满足两态下读起来要是同一句话。 */
  readonly label: string;
  readonly met: boolean;
}

/**
 * 破坏性确认的契约。`ActionMenuItem` / `BulkActionBarItem` 的 `confirm` 字段
 * 收的就是它，独立使用时由 `ConfirmDestructiveProps` 继承。
 */
export interface DestructiveConfirm {
  /** 动作名，必须是动词本身：「删除」「停用」「吊销」。同时进标题与确认按钮
   *  ——按钮上写「确定」是 05 §46 明令禁止的，这里从类型上就写不出来。 */
  readonly verb: string;
  /** 被作用的对象：「模型服务 gpt-4o-mini」。与 verb 拼成标题「{verb}{target}？」。 */
  readonly target: string;
  /** 后果一句话：「删除后不可恢复，已签发的密钥同时失效」。
   *  必填——写不出后果的动作，本来就不该染红。 */
  readonly consequence: string;
  /** 前置条件。任一条 `met: false` 则确认按钮禁用，并在列表里标出是哪条。 */
  readonly preconditions?: readonly DestructivePrecondition[];
  /** 取消钮文案。默认「取消」，改它的场合极少，留口是因为「保留」「暂不停用」
   *  这类反向措辞在某些动作上确实更准。 */
  readonly cancelLabel?: string;
  /**
   * 落锤。返回 Promise 时本件自己接管「处理中」态与关闭时机：成功才关，
   * 失败不关——用户得看见自己按的那一下没成。
   *
   * 失败本身不吞也不自己发明错误 UI：错误被重新抛出，落到应用自己的上报里。
   * 要出 Toast 就在 `onConfirm` 内部 catch 掉，那是产品的判断不是 DS 的。
   */
  readonly onConfirm: () => void | Promise<void>;
}

export interface ConfirmDestructiveProps extends DestructiveConfirm {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

function ConfirmDestructive({
  open,
  onOpenChange,
  verb,
  target,
  consequence,
  preconditions,
  cancelLabel = "取消",
  onConfirm,
}: ConfirmDestructiveProps) {
  const [pending, setPending] = React.useState(false);

  const blocked = preconditions?.some((item) => !item.met) ?? false;

  const handleConfirm = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      /* Radix 的 Action 默认是关闭触发器。异步落锤要等结果才能决定关不关，
         所以拦掉它的默认关闭，开合完全由本件的 open 受控。 */
      event.preventDefault();
      if (blocked || pending) return;

      const result = onConfirm();
      if (!(result instanceof Promise)) {
        onOpenChange(false);
        return;
      }
      setPending(true);
      result.then(
        () => {
          setPending(false);
          onOpenChange(false);
        },
        (error: unknown) => {
          setPending(false);
          throw error;
        },
      );
    },
    [blocked, pending, onConfirm, onOpenChange],
  );

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        /* 处理中不许关：落锤已经发出去了，这时候关掉对话框等于让用户以为
           自己取消了。Esc 与遮罩在 AlertDialog 上本来就不关，这里挡的是
           取消钮与程序化关闭。 */
        if (pending) return;
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{`${verb}${target}？`}</AlertDialogTitle>
          <AlertDialogDescription>{consequence}</AlertDialogDescription>
        </AlertDialogHeader>
        {preconditions && preconditions.length > 0 ? (
          <ul className="flex flex-col gap-2xs">
            {preconditions.map((item) => (
              <li
                key={item.label}
                className={cn(
                  "flex items-start gap-xs text-body-sm",
                  item.met ? "text-muted-foreground" : "text-destructive-text",
                )}
              >
                <Icon
                  name={item.met ? "check" : "x"}
                  size={16}
                  aria-hidden="true"
                  className="mt-3xs shrink-0"
                />
                <span className="min-w-0">{item.label}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive-strong" })}
            disabled={blocked || pending}
            /* 禁用态说清楚为什么——一个灰着的确认钮不给理由，用户只会反复点它。 */
            {...(blocked
              ? { title: "前置条件未满足，先处理上面标红的那几条" }
              : {})}
            onClick={handleConfirm}
          >
            {pending ? "处理中…" : verb}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { ConfirmDestructive };
