/**
 * setup.ts - 测试环境补齐。
 * @package @vxture/design-ui
 *
 * jsdom 没有实现 Radix 依赖的几个浏览器 API。缺了它们组件不是报错，是**行为
 * 不对**——例如 Popper 拿不到尺寸就把浮层定位到 (0,0)，看起来像布局 bug。
 */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, vi } from "vitest";

afterEach(() => {
  cleanup();
});

beforeAll(() => {
  /* Radix 的浮层族（DropdownMenu / Select / Tooltip）用 ResizeObserver 跟踪
     触发器尺寸。jsdom 没有它，构造时直接抛。 */
  if (!("ResizeObserver" in globalThis)) {
    globalThis.ResizeObserver = class {
      observe() {
        /* 空实现是**有意的**：这三个方法存在只为让 Radix 构造得出来。
           jsdom 不做布局，观察到的尺寸永远是 0，回调即使触发也没有意义。 */
      }
      unobserve() {
        /* 同上。 */
      }
      disconnect() {
        /* 同上。 */
      }
    } as unknown as typeof ResizeObserver;
  }

  /* Radix 用 pointer 事件判定「这次开合是鼠标还是键盘发起的」。
     jsdom 的 Element 上没有这三个方法。 */
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};
  }

  /* scrollIntoView：菜单项聚焦时会调，jsdom 未实现。 */
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }

  /* matchMedia：密度/主题相关的 hook 会读。 */
  if (!globalThis.matchMedia) {
    globalThis.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof globalThis.matchMedia;
  }
});

/* ── React 的 key 警告一律当失败 ───────────────────────────────────────────
 *
 * 2026-08-26 opera 报来一条「Section 是数组里没有 key 的孩子的根因」，实测不是：
 * 裸 <div> 换上去报的是同一条警告，跟 DS 没关系。真正的成因是**中间层把 props
 * 拼成数组再当 children 传下去**，而 React 的警告原文点的两个名字里恰好没有它：
 *
 *   Check the render method of `Section`.        ← 收数组的那个（DS 的件）
 *   It was passed a child from AccountDetailPage. ← 元素被创建的地方（页面）
 *
 * 拼数组的那一层一个字都没提，所以查的人自然会去查 Section。
 *
 * 这条警告本身值钱：`[a, b].filter(Boolean)` 少一个成员时，后面的会落到前面的
 * 索引上，React 按索引复用实例——同类型的兄弟之间**状态会串**（实测 B:3 变
 * 成 B:0，B 捡了 A 的那一格）。所以 DS 绝不能用 Children.toArray 之类的手法
 * 把它压掉：那是把消费端的真缺陷盖住。
 *
 * DS 能做的是保证**自己不出这个形状**。收集而不是当场抛：在 console.error 里
 * 抛会打断 React 自己的错误处理路径，攒到 afterEach 再判更稳。
 *
 * 用例自己 mock 掉 console.error 时（例如钉「缺 Provider 要抛」那条）这里看不到
 * 东西，也不会误报。
 */
/*
 * 两条，因为 React 对两种 key 缺陷用的是两句不同的话：
 *   · 数组成员没有 key      —— Each child in a list should have a unique "key" prop.
 *   · 两个成员用了同一个 key —— Encountered two children with the same key, ...
 *
 * 后一条 2026-08-26 补：给 MetricGrid 写「同名不同 id 的两张卡都渲染得出来」时，
 * 把 key 从 id 换成 String(label) 的变异**没有变红**——React 遇到重复 key 会
 * 警告，但照样把两个都渲染出来，所以从 DOM 上分辨不出。而重复 key 是真缺陷：
 * 重排时 React 认不出谁是谁，会把状态和 DOM 接到错的那一个上。
 */
const KEY_WARN = /unique "key"|two children with the same key/;
const keyWarnings: string[] = [];
const passThroughError = console.error;
console.error = (...args: unknown[]) => {
  const text = args.map(String).join(" ");
  if (KEY_WARN.test(text)) keyWarnings.push(text);
  passThroughError(...(args as []));
};

afterEach(() => {
  if (keyWarnings.length > 0) {
    const seen = keyWarnings.join("\n");
    keyWarnings.length = 0;
    throw new Error(
      "这条用例触发了 React 的 key 警告。DS 内部不允许出现无 key 的元素数组——\n" +
        "成因通常是把若干 props 拼成数组再当 children 传下去。\n\n" +
        seen,
    );
  }
});
