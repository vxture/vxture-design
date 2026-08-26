/**
 * setup.ts - 伞包测试环境补齐。
 * @package @vxture/design-system
 *
 * 比 design-ui 那份短：这个包没有 Radix 浮层，不需要 ResizeObserver /
 * pointer capture 那一族。要补的是**主题与偏好那三根轴读的东西**：
 * `matchMedia`（系统深色）与 `localStorage`（用户选择）。
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

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.colorScheme = "";
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
