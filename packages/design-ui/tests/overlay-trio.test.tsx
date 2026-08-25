/**
 * Dialog / AlertDialog / Popover / Tooltip：浮层族的分工。
 *
 * 03 §1 把容器的分工写成了契约。**分工写在散文里，就只对读过那一页的人生效**
 * ——而这一族里最容易被抹平的恰是「谁能随手关掉」这一条。
 */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../src/components/base/overlay/Dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../src/components/base/overlay/AlertDialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../src/components/base/overlay/Popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TOOLTIP_VARIANTS,
} from "../src/components/base/overlay/Tooltip";

function openDialog(onOpenChange = vi.fn()) {
  render(
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑通道</DialogTitle>
        </DialogHeader>
        正文
      </DialogContent>
    </Dialog>,
  );
  return onOpenChange;
}

function openAlert(onOpenChange = vi.fn()) {
  render(
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确定要删除吗？</AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction>删除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>,
  );
  return onOpenChange;
}

describe("Dialog vs AlertDialog · 谁能随手关掉", () => {
  /**
   * 03 §1：Dialog 是**可以随手关掉的容器**，AlertDialog **强制二选一**。
   * 三处差别，缺一条这个分工就名存实亡。
   */
  it("Dialog 有 X 关闭钮，AlertDialog 没有", () => {
    const { unmount } = render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>t</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
    unmount();

    openAlert();
    expect(
      screen.queryByRole("button", { name: "Close" }),
    ).not.toBeInTheDocument();
  });

  /**
   * ⚠ **Esc 两个都关得掉**，这是有意的：没有键盘出路的模态是键盘陷阱，读屏与
   * 纯键盘用户会被锁死在里面。「要求表态」靠的是拿掉随手可点的出口，不是堵死
   * 所有出口。
   *
   * AlertDialog 的头注原先写着「Esc 与点遮罩也不关」——错了一半，2026-08-26 写
   * 这一批测试时实测出来，文档已更正。
   */
  it("Esc 两个都关得掉——键盘出路不能堵", async () => {
    const user = userEvent.setup();
    const onDialog = openDialog();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(onDialog).toHaveBeenCalledWith(false));
    cleanup();

    const onAlert = openAlert();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(onAlert).toHaveBeenCalledWith(false));
  });

  /** 真正把两者分开的是这一条：误点遮罩不该等于放弃。 */
  it("点遮罩：Dialog 关，AlertDialog 不关", async () => {
    const user = userEvent.setup();
    const onDialog = openDialog();
    const dialogOverlay = document.querySelector(".fixed.inset-0");
    if (dialogOverlay) await user.click(dialogOverlay as HTMLElement);
    expect(onDialog).toHaveBeenCalled();
    cleanup();

    const onAlert = openAlert();
    const alertOverlay = document.querySelector(".fixed.inset-0");
    if (alertOverlay) await user.click(alertOverlay as HTMLElement);
    expect(onAlert).not.toHaveBeenCalled();
  });

  it("两者的 role 不同：读屏也要能分出强度", () => {
    const { unmount } = render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>t</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    unmount();
    openAlert();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
});

describe("Popover · 受控与外点关闭", () => {
  it("受控 open 时件自己不改开合", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <Popover open onOpenChange={onOpenChange}>
        <PopoverTrigger>触发</PopoverTrigger>
        <PopoverContent>气泡内容</PopoverContent>
      </Popover>,
    );
    expect(screen.getByText("气泡内容")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    // 外部没把 open 传回来，内容不许自己消失
    expect(screen.getByText("气泡内容")).toBeInTheDocument();
  });
});

describe("Tooltip · 三档变体是 DS 既有公开 API", () => {
  /**
   * shadcn 无此变体。三档由 cva 承载，**不新增档位**——所以这条钉的是
   * 「档位数量与名字不变」：TOOLTIP_VARIANTS 是运行时数组，加档要有意为之。
   */
  it("档位就是三个，且各自渲染得出", async () => {
    expect([...TOOLTIP_VARIANTS]).toEqual(["default", "surface", "soft"]);
    for (const variant of TOOLTIP_VARIANTS) {
      const { unmount } = render(
        <TooltipProvider>
          <Tooltip open>
            <TooltipTrigger>触发</TooltipTrigger>
            <TooltipContent variant={variant}>提示 {variant}</TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );
      expect(await screen.findAllByText(`提示 ${variant}`)).not.toHaveLength(0);
      unmount();
    }
  });
});
