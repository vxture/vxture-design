/**
 * 文案出口的**运行时**验证。
 *
 * 5.0 那次只验了编译期——「传得进去」不等于「渲染出来的真是它」。一个件完全
 * 可以收下 labels 却在某个分支上继续用默认值，类型一个字都不会说。
 *
 * 这一份逐个件把出口传成可识别的字符串，再从 DOM 里找它。
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Banner } from "../src/components/base/feedback/Banner";
import { BulkActionBar } from "../src/components/composite/data/BulkActionBar";
import { DialogForm } from "../src/components/composite/form/DialogForm";
import { ConfirmDestructive } from "../src/components/composite/overlay/ConfirmDestructive";

describe("文案出口 · 默认值是英文托底", () => {
  it("不传就出英文", () => {
    render(<Banner title="t" onDismiss={() => undefined} />);
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });
});

describe("文案出口 · 传了就必须生效", () => {
  it("Banner.dismissLabel", () => {
    render(
      <Banner title="t" onDismiss={() => undefined} dismissLabel="关闭提示" />,
    );
    expect(
      screen.getByRole("button", { name: "关闭提示" }),
    ).toBeInTheDocument();
  });

  it("DialogForm 的三处：提交 / 取消 / 处理中", () => {
    const { rerender } = render(
      <DialogForm
        open
        title="t"
        submitLabel="保存"
        cancelLabel="取消"
        pendingLabel="处理中…"
      />,
    );
    expect(screen.getByRole("button", { name: "保存" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "取消" })).toBeInTheDocument();

    rerender(
      <DialogForm
        open
        title="t"
        submitLabel="保存"
        cancelLabel="取消"
        pendingLabel="处理中…"
        submitting
      />,
    );
    expect(screen.getByRole("button", { name: "处理中…" })).toBeInTheDocument();
  });

  /**
   * 拼接出来的句子收**模板**不收词，这一条是 i18n 兼容性的真正门槛：
   * 只开 `noun` 一个口子的件，看着有出口，实际换不了语序。
   */
  it("BulkActionBar.selectionTemplate 能换掉语序，不只是换词", () => {
    render(
      <BulkActionBar
        count={3}
        noun="项"
        selectionTemplate="已选择 {count} {noun}"
        actions={[]}
        onClear={() => undefined}
        clearLabel="清除"
      />,
    );
    expect(screen.getByText("已选择 3 项")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "清除" })).toBeInTheDocument();
  });

  it("ConfirmDestructive.titleTemplate 交还语序与标点", () => {
    render(
      <ConfirmDestructive
        open
        onOpenChange={() => undefined}
        titleTemplate="{verb}{target}？"
        verb="删除"
        target="模型服务"
        consequence="不可恢复。"
        cancelLabel="取消"
        onConfirm={() => undefined}
      />,
    );
    // 中文语序 + 全角问号，中间没有空格
    expect(screen.getByText("删除模型服务？")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "删除" })).toBeInTheDocument();
  });

  it("只给读屏听的文案同样换得掉", () => {
    render(
      <BulkActionBar
        count={1}
        actions={[]}
        onClear={() => undefined}
        toolbarLabel="批量操作"
      />,
    );
    expect(
      screen.getByRole("toolbar", { name: "批量操作" }),
    ).toBeInTheDocument();
  });
});
