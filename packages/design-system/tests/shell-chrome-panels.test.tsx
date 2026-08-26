/**
 * `ShellChrome` 的三个弹层件：`ShellLocaleSwitcher` / `ShellPreferencePanel` /
 * `ShellUserMenu`。
 *
 * 这三件是外壳里唯一**有状态**的部分——弹层的开合。它们共有的一条契约是
 * **「选完就关」**：选了语言、点了链接、按了动作，面板必须自己收起来。漏掉
 * 一处不报错，表现是用户点完一项后面板赖着不走，得再点一次空白处。
 *
 * `ShellUserMenu` 另有一条：它整个壳都借 `ShellPanel*`，账户菜单与产品自拼的
 * 面板因此逐像素同款——这一条只能靠「用的是不是同一个件」来验。
 *
 * 81 条分支，此前 0%。
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  ShellLocaleSwitcher,
  ShellPreferencePanel,
  ShellUserMenu,
} from "../src/components/shell/ShellChrome";
import { ShellPanelRow } from "../src/components/shell/ShellPanel";

const hasClass = (el: Element | null, token: string) =>
  ((el as HTMLElement)?.className ?? "")
    .split(" ")
    .filter(Boolean)
    .includes(token);

/**
 * `ShellPanelRow` 在可点且没有 `trailingIcon` 时画的那张 chevron。用来区分
 * 「去向图标」与「展开子面板」两种右端记号——两者都只是一张 svg，光数个数
 * 分不出来。
 */
let CHEVRON = "";

beforeAll(() => {
  const probe = render(<ShellPanelRow label="probe" onClick={() => {}} />);
  CHEVRON = (probe.container.querySelector("svg") as SVGElement).innerHTML;
  probe.unmount();
});

const LOCALES = [
  { locale: "zh-CN", nativeName: "简体中文", label: "Chinese" },
  { locale: "en-US", nativeName: "English" },
  { locale: "ja-JP" },
];

/* ── ShellLocaleSwitcher ──────────────────────────────────────────────────── */

describe("ShellLocaleSwitcher · 选完就关", () => {
  const setup = (
    props: Partial<React.ComponentProps<typeof ShellLocaleSwitcher>> = {},
  ) => {
    const onLocaleChange = vi.fn();
    render(
      <ShellLocaleSwitcher
        currentLocale="zh-CN"
        options={LOCALES}
        onLocaleChange={onLocaleChange}
        {...props}
      />,
    );
    return { onLocaleChange, user: userEvent.setup() };
  };

  it("触发器与面板都有缺省的名字", async () => {
    const { user } = setup();
    const trigger = screen.getByRole("button", { name: "Select language" });
    await user.click(trigger);
    expect(await screen.findByRole("dialog")).toHaveAttribute(
      "aria-label",
      "Language",
    );
  });

  it("两个名字都可换——外壳要跟着产品的语言走", async () => {
    const { user } = setup({ buttonLabel: "切换语言", panelLabel: "语言" });
    await user.click(screen.getByRole("button", { name: "切换语言" }));
    expect(await screen.findByRole("dialog")).toHaveAttribute(
      "aria-label",
      "语言",
    );
  });

  /**
   * **选一项 = 回传 + 关闭。**
   *
   * 只回传不关，面板会赖在原地——而用户刚刚做的选择已经生效了，留着的那个
   * 面板看起来像是「还没选上」。
   */
  it("选一项既回传也关闭", async () => {
    const { user, onLocaleChange } = setup();
    await user.click(screen.getByRole("button", { name: "Select language" }));
    await user.click(
      await screen.findByRole("menuitemradio", { name: /English/ }),
    );
    expect(onLocaleChange).toHaveBeenCalledWith("en-US");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  /** 面板开着的时候触发器要保持按下态——否则看不出这个面板是谁开的。 */
  it("面板开着时触发器是按下态", async () => {
    const { user } = setup();
    const trigger = screen.getByRole("button", { name: "Select language" });
    expect(trigger).not.toHaveAttribute("aria-pressed");
    await user.click(trigger);
    await screen.findByRole("dialog");
    expect(trigger).toHaveAttribute("aria-pressed", "true");
  });

  it("不给 options 时面板是空的，不是崩的", async () => {
    const onLocaleChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ShellLocaleSwitcher
        currentLocale="zh-CN"
        onLocaleChange={onLocaleChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Select language" }));
    const panel = await screen.findByRole("dialog");
    expect(within(panel).queryAllByRole("menuitemradio")).toHaveLength(0);
  });

  it("三个 className 各挂各的位置", async () => {
    const { user } = setup({
      className: "OUTER",
      buttonClassName: "BTN",
      popoverClassName: "POP",
    });
    const trigger = screen.getByRole("button", { name: "Select language" });
    expect(hasClass(trigger, "BTN")).toBe(true);
    expect(hasClass(trigger.parentElement, "OUTER")).toBe(true);
    await user.click(trigger);
    expect(hasClass(await screen.findByRole("dialog"), "POP")).toBe(true);
  });

  it("activeButtonClassName 只在面板开着时上身", async () => {
    const { user } = setup({ activeButtonClassName: "ON" });
    const trigger = screen.getByRole("button", { name: "Select language" });
    expect(hasClass(trigger, "ON")).toBe(false);
    await user.click(trigger);
    await screen.findByRole("dialog");
    expect(hasClass(trigger, "ON")).toBe(true);
  });
});

/* ── ShellPreferencePanel ─────────────────────────────────────────────────── */

describe("ShellPreferencePanel · 四行偏好", () => {
  const setup = (
    props: Partial<React.ComponentProps<typeof ShellPreferencePanel>> = {},
  ) => {
    const fns = {
      onLocaleChange: vi.fn(),
      onThemeChange: vi.fn(),
      onDensityChange: vi.fn(),
      onFontSizeChange: vi.fn(),
    };
    const view = render(
      <ShellPreferencePanel
        locale="zh-CN"
        localeOptions={LOCALES}
        theme="system"
        {...fns}
        {...props}
      />,
    );
    return { ...fns, ...view, user: userEvent.setup() };
  };

  /**
   * ⚠ 数**元素**不数文字（070 §5.1.1）。把 `{labels?.title ? … : null}` 改成
   * 恒渲染，出来的是一个**空**标题行——既没有文字也没有角色，查文字查不出来，
   * 但它带着自己的行高，会在面板顶上留一段说不清来路的空白。
   */
  it("标题给了才出，不给就没有那一行", () => {
    const a = setup({ labels: { title: "偏好" } });
    expect(screen.getByText("偏好")).toBeInTheDocument();
    expect(a.container.firstElementChild?.children).toHaveLength(5);
    a.unmount();

    const { container } = setup();
    expect(container.firstElementChild?.children).toHaveLength(4);
  });

  /** 语言下拉的显示名与 `LocaleSelectPanel` 同一套回落：母语名 → 英文名 → 代码。 */
  it("语言下拉的显示名逐级回落到语言代码", () => {
    setup();
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual([
      "简体中文",
      "English",
      "ja-JP",
    ]);
  });

  it("换语言回传选中的代码", async () => {
    const { user, onLocaleChange } = setup();
    await user.selectOptions(screen.getByRole("combobox"), "en-US");
    expect(onLocaleChange).toHaveBeenCalledWith("en-US");
  });

  /** 主题/密度/字号三段的缺省文案是英文单词——短，三档并排等宽才不互相撑开。 */
  it("三段的缺省文案都在", () => {
    setup();
    for (const label of [
      "System",
      "Light",
      "Dark",
      "Compact",
      "Default",
      "Comfortable",
      "Small",
      "Large",
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  /** 逐档可换，且**只换传了的那一档**——`Partial` 与缺省逐项合并。 */
  it("单档文案可换，其余仍用缺省", () => {
    setup({ labels: { themeOptions: { dark: "暗色" } } });
    expect(screen.getByText("暗色")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
    expect(screen.queryByText("Dark")).not.toBeInTheDocument();
  });

  it("换主题回传档位", async () => {
    const { user, onThemeChange } = setup();
    await user.click(screen.getByText("Dark"));
    expect(onThemeChange).toHaveBeenCalledWith("dark");
  });

  it("换密度、换字号各自回传", async () => {
    const { user, onDensityChange, onFontSizeChange } = setup();
    await user.click(screen.getByText("Comfortable"));
    expect(onDensityChange).toHaveBeenCalledWith("comfortable");
    await user.click(screen.getByText("Small"));
    expect(onFontSizeChange).toHaveBeenCalledWith("small");
  });

  /** 两段都可整段关掉——不是每个产品都有密度和字号这两个概念。 */
  it("showDensity=false 时整段不出", () => {
    setup({ showDensity: false });
    expect(screen.queryByText("Compact")).not.toBeInTheDocument();
    expect(screen.getByText("Small")).toBeInTheDocument();
  });

  it("showFontSize=false 时整段不出", () => {
    setup({ showFontSize: false });
    expect(screen.queryByText("Small")).not.toBeInTheDocument();
    expect(screen.getByText("Compact")).toBeInTheDocument();
  });

  /** 不给 density / fontSize 时都停在 default 档，而不是没有任何一档选中。 */
  it("不给取值时两段都停在 default 档", () => {
    const { container } = setup();
    const checked = [
      ...container.querySelectorAll('[aria-checked="true"]'),
    ].map((el) => el.textContent);
    expect(checked).toContain("System");
    // 密度与字号两段的 default 档各选中一次
    expect(checked.filter((t) => t === "Default")).toHaveLength(2);
  });

  /**
   * **两个回调是可选的，不给也不能崩。**
   *
   * 关掉了密度那一段的产品不会传 `onDensityChange`；但段落开着、回调没传的
   * 组合也是合法的（只读展示），点下去应该什么都不发生，而不是抛
   * 「onDensityChange is not a function」。
   */
  it("段落开着但没给回调时，点下去不抛", async () => {
    const user = userEvent.setup();
    render(
      <ShellPreferencePanel
        locale="zh-CN"
        localeOptions={LOCALES}
        theme="system"
        onLocaleChange={() => {}}
        onThemeChange={() => {}}
      />,
    );
    // ⚠ 不能只写 `.resolves.toBeUndefined()`。React 的事件处理器抛出去的错
    // 不在这条 promise 链上——把 `onDensityChange?.()` 改成硬调用，那条断言
    // 照样通过，异常只会以「未捕获」的形式出现在跑批日志的角落里。
    const onError = vi.fn();
    window.addEventListener("error", onError);
    await user.click(screen.getByText("Comfortable"));
    await user.click(screen.getByText("Large"));
    window.removeEventListener("error", onError);
    expect(onError).not.toHaveBeenCalled();
  });
});

/* ── ShellUserMenu ────────────────────────────────────────────────────────── */

const USER = {
  displayName: "某某",
  uniqueLine: "@somebody",
  meta: "加入于 2024",
};

const openMenu = async (
  props: Partial<React.ComponentProps<typeof ShellUserMenu>> = {},
) => {
  const user = userEvent.setup();
  const view = render(<ShellUserMenu user={USER} {...props} />);
  await user.click(
    screen.getByRole("button", { name: props.openLabel ?? "User menu" }),
  );
  const panel = await screen.findByRole("dialog");
  return { user, panel, ...view };
};

describe("ShellUserMenu · 触发器", () => {
  it("名字同时落成 aria-label 与 title，可换", () => {
    const a = render(<ShellUserMenu user={USER} />);
    const btn = screen.getByRole("button", { name: "User menu" });
    expect(btn).toHaveAttribute("title", "User menu");
    a.unmount();

    render(<ShellUserMenu user={USER} openLabel="账户菜单" />);
    expect(
      screen.getByRole("button", { name: "账户菜单" }),
    ).toBeInTheDocument();
  });

  /** 在线小点是**装饰**：它旁边就是头像与名字，读屏器再念一遍「在线」是重复。 */
  it("在线小点缺省画，且对读屏器隐藏", () => {
    const { container } = render(<ShellUserMenu user={USER} />);
    const dot = container.querySelector(".bg-success");
    expect(dot).not.toBeNull();
    expect(dot).toHaveAttribute("aria-hidden", "true");
  });

  it("online=false 时不画", () => {
    const { container } = render(<ShellUserMenu user={USER} online={false} />);
    expect(container.querySelector(".bg-success")).toBeNull();
  });

  it("statusClassName 挂在小点上", () => {
    const { container } = render(
      <ShellUserMenu user={USER} statusClassName="DOT" />,
    );
    expect(hasClass(container.querySelector(".bg-success"), "DOT")).toBe(true);
  });

  /** 没有头像图时落到剪影兜底，而兜底也得有名字——它是这个按钮里唯一的内容。 */
  it("没有头像图时剪影兜底带名字", async () => {
    render(<ShellUserMenu user={USER} />);
    expect(await screen.findByLabelText("某某")).toBeInTheDocument();
  });

  it("avatarAlt 压过 displayName", async () => {
    render(<ShellUserMenu user={{ ...USER, avatarAlt: "我的头像" }} />);
    expect(await screen.findByLabelText("我的头像")).toBeInTheDocument();
  });
});

describe("ShellUserMenu · 头部", () => {
  it("显示名与两条 meta 都在", async () => {
    const { panel } = await openMenu();
    expect(within(panel).getByText("某某")).toBeInTheDocument();
    expect(within(panel).getByText("@somebody")).toBeInTheDocument();
    expect(within(panel).getByText("加入于 2024")).toBeInTheDocument();
  });

  /** ⚠ 同样数元素：内容为空的 meta 行查不出文字，但照样占一行高。 */
  it("两条 meta 都不给时头部只剩名字", async () => {
    const { panel } = await openMenu({ user: { displayName: "某某" } });
    expect(within(panel).getByText("某某")).toBeInTheDocument();
    expect(panel.querySelectorAll('p[class~="text-body-sm"]')).toHaveLength(0);
  });

  it("只给一条 meta 时就只画一行", async () => {
    const { panel } = await openMenu({
      user: { displayName: "某某", uniqueLine: "@somebody" },
    });
    expect(panel.querySelectorAll('p[class~="text-body-sm"]')).toHaveLength(1);
  });

  /**
   * 认证贴标靠 `verified` 翻**语气**，图标随语气来。
   *
   * ⚠ 不能拿「有没有 svg」当判据——`StatusBadge` 两种语气**都**自带前导图标
   * （成功=圆形对勾，中性=减号）。第一版就是这么写的，于是它既没验出语气，
   * 也没发现这里本来多画了一个对勾。
   */
  it("已认证时上成功语气", async () => {
    const { panel } = await openMenu({
      user: { ...USER, statusTag: { label: "已认证", verified: true } },
    });
    const tag = within(panel).getByText("已认证");
    expect(hasClass(tag, "text-success-text")).toBe(true);
  });

  it("未认证时中性语气", async () => {
    const { panel } = await openMenu({
      user: { ...USER, statusTag: { label: "未认证" } },
    });
    const tag = within(panel).getByText("未认证");
    expect(hasClass(tag, "text-success-text")).toBe(false);
  });

  /**
   * **只画一个对勾。**
   *
   * `StatusBadge` 的图标缺省随语气来（它的文件头：「不必每处各配一张」）。
   * 这里曾经在语气图标之外又显式画了一个 `check`，「已认证」前面于是并排
   * 两个对勾——不报错，就是看着别扭。
   */
  it("已认证只带一个前导图标", async () => {
    const { panel } = await openMenu({
      user: { ...USER, statusTag: { label: "已认证", verified: true } },
    });
    const tag = within(panel).getByText("已认证");
    expect(tag.querySelectorAll("svg")).toHaveLength(1);
  });

  it("不给 statusTag 就没有贴标", async () => {
    const { panel } = await openMenu();
    expect(within(panel).queryByText(/认证/)).not.toBeInTheDocument();
  });

  it("badges 逐个渲染", async () => {
    const { panel } = await openMenu({
      user: {
        ...USER,
        badges: [
          { key: "a", label: "内测" },
          { key: "b", label: "年费" },
        ],
      },
    });
    expect(within(panel).getByText("内测")).toBeInTheDocument();
    expect(within(panel).getByText("年费")).toBeInTheDocument();
  });

  /** 空数组不等于「有一个空的徽章区」——那会在头部下方留一条无来由的空行。 */
  it("badges 是空数组时不留空行", async () => {
    const { panel } = await openMenu({ user: { ...USER, badges: [] } });
    expect(panel.querySelector(".flex-wrap")).toBeNull();
  });
});

describe("ShellUserMenu · 各段落", () => {
  it("extras 插在头部之后，自带分隔线", async () => {
    const { panel } = await openMenu({ extras: <div>产品自定义</div> });
    const section = within(panel).getByText("产品自定义").parentElement;
    expect(hasClass(section, "pt-md")).toBe(true);
  });

  it("settings 段落同款", async () => {
    const { panel } = await openMenu({ settings: <div>偏好设置</div> });
    expect(
      hasClass(within(panel).getByText("偏好设置").parentElement, "pt-md"),
    ).toBe(true);
  });

  it("不给就没有那一段", async () => {
    const { panel } = await openMenu();
    expect(panel.querySelectorAll(".pt-md")).toHaveLength(0);
  });

  /**
   * 链接段的右端画的是**去向**图标而不是 chevron——chevron 在本面板里已经
   * 被「展开子面板」占用，两种去向要能一眼分开。
   */
  it("链接段每行右端是去向图标", async () => {
    const { panel } = await openMenu({
      links: [{ key: "p", label: "个人信息", href: "/me", icon: "user" }],
    });
    const row = within(panel).getByRole("link", { name: /个人信息/ });
    expect(row).toHaveAttribute("href", "/me");
    // 前置图标 + 去向图标
    expect(row.querySelectorAll("svg")).toHaveLength(2);

    // ⚠ 数个数分不出画的是**哪一张**——去向图标与 chevron 都只是一张 svg。
    // 拿一个只有 chevron 的同款行来比：末尾那张必须不一样。
    const trailing = [...row.querySelectorAll("svg")].at(-1)!;
    expect(trailing.innerHTML).not.toBe(CHEVRON);
  });

  it("newTab 缺省关，传了才新开并补 rel", async () => {
    const a = await openMenu({
      links: [{ key: "p", label: "文档", href: "/docs" }],
    });
    expect(within(a.panel).getByRole("link")).not.toHaveAttribute("target");
    a.unmount();

    const { panel } = await openMenu({
      links: [{ key: "p", label: "文档", href: "/docs", newTab: true }],
    });
    const link = within(panel).getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer noopener");
  });

  it("点链接把菜单收起来", async () => {
    const { user, panel } = await openMenu({
      links: [{ key: "p", label: "个人信息", href: "/me" }],
    });
    await user.click(within(panel).getByRole("link"));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("空数组时链接段整段不出", async () => {
    const { panel } = await openMenu({ links: [] });
    expect(within(panel).queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("ShellUserMenu · 动作段", () => {
  it("点动作既回调也关菜单", async () => {
    const onClick = vi.fn();
    const { user, panel } = await openMenu({
      actions: [{ key: "out", label: "退出登录", onClick }],
    });
    await user.click(within(panel).getByRole("button", { name: /退出登录/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  /** 动作就地生效，不去别处，所以右端不画去向图标。 */
  it("动作行右端不画图标", async () => {
    const { panel } = await openMenu({
      actions: [
        { key: "out", label: "退出登录", icon: "sign-out", onClick: () => {} },
      ],
    });
    const row = within(panel).getByRole("button", { name: /退出登录/ });
    expect(row.querySelectorAll("svg")).toHaveLength(1);
  });

  it("disabled 的动作按不动", async () => {
    const onClick = vi.fn();
    const { panel } = await openMenu({
      actions: [{ key: "out", label: "退出登录", disabled: true, onClick }],
    });
    expect(
      within(panel).queryByRole("button", { name: /退出登录/ }),
    ).not.toBeInTheDocument();
    expect(within(panel).getByText("退出登录")).toBeInTheDocument();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("danger 的动作走警示色", async () => {
    const { panel } = await openMenu({
      actions: [
        { key: "out", label: "退出登录", danger: true, onClick: () => {} },
      ],
    });
    expect(
      hasClass(
        within(panel).getByRole("button", { name: /退出登录/ }),
        "text-destructive-text",
      ),
    ).toBe(true);
  });

  /** 回调可以是异步的——组件不等它，先关面板。 */
  it("异步动作不拖住关闭", async () => {
    let resolve: () => void = () => {};
    const onClick = vi.fn(() => new Promise<void>((r) => (resolve = r)));
    const { user, panel } = await openMenu({
      actions: [{ key: "sync", label: "同步", onClick }],
    });
    await user.click(within(panel).getByRole("button", { name: /同步/ }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    resolve();
  });

  it("空数组时动作段整段不出", async () => {
    const { panel } = await openMenu({ actions: [] });
    expect(panel.querySelectorAll(".pt-md")).toHaveLength(0);
  });
});

describe("ShellUserMenu · 回到来处", () => {
  const RETURN = { label: "返回控制台", onReturn: vi.fn() };

  it("点「返回」既回调也关菜单", async () => {
    const onReturn = vi.fn();
    const { user, panel } = await openMenu({
      portalReturn: { ...RETURN, onReturn },
    });
    await user.click(within(panel).getByRole("button", { name: /返回控制台/ }));
    expect(onReturn).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  /** 关掉这条提示的小叉是**可选**的：不给 `onDismiss` 就不画。 */
  it("不给 onDismiss 时不画那个叉", async () => {
    const { panel } = await openMenu({ portalReturn: RETURN });
    expect(
      within(panel).queryByRole("button", { name: "Close" }),
    ).not.toBeInTheDocument();
  });

  it("给了就画，缺省名字是 Close，可换", async () => {
    const a = await openMenu({
      portalReturn: { ...RETURN, onDismiss: () => {} },
    });
    expect(
      within(a.panel).getByRole("button", { name: "Close" }),
    ).toBeInTheDocument();
    a.unmount();

    const { panel } = await openMenu({
      portalReturn: {
        ...RETURN,
        onDismiss: () => {},
        dismissLabel: "不再提示",
      },
    });
    expect(
      within(panel).getByRole("button", { name: "不再提示" }),
    ).toBeInTheDocument();
  });

  /**
   * **叉掉提示不关菜单。**
   *
   * 「不再显示这条」跟「我要走了」是两回事——把菜单一起关掉，用户会以为自己
   * 误触了别的东西。
   */
  it("叉掉提示只回调，菜单还开着", async () => {
    const onDismiss = vi.fn();
    const { user, panel } = await openMenu({
      portalReturn: { ...RETURN, onDismiss },
    });
    await user.click(within(panel).getByRole("button", { name: "Close" }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
