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
