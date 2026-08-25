/**
 * Combobox 与 DatePicker 的行为回归。
 *
 * 两个件都是「上游只给组合示例、DS 落成成品」的那一类，所以它们的价值全在
 * **受控语义**上——而受控语义是最容易在重构时被悄悄改掉的东西。
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Combobox } from "../src/components/composite/form/Combobox";
import { DatePicker } from "../src/components/composite/form/DatePicker";

const items = [
  { value: "a", label: "主力推理通道" },
  { value: "b", label: "备用通道" },
  { value: "c", label: "已停用通道", disabled: true },
];

describe("Combobox · 受控与回显", () => {
  it("不给 value 出 placeholder；给了 value 回显对应 label", () => {
    const { rerender } = render(
      <Combobox items={items} placeholder="请选择" />,
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("请选择");

    rerender(<Combobox items={items} value="b" placeholder="请选择" />);
    expect(screen.getByRole("combobox")).toHaveTextContent("备用通道");
  });

  it("选中一项走 onValueChange，件自己不改回显", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Combobox
        items={items}
        onValueChange={onValueChange}
        placeholder="请选择"
      />,
    );

    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "备用通道" }));

    expect(onValueChange).toHaveBeenCalledWith("b");
    // 受控件：没有外部把 value 传回来之前，回显不许自己变
    expect(screen.getByRole("combobox")).toHaveTextContent("请选择");
  });

  it("disabled 的条目点不动", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Combobox items={items} onValueChange={onValueChange} />);

    await user.click(screen.getByRole("combobox"));
    const disabled = await screen.findByRole("option", { name: "已停用通道" });
    expect(disabled).toHaveAttribute("aria-disabled", "true");
    await user.click(disabled);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("搜索把不匹配的筛掉；一条都不剩时出 emptyText", async () => {
    const user = userEvent.setup();
    render(<Combobox items={items} emptyText="没有匹配项" />);

    await user.click(screen.getByRole("combobox"));
    await user.type(screen.getByPlaceholderText("Search…"), "备用");
    expect(
      screen.getByRole("option", { name: "备用通道" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "主力推理通道" }),
    ).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("Search…"));
    await user.type(screen.getByPlaceholderText("Search…"), "不存在的东西");
    expect(screen.getByText("没有匹配项")).toBeInTheDocument();
  });
});

describe("DatePicker · 可清空是契约", () => {
  /**
   * 文件头写死的一条：**onValueChange 会收到 undefined**——再点已选中的那天是
   * 取消选择，这是日历的原生语义。吞掉它，调用方就做不出「可清空」的字段。
   *
   * 这条最容易在"顺手加个空值保护"时被改掉，而改掉之后没有任何东西会报错。
   */
  it("再点已选中的那天，回调收到 undefined 而不是被吞掉", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const day = new Date(2026, 7, 20);
    render(<DatePicker value={day} onValueChange={onValueChange} />);

    await user.click(screen.getByRole("button"));
    const grid = await screen.findByRole("grid");
    /* 用完整的日期名匹配：/20/ 会同时命中「2026」，日历里一票按钮都含它。 */
    await user.click(within(grid).getByRole("button", { name: /August 20th/ }));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0][0]).toBeUndefined();
  });

  it("没选时出 placeholder，选了出格式化日期", () => {
    const { rerender } = render(<DatePicker placeholder="选择日期" />);
    expect(screen.getByRole("button")).toHaveTextContent("选择日期");

    rerender(
      <DatePicker value={new Date(2026, 7, 20)} placeholder="选择日期" />,
    );
    expect(screen.getByRole("button")).not.toHaveTextContent("选择日期");
  });
});
