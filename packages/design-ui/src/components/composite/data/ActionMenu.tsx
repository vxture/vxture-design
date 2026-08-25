/**
 * ActionMenu.tsx - 行操作菜单（表格行尾的"⋮"）。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Pattern
 *
 * 数据驱动：调用方给 `items`，不给 markup。触发器形态、危险项配色、分隔位置都由
 * 本件固定，各处不会长得不一样。
 *
 * 相对原实现：`icon` 从 `ReactNode` 收为 `IconName`——传 node 等于把图标尺寸和
 * 颜色的决定权交回调用方，行内菜单最容易在这里长歪；删 `triggerClassName` /
 * `contentClassName` / `triggerProps` 三个逃生口。
 *
 * ## danger 必须带确认（4.0 起）
 *
 * `danger` 曾是个纯视觉开关：项变红，点了立刻生效。红色让运营以为「系统知道这
 * 很危险」，而系统其实什么都没做——视觉上警告、行为上不设防，凑在一起比不染红
 * 更危险。默认值也是反的：不写确认零成本，写确认要自己拼一整个对话框。
 *
 * 现在 `ActionMenuItem` 是判别联合，`danger: true` 必须二选一：
 *   - `confirm`：一份 `DestructiveConfirm` 契约，本件自己渲染确认框；
 *   - `confirmExempt`：一句**理由**，说明这一项为什么不需要拦。
 *
 * 判据放进类型而不是 guardrail 脚本，是因为 `scripts/guardrails/check-*` 的
 * 消费方那一半扫的是 `portals/**`，本仓没有这个目录（见 check-design-system.mjs
 * 头注释）——lint 规则不跟着 npm 包走，类型跟着包走。豁免用带理由的字符串而不是
 * `confirm: false`，是为了让它**可清点**：`grep -rn confirmExempt` 列全所有已
 * 声明豁免的红色动作，这比报错更有用，因为它给的是清单不是错误。
 *
 * 但清单只在本件与 `BulkActionBar` 的范围内完整——**够不到裸的
 * `<Button variant="destructive">`**。完整口径要两条 grep 一起看，见 03 §3。
 */

import * as React from "react";
import { cn } from "../../../utils/cn";
import { Icon, type IconName } from "../../../icons";
import { Button } from "../../base/form/Button";
import {
  ConfirmDestructive,
  type DestructiveConfirm,
} from "../overlay/ConfirmDestructive";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../base/overlay/DropdownMenu";

interface ActionMenuItemBase {
  readonly id: string;
  readonly label: React.ReactNode;
  readonly icon?: IconName;
  readonly disabled?: boolean;
  /**
   * 悬停说明，落到原生 `title`。主要用途是**讲清楚这一项为什么灰着**——
   * 禁用项不说理由，用户只能猜，而这一层信息在菜单里没有别的地方可放。
   */
  readonly hint?: string | undefined;
  /** 在本项之前插一条分隔线，用于把危险动作与常规动作分开。 */
  readonly separatorBefore?: boolean;
}

/** 常规项：不染红，点了直接生效。 */
interface ActionMenuItemPlain extends ActionMenuItemBase {
  readonly danger?: false;
  readonly onSelect?: () => void;
  readonly confirm?: never;
  readonly confirmExempt?: never;
}

/** 危险项，带拦截：落锤走 `confirm.onConfirm`，本件负责弹确认框。 */
interface ActionMenuItemGuarded extends ActionMenuItemBase {
  readonly danger: true;
  readonly confirm: DestructiveConfirm;
  /** 落锤在 `confirm.onConfirm` 上，这里不再收第二个回调——两个都接会一起触发。 */
  readonly onSelect?: never;
  readonly confirmExempt?: never;
}

/**
 * 危险项，显式豁免确认。理由是必填字符串而不是注释：注释 grep 不出清单，
 * 字符串可以——`grep -rn confirmExempt` 就是「本产品有多少个不设防的红色动作」
 * 的完整答案。
 *
 * 什么时候该用：动作本身可撤销（归档、下线），或上游已经拦过一道。
 * 「用户嫌麻烦」不是理由——那说明这一项不该染红。
 */
interface ActionMenuItemExempt extends ActionMenuItemBase {
  readonly danger: true;
  readonly confirmExempt: string;
  readonly onSelect?: () => void;
  readonly confirm?: never;
}

export type ActionMenuItem =
  ActionMenuItemPlain | ActionMenuItemGuarded | ActionMenuItemExempt;

export interface ActionMenuProps {
  readonly items: readonly ActionMenuItem[];
  readonly label?: string;
  readonly align?: "start" | "center" | "end";
  /**
   * 整个菜单不可用（提交进行中、无权操作）。这跟"逐项 disabled"不是一回事：
   * 逐项禁用仍然可以打开菜单看见有哪些动作，整体禁用连打开都不给。前者用于
   * "这一项现在做不了"，后者用于"现在什么都别做"。
   */
  readonly disabled?: boolean;
}

function ActionMenu({
  items,
  label = "Open actions menu",
  align = "end",
  disabled = false,
}: ActionMenuProps) {
  /**
   * 关闭时残留焦点环的修法：Radix 关菜单会把焦点还给触发器（无障碍要求，
   * 不能删）——但鼠标点击触发器把它关掉时，浏览器仍会判它为"需要显示焦点环"
   * 的一次 focus，环就一直挂在按钮外面，直到用户点别处失焦（2026-08-03
   * owner 实测抓到：鼠标点开、鼠标点别处关掉不会这样，只有点同一个按钮
   * 关掉才会）。键盘用户合上菜单后确实需要看见焦点在哪，不能全局关掉这次
   * 焦点找回；只在"这次开关是鼠标发起的"时跳过它，键盘发起的仍走默认。
   */
  const lastInputRef = React.useRef<"pointer" | "keyboard">("pointer");

  /** 当前正在确认哪一项（null = 没有确认框开着）。 */
  const [confirmingId, setConfirmingId] = React.useState<string | null>(null);
  /**
   * 「这次关菜单是为了让路给确认框」。菜单关闭时 Radix 会把焦点还给触发器，
   * 而确认框正在同一拍里抢焦点——不挡住这次找回，焦点会先落回那个「⋮」按钮，
   * 键盘用户开出确认框却发现焦点不在框里。有确认框要开时跳过找回，交给
   * AlertDialog 自己的焦点陷阱；确认框关掉后 Radix 的 Dialog 会把焦点还回来。
   */
  const openingConfirmRef = React.useRef(false);

  const activeConfirm = items.find((item) => item.id === confirmingId)?.confirm;
  /**
   * 关闭时不能立刻卸载：一卸载，AlertDialog 的 `data-[state=closed]:animate-out`
   * 就没机会跑，确认框是「啪」地消失而不是退场。留住上一份契约，让退场动画期间
   * 框里的文案不塌成空白——只有 `open` 变假，内容原样留到动画结束。
   */
  const lastConfirmRef = React.useRef<DestructiveConfirm | undefined>(
    undefined,
  );
  if (activeConfirm) lastConfirmRef.current = activeConfirm;
  const renderedConfirm = activeConfirm ?? lastConfirmRef.current;

  /*
   * `modal={false}`：菜单项打开 Dialog 是本件最常见的用法（编辑 / 删除 /
   * 抽屉），而 Radix 的模态菜单和模态 Dialog 各自往 `<body>` 上挂
   * `pointer-events: none`，菜单的解锁与对话框的加锁在同一拍里竞争——
   * 对话框关闭后锁会**残留**，整页从此点不动，只能刷新（2026-08-24 在
   * opera 模型服务页用真实鼠标事件复现：菜单→编辑→取消 后 body 一直是
   * `pointer-events: none`）。非模态菜单不上锁，就没有竞争；外点关闭、
   * 键盘导航、焦点找回都不受影响。行菜单本来也不需要"锁住全页"的强度。
   *
   * 本件自带的确认框（danger 项的 confirm）走的正是这条路：AlertDialog 是模态的，
   * 由它单独加锁、单独解锁，与非模态的菜单不争。
   */
  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-md"
            aria-label={label}
            disabled={disabled}
            onPointerDown={() => {
              lastInputRef.current = "pointer";
            }}
            onKeyDown={() => {
              lastInputRef.current = "keyboard";
            }}
          >
            <Icon name="more-vertical" size={16} aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={align}
          onKeyDown={() => {
            lastInputRef.current = "keyboard";
          }}
          onCloseAutoFocus={(event) => {
            if (openingConfirmRef.current) {
              openingConfirmRef.current = false;
              event.preventDefault();
              return;
            }
            if (lastInputRef.current === "pointer") event.preventDefault();
          }}
        >
          {items.map((item) => (
            <React.Fragment key={item.id}>
              {item.separatorBefore ? <DropdownMenuSeparator /> : null}
              <DropdownMenuItem
                {...(item.disabled !== undefined
                  ? { disabled: item.disabled }
                  : {})}
                {...(item.confirm !== undefined
                  ? {
                      onSelect: () => {
                        openingConfirmRef.current = true;
                        setConfirmingId(item.id);
                      },
                    }
                  : item.onSelect !== undefined
                    ? { onSelect: item.onSelect }
                    : {})}
                {...(item.hint !== undefined ? { title: item.hint } : {})}
                className={cn(
                  "gap-xs",
                  // 悬停时给一层淡底而不是把整条变实心红——菜单里危险项常和常规项
                  // 挨着，实心底会让整个菜单看起来在报警。与 Button / Badge 同一判断。
                  item.danger &&
                    "text-destructive-text focus:bg-destructive-muted focus:text-destructive-muted-foreground",
                )}
              >
                {item.icon ? (
                  <Icon name={item.icon} size={16} aria-hidden="true" />
                ) : null}
                <span className="min-w-0 truncate">{item.label}</span>
              </DropdownMenuItem>
            </React.Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {renderedConfirm ? (
        <ConfirmDestructive
          {...renderedConfirm}
          open={activeConfirm !== undefined}
          onOpenChange={(next) => {
            if (!next) setConfirmingId(null);
          }}
        />
      ) : null}
    </>
  );
}

export { ActionMenu };
