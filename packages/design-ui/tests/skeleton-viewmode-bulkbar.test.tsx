/**
 * Skeleton / ViewModeSwitch / BulkActionBar —— 第二批的其余三件。
 *
 * 三件的未覆盖分支各是 12/20、11/11、16/26。共同点是**默认值与空值**：
 * 没给 lines 时渲染几个、Radix 回空串时怎么办、count 为 0 时渲不渲染。
 * 默认值分支最容易漏测，因为写用例的人总是把参数写全。
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Skeleton } from "../src/components/base/display/Skeleton";
import { ViewModeSwitch } from "../src/components/composite/data/ViewModeSwitch";
import { BulkActionBar } from "../src/components/composite/data/BulkActionBar";

/* ── Skeleton ─────────────────────────────────────────────────────────────── */

describe("Skeleton · 三种形态", () => {
  it.each([
    ["line", "h-row-sm"],
    ["rect", "rounded-md"],
    ["circle", "rounded-full"],
  ] as const)("variant=%s 挂 %s", (variant, cls) => {
    const { container } = render(<Skeleton variant={variant} />);
    expect((container.firstElementChild as HTMLElement).className).toContain(
      cls,
    );
  });

  it("不给 variant 时是 line", () => {
    const { container } = render(<Skeleton />);
    expect((container.firstElementChild as HTMLElement).className).toContain(
      "h-row-sm",
    );
  });

  /** 占位块对读屏器没有意义，念出来只是噪音——一律 aria-hidden。 */
  it("一律 aria-hidden", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden");
  });
});

describe("Skeleton · 多行只对 line 生效", () => {
  /** 末行收窄是为了模拟段落尾——整齐的三条等宽横杠不像文字，像表格。 */
  it("lines=3 渲染三行，末行收窄", () => {
    const { container } = render(<Skeleton lines={3} />);
    const rows = [...(container.firstElementChild?.children ?? [])];
    expect(rows).toHaveLength(3);
    expect((rows[0] as HTMLElement).className).not.toContain("w-3/5");
    expect((rows[2] as HTMLElement).className).toContain("w-3/5");
  });

  it("lines=1 或不给都只渲染一块，不套外层", () => {
    const one = render(<Skeleton lines={1} />);
    expect(one.container.firstElementChild?.children).toHaveLength(0);
    one.unmount();

    const none = render(<Skeleton />);
    expect(none.container.firstElementChild?.children).toHaveLength(0);
  });

  /** `lines` 只对 line 有效——圆形占位分不出「三行」是什么意思。 */
  it("rect / circle 忽略 lines", () => {
    const { container } = render(<Skeleton variant="circle" lines={3} />);
    expect(container.firstElementChild?.children).toHaveLength(0);
  });
});

describe("Skeleton · 尺寸走内联，因为它是运行时数据", () => {
  it("数字当 px，字符串原样", () => {
    const a = render(<Skeleton width={120} height={16} />);
    const first = a.container.firstElementChild as HTMLElement;
    expect(first.style.width).toBe("120px");
    expect(first.style.height).toBe("16px");
    a.unmount();

    const b = render(<Skeleton width="50%" />);
    expect((b.container.firstElementChild as HTMLElement).style.width).toBe(
      "50%",
    );
  });

  it("两个都不给就不写内联尺寸", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.width).toBe("");
    expect(el.style.height).toBe("");
  });

  /** 调用方自己的 style 排在后面，压得过 width/height。 */
  it("调用方的 style 压过 width/height", () => {
    const { container } = render(
      <Skeleton width={120} style={{ width: "300px" }} />,
    );
    expect((container.firstElementChild as HTMLElement).style.width).toBe(
      "300px",
    );
  });
});

/* ── ViewModeSwitch ───────────────────────────────────────────────────────── */

describe("ViewModeSwitch · 视图必须始终有一个", () => {
  /**
   * **这一条是本件存在的理由之一**（见头注）。
   *
   * Radix 的单选组允许「取消选中」——点当前已选中的那一项会回**空串**。视图
   * 没有「无」这个档，空串必须直接忽略。少写这一句，用户点两下列表图标就把
   * 列表切成了「没有视图」，而这个状态在产品里通常没有渲染分支。
   */
  it("点已选中的那一项不会把视图清空", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ViewModeSwitch value="list" onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: "List view" }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("点另一项会切过去", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ViewModeSwitch value="list" onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: "Card view" }));

    expect(onChange).toHaveBeenCalledWith("cards");
  });

  it("当前项是按下态", () => {
    render(<ViewModeSwitch value="cards" onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: "Card view" })).toHaveAttribute(
      "data-state",
      "on",
    );
    expect(screen.getByRole("radio", { name: "List view" })).toHaveAttribute(
      "data-state",
      "off",
    );
  });
});

describe("ViewModeSwitch · 文案与停用", () => {
  it("整组与两项的无障碍名都可传参", () => {
    render(
      <ViewModeSwitch
        value="list"
        onChange={() => {}}
        ariaLabel="账单展示方式"
        labels={{ list: "列表", cards: "卡片" }}
      />,
    );
    // 单选的 ToggleGroup 落成 radiogroup（两项各是 radio），不是 group
    expect(
      screen.getByRole("radiogroup", { name: "账单展示方式" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "列表" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "卡片" })).toBeInTheDocument();
  });

  it("只传一半时另一半用缺省", () => {
    render(
      <ViewModeSwitch
        value="list"
        onChange={() => {}}
        labels={{ list: "列表" }}
      />,
    );
    expect(screen.getByRole("radio", { name: "列表" })).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: "Card view" }),
    ).toBeInTheDocument();
  });

  /**
   * 停用要**说明原因**：一个永远按不动又不说为什么的按钮，比没有这个按钮更糟。
   * 原因同时挂 `title`（鼠标）与 `aria-description`（读屏器），两条路都拿得到。
   */
  it("停用卡片档时带上原因，鼠标与读屏器都拿得到", () => {
    render(
      <ViewModeSwitch
        value="list"
        onChange={() => {}}
        cardsDisabledReason="卡片视图已退役"
      />,
    );
    const cards = screen.getByRole("radio", { name: "Card view" });
    expect(cards).toBeDisabled();
    expect(cards).toHaveAttribute("title", "卡片视图已退役");
    expect(cards).toHaveAttribute("aria-description", "卡片视图已退役");
  });

  it("不给原因就不停用", () => {
    render(<ViewModeSwitch value="list" onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: "Card view" })).not.toBeDisabled();
    expect(
      screen.getByRole("radio", { name: "Card view" }),
    ).not.toHaveAttribute("title");
  });
});

/* ── BulkActionBar ────────────────────────────────────────────────────────── */

const ACTIONS = [
  { id: "export", label: "导出", onSelect: vi.fn() },
  {
    id: "archive",
    label: "归档",
    icon: "archive" as const,
    onSelect: vi.fn(),
  },
] as const;

describe("BulkActionBar · 没选中就不该在", () => {
  /** 工具条是「你选了东西之后才出现的那一条」。0 选中还占着一行是视觉噪音。 */
  it.each([0, -1])("count=%i 时整条不渲染", (count) => {
    const { container } = render(
      <BulkActionBar count={count} actions={[...ACTIONS]} />,
    );
    expect(container.firstElementChild).toBeNull();
  });

  it("count=1 就出现", () => {
    render(<BulkActionBar count={1} actions={[...ACTIONS]} />);
    expect(screen.getByRole("toolbar")).toBeInTheDocument();
  });
});

describe("BulkActionBar · 计数语收模板不收词", () => {
  /**
   * 收模板而不是只收 `noun`：`已选择 N 项` 的语序是中文的（数词在前、量词在后），
   * 英文得是 `N items selected`——**只开 `noun` 一个口子，调用方拼不出那句话**。
   * 件替调用方定语序是越界。
   */
  it("缺省是英文语序", () => {
    render(<BulkActionBar count={3} actions={[...ACTIONS]} />);
    expect(screen.getByText("3 items selected")).toBeInTheDocument();
  });

  it("换成中文语序，槽位任意摆", () => {
    render(
      <BulkActionBar
        count={3}
        actions={[...ACTIONS]}
        noun="项"
        selectionTemplate="已选择 {count} {noun}"
      />,
    );
    expect(screen.getByText("已选择 3 项")).toBeInTheDocument();
  });

  it("同一个槽位出现多次也全替换", () => {
    render(
      <BulkActionBar
        count={2}
        actions={[...ACTIONS]}
        selectionTemplate="{count} / {count}"
      />,
    );
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });
});

describe("BulkActionBar · 清除与动作", () => {
  it("不给 onClear 就没有清除钮", () => {
    render(<BulkActionBar count={2} actions={[...ACTIONS]} />);
    expect(
      screen.queryByRole("button", { name: "Clear" }),
    ).not.toBeInTheDocument();
  });

  it("给了 onClear 才有，文案可换", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <BulkActionBar
        count={2}
        actions={[...ACTIONS]}
        onClear={onClear}
        clearLabel="取消选择"
      />,
    );
    await user.click(screen.getByRole("button", { name: "取消选择" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("没有 confirm 的动作直接触发 onSelect", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <BulkActionBar
        count={2}
        actions={[{ id: "export", label: "导出", onSelect }]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "导出" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("disabled 的动作按不动", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <BulkActionBar
        count={2}
        actions={[{ id: "export", label: "导出", onSelect, disabled: true }]}
      />,
    );
    const btn = screen.getByRole("button", { name: "导出" });
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("工具条的可访问名可换", () => {
    render(
      <BulkActionBar
        count={2}
        actions={[...ACTIONS]}
        toolbarLabel="批量操作"
      />,
    );
    expect(
      screen.getByRole("toolbar", { name: "批量操作" }),
    ).toBeInTheDocument();
  });
});

describe("BulkActionBar · 危险动作与确认", () => {
  const dangerous = [
    {
      id: "delete",
      label: "删除",
      danger: true as const,
      confirm: {
        verb: "Delete",
        target: "3 items",
        consequence: "This cannot be undone.",
        onConfirm: vi.fn(),
      },
    },
  ];

  /**
   * **给了 confirm 就不该直接执行**——点一下只开确认框。这正是 4.0 那套契约的
   * 意思：红与拦是同一个决定。
   */
  it("有 confirm 的动作先开确认框，不直接执行", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <BulkActionBar
        count={3}
        actions={[
          {
            ...dangerous[0]!,
            confirm: { ...dangerous[0]!.confirm, onConfirm },
          },
        ]}
      />,
    );

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "删除" }));

    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  /** 没开确认框时不该有对话框挂在 DOM 里。 */
  it("没有危险动作时不渲染确认框", () => {
    render(<BulkActionBar count={2} actions={[...ACTIONS]} />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
