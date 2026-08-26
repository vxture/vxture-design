/**
 * 反馈族：`Spinner` / `Avatar` / `ResultPageTemplate`。
 *
 * 三件共享的是**「什么时候该说话，什么时候该闭嘴」**：转圈在有文案时才播报、
 * 头像的兜底在图片加载不出来时才现身、结果页的图标缺省跟着语气走。
 * 这一类判断写反不报错，只是读屏器要么什么都不说、要么把同一件事说两遍。
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Spinner,
  SPINNER_SIZES,
} from "../src/components/base/feedback/Spinner";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  UserAvatar,
} from "../src/components/base/display/Avatar";
import { ResultPageTemplate } from "../src/components/templates/ResultPageTemplate";
import { TONES, toneIcons } from "../src/components/tone";

/* ── Spinner ──────────────────────────────────────────────────────────────── */

describe("Spinner · 有文案才说话", () => {
  /**
   * **不给 `label` 时整体 `aria-hidden`。**
   *
   * 转圈旁边必然还有别的文字在说明发生了什么——按钮文案（「保存中…」）、行内提示。
   * 让读屏器把这个图形也念一遍是噪音，而噪音会让人关掉读屏器的辅助提示。
   */
  it("不给 label：无角色、整体 aria-hidden", () => {
    const { container } = render(<Spinner />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root).not.toHaveAttribute("role");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  /** 给了 `label` 才以 `status` 播报，并渲染一段只给读屏器的文本。 */
  it("给了 label：status 角色 + sr-only 文本，且不再 aria-hidden", () => {
    const { container } = render(<Spinner label="正在保存" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveAttribute("role", "status");
    expect(root).not.toHaveAttribute("aria-hidden");

    const srOnly = screen.getByText("正在保存");
    expect(srOnly.className).toContain("sr-only");
  });

  /**
   * **文案是产品的话，DS 不带默认值。**给一个「加载中」的缺省等于替产品决定了
   * 语言和措辞——而这一句会出现在读屏用户的耳朵里，不是随手能改的装饰。
   */
  it("不给 label 时没有任何兜底文案", () => {
    const { container } = render(<Spinner />);
    expect(container.textContent).toBe("");
  });

  it.each(SPINNER_SIZES)("size=%s 落到图标上", (size) => {
    const { container } = render(<Spinner size={size} />);
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg).not.toBeNull();
    expect(svg.getAttribute("class")).toContain("animate-spin");
  });

  it("不同档位的图标尺寸类不同", () => {
    const xs = render(<Spinner size="xs" />);
    const xsCls = (
      xs.container.querySelector("svg") as SVGElement
    ).getAttribute("class");
    xs.unmount();

    const xl = render(<Spinner size="xl" />);
    expect(
      (xl.container.querySelector("svg") as SVGElement).getAttribute("class"),
    ).not.toBe(xsCls);
  });

  it("不给 size 时是 md", () => {
    const explicit = render(<Spinner size="md" />);
    const mdCls = (
      explicit.container.querySelector("svg") as SVGElement
    ).getAttribute("class");
    explicit.unmount();

    const implicit = render(<Spinner />);
    expect(
      (implicit.container.querySelector("svg") as SVGElement).getAttribute(
        "class",
      ),
    ).toBe(mdCls);
  });

  /** 档位是图标刻度的**子集**，编译期对账——图标刻度改档这里跟着报错。 */
  it("档位表就是那五档", () => {
    expect([...SPINNER_SIZES]).toEqual(["xs", "sm", "md", "lg", "xl"]);
  });
});

/* ── Avatar ───────────────────────────────────────────────────────────────── */

describe("Avatar · 兜底在图片起不来时接管", () => {
  /**
   * jsdom 不加载图片，`AvatarImage` 因此永远停在 loading 态——**这正好是真实
   * 世界里最常见的那一帧**：头像 URL 挂了、还没下完、或者用户根本没设头像。
   * Radix 在这一帧渲染 `AvatarFallback`。
   */
  it("图片起不来时出兜底", () => {
    render(
      <Avatar>
        <AvatarImage src="https://example.invalid/a.png" alt="头像" />
        <AvatarFallback>VX</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText("VX")).toBeInTheDocument();
    expect(screen.queryByAltText("头像")).not.toBeInTheDocument();
  });

  it("只给兜底也成立", () => {
    render(
      <Avatar>
        <AvatarFallback>VX</AvatarFallback>
      </Avatar>,
    );
    expect(screen.getByText("VX")).toBeInTheDocument();
  });

  /** 圆形与裁切写在根上——图片再宽也不会溢出那个圆。 */
  it("根节点自己裁切成圆", () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>VX</AvatarFallback>
      </Avatar>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("rounded-full");
    expect(root.className).toContain("overflow-hidden");
    expect(root.className).toContain("shrink-0");
  });

  it("兜底铺满整个圆，不是居中一小块", () => {
    render(
      <Avatar>
        <AvatarFallback>VX</AvatarFallback>
      </Avatar>,
    );
    const fb = screen.getByText("VX");
    expect(fb.className).toContain("h-full");
    expect(fb.className).toContain("w-full");
    expect(fb.className).toContain("rounded-full");
  });

  it("className 可加不可减", () => {
    const { container } = render(
      <Avatar className="size-media-md">
        <AvatarFallback>VX</AvatarFallback>
      </Avatar>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("size-media-md");
    expect(root.className).toContain("rounded-full");
  });
});

/* ── ResultPageTemplate ───────────────────────────────────────────────────── */

describe("ResultPageTemplate · 图标缺省跟着语气走", () => {
  /**
   * 结果页的图标不该让每个调用点自己挑——同一个「成功」在五个门户里挑出五个
   * 不同的对勾，用户会以为它们是不同的事。缺省从 `toneIcons` 取，一个语气一个图标。
   */
  it.each([...TONES])("tone=%s 时用该语气的缺省图标", (tone) => {
    const { container } = render(
      <ResultPageTemplate tone={tone} title="完成" />,
    );
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(toneIcons[tone]).toBeTruthy();
  });

  /** 不同语气必须画出不同的图标——否则这个缺省就没有意义。 */
  it("不同语气画出不同的图标", () => {
    const ok = render(<ResultPageTemplate tone="success" title="完成" />);
    const okSvg = (ok.container.querySelector("svg") as SVGElement).innerHTML;
    ok.unmount();

    const bad = render(<ResultPageTemplate tone="danger" title="失败" />);
    expect(
      (bad.container.querySelector("svg") as SVGElement).innerHTML,
    ).not.toBe(okSvg);
  });

  it("显式 icon 压过语气缺省", () => {
    const auto = render(<ResultPageTemplate tone="success" title="完成" />);
    const autoSvg = (auto.container.querySelector("svg") as SVGElement)
      .innerHTML;
    auto.unmount();

    const manual = render(
      <ResultPageTemplate tone="success" icon="settings" title="完成" />,
    );
    expect(
      (manual.container.querySelector("svg") as SVGElement).innerHTML,
    ).not.toBe(autoSvg);
  });

  it("不给 tone 时是 neutral", () => {
    const explicit = render(<ResultPageTemplate tone="neutral" title="完成" />);
    const neutralCls = (
      explicit.container.firstElementChild?.firstElementChild as HTMLElement
    ).className;
    explicit.unmount();

    const implicit = render(<ResultPageTemplate title="完成" />);
    expect(
      (implicit.container.firstElementChild?.firstElementChild as HTMLElement)
        .className,
    ).toBe(neutralCls);
  });

  /** 语气只染顶缘，同 `PanelCard` / `MetricCard`。 */
  it("语气染顶缘，且不同语气染不同的色", () => {
    const { container } = render(
      <ResultPageTemplate tone="danger" title="失败" />,
    );
    const card = container.firstElementChild?.firstElementChild as HTMLElement;
    expect(card.className).toContain("border-t-medium");
    expect(card.className).toContain("max-w-content-narrow-lg");

    // 六档两两不同——只断言「有一条 border-t-medium」的话，把 toneEdgeClasses
    // 整个拿掉也不变红：加粗的上边还在，只是不再有颜色。
    const seen = new Set<string>();
    for (const tone of TONES) {
      const r = render(<ResultPageTemplate tone={tone} title="x" />);
      seen.add(
        (r.container.firstElementChild?.firstElementChild as HTMLElement)
          .className,
      );
      r.unmount();
    }
    expect(seen.size).toBe(TONES.length);
  });

  /**
   * ⚠ `description` / `actions` 的**条件展开在这里是冗余的**，变异测试对它留绿
   * 是正常的：`React.ReactNode` 本身就含 `undefined`，写成 `description={description}`
   * 运行时与类型上都一模一样。
   *
   * 那个写法在别处是**必需**的——`MetricGrid.help?: string` 这类 props 的类型不含
   * undefined，本仓又开了 `exactOptionalPropertyTypes`，显式传 undefined 会编译
   * 失败。惯用法保持一致有价值，所以这里不为了「消掉一条无用分支」去改源码。
   */
  it("description 与 actions 给了才渲染", () => {
    const bare = render(<ResultPageTemplate title="完成" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    const bareText = bare.container.textContent;
    expect(bareText).toBe("完成");
    bare.unmount();

    render(
      <ResultPageTemplate
        title="完成"
        description="订单已提交"
        actions={<button>返回</button>}
      />,
    );
    expect(screen.getByText("订单已提交")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回" })).toBeInTheDocument();
  });

  /** 整页居中：它是一整页而不是页面里的一块。 */
  it("整页铺满并居中", () => {
    const { container } = render(<ResultPageTemplate title="完成" />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("min-h-full");
    expect(root.className).toContain("items-center");
    expect(root.className).toContain("justify-center");
  });
});

describe("UserAvatar · 没有头像就出剪影", () => {
  /**
   * ⚠ **`src` 那一支在 jsdom 里观察不到。**
   *
   * Radix 的 `AvatarImage` 在图片**加载成功之前根本不进 DOM**，而 jsdom 从不加载
   * 图片。于是「给了 src」与「没给 src」渲染出来的 DOM 一模一样——实测两条变异
   * （有 src 也不渲染 img / 无 src 也渲染 img）都不变红。
   *
   * 所以这一节**不断言 `<img>` 在不在**：那种断言无论代码对错都通过，是装饰
   * （070 §3.1）。能钉住的是剪影那一支：可访问名、染色方式、清空 src 之后仍在。
   */
  it("不给 src 时出剪影", async () => {
    // Radix 的 AvatarFallback 即使 delayMs={0} 也走一拍定时器，要等它出来
    const { container } = render(<UserAvatar />);
    await screen.findByLabelText("User avatar");
    expect(container.querySelector("svg")).not.toBeNull();
  });

  /**
   * 剪影用 `fill: currentColor`，由宿主按状态染色——这正是它做成内联组件而不是
   * 一张外链图片的原因：`<img>` 继承不了 `currentColor`。
   */
  it("剪影跟着文字色走", async () => {
    const { container } = render(<UserAvatar />);
    await screen.findByLabelText("User avatar");
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("text-muted-foreground");
    const svg = container.querySelector("svg") as SVGElement;
    expect(svg.getAttribute("fill")).toBe("currentColor");
  });

  it("兜底带可访问名，alt 可覆盖", async () => {
    const a = render(<UserAvatar />);
    expect(await screen.findByLabelText("User avatar")).toBeInTheDocument();
    a.unmount();

    render(<UserAvatar alt="张三的头像" />);
    expect(await screen.findByLabelText("张三的头像")).toBeInTheDocument();
  });

  /**
   * `key={src}` 是为了**强制重挂载**：Radix 把「图片加载成功了没有」存在自己的
   * 状态里，src 从 URL 变成 null 时不重挂载，那个「已加载」还留着——兜底剪影
   * 因此不出来，用户看到一个空框（件的头注记着这件事）。
   *
   * ⚠ 同上，**机制那一半 jsdom 重现不了**（图片从来没「加载成功」过），拿掉
   * `key` 这条不变红。它钉的是「src 清掉之后剪影在」这个结果。
   */
  it("src 从 URL 清成 null 之后，剪影仍在", async () => {
    const { container, rerender } = render(
      <UserAvatar src="https://example.invalid/a.png" alt="头像" />,
    );
    rerender(<UserAvatar alt="头像" />);
    await screen.findByLabelText("头像");
    expect(container.querySelector("svg")).not.toBeNull();
  });
});
