/**
 * 浮层落点挡位（owner 2026-09-22：「这个位置不能 DS 写死，影响面太大，应该可配置，
 * 默认右上角，支持业务平台传参定位」「弹窗的多个类型应该同理处理」）。
 *
 * 本文件守的是**改动的爆炸半径**：Toast 的默认落点是要换的（右下 → 右上），
 * 而 Dialog / AlertDialog 的 `center` 是既有默认值，一个像素都不能动。全站对话框
 * 都走这一档，换写法等于拿它们冒无谓的险——所以这里对 center 逐字断言原来那串
 * `left-[50%] top-[50%] + translate`。
 *
 * 位置类名改坏了不报错：页面照常渲染、快照照常过，只有人眼在某个分辨率下才看见
 * 面板跑偏。所以逐档断言，不靠肉眼。
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "../src/components/base/overlay/Dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from "../src/components/base/overlay/AlertDialog";
import {
  OVERLAY_POSITIONS,
  overlayAnchorClass,
  type OverlayPosition,
} from "../src/components/overlayPosition";

/** 改动前 Dialog / AlertDialog 写死的那一串，逐字抄在这里当基准。 */
const LEGACY_CENTER = [
  "left-[50%]",
  "top-[50%]",
  "translate-x-[-50%]",
  "translate-y-[-50%]",
];

function dialogAt(position?: OverlayPosition) {
  render(
    <Dialog open>
      <DialogContent {...(position ? { position } : {})}>
        <DialogTitle>标题</DialogTitle>
      </DialogContent>
    </Dialog>,
  );
  return screen.getByRole("dialog").className;
}

function alertAt(position?: OverlayPosition) {
  render(
    <AlertDialog open>
      <AlertDialogContent {...(position ? { position } : {})}>
        <AlertDialogTitle>标题</AlertDialogTitle>
      </AlertDialogContent>
    </AlertDialog>,
  );
  return screen.getByRole("alertdialog").className;
}

describe("Dialog / AlertDialog 的落点", () => {
  it.each([
    ["Dialog", dialogAt],
    ["AlertDialog", alertAt],
  ] as const)("%s 缺省仍是居中，且与改动前逐字相同", (_name, at) => {
    const cls = at();
    for (const token of LEGACY_CENTER) expect(cls).toContain(token);
  });

  it.each([
    ["Dialog", dialogAt],
    ["AlertDialog", alertAt],
  ] as const)("%s 传 top-right 时不再带居中的位移", (_name, at) => {
    const cls = at("top-right");
    expect(cls).toContain("right-lg");
    expect(cls).toContain("top-lg");
    /* 位移留着就会把面板顶出视口右上角——这是换挡最容易漏的一半。 */
    expect(cls).not.toContain("translate-x-[-50%]");
    expect(cls).not.toContain("translate-y-[-50%]");
  });

  it.each(OVERLAY_POSITIONS)("Dialog %s 档产出成套的落点类", (position) => {
    expect(dialogAt(position)).toContain(overlayAnchorClass[position]);
  });
});

describe("落点挡位表本身", () => {
  /*
   * Tailwind 扫的是源码文本：类名一旦被拼接就扫不到、产不出工具类，且**不报错**
   * （overlayWidth.ts 的那条警告）。这里挡的是「有人把表改成模板串」。
   */
  it("每一档都是完整字面量，不含插值痕迹", () => {
    for (const position of OVERLAY_POSITIONS) {
      const value = overlayAnchorClass[position];
      expect(value).not.toContain("${");
      expect(value.trim()).not.toBe("");
    }
  });

  it("七档齐全，没有重复的落点", () => {
    expect(OVERLAY_POSITIONS).toHaveLength(7);
    expect(new Set(Object.values(overlayAnchorClass)).size).toBe(7);
  });
});
