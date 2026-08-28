"use client";

/**
 * Toast.tsx - 全局通知（自有实现，非 shadcn 上游件）。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components - Overlay
 *
 * 为什么不照搬上游：shadcn 现行推荐是 sonner，换过去等于整套 API 改写并引一个
 * 新依赖，而本组件的 API（`toast()` 命令式调用、返回 id、tone / duration）已经被
 * 产品侧照抄了 16 处——换掉的收益是"跟上上游"，代价是让那 16 处全部返工。
 * 保留现有 API，只把样式换成 T2 语义类。真要迁 sonner 应当单独立项。
 *
 * 相对原实现的修正：
 * - 去掉整套 .vx-toast* 类（随遗留样式层退役后本组件完全无样式）。
 * - 关闭按钮原先是 "Close" 文本，改为图标 + aria-label。
 * - `role="alert"` 改为 `role="status"` + `aria-live`：alert 会打断屏幕阅读器，
 *   只有 danger 需要这种强度。
 * - **tone 收敛到共用六档**（owner 拍板 2026-08-02，Banner 先例）：原自有五值
 *   （success/error/warning/info/ai）改为 tone.ts 的 `Tone`——同一严重度在 DS 内
 *   只有一个名字，`error` 即 `danger`；`ai` 档随收敛移除，AI 语气由 AI 组件族
 *   自身承载，不经全局通知表达。图标改由 `toneIcons` 给出，一语气一图标。
 */

import * as React from "react";
import { cn } from "../../../utils/cn";
import { interactive } from "../../../styles/recipes";
import { Icon } from "../../../icons";
import { toneIcons, type Tone } from "../../tone";

export type ToastTone = Tone;

export interface ToastInput {
  readonly id?: string;
  readonly tone?: ToastTone;
  readonly title: string;
  readonly description?: string;
  /** 毫秒；<=0 表示不自动消失。 */
  readonly duration?: number;
}

interface ToastRecord {
  readonly id: string;
  readonly tone: ToastTone;
  readonly title: string;
  readonly description?: string;
  readonly duration: number;
}

interface ToastContextValue {
  readonly toast: (input: ToastInput) => string;
  readonly dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

/* 只染描边与图标、不染底——通知浮在任意内容之上，底保持近实色 popover 才可读。
   这与 toneSurfaceClasses（描边+弱化底）分工不同，故本件自持映射。 */
const TONE_CLS: Record<ToastTone, string> = {
  neutral: "border-border text-muted-foreground",
  brand: "border-primary-border text-primary-text",
  info: "border-info-border text-info-text",
  success: "border-success-border text-success-text",
  warning: "border-warning-border text-warning-text",
  danger: "border-destructive-border text-destructive-text",
};

/**
 * 通知 id 的生成。
 *
 * 原实现是 `toast-${Date.now()}-${Math.random()…}`。SonarCloud 把它报成
 * vulnerability（`Math.random` 不是密码学安全的）——**报得对，但那条理由不适用
 * 于这里**：这个 id 不需要不可预测，它只是 React 的 key 与 dismiss 时的查找键，
 * 被猜中也什么都做不了。
 *
 * 也没有换成 `crypto.randomUUID`。那是**安全上下文限定**的 API：在 http 页面上
 * （内网工具、局域网预览）`crypto.randomUUID` 是 undefined，调用直接抛。
 * 为了消一条不适用的告警，引入一个只在一半环境里存在的 API，是把告警换成故障。
 *
 * 换成单调计数器——对这个用途它比前两者都更合适：
 *
 *   · 随机数**可能碰撞**（同一毫秒内连发两条，36 进制尾巴还撞上），计数器按
 *     构造不会。这不是理论问题：碰撞的表现是两条通知共用一个 React key，
 *     后一条把前一条顶掉，而且只在手快的时候偶发
 *   · 不依赖任何环境 API，SSR / http / jsdom 三处行为一致
 *   · **可测**：「两条通知的 id 必须不同」这条断言，对随机数只是大概率成立，
 *     对计数器是恒真——所以它才值得写成回归测试
 *
 * 计数器放模块级而不是 Provider 级：跨 Provider、跨重挂载都不重复，
 * 于是上一次挂载残留的 `setTimeout(() => dismiss(id))` 不可能误伤新的通知。
 *
 * id 的格式是**不透明的**，不要去解析它。
 */
let toastSeq = 0;
const nextToastId = () => {
  toastSeq += 1;
  return `toast-${toastSeq}`;
};

export interface ToastProviderProps {
  readonly children: React.ReactNode;
  /** 通知区的可访问名。默认「通知」。 */
  readonly regionLabel?: string;
  /** 单条通知关闭钮的可访问名。默认「关闭通知」。 */
  readonly dismissLabel?: string;
}

export function ToastProvider({
  children,
  regionLabel = "Notifications",
  dismissLabel = "Dismiss notification",
}: ToastProviderProps) {
  const [toasts, setToasts] = React.useState<ToastRecord[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = React.useCallback(
    (input: ToastInput) => {
      const id = input.id ?? nextToastId();
      const record: ToastRecord = {
        id,
        tone: input.tone ?? "info",
        title: input.title,
        duration: input.duration ?? 4000,
        ...(input.description ? { description: input.description } : {}),
      };

      setToasts((current) => [...current, record]);
      if (record.duration > 0) {
        window.setTimeout(() => dismiss(id), record.duration);
      }
      return id;
    },
    [dismiss],
  );

  const value = React.useMemo<ToastContextValue>(
    () => ({ toast, dismiss }),
    [dismiss, toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-toast flex flex-col items-center gap-sm p-lg sm:items-end"
        role="region"
        aria-label={regionLabel}
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="status"
            aria-live={item.tone === "danger" ? "assertive" : "polite"}
            className={cn(
              // panel-sm 而非 content 宽度族：通知条是浮层面板，1024px 的行宽
              // 会让一条提示横贯整屏（content 族是页面级行宽，见 Dialog 塌宽案）。
              "pointer-events-auto flex w-full max-w-panel-sm items-start gap-sm",
              "rounded-lg border bg-popover p-md shadow-notification",
              "animate-in slide-in-from-bottom fade-in duration-base ease-enter",
              TONE_CLS[item.tone],
            )}
          >
            <Icon
              name={toneIcons[item.tone]}
              size={16}
              className="mt-2xs shrink-0"
              aria-hidden
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2xs">
              <div className="text-label-md text-foreground">{item.title}</div>
              {item.description ? (
                <div className="text-body-sm text-muted-foreground">
                  {item.description}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label={dismissLabel}
              className={cn(
                "inline-flex size-control-2xs shrink-0 items-center justify-center rounded-sm",
                "text-muted-foreground hover:bg-accent hover:text-foreground",
                interactive,
              )}
            >
              <Icon name="x" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}
