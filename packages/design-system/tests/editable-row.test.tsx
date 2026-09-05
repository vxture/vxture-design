/**
 * EditableRow（DS 10.1.0 新件）：展示态是文字、编辑态才是控件。
 *
 * 钉的是四条会悄悄退化的行为：展示态不渲染子控件；编辑态渲染子控件并把「修改」
 * 换成「取消」；空值画占位而不是空行；`action` 整体替换默认操作、`readOnly`
 * 不出操作。文案由调用方传（DS 零文案），这里传的是英文占位。
 */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DetailList, EditableRow, Input } from "../src/index";

const labels = { edit: "Edit", cancel: "Cancel" };

describe("EditableRow", () => {
  it("展示态:显示值文字与「修改」,不渲染子控件", () => {
    const onEdit = vi.fn();
    render(
      <DetailList>
        <EditableRow
          label="Display name"
          value="Zhang San"
          editing={false}
          onEdit={onEdit}
          labels={labels}
          hint="Shown in the sidebar"
        >
          <Input aria-label="display-name" defaultValue="Zhang San" />
        </EditableRow>
      </DetailList>,
    );
    expect(screen.getByText("Zhang San")).toBeTruthy();
    expect(screen.getByText("Shown in the sidebar")).toBeTruthy();
    expect(screen.queryByLabelText("display-name")).toBeNull();
    screen.getByRole("button", { name: "Edit" }).click();
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("编辑态:渲染子控件,操作换成「取消」", () => {
    const onCancel = vi.fn();
    render(
      <DetailList>
        <EditableRow
          label="Display name"
          value="Zhang San"
          editing
          onCancel={onCancel}
          labels={labels}
        >
          <Input aria-label="display-name" defaultValue="Zhang San" />
        </EditableRow>
      </DetailList>,
    );
    expect(screen.getByLabelText("display-name")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    screen.getByRole("button", { name: "Cancel" }).click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("空值画占位,默认「—」", () => {
    render(
      <DetailList>
        <EditableRow label="Industry" value="" editing={false} labels={labels}>
          <Input />
        </EditableRow>
        <EditableRow
          label="Website"
          value={null}
          editing={false}
          labels={labels}
          emptyText="n/a"
        >
          <Input />
        </EditableRow>
      </DetailList>,
    );
    expect(screen.getByText("—")).toBeTruthy();
    expect(screen.getByText("n/a")).toBeTruthy();
  });

  it("action 整体替换默认操作;readOnly 不出任何操作", () => {
    render(
      <DetailList>
        <EditableRow
          label="Registered name"
          value="Vxture Ltd."
          editing={false}
          labels={labels}
          action={<button type="button">Re-verify</button>}
        >
          <Input />
        </EditableRow>
        <EditableRow
          label="Tenant ID"
          value="T-2765001234"
          editing={false}
          labels={labels}
          readOnly
        >
          <Input />
        </EditableRow>
      </DetailList>,
    );
    expect(screen.getByRole("button", { name: "Re-verify" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.getByText("T-2765001234")).toBeTruthy();
  });
});
