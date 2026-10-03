import { describe, expect, it } from "vitest";
import { badgeVariants } from "../src/components/base/display/Badge";
import {
  BUTTON_SIZES,
  type ButtonSize,
} from "../src/components/base/form/Button/Button.types";
import { buttonVariants } from "../src/components/base/form/Button/Button";
import { toggleVariants } from "../src/components/base/form/Toggle";

const SIZES = [
  ["xs", "text-label-micro", "size-icon-xs"],
  ["sm", "text-label-small", "size-icon-xs"],
  ["md", "text-label-small", "size-icon-sm"],
  ["lg", "text-label", "size-icon-sm"],
  ["xl", "text-label", "size-icon-sm"],
] as const;

describe("单行控件 size 契约", () => {
  it.each(SIZES)(
    "%s：Button / Toggle / Badge 同高、同字号、同图标",
    (size, text, icon) => {
      const classes = [
        buttonVariants({ size }),
        toggleVariants({ size }),
        badgeVariants({ size }),
      ];

      for (const className of classes) {
        expect(className).toContain(`h-control-${size}`);
        expect(className).toContain(text);
        expect(className).toContain(icon);
      }
    },
  );

  it("通用 Button 只开放 xs–xl 与对应图标档", () => {
    const expected: ButtonSize[] = SIZES.flatMap(([size]) => [
      size,
      `icon-${size}` as ButtonSize,
    ]);
    expect(new Set(BUTTON_SIZES)).toEqual(new Set(expected));
    expect(BUTTON_SIZES).not.toContain("2xl" as ButtonSize);
    expect(BUTTON_SIZES).not.toContain("3xl" as ButtonSize);
  });
});
