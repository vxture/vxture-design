/**
 * FullscreenProvider 的**原生模式那半边**。
 *
 * 上一轮铺 hooks 时只测了 pseudo 模式——原生那半边一条没走，因为 jsdom 里
 * `requestFullscreen` / `exitFullscreen` / `fullscreenElement` **一个都不存在**。
 * 覆盖率上这件是 38/64 未覆盖，全仓第二高。
 *
 * 一个都不存在反而是好事：桩可以完全掌控这个面，包括**让哪个厂商前缀存在**——
 * 而厂商前缀阶梯正是这件里分支最密的一段（进出各四档），真浏览器里一次只能验一档。
 */

import { act, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFullscreen } from "../src/hooks/useFullscreen";
import { FullscreenProvider } from "../src/components/layout/fullscreen/Provider";

type Vendor = "std" | "webkit" | "moz" | "ms";

const ENTER: Record<Vendor, string> = {
  std: "requestFullscreen",
  webkit: "webkitRequestFullscreen",
  moz: "mozRequestFullScreen",
  ms: "msRequestFullscreen",
};
const EXIT: Record<Vendor, string> = {
  std: "exitFullscreen",
  webkit: "webkitExitFullscreen",
  moz: "mozCancelFullScreen",
  ms: "msExitFullscreen",
};
const ELEMENT_PROP: Record<Vendor, string> = {
  std: "fullscreenElement",
  webkit: "webkitFullscreenElement",
  moz: "mozFullScreenElement",
  ms: "msFullscreenElement",
};

const added: string[] = [];

/**
 * 装一套原生全屏 API。
 *
 * `enter` 挂在 `Element.prototype` 上——因为本件的**能力检测读的是
 * `document.documentElement`，而实际调用落在目标元素上**，两处都得有。
 * 这个不对称本身值得知道：只给目标元素挂 API 的话，能力检测会说「不支持」，
 * 于是根本不会走到调用那一步。
 */
function installNative(opts?: {
  vendor?: Vendor;
  enterRejects?: boolean;
  exitRejects?: boolean;
}) {
  const vendor = opts?.vendor ?? "std";
  const enterFn = vi.fn(() =>
    opts?.enterRejects
      ? Promise.reject(new Error("用户拒绝了全屏请求"))
      : Promise.resolve(),
  );
  const exitFn = vi.fn(() =>
    opts?.exitRejects
      ? Promise.reject(new Error("文档已不在全屏态"))
      : Promise.resolve(),
  );

  Object.defineProperty(Element.prototype, ENTER[vendor], {
    value: enterFn,
    configurable: true,
    writable: true,
  });
  added.push("Element:" + ENTER[vendor]);

  Object.defineProperty(document, EXIT[vendor], {
    value: exitFn,
    configurable: true,
    writable: true,
  });
  added.push("document:" + EXIT[vendor]);

  let current: Element | null = null;
  Object.defineProperty(document, ELEMENT_PROP[vendor], {
    get: () => current,
    configurable: true,
  });
  added.push("document:" + ELEMENT_PROP[vendor]);

  return {
    enterFn,
    exitFn,
    /** 模拟浏览器把文档置入 / 移出原生全屏，并派发 fullscreenchange。 */
    setBrowserFullscreen(el: Element | null) {
      current = el;
      document.dispatchEvent(new Event("fullscreenchange"));
    },
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <FullscreenProvider>{children}</FullscreenProvider>;
}

beforeEach(() => {
  added.length = 0;
});

afterEach(() => {
  for (const entry of added) {
    const [where, prop] = entry.split(":") as [string, string];
    const target = where === "Element" ? Element.prototype : document;
    delete (target as unknown as Record<string, unknown>)[prop];
  }
  added.length = 0;
  document.body.style.overflow = "";
  vi.restoreAllMocks();
});

/* ── 能力检测 ─────────────────────────────────────────────────────────────── */

describe("原生全屏 · 能力检测", () => {
  it("有 API 时进入原生模式会真的调它", () => {
    const native = installNative();
    const { result } = renderHook(() => useFullscreen(), { wrapper });
    const el = document.createElement("div");

    act(() => result.current.enter("panel", el, { mode: "native" }));

    expect(native.enterFn).toHaveBeenCalledTimes(1);
    expect(result.current.isFullscreen).toBe(true);
  });

  /**
   * **没有 API 时不调用，但状态照样进入。**这是有意的降级：伪全屏的样式那一层
   * 与原生请求是两件事，浏览器不给原生，面板照样该铺满视口——否则用户点了全屏
   * 什么都不发生。
   */
  it("没有 API 时不调用，但面板照样进入全屏态", () => {
    const { result } = renderHook(() => useFullscreen(), { wrapper });
    const el = document.createElement("div");

    act(() => result.current.enter("panel", el, { mode: "native" }));

    expect(result.current.isFullscreen).toBe(true);
    expect(result.current.targetId).toBe("panel");
  });

  it("pseudo 模式下不碰原生 API", () => {
    const native = installNative();
    const { result } = renderHook(() => useFullscreen(), { wrapper });
    const el = document.createElement("div");

    act(() => result.current.enter("panel", el, { mode: "pseudo" }));

    expect(native.enterFn).not.toHaveBeenCalled();
  });
});

/* ── 厂商前缀阶梯 ─────────────────────────────────────────────────────────── */

describe("原生全屏 · 厂商前缀阶梯", () => {
  /**
   * 四档各走一遍。真浏览器里一次只验得了一档，而写错的那一档**只在那一种浏览器
   * 上不工作**——最容易漏，也最难在本机复现。
   */
  it.each(["std", "webkit", "moz", "ms"] as const)(
    "只有 %s 前缀时也进得去、出得来",
    async (vendor) => {
      const native = installNative({ vendor });
      const { result } = renderHook(() => useFullscreen(), { wrapper });
      const el = document.createElement("div");

      act(() => result.current.enter("panel", el, { mode: "native" }));
      expect(native.enterFn).toHaveBeenCalledTimes(1);

      await act(async () => {
        result.current.exit();
      });
      expect(native.exitFn).toHaveBeenCalledTimes(1);
    },
  );
});

/* ── 退出只调一次 ─────────────────────────────────────────────────────────── */

describe("原生全屏 · 退出只调一次", () => {
  /**
   * **这条钉的是 6.0.4 那个修复的另一半。**
   *
   * 那次修的是标着「组件卸载时清理」的 effect——它的依赖数组里有
   * `state.isFullscreen`，而 effect 的清理每次依赖变化都会跑，于是退出那一帧
   * 它也跑了一次，`exitNativeFullscreen()` 因此被调**两次**。第二次时文档已经
   * 不在全屏态，浏览器对它报 TypeError。
   *
   * 当时只测了 pseudo 模式（滚动锁），原生这一半没测——而它才是真正会报错的
   * 那一半。补上。
   */
  it("原生模式退出时 exitFullscreen 只调一次", async () => {
    const native = installNative();
    const { result } = renderHook(() => useFullscreen(), { wrapper });
    const el = document.createElement("div");

    act(() => result.current.enter("panel", el, { mode: "native" }));
    await act(async () => {
      result.current.exit();
    });

    expect(native.exitFn).toHaveBeenCalledTimes(1);
    expect(result.current.isFullscreen).toBe(false);
  });

  /** 卸载时也只清理一次，不因为 state 变过就多跑一遍。 */
  it("在原生全屏态下卸载，exitFullscreen 也只调一次", async () => {
    const native = installNative();
    const { result, unmount } = renderHook(() => useFullscreen(), { wrapper });
    const el = document.createElement("div");

    act(() => result.current.enter("panel", el, { mode: "native" }));
    expect(native.exitFn).not.toHaveBeenCalled();

    await act(async () => {
      unmount();
    });
    expect(native.exitFn).toHaveBeenCalledTimes(1);
  });
});

/* ── 浏览器自己退出 ───────────────────────────────────────────────────────── */

describe("原生全屏 · 用户按 Esc 由浏览器退出", () => {
  /**
   * 原生全屏里按 Esc **是浏览器直接退的**，本件收不到那次按键——只能靠
   * `fullscreenchange` 事件回头对齐状态。不对齐的后果是：浏览器已经退出全屏，
   * 而组件还以为自己在全屏，面板保持铺满、滚动还锁着。
   */
  it("浏览器退出后状态跟着复位，滚动解锁", () => {
    const native = installNative();
    const { result } = renderHook(() => useFullscreen(), { wrapper });
    const el = document.createElement("div");

    act(() => result.current.enter("panel", el, { mode: "native" }));
    expect(result.current.isFullscreen).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");

    // 浏览器把文档移出全屏并派发事件（用户按了 Esc）
    act(() => native.setBrowserFullscreen(null));

    expect(result.current.isFullscreen).toBe(false);
    expect(result.current.targetId).toBeUndefined();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  /** 进入原生全屏那一下也会派发同一个事件，那时不该把自己退掉。 */
  it("进入时派发的同一个事件不会把自己退掉", () => {
    const native = installNative();
    const { result } = renderHook(() => useFullscreen(), { wrapper });
    const el = document.createElement("div");

    act(() => result.current.enter("panel", el, { mode: "native" }));
    act(() => native.setBrowserFullscreen(el));

    expect(result.current.isFullscreen).toBe(true);
  });

  /** pseudo 模式压根没进原生全屏，这个事件与它无关。 */
  it("pseudo 模式不受 fullscreenchange 影响", () => {
    const native = installNative();
    const { result } = renderHook(() => useFullscreen(), { wrapper });
    const el = document.createElement("div");

    act(() => result.current.enter("panel", el, { mode: "pseudo" }));
    act(() => native.setBrowserFullscreen(null));

    expect(result.current.isFullscreen).toBe(true);
  });
});

/* ── Esc 键的分工 ─────────────────────────────────────────────────────────── */

describe("Esc 键的分工", () => {
  /** 伪全屏没有浏览器帮忙，Esc 得本件自己收。 */
  it("pseudo 模式下 Esc 退出", () => {
    const { result } = renderHook(() => useFullscreen(), { wrapper });
    const el = document.createElement("div");

    act(() => result.current.enter("panel", el, { mode: "pseudo" }));
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(result.current.isFullscreen).toBe(false);
  });

  /**
   * **原生模式下本件不处理 Esc**——浏览器已经处理过了，本件再退一次就是重复
   * 退出（同上面那条「只调一次」是同一类问题）。状态由 `fullscreenchange` 对齐。
   */
  it("native 模式下 Esc 不由本件处理", () => {
    installNative();
    const { result } = renderHook(() => useFullscreen(), { wrapper });
    const el = document.createElement("div");

    act(() => result.current.enter("panel", el, { mode: "native" }));
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    // 浏览器还没发 fullscreenchange，状态就还不该变
    expect(result.current.isFullscreen).toBe(true);
  });

  it("其它按键不退出", () => {
    const { result } = renderHook(() => useFullscreen(), { wrapper });
    const el = document.createElement("div");

    act(() => result.current.enter("panel", el));
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    });

    expect(result.current.isFullscreen).toBe(true);
  });
});

/* ── 请求被拒 ─────────────────────────────────────────────────────────────── */

describe("原生全屏 · 请求被拒时降级而不是崩", () => {
  /**
   * 浏览器可以拒绝全屏请求（不是用户手势触发、iframe 没有 allowfullscreen、
   * 权限策略拦下）。**拒绝是常态，不是异常**——面板必须照样铺满，只是没有原生
   * 那一层。吞掉并 warn，不让一个 unhandled rejection 冒到应用里。
   */
  it("进入被拒时 warn 并保持全屏态", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    installNative({ enterRejects: true });
    const { result } = renderHook(() => useFullscreen(), { wrapper });
    const el = document.createElement("div");

    await act(async () => {
      result.current.enter("panel", el, { mode: "native" });
    });

    expect(result.current.isFullscreen).toBe(true);
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0]?.[0])).toContain("pseudo");
  });

  it("退出被拒时 warn 并照样复位状态", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    installNative({ exitRejects: true });
    const { result } = renderHook(() => useFullscreen(), { wrapper });
    const el = document.createElement("div");

    act(() => result.current.enter("panel", el, { mode: "native" }));
    await act(async () => {
      result.current.exit();
    });

    expect(result.current.isFullscreen).toBe(false);
    expect(warn).toHaveBeenCalled();
  });
});

/* ── 滚动锁与残留 ─────────────────────────────────────────────────────────── */

describe("原生全屏 · 滚动锁", () => {
  /**
   * `lockScroll: false` 那一支要**清掉上次的残留标记**，否则：先锁着进一次、
   * 退出、再以 lockScroll:false 进一次，退出时会去解一把根本没上的锁，
   * 把 body 的 overflow 改成上一轮记下的旧值。
   */
  it("先锁后不锁，第二次退出不会乱改 overflow", () => {
    installNative();
    const { result } = renderHook(() => useFullscreen(), { wrapper });
    const el = document.createElement("div");
    document.body.style.overflow = "scroll";

    act(() => result.current.enter("panel", el));
    expect(document.body.style.overflow).toBe("hidden");
    act(() => result.current.exit());
    expect(document.body.style.overflow).toBe("scroll");

    act(() => result.current.enter("panel", el, { lockScroll: false }));
    expect(document.body.style.overflow).toBe("scroll");
    act(() => result.current.exit());
    expect(document.body.style.overflow).toBe("scroll");
  });

  /**
   * **A（锁）→ 切到 B（不锁）→ 退出，页面必须还能滚。**
   *
   * 这条是 2026-08-26 由变异测试查出的真缺陷（6.0.6 修）。原实现在「这次不锁」
   * 那一支里把 `isScrollLockedRef` 置 false——清掉的是**记号而不是锁**：body 上
   * 的 `overflow: hidden` 还在，只是没人记得它是谁上的，于是退出时
   * `unlockScroll()` 拒绝还原，整页从此滚不动。
   *
   * 而这条路径不冷门：`toggle` 换 id 就是切换（不是先退出），一页上有多个可全屏
   * 面板时天天走。症状离病因很远——用户只会觉得「关掉全屏以后页面卡住了」。
   */
  it("从锁滚动的面板切到不锁的面板，退出后页面还能滚", () => {
    const { result } = renderHook(() => useFullscreen(), { wrapper });
    const a = document.createElement("div");
    const b = document.createElement("div");
    document.body.style.overflow = "scroll";

    act(() => result.current.enter("a", a));
    expect(document.body.style.overflow).toBe("hidden");

    // 切过去：B 不要这把锁，那就当场还回去，不是等退出
    act(() => result.current.enter("b", b, { lockScroll: false }));
    expect(document.body.style.overflow).toBe("scroll");

    act(() => result.current.exit());
    expect(document.body.style.overflow).toBe("scroll");
  });

  /** 反过来：不锁的面板切到锁的面板，锁得上。 */
  it("从不锁的面板切到锁滚动的面板，锁得上", () => {
    const { result } = renderHook(() => useFullscreen(), { wrapper });
    const a = document.createElement("div");
    const b = document.createElement("div");
    document.body.style.overflow = "scroll";

    act(() => result.current.enter("a", a, { lockScroll: false }));
    expect(document.body.style.overflow).toBe("scroll");

    act(() => result.current.enter("b", b));
    expect(document.body.style.overflow).toBe("hidden");

    act(() => result.current.exit());
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("Provider 的 defaultLockScroll 可关掉全局默认", () => {
    const { result } = renderHook(() => useFullscreen(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <FullscreenProvider defaultLockScroll={false}>
          {children}
        </FullscreenProvider>
      ),
    });
    const el = document.createElement("div");

    act(() => result.current.enter("panel", el));
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});

/* ── toggle 与多目标 ──────────────────────────────────────────────────────── */

describe("toggle 在多目标之间", () => {
  /**
   * 同一个 id 再 toggle 是退出；**换一个 id 是切过去，不是退出**。
   * 一页上有几个可全屏面板时，从 A 直接点 B 的全屏钮该切到 B，
   * 而不是先退出 A 再要求点第二下。
   */
  it("换目标 toggle 是切换，不是退出", () => {
    const { result } = renderHook(() => useFullscreen(), { wrapper });
    const a = document.createElement("div");
    const b = document.createElement("div");

    act(() => result.current.toggle("a", a));
    expect(result.current.targetId).toBe("a");

    act(() => result.current.toggle("b", b));
    expect(result.current.isFullscreen).toBe(true);
    expect(result.current.targetId).toBe("b");

    act(() => result.current.toggle("b", b));
    expect(result.current.isFullscreen).toBe(false);
  });
});

describe("Provider 照常渲染 children", () => {
  it("渲染", () => {
    render(
      <FullscreenProvider>
        <p>内容</p>
      </FullscreenProvider>,
    );
    expect(screen.getByText("内容")).toBeInTheDocument();
  });
});
