/**
 * 浮层族的**条目层**：`DropdownMenu` 与 `ContextMenu` 的
 * checkbox / radio / label / inset / 子菜单 / 宽度挡。
 *
 * 第一批只测了「右键才开、左键不开」——**开合是两件的唯一差别**，其余逐类相同。
 * 条目族才是这两件真正共享的那一半，也是剩下 16 条未覆盖分支的所在。
 *
 * 两件一起测，是因为它们的条目实现**逐类相同**：外观分叉没有任何理由（见件的
 * 头注）。一起测的副作用是：哪天有人只改了其中一件，这里会立刻不对称。
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../src/components/base/overlay/DropdownMenu";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "../src/components/base/overlay/ContextMenu";
import { OVERLAY_WIDTHS } from "../src/components/overlayWidth";

const openMenu = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "打开" }));
  await screen.findByRole("menu");
  return user;
};

/* ── 勾选条目 ─────────────────────────────────────────────────────────────── */

describe("DropdownMenu · 勾选条目", () => {
  function Menu({ checked }: { checked?: boolean }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem
            {...(checked !== undefined ? { checked } : {})}
          >
            显示已归档
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  /**
   * 勾选态要**读得出来**：`menuitemcheckbox` 角色 + `aria-checked`。
   * 只画一个勾而不给角色，读屏器只会念出一条普通菜单项，用户不知道它是开关。
   */
  it("是 menuitemcheckbox，勾选态读得出来", async () => {
    render(<Menu checked />);
    await openMenu();
    const item = screen.getByRole("menuitemcheckbox", { name: /显示已归档/ });
    expect(item).toHaveAttribute("aria-checked", "true");
  });

  it("未勾选时 aria-checked 是 false", async () => {
    render(<Menu checked={false} />);
    await openMenu();
    expect(
      screen.getByRole("menuitemcheckbox", { name: /显示已归档/ }),
    ).toHaveAttribute("aria-checked", "false");
  });

  /** 勾只在勾选态出现——`ItemIndicator` 是 Radix 按状态渲染的。 */
  it("勾只在勾选态出现", async () => {
    const on = render(<Menu checked />);
    await openMenu();
    const withCheck = screen
      .getByRole("menuitemcheckbox")
      .querySelectorAll("svg").length;
    on.unmount();

    render(<Menu checked={false} />);
    await openMenu();
    const withoutCheck = screen
      .getByRole("menuitemcheckbox")
      .querySelectorAll("svg").length;

    expect(withCheck).toBeGreaterThan(withoutCheck);
  });

  it("点一下回传新状态", async () => {
    const onCheckedChange = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem
            checked={false}
            onCheckedChange={onCheckedChange}
          >
            显示已归档
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const user = await openMenu();
    await user.click(screen.getByRole("menuitemcheckbox"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});

/* ── 单选条目 ─────────────────────────────────────────────────────────────── */

describe("DropdownMenu · 单选条目", () => {
  function Menu({ value }: { value: string }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value={value}>
            <DropdownMenuRadioItem value="asc">升序</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="desc">降序</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  /** `menuitemradio` + `aria-checked`：一组里只有一个为真。 */
  it("同组里只有一个是选中的", async () => {
    render(<Menu value="desc" />);
    await openMenu();
    expect(screen.getByRole("menuitemradio", { name: /降序/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("menuitemradio", { name: /升序/ })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("点另一项回传它的值", async () => {
    const onValueChange = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="asc" onValueChange={onValueChange}>
            <DropdownMenuRadioItem value="asc">升序</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="desc">降序</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const user = await openMenu();
    await user.click(screen.getByRole("menuitemradio", { name: /降序/ }));
    expect(onValueChange).toHaveBeenCalledWith("desc");
  });
});

/* ── inset ────────────────────────────────────────────────────────────────── */

describe("菜单 · inset 让没有记号的条目与有记号的对齐", () => {
  /**
   * 一个菜单里混着勾选项与普通项时，普通项的文字要和勾选项的文字**对齐**——
   * 否则勾选项的文字被勾推右一截，同一列文字长出两个左边界。
   * `inset` 就是给普通项补上那一格的宽度。
   */
  it.each([
    ["条目", DropdownMenuItem],
    ["分组标题", DropdownMenuLabel],
  ] as const)("%s 的 inset 补一格左内距", async (_name, Comp) => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <Comp inset>缩进的</Comp>
          <Comp>不缩进的</Comp>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await openMenu();
    expect(screen.getByText("缩进的").className).toContain("pl-2xl");
    expect(screen.getByText("不缩进的").className).not.toContain("pl-2xl");
  });

  it("ContextMenu 的 inset 与 DropdownMenu 一致", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu>
        <ContextMenuTrigger>右键这里</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel inset>缩进的标题</ContextMenuLabel>
          <ContextMenuItem inset>缩进的项</ContextMenuItem>
          <ContextMenuItem>不缩进的项</ContextMenuItem>
          {/* 子菜单触发器是三处 inset 里最容易漏的一处——两侧都要测，
              否则只改坏一件时另一件的用例接不住（见本文件头注）。 */}
          <ContextMenuSub>
            <ContextMenuSubTrigger inset>缩进的触发器</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuItem>子项</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>,
    );
    await user.pointer({
      keys: "[MouseRight]",
      target: screen.getByText("右键这里"),
    });
    await screen.findByRole("menu");
    expect(screen.getByText("缩进的标题").className).toContain("pl-2xl");
    expect(screen.getByText("缩进的项").className).toContain("pl-2xl");
    expect(screen.getByText("不缩进的项").className).not.toContain("pl-2xl");
    expect(
      screen.getByRole("menuitem", { name: "缩进的触发器" }).className,
    ).toContain("pl-2xl");
  });
});

/* ── 宽度挡 ───────────────────────────────────────────────────────────────── */

describe("菜单 · 宽度是下限不是定宽", () => {
  /**
   * 菜单类浮层用**下限**：挡位是起点，内容更宽就撑开。下拉项的文字长度不可预知，
   * 钉死宽度会截断——而截断的是命令名，用户读不出这一项是干什么的。
   */
  it.each(OVERLAY_WIDTHS)("width=%s 落成 min-w 而不是 w", async (w) => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent width={w}>
          <DropdownMenuItem>一项</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await openMenu();
    const menu = screen.getByRole("menu");
    expect(menu.className).toContain(`min-w-overlay-${w}`);
  });

  it("不给 width 时是 xs", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>一项</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await openMenu();
    expect(screen.getByRole("menu").className).toContain("min-w-overlay-xs");
  });
});

/* ── 子菜单 ───────────────────────────────────────────────────────────────── */

describe("菜单 · 子菜单", () => {
  function Menu() {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>直接项</DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>移动到</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>归档区</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  /** 子菜单触发器要标出「还有下一层」，否则和普通项长得一样、点了却不执行。 */
  it("子菜单触发器带 haspopup 与展开态", async () => {
    render(<Menu />);
    await openMenu();
    const trigger = screen.getByRole("menuitem", { name: /移动到/ });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("子菜单初始不在 DOM 里", async () => {
    render(<Menu />);
    await openMenu();
    expect(screen.queryByText("归档区")).not.toBeInTheDocument();
  });

  it("按右箭头展开子菜单", async () => {
    render(<Menu />);
    const user = await openMenu();
    const trigger = screen.getByRole("menuitem", { name: /移动到/ });
    trigger.focus();
    await user.keyboard("{ArrowRight}");
    expect(await screen.findByText("归档区")).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  /**
   * **子菜单触发器也有 inset**，而且它是三处 inset 里最容易漏的一处——
   * 写用例时只想得到「条目」和「分组标题」，触发器长得像条目就假定它一样。
   * 这一条是变异测试逼出来的：删掉 SubTrigger 的 inset 不变红。
   */
  it("子菜单触发器的 inset 补一格左内距", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger inset>缩进的触发器</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>子项</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>不缩进的触发器</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>子项</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await openMenu();
    expect(
      screen.getByRole("menuitem", { name: "缩进的触发器" }).className,
    ).toContain("pl-2xl");
    expect(
      screen.getByRole("menuitem", { name: "不缩进的触发器" }).className,
    ).not.toContain("pl-2xl");
  });

  /** 子菜单自己也有宽度挡，缺省同主菜单是 xs。 */
  it("子菜单的宽度挡独立，缺省 xs", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent width="lg">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>移动到</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>归档区</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const user = await openMenu();
    const trigger = screen.getByRole("menuitem", { name: /移动到/ });
    trigger.focus();
    await user.keyboard("{ArrowRight}");
    await screen.findByText("归档区");

    // ⚠ 子菜单**嵌在主菜单的 DOM 子树里**，按 includes 找会先命中主菜单
    // （它的 textContent 把子项也算进去了）。按精确文本认那一层。
    const subMenu = screen
      .getAllByRole("menu")
      .find((m) => m.textContent === "归档区")!;
    expect(subMenu.className).toContain("min-w-overlay-xs");
    // 主菜单那一档不会传染给子菜单
    expect(subMenu.className).not.toContain("min-w-overlay-lg");
  });

  it("子菜单的宽度挡可单独指定", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>移动到</DropdownMenuSubTrigger>
            <DropdownMenuSubContent width="md">
              <DropdownMenuItem>归档区</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    const user = await openMenu();
    const trigger = screen.getByRole("menuitem", { name: /移动到/ });
    trigger.focus();
    await user.keyboard("{ArrowRight}");
    await screen.findByText("归档区");

    const subMenu = screen
      .getAllByRole("menu")
      .find((m) => m.textContent === "归档区")!;
    expect(subMenu.className).toContain("min-w-overlay-md");
  });
});

/* ── 分隔线与快捷键 ───────────────────────────────────────────────────────── */

describe("菜单 · 分隔线与快捷键都是装饰", () => {
  it("分隔线不占一个菜单项", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>甲</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>乙</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await openMenu();
    expect(screen.getAllByRole("menuitem")).toHaveLength(2);
  });

  /**
   * 快捷键提示是**贴在条目上的说明**，不是独立条目。它要跟着条目的可访问名
   * 一起被念出来，而不是自成一行。
   */
  it("快捷键跟着条目念，不自成一项", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            删除
            <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await openMenu();
    expect(screen.getAllByRole("menuitem")).toHaveLength(1);
    expect(
      screen.getByRole("menuitem", { name: /删除/ }).textContent,
    ).toContain("⌘⌫");
  });
});

/* ── 两件的条目实现必须一致 ───────────────────────────────────────────────── */

describe("两件的条目实现逐类相同", () => {
  /**
   * 两件只差触发方式（右键 vs 点击），**外观分叉没有任何理由**（见件的头注）。
   * 这一条比对同名条目的类名——哪天有人只改了其中一件，这里立刻不对称。
   */
  it("勾选条目的类名两件一致", async () => {
    const a = render(
      <DropdownMenu>
        <DropdownMenuTrigger>打开</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuCheckboxItem checked>甲</DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    await openMenu();
    const dropdownCls = screen.getByRole("menuitemcheckbox").className;
    a.unmount();

    const user = userEvent.setup();
    render(
      <ContextMenu>
        <ContextMenuTrigger>右键这里</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuCheckboxItem checked>甲</ContextMenuCheckboxItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    await user.pointer({
      keys: "[MouseRight]",
      target: screen.getByText("右键这里"),
    });
    await screen.findByRole("menu");
    expect(screen.getByRole("menuitemcheckbox").className).toBe(dropdownCls);
  });
});
