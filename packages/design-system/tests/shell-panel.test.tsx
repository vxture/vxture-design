/**
 * `ShellPanel` —— 外壳弹层面板的**结构语法**（零业务语义）。
 *
 * 这一族只收语法不收内容：它不认识「租户」「配额」「账单」，业务词汇全部由
 * props 传入。它保证的是**各产品的面板逐像素一致**——而「一致」这件事写错了
 * 不报错，只表现为「这个面板的图标比隔壁那个往左半格」。
 *
 * 96 条分支，此前 0%。
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Popover, PopoverTrigger } from "@vxture/design-ui";
import {
  SHELL_PANEL_HAIRLINE,
  ShellPanelContent,
  ShellPanelControlRow,
  ShellPanelHeader,
  ShellPanelMeterRow,
  ShellPanelRow,
  ShellPanelSection,
  ShellPanelSectionTitle,
  ShellPanelSlots,
  ShellScopeButton,
} from "../src/components/shell/ShellPanel";

const cls = (el: Element | null) => (el as HTMLElement)?.className ?? "";
const hasClass = (el: Element | null, token: string) =>
  cls(el).split(" ").filter(Boolean).includes(token);

/* ── ShellPanelContent ────────────────────────────────────────────────────── */

describe("ShellPanelContent · 打开时不抢焦点", () => {
  /**
   * **`onOpenAutoFocus` 必须拦掉。**
   *
   * Radix 默认把焦点移进浮层的第一个可聚焦元素。对**菜单**是对的（用户就是来
   * 选一项的），但这类面板是「看一眼当前状态、顺手点个入口」——一打开就有个
   * 下拉被套上焦点环，读起来像是它已经被选中、正等着输入。
   *
   * 触发器保持焦点，Tab 仍可正常进入面板，键盘可达性不受影响。
   */
  it("打开后焦点留在触发器上，不跳进面板", async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>打开</PopoverTrigger>
        <ShellPanelContent>
          <button>面板里的按钮</button>
        </ShellPanelContent>
      </Popover>,
    );
    const trigger = screen.getByRole("button", { name: "打开" });
    await user.click(trigger);
    await screen.findByRole("button", { name: "面板里的按钮" });

    expect(document.activeElement).toBe(trigger);
  });

  /** 调用方自己的 `onOpenAutoFocus` 仍然收得到——拦掉的是默认行为，不是回调。 */
  it("调用方的 onOpenAutoFocus 照样被调用", async () => {
    const user = userEvent.setup();
    const onOpenAutoFocus = vi.fn();
    render(
      <Popover>
        <PopoverTrigger>打开</PopoverTrigger>
        <ShellPanelContent onOpenAutoFocus={onOpenAutoFocus}>
          <button>x</button>
        </ShellPanelContent>
      </Popover>,
    );
    await user.click(screen.getByRole("button", { name: "打开" }));
    await screen.findByRole("button", { name: "x" });
    expect(onOpenAutoFocus).toHaveBeenCalled();
  });

  it("面板宽度与内距是件自己定的，不由调用点各写一串", async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>打开</PopoverTrigger>
        <ShellPanelContent>
          <button>x</button>
        </ShellPanelContent>
      </Popover>,
    );
    await user.click(screen.getByRole("button", { name: "打开" }));
    const panel = await screen.findByRole("dialog");
    for (const token of ["w-80", "flex-col", "gap-md", "p-md"]) {
      expect(hasClass(panel, token)).toBe(true);
    }
  });
});

/* ── ShellPanelSection ────────────────────────────────────────────────────── */

describe("ShellPanelSection · 第一段不画上缘线", () => {
  /**
   * `divided` 缺省为 true。**面板第一段要显式传 false**——否则弹层顶部会多出
   * 一条贴着边框的分隔线，看起来像内容被截断了。
   */
  it("缺省画上缘分隔线", () => {
    const { container } = render(
      <ShellPanelSection>
        <div>内容</div>
      </ShellPanelSection>,
    );
    expect(cls(container.firstElementChild)).toContain("border-dashed");
    expect(hasClass(container.firstElementChild, "pt-md")).toBe(true);
  });

  it("divided=false 时不画", () => {
    const { container } = render(
      <ShellPanelSection divided={false}>
        <div>内容</div>
      </ShellPanelSection>,
    );
    expect(cls(container.firstElementChild)).not.toContain("border-dashed");
    expect(hasClass(container.firstElementChild, "pt-md")).toBe(false);
  });

  it("title 给了才出小标题行", () => {
    const a = render(
      <ShellPanelSection title="账户">
        <div>内容</div>
      </ShellPanelSection>,
    );
    expect(screen.getByText("账户")).toBeInTheDocument();
    a.unmount();

    const { container } = render(
      <ShellPanelSection>
        <div>内容</div>
      </ShellPanelSection>,
    );
    expect(container.firstElementChild?.children).toHaveLength(1);
  });

  /** 分隔线常量是**共用的**——`ShellUserMenu` 与这里同款，改一处等于改两处。 */
  it("分隔线走同一个常量", () => {
    const { container } = render(
      <ShellPanelSection>
        <div>x</div>
      </ShellPanelSection>,
    );
    for (const token of SHELL_PANEL_HAIRLINE.split(" ")) {
      expect(hasClass(container.firstElementChild, token)).toBe(true);
    }
  });

  it("小标题与行的左内距同档，图标左缘对齐", () => {
    render(<ShellPanelSectionTitle>标题</ShellPanelSectionTitle>);
    expect(hasClass(screen.getByText("标题"), "px-sm")).toBe(true);
  });
});

/* ── ShellPanelHeader ─────────────────────────────────────────────────────── */

describe("ShellPanelHeader · 标识块三选一", () => {
  it("三样都不给时不渲染标识块", () => {
    const { container } = render(<ShellPanelHeader title="某某租户" />);
    // 只剩右边那一列
    expect(container.firstElementChild?.children).toHaveLength(1);
  });

  it.each([
    ["icon", { icon: "settings" as const }],
    ["avatarSrc", { avatarSrc: "/a.png" }],
    ["avatarFallback", { avatarFallback: <span>VX</span> }],
  ])("给了 %s 就渲染标识块", (_name, props) => {
    const { container } = render(<ShellPanelHeader title="标题" {...props} />);
    expect(container.firstElementChild?.children).toHaveLength(2);
  });

  it("标题右侧的贴标由调用方给，DS 不判断什么算已认证", () => {
    render(
      <ShellPanelHeader title="某某租户" titleAside={<span>已认证</span>} />,
    );
    expect(screen.getByText("已认证")).toBeInTheDocument();
  });

  it("metaRows 逐行渲染，图标可选", () => {
    const { container } = render(
      <ShellPanelHeader
        title="标题"
        metaRows={[
          { key: "a", icon: "settings", content: "带图标的一行" },
          { key: "b", content: "不带图标的一行" },
        ]}
      />,
    );
    expect(screen.getByText("带图标的一行")).toBeInTheDocument();
    expect(screen.getByText("不带图标的一行")).toBeInTheDocument();
    // 只有一行带图标
    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });

  it("不给 metaRows 时只有标题一行", () => {
    const { container } = render(<ShellPanelHeader title="标题" />);
    const right = container.firstElementChild?.firstElementChild as HTMLElement;
    expect(right.children).toHaveLength(1);
  });

  /**
   * 标识块与右侧文字**垂直居中**。`items-start` 会让头像顶着第一行、
   * 下方留一截空白，看起来像掉了一行内容。
   */
  it("标识块与文字垂直居中", () => {
    const { container } = render(
      <ShellPanelHeader title="标题" icon="settings" />,
    );
    expect(hasClass(container.firstElementChild, "items-center")).toBe(true);
  });
});

/* ── ShellPanelRow ────────────────────────────────────────────────────────── */

describe("ShellPanelRow · 三种形态由 props 组合决定", () => {
  /**
   * **只读信息行渲染成 `div`，不进 tab 序。**
   *
   * 渲染成按钮的话，键盘用户 Tab 会停在一堆点了没反应的行上——面板里通常有
   * 七八行，其中大半是只读的。
   */
  it("只有 label / value 时是只读行，不是按钮", () => {
    const { container } = render(<ShellPanelRow label="套餐" value="专业版" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(container.firstElementChild?.tagName).toBe("DIV");
  });

  it("给了 onClick 就是按钮，点得动", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ShellPanelRow label="设置" onClick={onClick} />);
    await user.click(screen.getByRole("button", { name: /设置/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("给了 href 就是链接", () => {
    render(<ShellPanelRow label="文档" href="/docs" />);
    expect(screen.getByRole("link", { name: /文档/ })).toHaveAttribute(
      "href",
      "/docs",
    );
  });

  /**
   * **`disabled` 保留结构与文案，去掉交互**——「功能在这里，但现在不可用」。
   * 整行删掉的话用户不知道这里本来有东西。
   */
  it("disabled 时保留文案但不再是按钮", () => {
    const { container } = render(
      <ShellPanelRow label="导出" onClick={() => {}} disabled />,
    );
    expect(screen.getByText("导出")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(hasClass(container.firstElementChild, "opacity-disabled")).toBe(
      true,
    );
  });

  /** 可点的行默认带「可进入」角标；只读行没有。 */
  it("可点的行默认带角标，只读行没有", () => {
    const a = render(<ShellPanelRow label="设置" onClick={() => {}} />);
    expect(a.container.querySelectorAll("svg").length).toBeGreaterThan(0);
    a.unmount();

    const { container } = render(<ShellPanelRow label="套餐" value="专业版" />);
    expect(container.querySelectorAll("svg")).toHaveLength(0);
  });

  it("chevron 可两头覆盖缺省", () => {
    const a = render(
      <ShellPanelRow label="设置" onClick={() => {}} chevron={false} />,
    );
    expect(a.container.querySelectorAll("svg")).toHaveLength(0);
    a.unmount();

    const { container } = render(<ShellPanelRow label="套餐" chevron />);
    expect(container.querySelectorAll("svg").length).toBeGreaterThan(0);
  });

  /** `trailingIcon` 替代 chevron——给「新开页面」这类别的去向语义用。 */
  it("trailingIcon 顶掉 chevron", () => {
    const a = render(<ShellPanelRow label="设置" onClick={() => {}} />);
    const chevronSvg = (a.container.querySelector("svg") as SVGElement)
      .innerHTML;
    a.unmount();

    const { container } = render(
      <ShellPanelRow
        label="外链"
        onClick={() => {}}
        trailingIcon="external-link"
      />,
    );
    expect((container.querySelector("svg") as SVGElement).innerHTML).not.toBe(
      chevronSvg,
    );
  });

  /** 新标签页要**自动补 `rel`**——不补的话被打开的页面能拿到 `window.opener`。 */
  it("newTab 自动补 rel", () => {
    render(<ShellPanelRow label="文档" href="/docs" newTab />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer noopener");
  });

  it("不给 newTab 时不加 target / rel", () => {
    render(<ShellPanelRow label="文档" href="/docs" />);
    const link = screen.getByRole("link");
    expect(link).not.toHaveAttribute("target");
    expect(link).not.toHaveAttribute("rel");
  });

  /** `newTab` 只对 href 生效——onClick 行没有可以新开的目标。 */
  it("只有 onClick 时 newTab 不起作用", () => {
    render(<ShellPanelRow label="设置" onClick={() => {}} newTab />);
    expect(screen.getByRole("button")).not.toHaveAttribute("target");
  });

  /** 链接组件可换成 Next 的 Link 之类。 */
  it("linkComponent 可替换", () => {
    const CustomLink = ({
      href,
      children,
      ...rest
    }: {
      href: string;
      children: React.ReactNode;
    }) => (
      <a href={href} data-custom="1" {...rest}>
        {children}
      </a>
    );
    render(
      <ShellPanelRow label="文档" href="/docs" linkComponent={CustomLink} />,
    );
    expect(screen.getByRole("link")).toHaveAttribute("data-custom", "1");
  });

  /**
   * **危险动作用语义色，不做实心红**——危险项常与常规项挨着，实心底会让整个
   * 面板看起来在报警。同 `ActionMenu` 的 danger 判断。
   */
  it("danger 用文字色而不是实心底", () => {
    const { container } = render(
      <ShellPanelRow label="退出登录" onClick={() => {}} danger />,
    );
    const btn = container.querySelector("button") as HTMLElement;
    expect(hasClass(btn, "text-destructive-text")).toBe(true);
    // 不是实心：常态没有 destructive 底色，只有 hover 才有
    expect(hasClass(btn, "bg-destructive")).toBe(false);
  });

  it("active 用 secondary 底标注，与 hover 区分", () => {
    const { container } = render(<ShellPanelRow label="当前项" active />);
    expect(hasClass(container.firstElementChild, "bg-secondary")).toBe(true);
  });

  it("description 给了才出副行，并让行高改成自适应", () => {
    const { container } = render(
      <ShellPanelRow label="标题" description="一行小字" />,
    );
    expect(screen.getByText("一行小字")).toBeInTheDocument();
    expect(hasClass(container.firstElementChild, "h-auto")).toBe(true);
  });

  /** `value` 为 `0` 是合法值，不能被当成「没给」。 */
  it.each([
    ["0", 0],
    ["空字符串", ""],
  ])("value 是 %s 时仍然渲染", (_name, value) => {
    const { container } = render(<ShellPanelRow label="计数" value={value} />);
    const spans = [...container.querySelectorAll("span")];
    expect(spans.some((s) => hasClass(s, "tabular-nums"))).toBe(true);
  });

  it("value 不给时不占那一格", () => {
    const { container } = render(<ShellPanelRow label="计数" />);
    const spans = [...container.querySelectorAll("span")];
    expect(spans.some((s) => hasClass(s, "tabular-nums"))).toBe(false);
  });
});

/* ── ShellPanelControlRow ─────────────────────────────────────────────────── */

describe("ShellPanelControlRow · 控件与上下行严格同列", () => {
  it("控件铺满内容列，图标在导引列", () => {
    const { container } = render(
      <ShellPanelControlRow icon="settings" label="密度">
        <select aria-label="密度">
          <option>默认</option>
        </select>
      </ShellPanelControlRow>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(hasClass(root, "px-sm")).toBe(true);
    expect(screen.getByLabelText("密度")).toBeInTheDocument();
  });

  /** `label` 是字符串时才当 tooltip——节点塞进 title 会变成 `[object Object]`。 */
  it("label 是字符串时才挂 title", () => {
    const a = render(
      <ShellPanelControlRow label="密度">
        <span>x</span>
      </ShellPanelControlRow>,
    );
    expect(a.container.firstElementChild).toHaveAttribute("title", "密度");
    a.unmount();

    const { container } = render(
      <ShellPanelControlRow label={<span>密度</span>}>
        <span>x</span>
      </ShellPanelControlRow>,
    );
    expect(container.firstElementChild).not.toHaveAttribute("title");
  });
});

/* ── ShellPanelMeterRow ───────────────────────────────────────────────────── */

describe("ShellPanelMeterRow · 百分比要夹紧", () => {
  const bar = (root: ParentNode) =>
    root.querySelector('[role="progressbar"]') as HTMLElement;

  it.each([
    [0, "0"],
    [50, "50"],
    [100, "100"],
  ])("正常值 %i 原样传给进度条", (percent, expected) => {
    const { container } = render(
      <ShellPanelMeterRow label="存储" percent={percent} />,
    );
    expect(bar(container)).toHaveAttribute("aria-valuenow", expected);
  });

  /**
   * **超出范围要夹紧**——进度条溢出容器不会报错，只会画出一条越界的色带
   * 盖住旁边的内容。用量类数据来自后端，`102%` 这种是常态而不是异常。
   */
  it.each([
    [-10, "0"],
    [150, "100"],
  ])("越界值 %i 夹到 %s", (percent, expected) => {
    const { container } = render(
      <ShellPanelMeterRow label="存储" percent={percent} />,
    );
    expect(bar(container)).toHaveAttribute("aria-valuenow", expected);
  });

  /** `NaN` / `Infinity` 归零——一个 NaN 宽度会让进度条整条消失。 */
  it.each([
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["-Infinity", Number.NEGATIVE_INFINITY],
  ])("非有限值 %s 归零", (_name, percent) => {
    const { container } = render(
      <ShellPanelMeterRow label="存储" percent={percent} />,
    );
    expect(bar(container)).toHaveAttribute("aria-valuenow", "0");
  });

  /**
   * 用量文案是**成品字符串**，由调用方给——单位、进制、小数位、货币全是业务
   * 判断（字节按 1024、额度按千分位、金额按币种），DS 不做这些决定。
   */
  it("valueLabel 给了才渲染", () => {
    const a = render(
      <ShellPanelMeterRow label="存储" percent={50} valueLabel="5 / 10 GB" />,
    );
    expect(screen.getByText("5 / 10 GB")).toBeInTheDocument();
    a.unmount();

    const { container } = render(
      <ShellPanelMeterRow label="存储" percent={50} />,
    );
    const spans = [...container.querySelectorAll("span")];
    expect(spans.some((s) => hasClass(s, "tabular-nums"))).toBe(false);
  });

  it("valueLabel 是 0 时也渲染", () => {
    const { container } = render(
      <ShellPanelMeterRow label="存储" percent={0} valueLabel={0} />,
    );
    const spans = [...container.querySelectorAll("span")];
    expect(spans.some((s) => hasClass(s, "tabular-nums"))).toBe(true);
  });
});

/* ── ShellPanelSlots ──────────────────────────────────────────────────────── */

describe("ShellPanelSlots · 一排槽位", () => {
  const SLOTS = [
    { key: "a", icon: "settings" as const, label: "已解锁的", earned: true },
    { key: "b", icon: "list" as const, label: "没解锁的" },
  ];

  it("整排是 group 并带名", () => {
    render(<ShellPanelSlots label="账户标识" slots={SLOTS} />);
    expect(screen.getByRole("group", { name: "账户标识" })).toBeInTheDocument();
  });

  /** 每个槽位靠 `label` 认——它同时是 tooltip 与无障碍名。 */
  it("每个槽位都有名字，鼠标与读屏器都拿得到", () => {
    render(<ShellPanelSlots label="账户标识" slots={SLOTS} />);
    const earned = screen.getByLabelText("已解锁的");
    expect(earned).toHaveAttribute("title", "已解锁的");
  });

  /** 已获得 = 实心高亮；未获得 = 灰底轮廓（「这里还有位置，但没解锁」）。 */
  it("已获得与未获得画得不一样", () => {
    render(<ShellPanelSlots label="账户标识" slots={SLOTS} />);
    const earned = screen.getByLabelText("已解锁的");
    const unearned = screen.getByLabelText("没解锁的");
    expect(hasClass(earned, "text-primary")).toBe(true);
    expect(hasClass(unearned, "opacity-muted")).toBe(true);
    expect(hasClass(unearned, "text-primary")).toBe(false);
  });

  it("空槽位列表也渲染得出容器", () => {
    render(<ShellPanelSlots label="账户标识" slots={[]} />);
    expect(screen.getByRole("group", { name: "账户标识" })).toBeInTheDocument();
  });
});

/* ── ShellScopeButton ─────────────────────────────────────────────────────── */

describe("ShellScopeButton · 当前范围", () => {
  it("ariaLabel 同时落成 aria-label 与 title", () => {
    render(<ShellScopeButton label="某某租户" ariaLabel="切换租户" />);
    const btn = screen.getByRole("button", { name: "切换租户" });
    expect(btn).toHaveAttribute("aria-label", "切换租户");
    expect(btn).toHaveAttribute("title", "切换租户");
  });

  /** `aria-expanded` 是这个按钮的状态——它开的是一个面板，读屏器要知道开没开。 */
  it("aria-expanded 跟着 active 走", () => {
    const a = render(<ShellScopeButton label="x" ariaLabel="切换" active />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
    a.unmount();

    render(<ShellScopeButton label="x" ariaLabel="切换" />);
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("active 时上底色", () => {
    const { container } = render(
      <ShellScopeButton label="x" ariaLabel="切换" active />,
    );
    expect(hasClass(container.querySelector("button"), "bg-accent")).toBe(true);
  });

  /** 只作展示、不可点的场合传 `caret={false}`——一个不会展开的下拉角标是骗人的。 */
  it("caret 缺省画，传 false 不画", () => {
    const a = render(<ShellScopeButton label="x" ariaLabel="切换" />);
    const withCaret = a.container.querySelectorAll("svg").length;
    a.unmount();

    const { container } = render(
      <ShellScopeButton label="x" ariaLabel="切换" caret={false} />,
    );
    expect(container.querySelectorAll("svg").length).toBe(withCaret - 1);
  });

  it("icon 给了才画前置图标", () => {
    const a = render(
      <ShellScopeButton label="x" ariaLabel="切换" caret={false} />,
    );
    expect(a.container.querySelectorAll("svg")).toHaveLength(0);
    a.unmount();

    const { container } = render(
      <ShellScopeButton
        label="x"
        ariaLabel="切换"
        icon="settings"
        caret={false}
      />,
    );
    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });

  it("点一下回调", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ShellScopeButton label="x" ariaLabel="切换" onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
