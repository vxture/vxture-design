/**
 * overlayPosition.ts - 视口浮层的落点挡位，base 层各浮层件共用。
 * @package @vxture/design-ui
 * @layer Presentation
 * @category Components
 *
 * ── 为什么要有这一族 ──
 * owner 2026-09-22：「这个位置不能 DS 写死，影响面太大，应该可配置，默认右上角，
 * 支持业务平台传参定位」「弹窗的多个类型应该同理处理」。
 *
 * 此前 Toast 的视口钉死在 `inset-x-0 bottom-0 ... sm:items-end`（右下角），
 * Dialog / AlertDialog 钉死在 `left-[50%] top-[50%]`。件本身没有任何口子——
 * 调用方想换位置只能整条 className 覆盖，那等于绕开件的契约。
 *
 * ── 哪些件不在这一族里 ──
 * · Drawer 有自己的 `side`（left/right），那已经是它的落点 API，不重复造。
 * · Popover / DropdownMenu / Tooltip / HoverCard 由 Radix 按**触发元素**定位，
 *   `side` / `align` 已经透传给调用方——它们本来就没写死。
 * 也就是说这一族只服务「与触发点无关、钉在视口上」的那类浮层。
 *
 * ⚠ 类名必须写成**完整字面量**。Tailwind 扫的是源码文本，`top-${x}` 这种拼接扫不到，
 *   产不出工具类，且不报错（同 [overlayWidth.ts] 的那条警告）。
 */

/**
 * 七个落点的**运行时数组**，类型由它推导。预览面要遍历全部挡位时引这里，别手抄。
 * 下方两个 Record<OverlayPosition, string> 以此类型为键，加挡漏填在编译期即报。
 */
export const OVERLAY_POSITIONS = [
  "top-left",
  "top-center",
  "top-right",
  "center",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;

export type OverlayPosition = (typeof OVERLAY_POSITIONS)[number];

/**
 * **通知堆**用（Toast）：容器横向铺满、纵向贴一条边，靠 items-* 决定左右。
 *
 * 堆叠方向跟着落点走：贴顶时新的在下（`flex-col`），贴底时新的在上
 * （`flex-col-reverse`）——两种都让**新的那条离屏幕边最远**，位置才稳定。
 * 贴底却用 flex-col，会让已有的提示被新的顶着往上跳。
 *
 * `center` 在这一族里按贴顶处理：一堆通知悬在屏幕正中会盖住正在操作的内容。
 */
export const overlayStackClass: Record<OverlayPosition, string> = {
  "top-left": "inset-x-0 top-0 flex-col items-start",
  "top-center": "inset-x-0 top-0 flex-col items-center",
  "top-right": "inset-x-0 top-0 flex-col items-end",
  center: "inset-x-0 top-0 flex-col items-center",
  "bottom-left": "inset-x-0 bottom-0 flex-col-reverse items-start",
  "bottom-center": "inset-x-0 bottom-0 flex-col-reverse items-center",
  "bottom-right": "inset-x-0 bottom-0 flex-col-reverse items-end",
};

/**
 * **单块面板**用（Dialog / AlertDialog）：直接贴视口的边或居中。
 *
 * `center` 这一档逐字保留原来那串 `left-[50%] top-[50%] + translate`——它是既有
 * 默认值，换写法就是拿全站对话框冒无谓的险。四角用 `lg` 间距贴边，与浮层自身的
 * `p-xl` 内距分开：贴边留白是它与视口的关系，不是它的内部节奏。
 */
export const overlayAnchorClass: Record<OverlayPosition, string> = {
  "top-left": "left-lg top-lg",
  "top-center": "left-[50%] top-lg translate-x-[-50%]",
  "top-right": "right-lg top-lg",
  center: "left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]",
  "bottom-left": "bottom-lg left-lg",
  "bottom-center": "bottom-lg left-[50%] translate-x-[-50%]",
  "bottom-right": "bottom-lg right-lg",
};
