/**
 * `ThemeProvider` —— 伞包里最大的一个文件（312 行），也是**四个门户的根**。
 *
 * 它把三根轴接在一起：主题（转给 next-themes）、密度、字号。三根轴的共同点是
 * **落地方式都是往 `<html>` 上写 class**，而 class 写错了不报错——页面照常渲染，
 * 只是「设置好像没生效」。
 *
 * 这个文件此前是 0%。它没进任何清单，因为伞包整个没有 test 脚本（见 070 §5.1）。
 */

import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { THEME_CONSTANTS } from "@vxture/design-tokens";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";
import { DENSITY_STORAGE_KEY } from "../src/density";
import { BootSplash, markAppReady } from "../src/theme/boot-splash";
import { setPrefersDark } from "./setup";

const html = () => document.documentElement;
const classes = () => [...html().classList];

function wrapper({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

/* ── useTheme ─────────────────────────────────────────────────────────────── */

describe("useTheme · 用错地方要当场报错", () => {
  /**
   * 不在 Provider 里用就抛——**这比返回一个默认值好**：默认值会让调用方以为
   * 主题能切，点下去什么都不发生，而错误发生在离病因很远的地方。
   * 同 `useFullscreenContext` 的判据。
   */
  it("不在 ThemeProvider 里用会抛出可读的错误", () => {
    const silence = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useTheme())).toThrow(/ThemeProvider/);
    silence.mockRestore();
  });

  it("在 Provider 里拿得到三根轴", async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.density).toBeDefined());
    expect(result.current).toMatchObject({
      density: "default",
      fontSize: "default",
    });
    expect(typeof result.current.setMode).toBe("function");
    expect(typeof result.current.toggle).toBe("function");
  });
});

/* ── 密度轴 ───────────────────────────────────────────────────────────────── */

describe("密度轴 · 落地是往 <html> 写 class", () => {
  it("挂载后写上 density-default", async () => {
    render(<ThemeProvider>x</ThemeProvider>);
    await waitFor(() => expect(classes()).toContain("density-default"));
  });

  it("defaultDensity 决定初始档", async () => {
    render(<ThemeProvider defaultDensity="comfortable">x</ThemeProvider>);
    await waitFor(() => expect(classes()).toContain("density-comfortable"));
  });

  /**
   * **换档时要先把旧的那条摘掉。**只加不删的话 `<html>` 上会同时挂着
   * `density-default` 与 `density-compact`——两条规则的特异性一样，
   * **后写进样式表的赢**，于是「切了没反应」或者「切了但只有一半生效」。
   */
  it("换档时旧的那条要摘掉，同一时刻只有一条", async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(classes()).toContain("density-default"));

    act(() => result.current.setDensity("compact"));
    await waitFor(() => expect(classes()).toContain("density-compact"));

    expect(classes().filter((c) => c.startsWith("density-"))).toHaveLength(1);
    expect(classes()).not.toContain("density-default");
  });

  it("setDensity 写进 localStorage", async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.density).toBe("default"));

    act(() => result.current.setDensity("comfortable"));
    expect(localStorage.getItem(DENSITY_STORAGE_KEY)).toBe("comfortable");
  });

  /** 挂载时从 localStorage 恢复——刷新之后不该回到默认档。 */
  it("挂载时从 localStorage 恢复", async () => {
    localStorage.setItem(DENSITY_STORAGE_KEY, "compact");
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.density).toBe("compact"));
    expect(classes()).toContain("density-compact");
  });

  /**
   * **存里的脏值要忽略，不能原样用。**这个键用户可写，而值会被直接拼进 class
   * 名——原样透传等于让任意字符串进到 `<html>` 的 class 里。
   */
  it.each(["", "Compact", "tiny", "null", "{}"])(
    "localStorage 里的脏值 %o 被忽略，留在默认档",
    async (bad) => {
      localStorage.setItem(DENSITY_STORAGE_KEY, bad);
      const { result } = renderHook(() => useTheme(), { wrapper });
      await waitFor(() => expect(classes()).toContain("density-default"));
      expect(result.current.density).toBe("default");
    },
  );

  it("三档都落得下去", async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.density).toBe("default"));

    for (const d of ["compact", "comfortable", "default"] as const) {
      act(() => result.current.setDensity(d));
      await waitFor(() => expect(classes()).toContain(`density-${d}`));
    }
  });
});

/* ── 字号轴 ───────────────────────────────────────────────────────────────── */

describe("字号轴 · class 与 data 属性一起写", () => {
  it("挂载后写上 vx-font-default 与 data 属性", async () => {
    render(<ThemeProvider>x</ThemeProvider>);
    await waitFor(() => expect(classes()).toContain("vx-font-default"));
    expect(html().dataset["vxFontSize"]).toBe("default");
  });

  /** 初始值从偏好里读——localStorage 那一半（cookie 那一半在 preferences 用例里）。 */
  it("挂载时读已存的偏好", async () => {
    localStorage.setItem("vx-fontsize", "large");
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.fontSize).toBe("large"));
    expect(classes()).toContain("vx-font-large");
  });

  it("换档时旧的那条要摘掉", async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(classes()).toContain("vx-font-default"));

    act(() => result.current.setFontSize("small"));
    await waitFor(() => expect(classes()).toContain("vx-font-small"));

    expect(classes().filter((c) => c.startsWith("vx-font-"))).toHaveLength(1);
  });

  it("setFontSize 落进 localStorage", async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.fontSize).toBe("default"));

    act(() => result.current.setFontSize("large"));
    expect(localStorage.getItem("vx-fontsize")).toBe("large");
  });

  /**
   * **跨标签页同步：别的标签页改了字号，这一页要跟上。**
   *
   * 少了这条订阅的表现是「在设置页改了字号，回到列表页那一栏还是旧的」——
   * 而用户通常不会想到要刷新。
   */
  it("别的标签页改了字号，这一页跟着变", async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.fontSize).toBe("default"));

    act(() => {
      localStorage.setItem("vx-fontsize", "large");
      window.dispatchEvent(new StorageEvent("storage", { key: "vx-fontsize" }));
    });

    await waitFor(() => expect(result.current.fontSize).toBe("large"));
    expect(classes()).toContain("vx-font-large");
  });

  /** 卸载要退订——不退订就是内存泄漏，而泄漏不报错。 */
  it("卸载后不再响应同步事件", async () => {
    const { result, unmount } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.fontSize).toBe("default"));
    unmount();

    const before = [...classes()];
    act(() => {
      localStorage.setItem("vx-fontsize", "large");
      window.dispatchEvent(new StorageEvent("storage", { key: "vx-fontsize" }));
    });
    expect(classes()).toEqual(before);
  });
});

/* ── 主题轴 ───────────────────────────────────────────────────────────────── */

describe("主题轴 · 转给 next-themes，但键必须是契约里那个", () => {
  /**
   * **存储键必须与 `themeBootstrapScript` 读的那个是同一个。**
   *
   * 两处对不上的表现最刁钻：启动脚本按旧键读、Provider 按新键写，于是**每次
   * 刷新都闪一下再切回来**——用户选的主题「保存住了，但每次都要闪」。
   */
  it("用的是 THEME_CONSTANTS.STORAGE_KEY", async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.mode).toBeDefined());

    act(() => result.current.setMode("dark"));
    await waitFor(() =>
      expect(localStorage.getItem(THEME_CONSTANTS.STORAGE_KEY)).toBe("dark"),
    );
  });

  it("setMode 三档都落得下去", async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.mode).toBeDefined());

    for (const m of ["light", "dark", "system"] as const) {
      act(() => result.current.setMode(m));
      await waitFor(() => expect(result.current.mode).toBe(m));
    }
  });

  it("dark 档时 <html> 上有 dark 类", async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.mode).toBeDefined());

    act(() => result.current.setMode("dark"));
    await waitFor(() => expect(classes()).toContain("dark"));
    expect(result.current.theme).toBe("dark");

    act(() => result.current.setMode("light"));
    await waitFor(() => expect(classes()).not.toContain("dark"));
    expect(result.current.theme).toBe("light");
  });

  /** `toggle` 翻的是**当前渲染出来的**那一档，不是用户选的档。 */
  it("toggle 在亮暗之间来回", async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.theme).toBeDefined());

    act(() => result.current.setMode("light"));
    await waitFor(() => expect(result.current.theme).toBe("light"));

    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.theme).toBe("dark"));

    act(() => result.current.toggle());
    await waitFor(() => expect(result.current.theme).toBe("light"));
  });

  /**
   * **在「跟随系统」档下点切换，翻的必须是眼前这一档。**
   *
   * 这是 `toggle` 唯一分得出对错的一格：`mode` 与 `theme` 在 light / dark 两档下
   * 恒等，只有 `system` 档里它们才可能不同（mode 是 "system"，theme 是系统解析
   * 出来的那一个）。判据若写成 `mode === "dark"`，系统是深色时点一下会 setTheme
   * 到 "dark"——**用户点了切换，屏幕纹丝不动**。
   *
   * 上一条 toggle 用例（light ↔ dark）对这个错误是**看不出来的**：那两档里
   * mode 与 theme 一样。变异测试就是这么把它揪出来的。
   */
  it("system 档下点切换，翻的是眼前这一档", async () => {
    setPrefersDark(true);
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider defaultMode="system">{children}</ThemeProvider>
      ),
    });

    await waitFor(() => expect(result.current.mode).toBe("system"));
    await waitFor(() => expect(result.current.theme).toBe("dark"));

    act(() => result.current.toggle());

    // 眼前是深色 → 应当切到浅色。判据写成 mode 的话这里会拿到 dark（没反应）
    await waitFor(() => expect(result.current.theme).toBe("light"));
    expect(result.current.mode).toBe("light");
  });

  /**
   * **不认识的档位归一到 `system`，不是原样透传。**
   *
   * 这个值来自 localStorage（用户可写），而它会被当成 `mode` 交给调用方——
   * 设置面板拿它去比对「哪一项该高亮」，一个不认识的值会让三项全不高亮。
   */
  it("存了不认识的档位时归一到 system", async () => {
    localStorage.setItem(THEME_CONSTANTS.STORAGE_KEY, "midnight");
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.mode).toBe("system"));
  });

  it("defaultMode 决定没存过时的初始档", async () => {
    const { result } = renderHook(() => useTheme(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ThemeProvider defaultMode="dark">{children}</ThemeProvider>
      ),
    });
    await waitFor(() => expect(result.current.mode).toBe("dark"));
  });
});

/* ── 启动占位 ─────────────────────────────────────────────────────────────── */

describe("BootSplash · 服务端直出的占位，挂载后让位", () => {
  /**
   * `data-app-ready` 挂在 `<html>` 而不是 `<body>`：它与启动脚本写的 `.dark`
   * 同处一个元素，「首帧就该定下来的东西」集中在一处。
   */
  it("Provider 挂载后打上 data-app-ready", async () => {
    expect(html().hasAttribute("data-app-ready")).toBe(false);
    render(<ThemeProvider>x</ThemeProvider>);
    await waitFor(() =>
      expect(html().hasAttribute("data-app-ready")).toBe(true),
    );
  });

  it("markAppReady 可单独调用，且幂等", () => {
    markAppReady();
    markAppReady();
    expect(html().getAttribute("data-app-ready")).toBe("");
  });

  /** 占位本身对读屏器隐藏——它是一个转圈，不是内容。 */
  it("占位整体 aria-hidden", () => {
    const { container } = render(<BootSplash />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root.className).toContain("vx-boot-splash");
  });
});

/* ── 三根轴互不干扰 ───────────────────────────────────────────────────────── */

describe("三根轴正交", () => {
  /**
   * 三轴是**互不相干**的（见设计语言 §07）：换密度不该动字号，换字号不该动明暗。
   * 它们都往同一个 `<html>` 上写 class，写的时候各扫各的前缀——扫错前缀的表现是
   * 「改了 A，B 跟着没了」。
   */
  it("换密度不影响字号与明暗", async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.density).toBe("default"));

    act(() => result.current.setFontSize("large"));
    act(() => result.current.setMode("dark"));
    await waitFor(() => expect(classes()).toContain("dark"));

    act(() => result.current.setDensity("compact"));
    await waitFor(() => expect(classes()).toContain("density-compact"));

    expect(classes()).toContain("vx-font-large");
    expect(classes()).toContain("dark");
  });

  it("换字号不影响密度与明暗", async () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    await waitFor(() => expect(result.current.density).toBe("default"));

    act(() => result.current.setDensity("comfortable"));
    act(() => result.current.setMode("dark"));
    await waitFor(() => expect(classes()).toContain("dark"));

    act(() => result.current.setFontSize("small"));
    await waitFor(() => expect(classes()).toContain("vx-font-small"));

    expect(classes()).toContain("density-comfortable");
    expect(classes()).toContain("dark");
  });
});

describe("Provider 照常渲染 children", () => {
  it("渲染", async () => {
    render(
      <ThemeProvider>
        <p>内容</p>
      </ThemeProvider>,
    );
    expect(await screen.findByText("内容")).toBeInTheDocument();
  });

  it("children 里能用 useTheme 切主题", async () => {
    function Toggle() {
      const { theme, toggle } = useTheme();
      return <button onClick={toggle}>当前 {theme}</button>;
    }
    const user = userEvent.setup();
    render(
      <ThemeProvider defaultMode="light">
        <Toggle />
      </ThemeProvider>,
    );
    const btn = await screen.findByRole("button");
    await waitFor(() => expect(btn).toHaveTextContent("当前 light"));
    await user.click(btn);
    await waitFor(() => expect(btn).toHaveTextContent("当前 dark"));
  });
});
