/**
 * 表单族：`Field` 一家、`InputGroup`、`InputOTP`、`SegmentedControl`。
 *
 * 这一族共享的是**状态怎么往下传**：失效态由 `Field` 下发给标签、聚焦与失效由
 * `InputGroup` 从内部控件上浮到框身、`InputOTP` 的活动格由上下文下发。
 * 状态传递写错不报错，只是「红的地方不对」——而用户找不到是哪一行错了。
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "../src/components/base/form/Field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../src/components/base/form/InputGroup";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "../src/components/base/form/InputOTP";
import { SegmentedControl } from "../src/components/base/form/SegmentedControl";

const cls = (el: Element | null) => (el as HTMLElement)?.className ?? "";

/* ── Field ────────────────────────────────────────────────────────────────── */

describe("Field · 一行是一个组", () => {
  /** 标签、控件、说明、错误是**一行里的一组**，读屏器要能整组念下来。 */
  it("是 group 角色，带 data-slot 供样式钩子用", () => {
    const { container } = render(
      <Field>
        <FieldLabel htmlFor="x">名称</FieldLabel>
        <input id="x" />
      </Field>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("role", "group");
    expect(root).toHaveAttribute("data-slot", "field");
  });

  /**
   * 两种朝向：默认标签在上；`horizontal` 用于开关行、复选行——控件与标签同行，
   * 说明文字换行后仍对齐标签列。
   */
  it.each([
    ["vertical", "flex-col"],
    ["horizontal", "flex-row"],
  ] as const)("orientation=%s → %s，并落到 data 属性上", (o, cl) => {
    const { container } = render(<Field orientation={o}>x</Field>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain(cl);
    expect(root).toHaveAttribute("data-orientation", o);
  });

  it("不给 orientation 时是 vertical", () => {
    const { container } = render(<Field>x</Field>);
    expect(container.firstElementChild).toHaveAttribute(
      "data-orientation",
      "vertical",
    );
  });

  /**
   * **失效态从 Field 下发，标签随控件一起变色。**只红输入框会让用户在一屏十几
   * 行的表单里找不到是哪一行错了——红色的输入框边框在扫视时和正常的差别很小，
   * 而变红的标签是有文字的，一眼认得出是哪一项。
   */
  it("失效态的下发写在 Field 上，不是写在标签上", () => {
    const { container } = render(
      <Field data-invalid="true">
        <FieldLabel htmlFor="x">名称</FieldLabel>
        <input id="x" aria-invalid />
      </Field>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("data-invalid", "true");
    expect(root.className).toContain("data-[invalid=true]:");
    expect(root.className).toContain("field-label");
    // 标签自己不带任何失效色——它是被下发的那一方
    expect(cls(screen.getByText("名称"))).not.toContain("destructive");
  });
});

describe("FieldError · 没内容就不占位", () => {
  /**
   * `role="alert"` 让读屏在错误**出现的当下**播报，而不是等用户巡航到这一行。
   * 表单校验失败时用户的焦点通常在提交按钮上，离出错那一行很远。
   */
  it("有内容时以 alert 播报", () => {
    render(<FieldError>名称不能为空</FieldError>);
    expect(screen.getByRole("alert")).toHaveTextContent("名称不能为空");
  });

  /**
   * 三种「没有」都不渲染。`false` 那一支尤其要紧：调用方常写
   * `<FieldError>{touched && message}</FieldError>`，未触碰时传进来的正是 `false`——
   * 渲染出来会是一个空的红色段落，占着行高，看起来像「这里本该有句话没加载出来」。
   */
  it.each([
    ["undefined", undefined],
    ["null", null],
    ["false", false],
  ])("children 是 %s 时整个不渲染", (_name, value) => {
    const { container } = render(<FieldError>{value}</FieldError>);
    expect(container.firstElementChild).toBeNull();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  /** 空字符串**要**渲染——它是调用方给的内容，不是「没给」。 */
  it("空字符串仍然渲染（它是内容不是缺席）", () => {
    render(<FieldError>{""}</FieldError>);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});

describe("Field 一家的其余成员", () => {
  it("FieldGroup 一次定齐行距", () => {
    const { container } = render(<FieldGroup>x</FieldGroup>);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("data-slot", "field-group");
    expect(root.className).toContain("flex-col");
  });

  it("FieldLabel 与 FieldDescription 各自带 data-slot", () => {
    render(
      <>
        <FieldLabel htmlFor="x">名称</FieldLabel>
        <FieldDescription>会显示在列表里</FieldDescription>
      </>,
    );
    expect(screen.getByText("名称")).toHaveAttribute(
      "data-slot",
      "field-label",
    );
    expect(screen.getByText("会显示在列表里")).toHaveAttribute(
      "data-slot",
      "field-description",
    );
  });
});

/* ── InputGroup ───────────────────────────────────────────────────────────── */

describe("InputGroup · 框身在容器，状态从内部上浮", () => {
  /**
   * ⚠ 断言要落在**每一条具体的类**上，不能只查前缀 `has-[input:focus-visible]:`。
   *
   * 聚焦那一组有两条类、失效那一组有三条。只查前缀的话，删掉其中一条**照样绿**——
   * 剩下的那条仍然含这个前缀。而少掉的可能正是 `ring-3`（外圈粗细）那一条，
   * 表现是「聚焦时框变色了但没有光圈」，看起来像样式没加载全。
   */
  it("聚焦与失效都由容器上浮表达", () => {
    const { container } = render(
      <InputGroup>
        <InputGroupInput aria-label="搜索" />
      </InputGroup>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("role", "group");

    /* ⚠ 按 **token** 比，不用 `toContain`。`toContain` 是子串匹配，而 Tailwind
       的变体会让一条类成为另一条的子串——`has-[…]:border-destructive` 被删掉之后，
       `dark:has-[…]:border-destructive/50` 仍然含那个子串，断言照样绿。 */
    const tokens = new Set(root.className.split(" ").filter(Boolean));
    for (const c of [
      "has-[input:focus-visible]:border-ring",
      "has-[input:focus-visible]:ring-3",
      "has-[input:focus-visible]:ring-ring/50",
      "has-[input[aria-invalid=true]]:border-destructive",
      "has-[input[aria-invalid=true]]:ring-3",
      "has-[input[aria-invalid=true]]:ring-destructive/20",
      "dark:has-[input[aria-invalid=true]]:border-destructive/50",
      "has-[input:disabled]:pointer-events-none",
      "has-[input:disabled]:opacity-disabled",
    ]) {
      expect(tokens).toContain(c);
    }
  });

  /** 组内输入框**不再自带框身**——再画一层会出现框中框。 */
  it("组内输入框自己不画框", () => {
    render(
      <InputGroup>
        <InputGroupInput aria-label="搜索" />
      </InputGroup>,
    );
    const input = screen.getByLabelText("搜索");
    expect(input.className).toContain("bg-transparent");
    expect(input.className).toContain("outline-none");
    expect(input.className).not.toContain("border-input");
  });

  it.each([
    ["start", "pl-sm"],
    ["end", "pr-sm"],
  ] as const)("前后缀 align=%s → %s", (align, cl) => {
    render(<InputGroupAddon align={align}>￥</InputGroupAddon>);
    const addon = screen.getByText("￥");
    expect(addon.className).toContain(cl);
    expect(addon).toHaveAttribute("data-align", align);
  });

  it("不给 align 时是 start", () => {
    render(<InputGroupAddon>￥</InputGroupAddon>);
    expect(screen.getByText("￥")).toHaveAttribute("data-align", "start");
  });

  /** 前后缀取弱化色——它是单位、图标，不该与输入内容抢重量。 */
  it("前后缀是弱化色且不可选中", () => {
    render(<InputGroupAddon>￥</InputGroupAddon>);
    const addon = screen.getByText("￥");
    expect(addon.className).toContain("text-muted-foreground");
    expect(addon.className).toContain("select-none");
  });

  it("能真的打字", async () => {
    const user = userEvent.setup();
    render(
      <InputGroup>
        <InputGroupAddon>￥</InputGroupAddon>
        <InputGroupInput aria-label="金额" />
      </InputGroup>,
    );
    await user.type(screen.getByLabelText("金额"), "128");
    expect(screen.getByLabelText("金额")).toHaveValue("128");
  });
});

/* ── InputOTP ─────────────────────────────────────────────────────────────── */

describe("InputOTP · 活动格由上下文下发", () => {
  function Otp() {
    return (
      <InputOTP maxLength={4} aria-label="验证码">
        <InputOTPGroup>
          {[0, 1, 2, 3].map((i) => (
            <InputOTPSlot key={i} index={i} data-testid={`slot-${i}`} />
          ))}
        </InputOTPGroup>
      </InputOTP>
    );
  }

  it("按 maxLength 渲染出对应的格子", () => {
    render(<Otp />);
    expect(screen.getAllByTestId(/slot-/)).toHaveLength(4);
  });

  /** 输入的字符落在对应的格子里——格子是显示层，真正的 input 是隐藏的那一个。 */
  it("打字后字符落进格子", async () => {
    const user = userEvent.setup();
    render(<Otp />);
    await user.type(screen.getByLabelText("验证码"), "12");
    expect(screen.getByTestId("slot-0")).toHaveTextContent("1");
    expect(screen.getByTestId("slot-1")).toHaveTextContent("2");
    expect(screen.getByTestId("slot-2")).toHaveTextContent("");
  });

  /**
   * **活动格要标出来**：这是唯一告诉用户「下一个字符落在哪」的线索。
   * 没有它，四个一模一样的方格里没有任何位置感。
   */
  it("活动格带 data-active，且只有一个", async () => {
    const user = userEvent.setup();
    render(<Otp />);
    const input = screen.getByLabelText("验证码");
    await user.click(input);
    await user.type(input, "1");

    const actives = screen
      .getAllByTestId(/slot-/)
      .filter((el) => el.getAttribute("data-active") === "true");
    expect(actives).toHaveLength(1);
    expect(actives[0]).toBe(screen.getByTestId("slot-1"));
  });

  /** 脱离上下文单独用时不炸——渲染成一个空格子。 */
  it("脱离上下文单独渲染也不炸", () => {
    render(<InputOTPSlot index={0} data-testid="lonely" />);
    expect(screen.getByTestId("lonely")).toBeInTheDocument();
    expect(screen.getByTestId("lonely")).toHaveTextContent("");
  });
});

/* ── SegmentedControl ─────────────────────────────────────────────────────── */

describe("SegmentedControl · 槽与滑块", () => {
  const ITEMS = [
    { value: "all", label: "全部", count: 128 },
    { value: "active", label: "启用中" },
    { value: "off", label: "已停用", disabled: true },
  ] as const;

  it("是 radiogroup，选中项 aria-checked 为真且只有一个", () => {
    render(
      <SegmentedControl
        items={[...ITEMS]}
        value="active"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    const checked = screen
      .getAllByRole("radio")
      .filter((r) => r.getAttribute("aria-checked") === "true");
    expect(checked).toHaveLength(1);
    expect(checked[0]).toHaveTextContent("启用中");
  });

  it("点一档回传它的值", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl items={[...ITEMS]} value="all" onChange={onChange} />,
    );
    await user.click(screen.getByRole("radio", { name: /启用中/ }));
    expect(onChange).toHaveBeenCalledWith("active");
  });

  it("停用档按不动", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl items={[...ITEMS]} value="all" onChange={onChange} />,
    );
    const off = screen.getByRole("radio", { name: /已停用/ });
    expect(off).toBeDisabled();
    await user.click(off);
    expect(onChange).not.toHaveBeenCalled();
  });

  /** 每一档都是 `type="button"`——它常出现在筛选栏，而筛选栏常在 `<form>` 里。 */
  it("每一档都是 type=button", () => {
    render(
      <SegmentedControl items={[...ITEMS]} value="all" onChange={() => {}} />,
    );
    for (const r of screen.getAllByRole("radio")) {
      expect(r).toHaveAttribute("type", "button");
    }
  });

  it("count 给了才出徽标", () => {
    render(
      <SegmentedControl items={[...ITEMS]} value="all" onChange={() => {}} />,
    );
    expect(screen.getByText("128")).toBeInTheDocument();
    // 启用中那一档没有 count
    expect(screen.getByRole("radio", { name: /启用中/ }).textContent).toBe(
      "启用中",
    );
  });

  /** `count={0}` 是合法值，不能被当成「没给」——「0 条」和「不知道多少条」不同。 */
  it("count=0 也出徽标", () => {
    render(
      <SegmentedControl
        items={[{ value: "all", label: "全部", count: 0 }]}
        value="all"
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  /**
   * **只有图标时必须给 ariaLabel**，否则读屏器没有可念的名字——那一档对
   * 读屏用户就是一个无名按钮。
   */
  it("只有图标的档靠 ariaLabel 认", () => {
    render(
      <SegmentedControl
        items={[
          { value: "list", icon: "list", ariaLabel: "列表" },
          { value: "grid", icon: "squares-four", ariaLabel: "网格" },
        ]}
        value="list"
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("radio", { name: "列表" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "网格" })).toBeInTheDocument();
  });

  /**
   * `fill` 撑满可用宽度、各档等宽。表单里独占一行时要置 true，否则控件缩在左边、
   * 右侧留一大片空白，与同栏的输入框 / 下拉右边缘对不齐。
   */
  it("fill 撑满，缺省不撑", () => {
    const on = render(
      <SegmentedControl
        items={[...ITEMS]}
        value="all"
        onChange={() => {}}
        fill
      />,
    );
    expect(cls(screen.getByRole("radiogroup"))).toContain("w-full");
    expect(cls(screen.getAllByRole("radio")[0]!)).toContain("flex-1");
    on.unmount();

    render(
      <SegmentedControl items={[...ITEMS]} value="all" onChange={() => {}} />,
    );
    expect(cls(screen.getByRole("radiogroup"))).toContain("inline-flex");
    expect(cls(screen.getAllByRole("radio")[0]!)).not.toContain("flex-1");
  });

  /**
   * 整组的可访问名给了才挂。
   *
   * ⚠ 变异测试对「不给时不挂」那一半是**看不出来的**：React 本来就不渲染值为
   * `undefined` 的属性，条件展开与直接展开渲染出来一模一样。真正有差别的是
   * **空字符串**——`aria-label=""` 会实打实地渲染出来，而一个空的可访问名比
   * 没有更糟：读屏器会认为这个组「已经命名了，名字是空的」，连元素类型的兜底
   * 播报都不再给。
   */
  it("整组的可访问名给了才挂，空字符串等同没给", () => {
    const a = render(
      <SegmentedControl
        items={[...ITEMS]}
        value="all"
        onChange={() => {}}
        ariaLabel="账单状态"
      />,
    );
    expect(
      screen.getByRole("radiogroup", { name: "账单状态" }),
    ).toBeInTheDocument();
    a.unmount();

    const b = render(
      <SegmentedControl items={[...ITEMS]} value="all" onChange={() => {}} />,
    );
    expect(screen.getByRole("radiogroup")).not.toHaveAttribute("aria-label");
    b.unmount();

    render(
      <SegmentedControl
        items={[...ITEMS]}
        value="all"
        onChange={() => {}}
        ariaLabel=""
      />,
    );
    expect(screen.getByRole("radiogroup")).not.toHaveAttribute("aria-label");
  });

  /**
   * **只有两档**，不是三档。档位在这里只决定高度，不连带改字号——md 档原先用
   * label-md，比同尺寸 NativeSelect 大一号，两个控件上下排在同一栏里字号明显
   * 不一致。控件里的选项文字是标签不是正文。
   */
  it.each([
    ["sm", "h-control-sm"],
    ["md", "h-control-md"],
  ] as const)("size=%s → 槽高 %s", (size, cl) => {
    render(
      <SegmentedControl
        items={[...ITEMS]}
        value="all"
        onChange={() => {}}
        size={size}
      />,
    );
    expect(cls(screen.getByRole("radiogroup"))).toContain(cl);
  });

  it("不给 size 时是 md", () => {
    render(
      <SegmentedControl items={[...ITEMS]} value="all" onChange={() => {}} />,
    );
    expect(cls(screen.getByRole("radiogroup"))).toContain("h-control-md");
  });
});
