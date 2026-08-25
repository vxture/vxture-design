/**
 * Select / Tabs / Accordion：Radix 薄封装的受控语义。
 *
 * 这三件相对上游只换了取值，**行为全部继承**——所以测的不是我们写了什么，是
 * 「换取值时没有把行为一起换掉」。薄封装最容易出的事是某次调样式时顺手把
 * `value` 变成 `defaultValue`，那之后件看起来照常，只是不再受控。
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../src/components/base/form/Select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../src/components/base/navigation/Tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../src/components/base/display/Accordion";

describe("Tabs · 受控", () => {
  it("受控时切换只走回调，件自己不改选中项", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Tabs value="a" onValueChange={onValueChange}>
        <TabsList>
          <TabsTrigger value="a">甲</TabsTrigger>
          <TabsTrigger value="b">乙</TabsTrigger>
        </TabsList>
        <TabsContent value="a">A 面</TabsContent>
        <TabsContent value="b">B 面</TabsContent>
      </Tabs>,
    );
    await user.click(screen.getByRole("tab", { name: "乙" }));
    expect(onValueChange).toHaveBeenCalledWith("b");
    // 外部没把 value 传回来，选中项不许自己变
    expect(screen.getByRole("tab", { name: "甲" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("A 面")).toBeInTheDocument();
  });

  it("非受控时自己切", async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">甲</TabsTrigger>
          <TabsTrigger value="b">乙</TabsTrigger>
        </TabsList>
        <TabsContent value="a">A 面</TabsContent>
        <TabsContent value="b">B 面</TabsContent>
      </Tabs>,
    );
    await user.click(screen.getByRole("tab", { name: "乙" }));
    expect(screen.getByText("B 面")).toBeInTheDocument();
  });
});

describe("Select · 受控", () => {
  it("选中走回调，受控值不自己变", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Select value="a" onValueChange={onValueChange}>
        <SelectTrigger aria-label="通道">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">主力</SelectItem>
          <SelectItem value="b">备用</SelectItem>
        </SelectContent>
      </Select>,
    );
    const trigger = screen.getByRole("combobox", { name: "通道" });
    expect(trigger).toHaveTextContent("主力");

    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: "备用" }));
    expect(onValueChange).toHaveBeenCalledWith("b");
    expect(trigger).toHaveTextContent("主力");
  });
});

describe("Accordion · 刻意不做高度动画", () => {
  /**
   * 文件头写死的一处**刻意省略**：上游的展开/收起高度动画依赖 tailwind 配置里
   * 自定义的 `accordion-down/up` keyframes（读 `--radix-accordion-content-height`）。
   * 本仓样式层**没有注册这对 keyframes**，写上类名只会静默哑火。
   *
   * 这条钉的就是「没写」。谁"顺手补回上游的动画"，这里会红——提醒他先去注册
   * keyframes，否则补的是一个哑火的类名。
   */
  it("内容区不带 accordion-down / accordion-up 类", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Accordion type="single" collapsible>
        <AccordionItem value="one">
          <AccordionTrigger>标题</AccordionTrigger>
          <AccordionContent>内容</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    await user.click(screen.getByRole("button", { name: "标题" }));
    const all = [...container.querySelectorAll("*")]
      .map((el) => el.className)
      .filter((c) => typeof c === "string")
      .join(" ");
    expect(all).not.toContain("accordion-down");
    expect(all).not.toContain("accordion-up");
  });

  it("展开与收起本身照常工作", async () => {
    const user = userEvent.setup();
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="one">
          <AccordionTrigger>标题</AccordionTrigger>
          <AccordionContent>内容</AccordionContent>
        </AccordionItem>
      </Accordion>,
    );
    const trigger = screen.getByRole("button", { name: "标题" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("内容")).toBeInTheDocument();
  });
});
