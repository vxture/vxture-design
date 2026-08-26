/**
 * `ShellBootScreen` / `ShellLauncher` / `ShellSearchBox`。
 *
 * 三件的共同点是**时序**：启动屏要等一拍才现身（否则快的那次会闪一下转圈）、
 * 启动器与搜索面板都是浮层（开合的来源不止一个）。时序写错不报错——它表现为
 * 「偶尔闪一下」或者「点了没反应」，两种都难复现。
 */

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ShellBootScreen } from "../src/components/shell/ShellBootScreen";
import { ShellLauncher } from "../src/components/shell/ShellLauncher";
import { ShellSearchBox } from "../src/components/shell/ShellSearchBox";

const cls = (el: Element | null) => (el as HTMLElement)?.className ?? "";
const hasClass = (el: Element | null, token: string) =>
  cls(el).split(" ").filter(Boolean).includes(token);

/* ── ShellBootScreen ──────────────────────────────────────────────────────── */

describe("ShellBootScreen · 底色立刻铺，转圈等一拍", () => {
  /**
   * **底色必须立刻铺上，与转圈的延迟无关。**
   *
   * 容器无论可见与否都占满视口并涂 `bg-background`——否则在转圈出现之前会露出
   * 浏览器的默认白底，**暗色模式下就是一记白闪**。这正是这一整个件存在的理由，
   * 把它做没了等于白做。
   */
  it("首帧就铺满视口并涂底色，即使转圈还没出来", () => {
    const { container } = render(<ShellBootScreen />);
    const root = container.firstElementChild as HTMLElement;
    expect(hasClass(root, "min-h-screen")).toBe(true);
    expect(hasClass(root, "bg-background")).toBe(true);
    // 还没到点，里面是空的
    expect(container.querySelector("svg")).toBeNull();
  });

  /**
   * 转圈**延迟出现**：加载在 250ms 内完成的那些次，用户根本不该看到转圈——
   * 一个一闪而过的转圈比什么都不显示更像卡顿。
   */
  it("到点之后转圈才出来", async () => {
    vi.useFakeTimers();
    const { container } = render(<ShellBootScreen delayMs={250} />);
    expect(container.querySelector("svg")).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(250);
    });
    expect(container.querySelector("svg")).not.toBeNull();
    vi.useRealTimers();
  });

  /** `delayMs={0}` 是「立刻显示」，不是「用缺省值」。 */
  it("delayMs=0 时首帧就有转圈", () => {
    const { container } = render(<ShellBootScreen delayMs={0} />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  /**
   * 卸载要清定时器。
   *
   * ⚠ 断言的是 clearTimeout 真的被调了。第一版写的是「推进时钟不抛」——
   * React 18 起卸载后 setState 已经不再警告，那条断言清不清都通过。
   */
  it("到点前卸载会清掉定时器", () => {
    const clear = vi.spyOn(window, "clearTimeout");
    const { unmount } = render(<ShellBootScreen delayMs={250} />);
    const before = clear.mock.calls.length;
    unmount();
    expect(clear.mock.calls.length).toBeGreaterThan(before);
    clear.mockRestore();
  });

  /**
   * 整块是 `status` + `aria-busy`——读屏器要知道「正在加载」，
   * 而不是把一个空白页面念成「什么都没有」。
   */
  it("对读屏器报「正在忙」", () => {
    render(<ShellBootScreen />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("文案给了才渲染", async () => {
    const { container } = render(
      <ShellBootScreen delayMs={0} label="正在加载" description="稍候" />,
    );
    expect(screen.getByText("正在加载")).toBeInTheDocument();
    expect(screen.getByText("稍候")).toBeInTheDocument();

    const bare = render(<ShellBootScreen delayMs={0} />);
    // 只有转圈，没有文字
    expect(bare.container.textContent).toBe("");
    void container;
  });
});

/* ── ShellLauncher ────────────────────────────────────────────────────────── */

describe("ShellLauncher · 分区切换器", () => {
  const ITEMS = [
    { key: "a", icon: "settings" as const, label: "设置", active: true },
    { key: "b", icon: "list" as const, label: "列表", description: "全部条目" },
  ];

  it("初始不开，点了才开", async () => {
    const user = userEvent.setup();
    render(<ShellLauncher items={ITEMS} onSelect={() => {}} />);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Sections" }));
    expect(await screen.findByRole("menu")).toBeInTheDocument();
  });

  it("打开时触发按钮是按下态", async () => {
    const user = userEvent.setup();
    render(<ShellLauncher items={ITEMS} onSelect={() => {}} />);
    const btn = screen.getByRole("button", { name: "Sections" });
    expect(btn).not.toHaveAttribute("aria-pressed");

    await user.click(btn);
    await screen.findByRole("menu");
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("每一项是 menuitemradio，当前那个 checked", async () => {
    const user = userEvent.setup();
    render(<ShellLauncher items={ITEMS} onSelect={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Sections" }));
    await screen.findByRole("menu");

    const items = screen.getAllByRole("menuitemradio");
    expect(items).toHaveLength(2);
    expect(screen.getByRole("menuitemradio", { name: /设置/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    /* 非当前那项**不能是 true**——只断当前项的话，恒真的写法照样通过。
       断的是「不是 true」而不是「等于 false」：item.active 没给时是 undefined，
       React 不渲染值为 undefined 的属性，那一项身上根本没有这个属性。 */
    expect(
      screen.getByRole("menuitemradio", { name: /列表/ }),
    ).not.toHaveAttribute("aria-checked", "true");
  });

  /** **选中一项要把面板收掉**——不收的话它盖着刚切过去的那一屏。 */
  it("选一项：回传 key 并收起面板", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ShellLauncher items={ITEMS} onSelect={onSelect} />);
    await user.click(screen.getByRole("button", { name: "Sections" }));
    await screen.findByRole("menu");

    await user.click(screen.getByRole("menuitemradio", { name: /列表/ }));
    expect(onSelect).toHaveBeenCalledWith("b");
    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
    );
  });

  it("description 给了才渲染", async () => {
    const user = userEvent.setup();
    render(<ShellLauncher items={ITEMS} onSelect={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Sections" }));
    await screen.findByRole("menu");

    expect(screen.getByText("全部条目")).toBeInTheDocument();
    expect(
      screen.getByRole("menuitemradio", { name: /设置/ }).textContent,
    ).toBe("设置");
  });

  it("两处文案都可换", async () => {
    const user = userEvent.setup();
    render(
      <ShellLauncher
        items={ITEMS}
        onSelect={() => {}}
        buttonLabel="切换分区"
        panelLabel="选择一个分区"
      />,
    );
    const btn = screen.getByRole("button", { name: "切换分区" });
    await user.click(btn);
    expect(
      await screen.findByRole("dialog", { name: "选择一个分区" }),
    ).toBeInTheDocument();
  });
});

/* ── ShellSearchBox ───────────────────────────────────────────────────────── */

describe("ShellSearchBox · 空查询不开面板", () => {
  const GROUPS = [
    {
      key: "pages",
      heading: "页面",
      items: [
        { key: "home", label: "首页", onSelect: vi.fn() },
        { key: "settings", label: "设置", onSelect: vi.fn() },
      ],
    },
  ];

  const Box = (props: Partial<React.ComponentProps<typeof ShellSearchBox>>) => (
    <ShellSearchBox
      query=""
      onQueryChange={() => {}}
      groups={GROUPS}
      {...props}
    />
  );

  /**
   * **还没敲字就弹一个「没有匹配结果」，等于告诉用户搜索坏了。**
   * 所以空查询一律不开；有查询就开——即使还没有结果，也要把「检索中」或
   * 「没找到」说出来。
   */
  it("空查询时面板不开", () => {
    render(<Box query="" />);
    expect(screen.getByRole("combobox")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it.each(["  ", "\t"])("只有空白的查询 %o 也不开", (blank) => {
    render(<Box query={blank} />);
    expect(screen.getByRole("combobox")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("有查询就开", () => {
    render(<Box query="设置" />);
    expect(screen.getByRole("combobox")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  /** 没有结果时也要开——那一屏要说「没找到」，而不是什么都不说。 */
  it("有查询但没有结果时仍然开", () => {
    render(<Box query="不存在的东西" groups={[]} />);
    expect(screen.getByRole("combobox")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("输入时回传新查询串", async () => {
    const user = userEvent.setup();
    const onQueryChange = vi.fn();
    render(<Box query="" onQueryChange={onQueryChange} />);
    await user.type(screen.getByRole("combobox"), "设");
    expect(onQueryChange).toHaveBeenCalledWith("设");
  });
});

describe("ShellSearchBox · Esc 是两段式", () => {
  const GROUPS = [
    {
      key: "g",
      heading: "组",
      items: [{ key: "i", label: "项", onSelect: vi.fn() }],
    },
  ];

  /**
   * ⚠ 这一节用 `fireEvent.keyDown` 而不是 `userEvent`，理由见下面那条
   * 「Esc 必须被取消」——`userEvent` 会**模拟浏览器对 `<input type="search">`
   * 的原生 Esc 清空**，而且**不理会 `preventDefault`**。拿它测这一段，测到的是
   * 它的模拟而不是本件的逻辑。
   */
  const pressEscape = (input: HTMLElement) => {
    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    });
    // 包 act：原生 dispatchEvent 不会冲刷 React 的状态更新，不包的话第二次
    // 按键读到的还是上一帧的 open
    act(() => {
      input.dispatchEvent(event);
    });
    return event;
  };

  /**
   * **Esc 这次按键是被取消的**——`<input type="search">` 有原生的 Esc 清空行为
   * （Chrome / Safari / Firefox 都实现），不取消的话一次 Esc 会同时走两条路：
   * 原生把词清了，本件这边又收了面板，下面那套两段式等于没写。
   *
   * ⚠ **取消它的不是本件自己**，是浮层那一层（cmdk / Radix 的 Esc 处理）。
   *
   * 这一条查过一圈弯路，记在这里免得下一轮重走：`userEvent` 会模拟那个原生清空
   * 行为，于是「第一次 Esc 不清词」写成 `userEvent` 版时是**红的**——我据此判定
   * 是缺陷，给 keydown 加了一次 `event.preventDefault()`。加完**照样红**，
   * 追下去才发现两件事：
   *
   *   · `userEvent` **不理会 preventDefault**，它的模拟拦不住——所以那条红
   *     证明不了缺陷
   *   · 修复前 `defaultPrevented` 就**已经是 true**——浮层那一层早就拦了，
   *     真浏览器里原生清空根本不会发生
   *
   * 也就是说我修的是一个不存在的缺陷。那次改动已撤（同 `EntryCard` 那次删掉
   * 不可达防御分支是一条判据：**一道没有任何输入能触发的防御，读起来像在防什么，
   * 实际是死代码**）。
   *
   * 留下这条断言是有价值的：它钉住「Esc 确实被取消了」这个**结果**——哪天浮层
   * 那一层换了实现不再取消，这里会红，那时才轮到本件自己动手。
   */
  it("Esc 这次按键被取消（由浮层那一层）", () => {
    render(
      <ShellSearchBox query="设置" onQueryChange={() => {}} groups={GROUPS} />,
    );
    const event = pressEscape(screen.getByRole("combobox"));
    expect(event.defaultPrevented).toBe(true);
  });

  /**
   * 普通字符键不拦——拦了会把输入法和正常打字都吃掉。
   *
   * ⚠ 方向键**是被拦的，而且应该被拦**：面板开着时 cmdk 用上下键做结果巡航，
   * 不拦的话页面会跟着滚。第一版这条断言写的是「别的键都不拦」，红了——
   * 那是我把「Esc 之外一律不拦」当成了契约，而真实契约是「各拦各的」。
   */
  it("普通字符键不拦", () => {
    render(
      <ShellSearchBox query="设置" onQueryChange={() => {}} groups={GROUPS} />,
    );
    const input = screen.getByRole("combobox");
    const event = new KeyboardEvent("keydown", {
      key: "a",
      bubbles: true,
      cancelable: true,
    });
    act(() => {
      input.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(false);
  });

  /**
   * **第一次 Esc 收面板但保留已敲的词，第二次才清空。**
   *
   * 判据是常见度：「看错了想重新看看结果」比「这一整串都不要了」常见得多。
   * 一次 Esc 就清空的话，用户想收起浮层看看底下的页面，代价是重打一遍。
   */
  it("面板开着时，Esc 只收面板不清词", () => {
    const onQueryChange = vi.fn();
    render(
      <ShellSearchBox
        query="设置"
        onQueryChange={onQueryChange}
        groups={GROUPS}
      />,
    );
    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-expanded", "true");

    pressEscape(input);
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(onQueryChange).not.toHaveBeenCalled();
  });

  it("面板已收时，再按 Esc 才清词", () => {
    const onQueryChange = vi.fn();
    render(
      <ShellSearchBox
        query="设置"
        onQueryChange={onQueryChange}
        groups={GROUPS}
      />,
    );
    const input = screen.getByRole("combobox");

    pressEscape(input); // 第一次：收面板
    pressEscape(input); // 第二次：清词
    expect(onQueryChange).toHaveBeenCalledWith("");
  });

  /** 词本来就是空的时候，第二次 Esc 什么都不做——不发一次多余的空串。 */
  it("空词时 Esc 不回传任何东西", () => {
    const onQueryChange = vi.fn();
    render(
      <ShellSearchBox query="" onQueryChange={onQueryChange} groups={GROUPS} />,
    );
    pressEscape(screen.getByRole("combobox"));
    expect(onQueryChange).not.toHaveBeenCalled();
  });

  /** 重新敲字 = 重新开始找，把上一次的「关掉」作废。 */
  it("收起后重新敲字，面板要再开", async () => {
    const user = userEvent.setup();
    const onQueryChange = vi.fn();
    const { rerender } = render(
      <ShellSearchBox
        query="设"
        onQueryChange={onQueryChange}
        groups={GROUPS}
      />,
    );
    const input = screen.getByRole("combobox");
    pressEscape(input);
    expect(input).toHaveAttribute("aria-expanded", "false");

    await user.type(input, "置");
    expect(onQueryChange).toHaveBeenCalledWith("设置");
    rerender(
      <ShellSearchBox
        query="设置"
        onQueryChange={onQueryChange}
        groups={GROUPS}
      />,
    );
    expect(screen.getByRole("combobox")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("其它按键不影响面板", () => {
    render(
      <ShellSearchBox query="设置" onQueryChange={() => {}} groups={GROUPS} />,
    );
    const input = screen.getByRole("combobox");
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
    );
    expect(input).toHaveAttribute("aria-expanded", "true");
  });
});

describe("ShellSearchBox · 快捷键", () => {
  const GROUPS = [{ key: "g", heading: "组", items: [] }];

  const fireShortcut = (key: string) =>
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key, metaKey: true, cancelable: true }),
      );
    });

  it("⌘K 聚焦到输入框", () => {
    render(
      <ShellSearchBox query="" onQueryChange={() => {}} groups={GROUPS} />,
    );
    const input = screen.getByRole("combobox");
    expect(document.activeElement).not.toBe(input);

    fireShortcut("k");
    expect(document.activeElement).toBe(input);
  });

  it("大小写都认", () => {
    render(
      <ShellSearchBox query="" onQueryChange={() => {}} groups={GROUPS} />,
    );
    fireShortcut("K");
    expect(document.activeElement).toBe(screen.getByRole("combobox"));
  });

  /** 没按修饰键就不算——单独一个 k 是在别处打字。 */
  it("不带修饰键的同一个字母不触发", () => {
    render(
      <ShellSearchBox query="" onQueryChange={() => {}} groups={GROUPS} />,
    );
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k" }));
    });
    expect(document.activeElement).not.toBe(screen.getByRole("combobox"));
  });

  it("别的字母不触发", () => {
    render(
      <ShellSearchBox query="" onQueryChange={() => {}} groups={GROUPS} />,
    );
    fireShortcut("j");
    expect(document.activeElement).not.toBe(screen.getByRole("combobox"));
  });

  /** 自定义字母。 */
  it("快捷键字母可换", () => {
    render(
      <ShellSearchBox
        query=""
        onQueryChange={() => {}}
        groups={GROUPS}
        shortcutKey="/"
      />,
    );
    fireShortcut("/");
    expect(document.activeElement).toBe(screen.getByRole("combobox"));
  });

  /**
   * **传 null 关掉绑定**——嵌在已有全局快捷键体系里的产品要能自己接管。
   * 不给这个出口的话，两套快捷键会抢同一个组合。
   */
  it("shortcutKey=null 时完全不绑", () => {
    render(
      <ShellSearchBox
        query=""
        onQueryChange={() => {}}
        groups={GROUPS}
        shortcutKey={null}
      />,
    );
    fireShortcut("k");
    expect(document.activeElement).not.toBe(screen.getByRole("combobox"));
  });

  /**
   * 卸载要退订——不退订的话第二个实例挂上来时会有两个监听抢焦点。
   *
   * ⚠ 断言的是「那个监听真的被摘了」。第一版写的是「触发一次不抛」——
   * 卸载之后本来就不会抛，那条断言无论退不退订都通过。
   */
  it("卸载后把 keydown 监听摘掉", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");

    const { unmount } = render(
      <ShellSearchBox query="" onQueryChange={() => {}} groups={GROUPS} />,
    );
    const handler = add.mock.calls.find(([type]) => type === "keydown")?.[1];
    expect(handler).toBeDefined();

    unmount();
    expect(
      remove.mock.calls.some(
        ([type, fn]) => type === "keydown" && fn === handler,
      ),
    ).toBe(true);

    add.mockRestore();
    remove.mockRestore();
  });

  /**
   * 提示片只在「有快捷键且还没敲字」时出现——敲上字之后那块位置要让给内容。
   *
   * ⚠ 按 kbd **元素**查，不按文本。片里是「修饰符 + 字母」两段（⌘ 与 K），
   * 第一版写的 queryByText(/^K$/) **永远匹配不上**，于是那条断言无论提示片
   * 在不在都通过——变异测试戳穿的。
   */
  it("提示片在有查询时让位", () => {
    const a = render(
      <ShellSearchBox query="" onQueryChange={() => {}} groups={GROUPS} />,
    );
    expect(a.container.querySelector("kbd")).not.toBeNull();
    a.unmount();

    const { container } = render(
      <ShellSearchBox query="设置" onQueryChange={() => {}} groups={GROUPS} />,
    );
    expect(container.querySelector("kbd")).toBeNull();
  });

  it("关掉快捷键时不出提示片", () => {
    const { container } = render(
      <ShellSearchBox
        query=""
        onQueryChange={() => {}}
        groups={GROUPS}
        shortcutKey={null}
      />,
    );
    expect(container.querySelector("kbd")).toBeNull();
  });
});
