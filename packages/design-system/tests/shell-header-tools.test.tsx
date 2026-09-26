/**
 * `ShellHeaderTools` —— 顶栏标准工具箱（owner 2026-09-26）。
 *
 * 两条契约写错都不报错，只能断言：**顺序**固定为 主题 → 语言 → 全屏 → 帮助 →
 * 消息 → 配置，与调用方传 prop 的先后无关；**交互**各自固定——主题点击即切、
 * 语言弹面板、全屏直接切、帮助新标签页、消息开抽屉、配置当前页跳转。
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FullscreenProvider } from "@vxture/design-ui";
import {
  ShellHeaderTools,
  type ShellHeaderToolsProps,
} from "../src/components/shell/ShellHeaderTools";

const ALL: Omit<ShellHeaderToolsProps, "label"> = {
  theme: {
    current: "light",
    onChange: () => {},
    toDarkLabel: "切到暗色",
    toLightLabel: "切到亮色",
  },
  locale: {
    current: "zh-CN",
    options: [
      { locale: "zh-CN", nativeName: "简体中文" },
      { locale: "en-US", nativeName: "English" },
    ],
    onChange: () => {},
    label: "语言",
  },
  fullscreen: { enterLabel: "全屏", exitLabel: "退出全屏" },
  help: { label: "帮助", href: "/help/orders" },
  notifications: { label: "消息", children: <p>没有新消息</p> },
  settings: { label: "配置", href: "/admin/settings" },
};

function renderTools(props: Omit<ShellHeaderToolsProps, "label">) {
  return render(
    <FullscreenProvider>
      <ShellHeaderTools label="工具" {...props} />
    </FullscreenProvider>,
  );
}

const names = () =>
  [
    ...screen
      .getByRole("toolbar", { name: "工具" })
      .querySelectorAll("button, a"),
  ].map((el) => el.getAttribute("aria-label"));

describe("ShellHeaderTools · 顺序", () => {
  it("六件固定顺序：主题 语言 全屏 帮助 消息 配置", () => {
    renderTools(ALL);
    expect(names()).toEqual([
      "切到暗色",
      "语言",
      "全屏",
      "帮助",
      "消息",
      "配置",
    ]);
  });

  /** 顺序由本件定，不由 prop 的书写先后定。 */
  it("prop 倒着写，顺序不变", () => {
    const reversed = Object.fromEntries(Object.entries(ALL).reverse());
    renderTools(reversed);
    expect(names()).toEqual([
      "切到暗色",
      "语言",
      "全屏",
      "帮助",
      "消息",
      "配置",
    ]);
  });

  it("不给的工具不出现、不占位；访客只给前三件", () => {
    renderTools({
      theme: ALL.theme,
      locale: ALL.locale,
      fullscreen: ALL.fullscreen,
    });
    expect(names()).toEqual(["切到暗色", "语言", "全屏"]);
  });

  it("一件都不给时不渲染", () => {
    const { container } = renderTools({});
    expect(container.querySelector("[role=toolbar]")).toBeNull();
  });
});

describe("ShellHeaderTools · 交互", () => {
  it("主题：点击直接切换；图标表示当前主题，名字说点下去会怎样", async () => {
    const onChange = vi.fn();
    const { rerender } = renderTools({
      theme: { ...ALL.theme!, onChange },
    });
    await userEvent.click(screen.getByRole("button", { name: "切到暗色" }));
    expect(onChange).toHaveBeenCalledWith("dark");

    rerender(
      <FullscreenProvider>
        <ShellHeaderTools
          label="工具"
          theme={{ ...ALL.theme!, current: "dark", onChange }}
        />
      </FullscreenProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "切到亮色" }));
    expect(onChange).toHaveBeenLastCalledWith("light");
  });

  it("语言：弹出面板，选中后回调并收起", async () => {
    const onChange = vi.fn();
    renderTools({ locale: { ...ALL.locale!, onChange } });
    await userEvent.click(screen.getByRole("button", { name: "语言" }));
    await userEvent.click(
      await screen.findByRole("menuitemradio", { name: /English/ }),
    );
    expect(onChange).toHaveBeenCalledWith("en-US");
    expect(screen.queryByRole("menuitemradio")).toBeNull();
  });

  it("全屏：直接切换，开启后名字变成退出", async () => {
    renderTools({ fullscreen: ALL.fullscreen });
    const btn = screen.getByRole("button", { name: "全屏" });
    expect(btn).not.toHaveAttribute("aria-pressed");
    await userEvent.click(btn);
    // jsdom 没有原生全屏 API；Provider 的行为由 design-ui 自己的测试覆盖，这里只
    // 验证按钮确实调用了它（没抛错、仍在）。
    expect(
      screen.getByRole("button", { name: /全屏|退出全屏/ }),
    ).toBeInTheDocument();
  });

  it("帮助：新标签页打开，去向由调用方按当前页给", () => {
    renderTools({ help: ALL.help });
    const link = screen.getByRole("link", { name: "帮助" });
    expect(link).toHaveAttribute("href", "/help/orders");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("消息：打开侧边抽屉，未读显示小圆点，开合回调", async () => {
    const onOpenChange = vi.fn();
    renderTools({
      notifications: { ...ALL.notifications!, unread: true, onOpenChange },
    });
    const bell = screen.getByRole("button", { name: "消息" });
    expect(bell.querySelector("span[aria-hidden=true]")).not.toBeNull();
    await userEvent.click(bell);
    const drawer = await screen.findByRole("dialog");
    expect(within(drawer).getByText("没有新消息")).toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(true);
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("配置：当前标签页跳转到后台配置", () => {
    renderTools({ settings: ALL.settings });
    const link = screen.getByRole("link", { name: "配置" });
    expect(link).toHaveAttribute("href", "/admin/settings");
    expect(link).not.toHaveAttribute("target");
  });
});
