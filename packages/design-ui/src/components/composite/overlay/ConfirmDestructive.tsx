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
 * 一条前置条件。
 *
 * `met` 是**门闩**：为假则确认按钮禁用。它不是提示语。
 *
 * `unknown` 只管**显示**，不参与门闩——这两件事分开是有意的。「读不到检查单
 * 时挡住还是放行」是产品的风险判断（opera 判「门槛失效必须失效在保守那一侧」，
 * 另一个产品判「读不到就放行、只提示」并不比它蠢），DS 收下这一条就等于把
 * 风险偏好焊了进来，正是 `tone.ts` 拒绝过的那类事。所以放不放行由调用方在
 * `met` 上表态，本件只负责把「查不到」和「确认没满足」在视觉上分开——
 * 后者是红叉，前者是灰问号。
 *
 * 三态本身不是业务：`Checkbox` 的半选态早就承认了「布尔说不出的第三态」是形状
 * 问题。少了它，`met: false` 会让界面说假话——「服务已下线」被划掉标红，而事实
 * 是我们根本没查到它下没下线，运营会跑去下线一个已经下线的服务。
 */
export interface DestructivePrecondition {
  /** 条件本身，正面陈述：「已下线」而不是「未下线」。未满足时由本件标出，
   *  文案不必自己变成否定句——同一条在满足与未满足两态下读起来要是同一句话。 */
  readonly label: string;
  /** 门闩。为假则禁用确认钮。查不到时填什么由调用方的风险判断决定。 */
  readonly met: boolean;
  /** 这一条的真值查不到（上游挂了、超时、无权读）。只改图标与配色，不改门闩。 */
  readonly unknown?: boolean;
  /**
   * 附在条件下方的一句说明，调用方给。
   *
   * 本件不内建默认文案：「读不到，按未满足处理」这句话本身就断言了保守政策，
   * 而那是产品的判断。`unknown` 为真时强烈建议给一句——只显示一个灰问号而不
   * 说为什么，和标错红叉一样让人猜。
   */
  readonly note?: string;
}

/**
 * 破坏性确认的契约。`ActionMenuItem` / `BulkActionBarItem` 的 `confirm` 字段
 * 收的就是它，独立使用时由 `ConfirmDestructiveProps` 继承。
 */
export interface DestructiveConfirm {
  /** 动作名，必须是动词本身：「删除」「停用」「吊销」。同时进标题与确认按钮
   *  ——按钮上写「确定」是 05 §46 明令禁止的，这里从类型上就写不出来。 */
  readonly verb: string;
  /** 被作用的对象：「模型服务 gpt-4o-mini」。与 verb 一起填进 `titleTemplate`。 */
  readonly target: string;
  /** 后果一句话：「删除后不可恢复，已签发的密钥同时失效」。
   *  必填——写不出后果的动作，本来就不该染红。 */
  readonly consequence: string;
  /** 前置条件。任一条 `met: false` 则确认按钮禁用，并在列表里标出是哪条。 */
  readonly preconditions?: readonly DestructivePrecondition[];
  /**
   * 标题拼法。默认 `"{verb}{target}？"`，即 05 §46 的中文句式。
   *
   * 开这个口是因为 4.0 在这里越了界：件直接拼 `${verb}${target}？`，于是
   * **DS 替调用方决定了语序和标点**——英文下会渲染成 `Deletemodel service？`
   * （动词与对象之间没有空格，句尾一个全角问号），而调用方无论如何覆盖不掉。
   * 一个门户说什么语言是产品的决定，DS 本就不该握着它。英文传
   * `"{verb} {target}?"`。
   *
   * `verb` / `target` 仍是必填：契约要的是「标题由动词加对象构成、按钮用动词
   * 本身」这条**形状**，不是某一种语言的语序。形状留在 DS，语法交还调用方。
   */
  readonly titleTemplate?: string;
  /** 取消钮文案。默认「取消」，改它的场合极少，留口是因为「保留」「暂不停用」
   *  这类反向措辞在某些动作上确实更准。 */
  readonly cancelLabel?: string;
  /** 落锤进行中的按钮文案。默认「处理中…」，与 `DialogForm` 同。 */
  readonly pendingLabel?: string;
  /** 确认钮因前置条件未满足而禁用时的悬停说明。默认见实现。 */
  readonly blockedHint?: string;
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
  titleTemplate = "{verb}{target}？",
  cancelLabel = "取消",
  pendingLabel = "处理中…",
  blockedHint = "前置条件未满足，先处理上面未通过的那几条",
  onConfirm,
}: ConfirmDestructiveProps) {
  const [pending, setPending] = React.useState(false);

  const blocked = preconditions?.some((item) => !item.met) ?? false;

  /* 只替换这两个槽位，不引模板引擎：多出来的花括号原样留着，调用方看得见自己
     写错了。静默吞掉未知槽位会让 "{verb} {targt}?" 这种笔误变成没有对象的标题。 */
  const title = titleTemplate
    .replaceAll("{verb}", verb)
    .replaceAll("{target}", target);

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
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{consequence}</AlertDialogDescription>
        </AlertDialogHeader>
        {preconditions && preconditions.length > 0 ? (
          <ul className="flex flex-col gap-2xs">
            {preconditions.map((item) => (
              <li
                key={item.label}
                className={cn(
                  "flex items-start gap-xs text-body-sm",
                  /* 查不到走中性灰,不走红:红叉是「确认了没满足」,而这一条我们
                     没查到。unknown 优先于 met——即使调用方判了放行(met: true),
                     显示上仍要说清楚这是没查到,不能画成对勾。 */
                  item.unknown
                    ? "text-muted-foreground"
                    : item.met
                      ? "text-muted-foreground"
                      : "text-destructive-text",
                )}
              >
                <Icon
                  name={item.unknown ? "help" : item.met ? "check" : "x"}
                  size={16}
                  aria-hidden="true"
                  className="mt-3xs shrink-0"
                />
                <span className="min-w-0">
                  {item.label}
                  {item.note ? (
                    <span className="block text-body-sm text-muted-foreground">
                      {item.note}
                    </span>
                  ) : null}
                </span>
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
            {...(blocked ? { title: blockedHint } : {})}
            onClick={handleConfirm}
          >
            {pending ? pendingLabel : verb}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { ConfirmDestructive };
