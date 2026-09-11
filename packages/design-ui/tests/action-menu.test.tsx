/**
 * ActionMenu 的行为回归。
 *
 * 这一份测的是**类型保证不了的东西**：契约由判别联合钉住「必须给 confirm」，
 * 但「点了之后确认框真的开了吗」「关掉之后整页还能不能点」只有跑起来才知道。
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ActionMenu } from "../src/components/composite/data/ActionMenu";

function open() {
  return userEvent.setup();
}

describe("ActionMenu · 整页锁死回归", () => {
  /**
   * 审计报告里最贵的一条运行时缺陷，3.2.0 修的：
   *
   * Radix 的**模态** DropdownMenu 与模态 Dialog 各自往 <body> 挂
   * pointer-events: none。菜单项 onSelect 里开对话框时两者同拍竞争，对话框关闭
   * 后锁**残留**，整页从此点不动、只能刷新浏览器。type-check / lint / build
   * 三者全绿——当时只能靠真实鼠标事件复现。修法：菜单改 modal={false}。
   *
   * ⚠ **这条测试钉的是机制，不是症状。** 实测确认 jsdom **重现不了那个残留**：
   * 把 modal={false} 改回 modal 之后，走完「开菜单 → 开确认框 → 关确认框」全程，
   * body 的最终态仍然是干净的——真实故障依赖两个锁的竞争时序，而 jsdom 的同步
   * 事件派发把竞争抹平了。断言「关掉后 body 干净」在两个版本上都会绿，那种测试
   * 等于没测。
   *
   * 能稳定分辨两个版本的是**中间态**：模态菜单一打开就给 body 挂
   * data-scroll-locked，非模态的不挂。所以这里断言的是「菜单单独开着时不上锁」
   * ——不上锁就没有竞争，也就没有残留。谁把 modal={false} 改回去，这里会红。
   */
  it("菜单单独打开时不给 body 上锁——不上锁就没有竞争", async () => {
    const user = open();
    render(
      <ActionMenu
        items={[{ id: "edit", label: "编辑", onSelect: () => undefined }]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open actions menu" }));
    expect(
      await screen.findByRole("menuitem", { name: "编辑" }),
    ).toBeInTheDocument();

    expect(document.body).not.toHaveAttribute("data-scroll-locked");
    expect(document.body.style.pointerEvents).not.toBe("none");
  });

  it("确认框开着时该上锁，关掉后要还回去", async () => {
    const user = open();
    render(
      <ActionMenu
        items={[
          {
            id: "delete",
            label: "删除",
            danger: true,
            confirm: {
              verb: "Delete",
              target: "thing",
              consequence: "gone",
              onConfirm: () => undefined,
            },
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open actions menu" }));
    await user.click(await screen.findByRole("menuitem", { name: "删除" }));
    await screen.findByRole("alertdialog");

    // 模态对话框**应该**锁——它就是要让下层失效
    expect(document.body.style.pointerEvents).toBe("none");

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(document.body.style.pointerEvents).not.toBe("none");
  });
});

describe("ActionMenu · 契约行为", () => {
  it("danger 项点下去开的是确认框，不是直接落锤", async () => {
    const user = open();
    const onConfirm = vi.fn();
    render(
      <ActionMenu
        items={[
          {
            id: "delete",
            label: "删除",
            danger: true,
            confirm: {
              verb: "Delete",
              target: "service",
              consequence: "gone",
              onConfirm,
            },
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open actions menu" }));
    await user.click(await screen.findByRole("menuitem", { name: "删除" }));

    // 关键：确认框已开，而落锤**没有**被调用
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("confirmExempt 的 danger 项直接落锤，不弹框", async () => {
    const user = open();
    const onSelect = vi.fn();
    render(
      <ActionMenu
        items={[
          {
            id: "archive",
            label: "归档",
            danger: true,
            confirmExempt: "可从回收站还原",
            onSelect,
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open actions menu" }));
    await user.click(await screen.findByRole("menuitem", { name: "归档" }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});

/**
 * 下面两组测的是 9.3.0 的两项改动。两者都**没有 layout 可量**——jsdom 不排版，
 * 断言「对齐了」是做不到的。所以这里断言的是产生对齐的那个**结构**：槽位节点
 * 在不在。谁把 `reserveIconSlot` 摘掉，子节点数会从 2 掉回 1。
 */
describe("ActionMenu · 图标槽位", () => {
  async function openMenu() {
    const user = open();
    await user.click(screen.getByRole("button", { name: "Open actions menu" }));
  }

  it("菜单里只要有一项带图标，没图标的项也占一格", async () => {
    render(
      <ActionMenu
        items={[
          { id: "edit", label: "编辑", icon: "edit" },
          { id: "dup", label: "复制一份" },
        ]}
      />,
    );
    await openMenu();

    // 两项都是「槽位 + 标签」两个子节点。没有槽位时这里是 1，标签直接贴左边。
    expect(
      (await screen.findByRole("menuitem", { name: "编辑" })).children,
    ).toHaveLength(2);
    expect(
      screen.getByRole("menuitem", { name: "复制一份" }).children,
    ).toHaveLength(2);
  });

  it("整菜单都没图标时不留空位——纯文字菜单不该凭空缩进", async () => {
    render(
      <ActionMenu
        items={[
          { id: "a", label: "上移" },
          { id: "b", label: "下移" },
        ]}
      />,
    );
    await openMenu();

    expect(
      (await screen.findByRole("menuitem", { name: "上移" })).children,
    ).toHaveLength(1);
  });
});

describe("ActionMenu · 分组分隔线", () => {
  async function openWith(
    items: React.ComponentProps<typeof ActionMenu>["items"],
  ) {
    const user = open();
    render(<ActionMenu items={items} />);
    await user.click(screen.getByRole("button", { name: "Open actions menu" }));
    await screen.findByRole("menu");
    return screen.queryAllByRole("separator");
  }

  const del = {
    id: "del",
    label: "删除",
    danger: true,
    confirmExempt: "测试用",
  } as const;

  it("尾部的危险段自动与常规动作分开——调用方不必手写", async () => {
    expect(await openWith([{ id: "edit", label: "编辑" }, del])).toHaveLength(
      1,
    );
  });

  it("危险项散在中间不自动分隔——那是排序问题，逐项加线只会把菜单切碎", async () => {
    expect(
      await openWith([
        { id: "edit", label: "编辑" },
        { ...del, id: "d1" },
        { id: "view", label: "查看" },
      ]),
    ).toHaveLength(0);
  });

  it("整个菜单都是危险项时不分隔——没有常规段可分", async () => {
    expect(
      await openWith([
        { ...del, id: "d1" },
        { ...del, id: "d2" },
      ]),
    ).toHaveLength(0);
  });

  it("separatorBefore: false 压得住自动判断", async () => {
    expect(
      await openWith([
        { id: "edit", label: "编辑" },
        { ...del, separatorBefore: false },
      ]),
    ).toHaveLength(0);
  });

  it("既有调用方写的 true 与自动判断撞在一处时，只画一条", async () => {
    expect(
      await openWith([
        { id: "edit", label: "编辑" },
        { ...del, separatorBefore: true },
      ]),
    ).toHaveLength(1);
  });

  it("常规动作内部的分组仍归调用方——DS 推断不出「上移/下移」是一组", async () => {
    expect(
      await openWith([
        { id: "edit", label: "编辑" },
        { id: "up", label: "上移", separatorBefore: true },
        { id: "down", label: "下移" },
        del,
      ]),
    ).toHaveLength(2);
  });
});
