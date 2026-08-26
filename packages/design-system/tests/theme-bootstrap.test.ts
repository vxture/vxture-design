/**
 * `themeBootstrapScript` —— 本仓风险最高的一段代码。
 *
 * ## 为什么这么说
 *
 * 它是一段**字符串形态的 JavaScript**：
 *
 *   · 注进**每个门户每一页**的 `<head>`，在 React 接管之前同步执行
 *   · 是字符串，所以 **tsc 不看它、eslint 不看它**——两道静态关卡在它面前都是瞎的
 *   · 自带 `try { … } catch (_) {}`，**把一切吞掉**
 *
 * 三条合起来的后果：写错了不会有任何声音。表现不是报错，是「主题就是不生效」
 * ——而它存在的唯一理由（防首帧白闪）失败时同样不报错，只是闪一下。
 *
 * ## 测法
 *
 * 在 jsdom 里 `eval` 这段字符串，喂不同的 localStorage / matchMedia 组合，
 * 断言 `documentElement` 的结果。这与它在真实页面里的运行方式**同源**——
 * 那边也是把这段文本塞进 `<script>` 里求值，不是 import 一个函数。
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_CONSTANTS } from "@vxture/design-tokens";
import { themeBootstrapScript } from "../src/theme/script";
import { setPrefersDark } from "./setup";

const KEY = THEME_CONSTANTS.STORAGE_KEY;
const DARK = THEME_CONSTANTS.DARK_CLASS;

/** 照它在页面里的样子求值：一段文本，不是一个导入的函数。 */
const boot = () => {
  (0, eval)(themeBootstrapScript);
};

const html = () => document.documentElement;

beforeEach(() => {
  html().className = "";
  html().style.colorScheme = "";
});

describe("themeBootstrapScript · 三档主题", () => {
  it("存了 dark 就上暗色，且 color-scheme 跟着走", () => {
    localStorage.setItem(KEY, "dark");
    boot();
    expect(html().classList.contains(DARK)).toBe(true);
    expect(html().style.colorScheme).toBe("dark");
  });

  it("存了 light 就不上暗色", () => {
    localStorage.setItem(KEY, "light");
    setPrefersDark(true); // 系统是深色也不管——显式选择压过系统
    boot();
    expect(html().classList.contains(DARK)).toBe(false);
    expect(html().style.colorScheme).toBe("light");
  });

  /**
   * `system` 档才读系统偏好。**这一支最容易写反**：把 `saved === "system"`
   * 写成 `saved !== "light"` 之类，显式选浅色的用户在深色系统上会被强行切暗。
   */
  it("system 档跟随系统：系统深色 → 暗", () => {
    localStorage.setItem(KEY, "system");
    setPrefersDark(true);
    boot();
    expect(html().classList.contains(DARK)).toBe(true);
  });

  it("system 档跟随系统：系统浅色 → 亮", () => {
    localStorage.setItem(KEY, "system");
    setPrefersDark(false);
    boot();
    expect(html().classList.contains(DARK)).toBe(false);
  });

  /**
   * **没存过时的缺省是 `system`，不是 `light`。**
   *
   * 这条差别只在「新用户 + 深色系统」那一格里看得见——而那正是首帧白闪最刺眼
   * 的一格：整屏先白一下再变暗。缺省写成 light 的话，这段脚本对这批用户等于
   * 完全没有作用，而且**照样静默**。
   */
  it("从没存过时用缺省档（system），深色系统下直接进暗色", () => {
    setPrefersDark(true);
    boot();
    expect(THEME_CONSTANTS.DEFAULT_THEME).toBe("system");
    expect(html().classList.contains(DARK)).toBe(true);
  });

  it("从没存过 + 系统浅色 → 亮", () => {
    setPrefersDark(false);
    boot();
    expect(html().classList.contains(DARK)).toBe(false);
  });
});

describe("themeBootstrapScript · 不认识的值不许把页面弄坏", () => {
  /**
   * localStorage 是**用户可写的**（别的脚本、扩展、手动改），而这段代码跑在
   * 首帧之前。喂它一个不认识的值，最坏的结果也只能是「按浅色渲染」，
   * 不能是抛错——抛错等于后面那半段（`colorScheme`）不执行。
   */
  it.each(["  ", "Dark", "DARK", "auto", "{}", "null"])(
    "值是 %o 时按浅色走，且不抛",
    (value) => {
      localStorage.setItem(KEY, value);
      setPrefersDark(true);
      expect(() => boot()).not.toThrow();
      expect(html().classList.contains(DARK)).toBe(false);
      expect(html().style.colorScheme).toBe("light");
    },
  );

  /**
   * **空串是个例外，而且这个例外是对的。**
   *
   * 代码写的是 `getItem(KEY) || DEFAULT_THEME`，空串是假值，于是落到缺省档
   * `system`——也就是「跟随系统」。这比把空串当成一个不认识的值、强行按浅色渲染
   * 更合理：**存了一个空串等于什么都没存**，而「什么都没存」的答案本来就是跟随系统。
   *
   * 写这条用例时我先断言了「按浅色」，跑出来是红的——那是我把假设写进了断言，
   * 不是代码不对。留着这条是为了把这个区别钉住：`""` 与 `"auto"` 走两条不同的路。
   */
  it("空串当成「没设过」，因此跟随系统", () => {
    localStorage.setItem(KEY, "");
    setPrefersDark(true);
    boot();
    expect(html().classList.contains(DARK)).toBe(true);
  });

  /** 大小写敏感是有意的：档位名来自 `AVAILABLE_THEMES`，那是一份词表不是自由文本。 */
  it("档位名大小写敏感", () => {
    localStorage.setItem(KEY, "Dark");
    boot();
    expect(html().classList.contains(DARK)).toBe(false);
  });
});

describe("themeBootstrapScript · 拿不到 localStorage 也要活着", () => {
  /**
   * **这是那个 `catch` 唯一正当的用途。**
   *
   * 隐私模式、被禁用的站点数据、iframe 的第三方 cookie 限制——`localStorage`
   * 的**读取本身**就可能抛。这段脚本跑在所有页面的最前面，它抛出去整页脚本
   * 就断了，后面的 React 挂载都不会发生。
   *
   * 所以 catch 要留，但它兜住的应当只有这一类。
   */
  it("localStorage.getItem 抛出时不影响页面，只是不换主题", () => {
    const spy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new DOMException("Access is denied", "SecurityError");
      });

    expect(() => boot()).not.toThrow();
    // 抛在第一行，后面什么都没做——页面保持它本来的样子
    expect(html().classList.contains(DARK)).toBe(false);
    expect(html().style.colorScheme).toBe("");

    spy.mockRestore();
  });

  it("matchMedia 抛出时同样不影响页面", () => {
    localStorage.setItem(KEY, "system");
    const original = globalThis.matchMedia;
    globalThis.matchMedia = (() => {
      throw new TypeError("matchMedia is not a function");
    }) as unknown as typeof globalThis.matchMedia;

    expect(() => boot()).not.toThrow();

    globalThis.matchMedia = original;
  });
});

describe("themeBootstrapScript · 它得是一段能跑的脚本", () => {
  /**
   * 这一条钉的是**最基本的那件事**：它是合法的 JavaScript。
   *
   * 听起来多余，但它恰恰是 tsc 与 eslint 都够不着的一格——模板串里写错一个
   * 括号，构建照过、类型照过、所有组件用例照过，只有真实页面在首帧那一刻炸。
   * 而它自己的 catch 还兜不住语法错误（语法错误发生在解析期，不进 try）。
   */
  it("是合法的 JavaScript", () => {
    expect(() => new Function(themeBootstrapScript)).not.toThrow();
  });

  /** 立即执行函数包起来：它注在 `<head>` 里，泄漏到全局的变量会和页面打架。 */
  it("整段包在 IIFE 里，不往全局泄漏变量", () => {
    localStorage.setItem(KEY, "dark");
    boot();
    expect((globalThis as Record<string, unknown>)["saved"]).toBeUndefined();
    expect((globalThis as Record<string, unknown>)["isDark"]).toBeUndefined();
  });

  /**
   * 存储键与缺省档来自 tokens 的常量，不是这里手抄的字符串。
   *
   * ⚠ **这条断言只能证明「值对得上」，证明不了「走的是常量」**——两者的文本
   * 恰好一样。写这条时源码里 `classList.toggle('dark', …)` 的 `'dark'` 就是
   * 一个写死的字面量，而断言照样通过，因为 `DARK_CLASS` 的值正是 `"dark"`。
   *
   * 已把那一处改成插值（产出逐字节不变，所以不涉及发版）。真正钉住行为的是
   * 上面那几条——把键改错一个字母，它们会红；而「是不是走常量」这件事，
   * 断言天然分辨不出，记在这里免得下一轮有人以为它钉住了。
   */
  it("键与档位名与 THEME_CONSTANTS 一致", () => {
    expect(themeBootstrapScript).toContain(KEY);
    expect(themeBootstrapScript).toContain(THEME_CONSTANTS.DEFAULT_THEME);
    expect(themeBootstrapScript).toContain(DARK);
  });

  /** 反复执行要幂等——SSR 水合、软导航都可能让它跑不止一次。 */
  it("连跑两次结果一致", () => {
    localStorage.setItem(KEY, "dark");
    boot();
    boot();
    expect(html().classList.contains(DARK)).toBe(true);
    expect(
      html()
        .className.split(" ")
        .filter((c) => c === DARK),
    ).toHaveLength(1);
  });
});
