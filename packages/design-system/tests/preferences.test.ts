/**
 * 偏好轴的读写与跨端同步：`fontSizePreference` 与 `densityConfig`。
 *
 * ⚠ 本文件把 jsdom 的文档 URL 设成 `https://app.vxture.com/`（见下方 docblock）。
 * 光把 `window.location` 桩掉不够——被测代码读的是那个桩，而**cookie 罐子按真实
 * 文档 URL 判**：文档在 localhost 上时，一条 `domain=.vxture.com` 的 cookie 会被
 * 浏览器整条丢弃，不报错。第一版就是这么写的，两条用例红在「cookie 是空的」。
 *
 * 这个坑本身就是那条 domain 分支要防的东西，所以留在注释里。
 *
 * 这一族的特点是**两个存储各存一份**：localStorage 管本标签页，cookie 管跨子域
 * （platform / console / opera 是同一个 `.vxture.com` 下的不同主机）。两份不同步
 * 的表现是「在 A 站改了字号，切到 B 站又变回去」——而它不报错，用户只会觉得
 * 「这个设置好像没保存住」。
 *
 * @vitest-environment-options { "url": "https://app.vxture.com/" }
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PREFERENCE_CONSTANTS } from "@vxture/design-tokens";
import {
  readFontSizePreference,
  writeFontSizePreference,
  subscribeFontSizePreference,
  type FontSizePreference,
} from "../src/theme/fontSizePreference";
import {
  DEFAULT_DENSITY,
  DENSITY_STORAGE_KEY,
} from "../src/density/densityConfig";

const LS = PREFERENCE_CONSTANTS.FONTSIZE_STORAGE_KEY;
const CK = PREFERENCE_CONSTANTS.FONTSIZE_COOKIE_KEY;
const SYNC = PREFERENCE_CONSTANTS.SYNC_STORAGE_KEY;

/** jsdom 的 document.cookie 只增不减，逐条置过期才清得掉。 */
function clearCookies() {
  for (const entry of document.cookie.split(";")) {
    const name = entry.split("=")[0]?.trim();
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  }
}

/** 换 hostname / 协议：cookie 的 domain 与 secure 两支都由它们决定。 */
function setLocation(hostname: string, protocol = "https:") {
  Object.defineProperty(window, "location", {
    value: { hostname, protocol },
    writable: true,
    configurable: true,
  });
}

/**
 * 截获写进 `document.cookie` 的**原始字符串**。
 *
 * 为什么必须这样：`domain` 与 `secure` 两支的判据读的是 `window.location`，
 * 而我们只能把那个对象桩掉；**jsdom 的 cookie 罐子按真实文档 URL 判**，两者
 * 按构造就不一致。于是「代码决定加不加 domain」这件事，从读回来的 cookie 上
 * 观察不到——把那一支删掉，用例照样绿（实测过）。
 *
 * 截 setter 才看得见决定本身。这也更接近这条分支的真实后果：错误的 domain
 * 会让浏览器**整条丢弃**这个 cookie，而丢弃是静默的。
 */
function captureCookieWrites() {
  const written: string[] = [];
  const spy = vi.spyOn(document, "cookie", "set").mockImplementation((v) => {
    written.push(v);
  });
  return { written, restore: () => spy.mockRestore() };
}

const originalLocation = window.location;

beforeEach(() => {
  clearCookies();
});

afterEach(() => {
  Object.defineProperty(window, "location", {
    value: originalLocation,
    writable: true,
    configurable: true,
  });
});

/* ── 读 ───────────────────────────────────────────────────────────────────── */

describe("readFontSizePreference · localStorage 优先，cookie 兜底", () => {
  it.each(["small", "default", "large"] as const)(
    "localStorage 里的 %s 直接采信",
    (value) => {
      localStorage.setItem(LS, value);
      expect(readFontSizePreference()).toBe(value);
    },
  );

  /**
   * **cookie 是跨子域那一半。**从 platform 切到 opera 时 localStorage 是空的
   * （不同 origin），只有 `.vxture.com` 上的 cookie 跟得过来。少了这一支的表现是
   * 「每换一个子站字号就回到默认」。
   */
  it("localStorage 没有时回落到 cookie", () => {
    document.cookie = `${CK}=large; path=/`;
    expect(readFontSizePreference()).toBe("large");
  });

  it("两个都有时以 localStorage 为准", () => {
    localStorage.setItem(LS, "small");
    document.cookie = `${CK}=large; path=/`;
    expect(readFontSizePreference()).toBe("small");
  });

  /** 两个都没有 → 缺省档。 */
  it("都没有时是 default", () => {
    expect(readFontSizePreference()).toBe("default");
  });

  /**
   * 不认识的值归一到缺省，不是原样返回。这两个存储**用户可写**，而返回值会被
   * 当成类名后缀用（`vx-font-*`）——原样透传等于让一个任意字符串进到 class 里。
   */
  it.each(["", "  ", "Large", "medium", "null", "{}"])(
    "不认识的值 %o 归一到 default",
    (bad) => {
      localStorage.setItem(LS, bad);
      expect(readFontSizePreference()).toBe("default");
    },
  );

  /** cookie 里的脏值同样归一。 */
  it("cookie 里的脏值也归一", () => {
    document.cookie = `${CK}=huge; path=/`;
    expect(readFontSizePreference()).toBe("default");
  });

  /**
   * 名字相近的另一条 cookie 不许被读成本项。同一个域下还有 `vx-density` /
   * `vx-theme`，前缀写松了会读到隔壁那一条。
   *
   * ⚠ **这条钉的是结果，钉不住判据本身**，说明白免得下一轮误会：
   *
   * 把 `startsWith(prefix)` 换成 `includes(name)` 之后，`find` 命中的是隔壁那条，
   * 再按 `vx-fontsize=` 的长度切片，切出来必然是一段废字符串（`"e=large"` 之类），
   * 归一之后还是 `default`——**与正确实现的结果一样**。
   *
   * 唯一能分辨的构造是「两条 cookie，隔壁那条排在前面」。而 `document.cookie` 的
   * 排列**不由用例控制**：同一段代码隔离跑是 `a-vx-fontsize=…; vx-fontsize=…`，
   * 全套跑变成反过来（旧 cookie 被 max-age=0 清掉后再写，罐子里的次序变了）。
   * 依赖那个次序的用例会**因不同理由通过**——第一版就是这样，隔离跑变红、
   * 全套跑变绿。
   *
   * 所以这里只断言「隔壁那条没被当成本项」，并把分辨不了的那一半记在这。
   */
  it("名字相近的另一条 cookie 不会被当成本项", () => {
    document.cookie = `a-${CK}=large; path=/`;
    expect(readFontSizePreference()).toBe("default");
  });
});

/* ── 写 ───────────────────────────────────────────────────────────────────── */

describe("writeFontSizePreference · 两个存储都要写", () => {
  it("localStorage 与 cookie 同时落", () => {
    setLocation("app.vxture.com");
    writeFontSizePreference("large");
    expect(localStorage.getItem(LS)).toBe("large");
    expect(document.cookie).toContain(`${CK}=large`);
  });

  /**
   * **`domain=.vxture.com` 只在自家域下才加。**
   *
   * 在 localhost 或 IP 上加这条，浏览器会**整条丢弃**这个 cookie——不是报错，
   * 是静默不写。表现是「本地开发时字号跨标签页不同步，线上却好的」，
   * 而这种「线上好、本地炸」最难归因。
   */
  it.each([
    ["vxture.com", true],
    ["app.vxture.com", true],
    ["a.b.vxture.com", true],
    ["localhost", false],
    ["127.0.0.1", false],
    // 形近域名不算自家：endsWith 前面那个点不能少，少了它任何以
    // vxture.com 结尾的域名都会拿到一条写向 .vxture.com 的 cookie
    ["evilvxture.com", false],
    ["notvxture.com", false],
  ])("hostname=%s 时加 domain=%s", (host, shouldHaveDomain) => {
    const cap = captureCookieWrites();
    setLocation(host);
    writeFontSizePreference("small");
    cap.restore();

    expect(cap.written).toHaveLength(1);
    expect(cap.written[0]!.includes("; domain=.vxture.com")).toBe(
      shouldHaveDomain,
    );
  });

  /** `secure` 只在 https 下加——http 页面写了 secure 的 cookie 同样被丢弃。 */
  it.each([
    ["https:", true],
    ["http:", false],
  ])("协议 %s 时加 secure=%s", (protocol, shouldBeSecure) => {
    const cap = captureCookieWrites();
    setLocation("app.vxture.com", protocol);
    writeFontSizePreference("small");
    cap.restore();

    expect(cap.written[0]!.includes("; secure")).toBe(shouldBeSecure);
  });

  /** 其余属性一个都不能少：不写 path 的话 cookie 只在当前路径下可见。 */
  it("path / max-age / samesite 都在", () => {
    const cap = captureCookieWrites();
    setLocation("app.vxture.com");
    writeFontSizePreference("large");
    cap.restore();

    const raw = cap.written[0]!;
    expect(raw).toContain("; path=/");
    expect(raw).toContain(`; max-age=${PREFERENCE_CONSTANTS.COOKIE_MAX_AGE}`);
    expect(raw).toContain("; samesite=lax");
  });
  it("写进去的值本身要转义", () => {
    setLocation("app.vxture.com");
    writeFontSizePreference("large");
    expect(document.cookie).toContain(encodeURIComponent("large"));
  });
});

/* ── 跨标签同步 ───────────────────────────────────────────────────────────── */

describe("subscribeFontSizePreference · 跨标签同步", () => {
  const fire = (key: string | null) =>
    window.dispatchEvent(new StorageEvent("storage", { key }));

  it("本键变化时回调，并带上新值", () => {
    const listener = vi.fn<(v: FontSizePreference) => void>();
    const off = subscribeFontSizePreference(listener);

    localStorage.setItem(LS, "large");
    fire(LS);

    expect(listener).toHaveBeenCalledWith("large");
    off();
  });

  /**
   * **共享快照那一支不能少。**platform-browser 在任何一项偏好变化时写
   * `vx-user-preferences`，而它不一定同时写字号那个键。少了这一支的表现是
   * 「在设置面板改了字号，别的标签页要刷新才跟上」。
   */
  it("共享快照键变化时也回调", () => {
    const listener = vi.fn();
    const off = subscribeFontSizePreference(listener);

    localStorage.setItem(LS, "small");
    fire(SYNC);

    expect(listener).toHaveBeenCalledWith("small");
    off();
  });

  it("别的键变化时不回调", () => {
    const listener = vi.fn();
    const off = subscribeFontSizePreference(listener);

    fire("vx-density");
    fire("完全无关的键");
    fire(null);

    expect(listener).not.toHaveBeenCalled();
    off();
  });

  /** 退订之后不再回调——不退订就是内存泄漏，而泄漏不报错。 */
  it("退订之后不再回调", () => {
    const listener = vi.fn();
    const off = subscribeFontSizePreference(listener);
    off();

    localStorage.setItem(LS, "large");
    fire(LS);

    expect(listener).not.toHaveBeenCalled();
  });
});

/* ── densityConfig ────────────────────────────────────────────────────────── */

describe("densityConfig · 常量本身", () => {
  /** 缺省档是 `default` 而不是 `compact`：密度是偏好，不该替用户先收紧。 */
  it("缺省密度是 default", () => {
    expect(DEFAULT_DENSITY).toBe("default");
  });

  /**
   * 存储键与 tokens 那份常量必须一致。两处对不上的表现是「设置面板写的键
   * 和读的键不是同一个」——写进去了，读不回来，而且**两边都不报错**。
   */
  it("存储键与 PREFERENCE_CONSTANTS 一致", () => {
    expect(DENSITY_STORAGE_KEY).toBe(PREFERENCE_CONSTANTS.DENSITY_STORAGE_KEY);
  });
});
