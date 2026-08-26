/**
 * 外壳部件族：品牌、图标按钮、语言/主题/全屏、停靠区、法务页脚。
 *
 * 这一族是**门户顶栏上那一排**——每个门户每一页都在。它们的共同点是
 * **几乎全是可访问性契约**：一个图标按钮除了那个图标什么都没有，读屏器能不能
 * 用全靠 `aria-label` / `aria-pressed`；写错了屏幕上一点看不出来。
 *
 * `ShellChrome.tsx` 1027 行、164 条分支，是伞包里最大的一个文件。
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FullscreenProvider, Icon } from "@vxture/design-ui";
import {
  LocaleSelectPanel,
  ShellAgentButton,
  ShellBrand,
  ShellDock,
  ShellIconButton,
  ShellIconGroup,
  ShellLegalFooter,
  ShellThemeToggle,
  ShellFullscreenToggle,
} from "../src/components/shell/ShellChrome";

const cls = (el: Element | null) => (el as HTMLElement)?.className ?? "";

/**
 * className 断言一律**按 token 比**，不用 `toContain`。
 *
 * `toContain` 是子串匹配，而 Tailwind 的变体让一条类天然是另一条的子串：
 * `Button variant="ghost"` 自带 `hover:bg-accent`，于是「active 时上 `bg-accent`」
 * 这条断言**在 active 分支被整个删掉之后照样绿**。
 *
 * 这是同一个陷阱第三次咬人（070 §5.1.3 记的是 `dark:` 变体那次）。
 */
const hasClass = (el: Element | null, token: string) =>
  cls(el).split(" ").filter(Boolean).includes(token);

/** 图标是 aria-hidden 的内联 SVG，没有可查询的名字——拿渲染内容当指纹。 */
const iconFingerprint = (root: ParentNode) =>
  (root.querySelector("svg") as SVGElement | null)?.innerHTML ?? "";

/* ── ShellIconButton ──────────────────────────────────────────────────────── */

describe("ShellIconButton · 只有图标，全靠 label 认", () => {
  /**
   * `label` 同时喂 `aria-label`（读屏器）与 `title`（鼠标停留）。**两条路都得给**：
   * 只给 title 读屏器听不见，只给 aria-label 鼠标用户悬停没提示——而这一排按钮
   * 除了图标什么都没有，两种用户都得靠它认。
   */
  it("label 同时落成 aria-label 与 title", () => {
    render(<ShellIconButton icon="settings" label="设置" />);
    const btn = screen.getByRole("button", { name: "设置" });
    /* ⚠ 两条都要显式断。可访问名的计算会**回落到 title**——只断 name 的话，
       把 aria-label 整个删掉这条照样绿（实测过）。而契约要的是两条路都给。 */
    expect(btn).toHaveAttribute("aria-label", "设置");
    expect(btn).toHaveAttribute("title", "设置");
  });

  /**
   * **`aria-pressed` 只在按下态出现，不是恒挂 `false`。**
   *
   * 恒挂的话，读屏器会把每一个图标按钮都念成「切换按钮，未按下」——而这一排里
   * 只有一两个真是开关（主题、全屏），其余是普通动作。全念成开关是噪音。
   */
  it("aria-pressed 只在 active 时出现", () => {
    const on = render(<ShellIconButton icon="settings" label="设置" active />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
    on.unmount();

    render(<ShellIconButton icon="settings" label="设置" />);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-pressed");
  });

  it("active 时上底色，非 active 时没有", () => {
    const on = render(<ShellIconButton icon="settings" label="设置" active />);
    expect(hasClass(on.container.querySelector("button"), "bg-accent")).toBe(
      true,
    );
    on.unmount();

    const off = render(<ShellIconButton icon="settings" label="设置" />);
    // ghost 档自带 hover:bg-accent——按 token 比才分得出「常态就有底」与「悬停才有」
    expect(hasClass(off.container.querySelector("button"), "bg-accent")).toBe(
      false,
    );
  });

  it("disabled 时按不动", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ShellIconButton
        icon="settings"
        label="设置"
        disabled
        onClick={onClick}
      />,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("点一下回调", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ShellIconButton icon="settings" label="设置" onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  /** 给了 children 就用它，不再画那个图标——头像按钮走的是这条路。 */
  it("children 顶掉图标", () => {
    const { container } = render(
      <ShellIconButton icon="settings" label="用户">
        <span>头像</span>
      </ShellIconButton>,
    );
    expect(screen.getByText("头像")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeNull();
  });
});

/* ── ShellBrand ───────────────────────────────────────────────────────────── */

describe("ShellBrand · 真名不入仓", () => {
  /**
   * 默认 label 是中性占位 `"Brand"`——**真实品牌名由调用方传入**。
   * DS 里出现一个具体产品名，等于把这套系统焊在那一个产品上。
   */
  it("不给 label 时是中性占位", () => {
    render(<ShellBrand />);
    expect(screen.getByText("Brand")).toBeInTheDocument();
  });

  it("默认链到根路径", () => {
    render(<ShellBrand />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/");
  });

  it("label 是字符串时才当可访问名", () => {
    const a = render(<ShellBrand label="控制台" />);
    expect(screen.getByRole("link", { name: "控制台" })).toBeInTheDocument();
    a.unmount();

    // ReactNode 时不硬塞 aria-label——塞进去会是 "[object Object]"
    render(<ShellBrand label={<span>控制台</span>} />);
    expect(screen.getByRole("link")).not.toHaveAttribute("aria-label");
  });

  it("不给 logo 就不渲染 img", () => {
    const { container } = render(<ShellBrand />);
    expect(container.querySelector("img")).toBeNull();
  });

  /**
   * **`logoAlt` 为空时图片要 `aria-hidden`。** 一个 `alt=""` 的图片本来就该被
   * 读屏器跳过，但显式挂上更稳——而给了 alt 就不能挂，挂了 alt 就白写了。
   */
  it("logoAlt 为空时图片对读屏器隐藏，给了就不隐藏", () => {
    const a = render(<ShellBrand logoSrc="/logo.svg" />);
    expect(a.container.querySelector("img")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    a.unmount();

    const b = render(<ShellBrand logoSrc="/logo.svg" logoAlt="标志" />);
    expect(b.container.querySelector("img")).not.toHaveAttribute("aria-hidden");
  });

  /** 宽高属性是**预留版位防抖动**，实际尺寸由 CSS 定——两处不同步会在加载前跳一下。 */
  it("图片带宽高，且不可拖拽", () => {
    const { container } = render(<ShellBrand logoSrc="/logo.svg" />);
    const img = container.querySelector("img") as HTMLImageElement;
    expect(img).toHaveAttribute("width", "24");
    expect(img).toHaveAttribute("height", "24");
    expect(img).toHaveAttribute("draggable", "false");
  });

  it("tag 给了才渲染那一片", () => {
    const a = render(<ShellBrand tag="Beta" />);
    expect(screen.getByText("Beta")).toBeInTheDocument();
    a.unmount();

    const { container } = render(<ShellBrand />);
    expect(container.querySelector(".vx-brand-local-name")).toBeNull();
  });

  /** 品牌标识走 `.vx-brand-*` 组合类——那是仍在册的品牌基线，不是遗留类。 */
  it("用的是品牌基线类", () => {
    const { container } = render(<ShellBrand logoSrc="/logo.svg" />);
    expect(cls(container.querySelector("a"))).toContain("vx-brand-lockup");
    expect(cls(container.querySelector("img"))).toContain("vx-brand-mark");
    expect(container.querySelector(".vx-brand-name")).not.toBeNull();
  });
});

/* ── ShellThemeToggle ─────────────────────────────────────────────────────── */

describe("ShellThemeToggle · 标签说的是「点了会变成什么」", () => {
  /**
   * **这是最容易写反的一条。**
   *
   * 图标画的是**当前**状态（现在是暗色 → 画太阳，暗示「点了会亮」），而
   * 标签念的是**点了会得到的那一档**。两者说的是同一件事的两面，但一个用图形、
   * 一个用文字，方向相反——写成「当前是暗色」的话，读屏用户听到「深色模式」
   * 点下去却变成了浅色。
   */
  it("当前浅色：图标是月亮，标签是「会变成暗」", () => {
    render(<ShellThemeToggle currentTheme="light" onThemeChange={() => {}} />);
    expect(
      screen.getByRole("button", { name: "Dark mode" }),
    ).toBeInTheDocument();
  });

  /**
   * **图标画的是当前状态，与标签方向相反。**
   *
   * 现在是暗色 → 画**太阳**（暗示「点了会亮」）；现在是浅色 → 画**月亮**。
   *
   * ⚠ 只断「两档图标不同」是**钉不住方向的**——把 sun / moon 对调之后那条照样绿
   * （实测过）。这里拿 `Icon` 直接渲染出参照指纹来比，方向才落定。
   */
  it.each([
    ["dark", "sun"],
    ["light", "moon"],
  ] as const)("当前 %s 时画的是 %s", (current, expectedIcon) => {
    const ref = render(<Icon name={expectedIcon} size="sm" />);
    const expected = iconFingerprint(ref.container);
    expect(expected).not.toBe("");
    ref.unmount();

    const { container } = render(
      <ShellThemeToggle currentTheme={current} onThemeChange={() => {}} />,
    );
    expect(iconFingerprint(container)).toBe(expected);
  });

  it.each([
    ["light", "dark"],
    ["dark", "light"],
  ] as const)("当前 %s 时点一下回传 %s", async (current, next) => {
    const user = userEvent.setup();
    const onThemeChange = vi.fn();
    render(
      <ShellThemeToggle currentTheme={current} onThemeChange={onThemeChange} />,
    );
    await user.click(screen.getByRole("button"));
    expect(onThemeChange).toHaveBeenCalledWith(next);
  });

  /**
   * 不认识的值当浅色处理——这个值可能来自 `system` 档或存储里的脏数据，
   * 而按钮总得有个确定的样子。
   */
  it.each(["system", "", "Dark", "midnight"])(
    "不认识的档位 %o 当浅色处理",
    (weird) => {
      render(
        <ShellThemeToggle currentTheme={weird} onThemeChange={() => {}} />,
      );
      const btn = screen.getByRole("button", { name: "Dark mode" });
      expect(btn).not.toHaveAttribute("aria-pressed");
    },
  );

  it("不给 currentTheme 时按浅色", () => {
    render(<ShellThemeToggle onThemeChange={() => {}} />);
    expect(
      screen.getByRole("button", { name: "Dark mode" }),
    ).toBeInTheDocument();
  });

  it("buttonLabel 压过两个方向的缺省文案", () => {
    render(
      <ShellThemeToggle
        currentTheme="dark"
        buttonLabel="切换外观"
        onThemeChange={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "切换外观" }),
    ).toBeInTheDocument();
  });

  it("两个方向的文案各自可换", () => {
    render(
      <ShellThemeToggle
        currentTheme="light"
        darkLabel="切到深色"
        onThemeChange={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "切到深色" }),
    ).toBeInTheDocument();
  });
});

/* ── ShellFullscreenToggle ────────────────────────────────────────────────── */

describe("ShellFullscreenToggle · 三个条件都对上才算「我在全屏」", () => {
  const wrap = (ui: React.ReactNode) => (
    <FullscreenProvider>{ui}</FullscreenProvider>
  );

  it("初始是「进入全屏」", () => {
    render(wrap(<ShellFullscreenToggle targetId="panel-a" />));
    expect(
      screen.getByRole("button", { name: "Enter full screen" }),
    ).toBeInTheDocument();
  });

  it("点一下进入，再点退出", async () => {
    const user = userEvent.setup();
    render(wrap(<ShellFullscreenToggle targetId="panel-a" mode="pseudo" />));

    await user.click(screen.getByRole("button"));
    const exitBtn = screen.getByRole("button", { name: "Exit full screen" });
    expect(exitBtn).toHaveAttribute("aria-pressed", "true");

    await user.click(exitBtn);
    expect(
      screen.getByRole("button", { name: "Enter full screen" }),
    ).toBeInTheDocument();
  });

  /**
   * **一页上有多个可全屏面板时，只有「就是我」那一个显示按下态。**
   *
   * 判据是三个都要对上：在全屏 + targetId 是我 + 模式也是我。少比一个的表现是
   * 「A 面板全屏时，B 面板的按钮也亮着」——用户点 B 会以为是退出，实际是切过去。
   */
  it("别的面板在全屏时，本按钮不亮", async () => {
    const user = userEvent.setup();
    render(
      wrap(
        <>
          <ShellFullscreenToggle
            targetId="panel-a"
            mode="pseudo"
            enterLabel="A 进入"
            exitLabel="A 退出"
          />
          <ShellFullscreenToggle
            targetId="panel-b"
            mode="pseudo"
            enterLabel="B 进入"
            exitLabel="B 退出"
          />
        </>,
      ),
    );

    await user.click(screen.getByRole("button", { name: "A 进入" }));

    expect(screen.getByRole("button", { name: "A 退出" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // B 仍是「进入」，且不亮
    const b = screen.getByRole("button", { name: "B 进入" });
    expect(b).not.toHaveAttribute("aria-pressed");
  });

  /** 模式对不上也不算——同一个 id 的原生全屏与伪全屏是两回事。 */
  it("模式对不上时不亮", async () => {
    const user = userEvent.setup();
    render(
      wrap(
        <>
          <ShellFullscreenToggle
            targetId="same"
            mode="pseudo"
            enterLabel="伪进入"
            exitLabel="伪退出"
          />
          <ShellFullscreenToggle
            targetId="same"
            mode="native"
            enterLabel="原生进入"
            exitLabel="原生退出"
          />
        </>,
      ),
    );

    await user.click(screen.getByRole("button", { name: "伪进入" }));
    expect(
      screen.getByRole("button", { name: "原生进入" }),
    ).not.toHaveAttribute("aria-pressed");
  });

  /** 调用方可以指定全屏的目标元素；不给就用整个文档。 */
  it("getTargetElement 决定谁进全屏", async () => {
    const user = userEvent.setup();
    const el = document.createElement("div");
    const getTargetElement = vi.fn(() => el);
    render(
      wrap(
        <ShellFullscreenToggle
          targetId="panel-a"
          mode="pseudo"
          getTargetElement={getTargetElement}
        />,
      ),
    );
    await user.click(screen.getByRole("button"));
    expect(getTargetElement).toHaveBeenCalled();
  });
});

/* ── LocaleSelectPanel ────────────────────────────────────────────────────── */

describe("LocaleSelectPanel · 语言目录不归 DS 所有", () => {
  const OPTIONS = [
    { locale: "zh-CN", nativeName: "简体中文", label: "Chinese", flag: "🇨🇳" },
    { locale: "en-US", nativeName: "English", label: "English" },
    { locale: "ja-JP", label: "Japanese" },
  ];

  /**
   * **缺省是空数组，不是一份内置语言表。** 支持哪些语言是平台的业务事实，
   * DS 收下那份表就等于把业务语义焊了进来（同 `tone.ts` 不收 `overdue` 的判据）。
   */
  it("不给 options 时一项都不出", () => {
    render(<LocaleSelectPanel activeLocale="zh-CN" onSelect={() => {}} />);
    expect(screen.queryAllByRole("menuitemradio")).toHaveLength(0);
  });

  it("每一项是 menuitemradio，只有当前那个 checked", () => {
    render(
      <LocaleSelectPanel
        activeLocale="en-US"
        options={OPTIONS}
        onSelect={() => {}}
      />,
    );
    const items = screen.getAllByRole("menuitemradio");
    expect(items).toHaveLength(3);
    expect(
      items.filter((i) => i.getAttribute("aria-checked") === "true"),
    ).toHaveLength(1);
    expect(
      screen.getByRole("menuitemradio", { name: /English/ }),
    ).toHaveAttribute("aria-checked", "true");
  });

  it("点一项回传它的 locale", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <LocaleSelectPanel
        activeLocale="zh-CN"
        options={OPTIONS}
        onSelect={onSelect}
      />,
    );
    await user.click(screen.getByRole("menuitemradio", { name: /Japanese/ }));
    expect(onSelect).toHaveBeenCalledWith("ja-JP");
  });

  /** 三个字段逐级回落：母语名 → 英文名 → 语言代码。都没有时至少还有代码。 */
  it("显示名逐级回落到语言代码", () => {
    render(
      <LocaleSelectPanel
        activeLocale="x"
        options={[{ locale: "fr-FR" }]}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText("fr-FR")).toBeInTheDocument();
  });

  /**
   * 母语名与英文名相同时**不重复显示**——`English / English` 是同一件事说两遍。
   */
  it("母语名与英文名相同时只显示一行", () => {
    render(
      <LocaleSelectPanel
        activeLocale="x"
        options={[{ locale: "en-US", nativeName: "English", label: "English" }]}
        onSelect={() => {}}
      />,
    );
    expect(screen.getAllByText("English")).toHaveLength(1);
  });

  it("两者不同时两行都出", () => {
    render(
      <LocaleSelectPanel
        activeLocale="x"
        options={[OPTIONS[0]!]}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText("简体中文")).toBeInTheDocument();
    expect(screen.getByText("Chinese")).toBeInTheDocument();
  });

  /** 旗子是装饰，不进无障碍树——语言名已经说清楚了。 */
  it("旗子对读屏器隐藏，不给就不渲染", () => {
    render(
      <LocaleSelectPanel
        activeLocale="x"
        options={OPTIONS}
        onSelect={() => {}}
      />,
    );
    const flag = screen.getByText("🇨🇳");
    expect(flag).toHaveAttribute("aria-hidden", "true");
    // en-US 那项没有 flag
    const en = screen.getByRole("menuitemradio", { name: /English/ });
    expect(en.textContent).not.toContain("🇨🇳");
  });
});

/* ── 其余部件 ─────────────────────────────────────────────────────────────── */

describe("ShellIconGroup · 一组按钮要有组名", () => {
  it("是 group 角色并带名", () => {
    render(
      <ShellIconGroup label="工具">
        <ShellIconButton icon="settings" label="设置" />
      </ShellIconGroup>,
    );
    expect(screen.getByRole("group", { name: "工具" })).toBeInTheDocument();
  });

  /** 组内任一项聚焦时整组上底——键盘用户看得见「我在这一组里」。 */
  it("组内聚焦时整组上底", () => {
    const { container } = render(
      <ShellIconGroup label="工具">
        <ShellIconButton icon="settings" label="设置" />
      </ShellIconGroup>,
    );
    expect(cls(container.firstElementChild)).toContain(
      "focus-within:bg-accent",
    );
  });
});

describe("ShellAgentButton · 头像按钮", () => {
  it("是 type=button，图标对读屏器隐藏", () => {
    const { container } = render(
      <ShellAgentButton iconSrc="/a.png" label="助手" />,
    );
    const btn = screen.getByRole("button", { name: "助手" });
    expect(btn).toHaveAttribute("type", "button");
    expect(container.querySelector("img")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("aria-pressed 只在 active 时出现", () => {
    const on = render(
      <ShellAgentButton iconSrc="/a.png" label="助手" active />,
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
    on.unmount();

    render(<ShellAgentButton iconSrc="/a.png" label="助手" />);
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-pressed");
  });

  it("disabled 时按不动", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <ShellAgentButton
        iconSrc="/a.png"
        label="助手"
        disabled
        onClick={onClick}
      />,
    );
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("ShellDock · 三种宽度形态", () => {
  it.each([
    ["narrow", "w-[26.25rem]"],
    ["wide", "w-[clamp(30rem,46vw,47.5rem)]"],
  ] as const)("mode=%s → %s", (mode, expected) => {
    const { container } = render(<ShellDock mode={mode}>x</ShellDock>);
    expect(cls(container.firstElementChild)).toContain(expected);
  });

  /** `full` 是**盖住整个视口**：定位、层级、去边框去阴影一起来，少一样都露馅。 */
  it("mode=full 时铺满视口并去掉边与影", () => {
    const { container } = render(<ShellDock mode="full">x</ShellDock>);
    const c = cls(container.firstElementChild);
    expect(c).toContain("fixed");
    expect(c).toContain("inset-0");
    expect(c).toContain("z-modal");
    expect(c).toContain("border-l-0");
    expect(c).toContain("shadow-none");
  });

  it("不给 mode 时是 narrow", () => {
    const { container } = render(<ShellDock>x</ShellDock>);
    expect(cls(container.firstElementChild)).toContain("w-[26.25rem]");
  });
});

describe("ShellLegalFooter · 法务链接", () => {
  it("缺省三条链接都在，且导航有名", () => {
    render(<ShellLegalFooter />);
    const nav = screen.getByRole("navigation", { name: "Legal links" });
    expect(nav).toBeInTheDocument();
    for (const name of [
      "Terms of Service",
      "Privacy Policy",
      "Cookie Policy",
    ]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
  });

  it("链接可整份替换", () => {
    render(
      <ShellLegalFooter
        links={[{ href: "/x", label: "服务条款" }]}
        legalLabel="法务"
      />,
    );
    expect(
      screen.getByRole("navigation", { name: "法务" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  /** 版权行的缺省同样是中性占位——真名不入仓。 */
  it("版权行可换，缺省是中性占位", () => {
    const a = render(<ShellLegalFooter />);
    expect(screen.getByText(/Brand/)).toBeInTheDocument();
    a.unmount();

    render(<ShellLegalFooter copyright="© 2026 某某公司" />);
    expect(screen.getByText("© 2026 某某公司")).toBeInTheDocument();
  });
});
