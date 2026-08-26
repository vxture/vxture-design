/**
 * setup.ts - 伞包测试环境补齐。
 * @package @vxture/design-system
 *
 * 要补两类：**主题与偏好那三根轴读的东西**（`matchMedia` 与 `localStorage`），
 * 以及 **Radix 浮层需要的浏览器 API**。
 *
 * ⚠ 第一版这里写着「这个包没有 Radix 浮层，不需要 ResizeObserver 那一族」——
 * **那句是凭印象写的**。`ShellSearchBox` 与 `ShellLauncher` 都用 Popover，
 * 七条用例因此红在 `ResizeObserver is not defined`。
 *
 * 同 setup 里那次「只清了我想得起来的那几处」是一条：**基座要照被测代码真正
 * 用到的东西补，不是照我记得的**。
 *
 * jsdom 有 localStorage，但**每个用例之间不会自动清**——上一条用例存的主题会
 * 被下一条读到，而且是间歇性的（取决于用例顺序）。所以这里逐条清。
 */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

/**
 * 逐条重置**被测代码写过的每一处**。
 *
 * 第一版只清了 localStorage 与两个 class/属性，结果三条字号用例串了状态——
 * 偏好还落在 **cookie** 里（跨子域那一半），而 `data-app-ready` 是另一个用例的
 * Provider 挂载时打上的。表现是「单跑绿、全套红」，而且红的那几条看起来毫无关系。
 *
 * 判据：**共享的 setup 必须重置被测代码写过的每一处**，不是「我想得起来的那几处」。
 * 想不全就会变成用例顺序的函数。
 */
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();

  // cookie：jsdom 只增不减，逐条置过期
  for (const entry of document.cookie.split(";")) {
    const name = entry.split("=")[0]?.trim();
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  }

  const root = document.documentElement;
  root.className = "";
  root.style.colorScheme = "";
  // 主题、密度、字号、启动占位——四处都写在 <html> 上，逐个摘干净
  for (const attr of [...root.attributes]) {
    if (attr.name !== "lang") root.removeAttribute(attr.name);
  }
});

/**
 * 可控的 matchMedia。
 *
 * 默认恒 false（不是深色）。要测「系统是深色」的用例自己调
 * `setPrefersDark(true)`——做成开关而不是让每条用例各写一份桩，是因为
 * `prefers-color-scheme` 这一支在主题逻辑里出现三次（启动脚本、Provider、
 * 偏好同步），三处各抄一份桩迟早对不上。
 */
let prefersDark = false;

export function setPrefersDark(next: boolean) {
  prefersDark = next;
}

beforeEach(() => {
  prefersDark = false;
});

/* Radix 的浮层族（Popover）用 ResizeObserver 跟踪触发器尺寸。jsdom 没有它，
   构造时直接抛。空实现是**有意的**：这三个方法存在只为让 Radix 构造得出来，
   jsdom 不做布局，观察到的尺寸永远是 0。 */
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

/* Radix 用 pointer 事件判定「这次开合是鼠标还是键盘发起的」。 */
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}

/* 菜单项聚焦时会调，jsdom 未实现。 */
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

if (!globalThis.matchMedia) {
  globalThis.matchMedia = ((query: string) => ({
    get matches() {
      return query.includes("dark") ? prefersDark : false;
    },
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof globalThis.matchMedia;
}
