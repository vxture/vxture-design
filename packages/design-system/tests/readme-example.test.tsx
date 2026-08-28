/**
 * README 里那段 Root Layout 示例，必须真的编得过、渲染得出来。
 *
 * ── 补的是哪个盲区 ──
 * 随包发布的 README 是消费方装完之后第一个照抄的东西，而**它不进任何编译**。
 * 实测代价：那段示例写的是 `defaultTheme="system"`，而 `ThemeProvider` 的 prop
 * 一直叫 `defaultMode`——照抄的人会拿到一个类型错误，然后开始怀疑是自己的接法
 * 不对。这个错在 README 里躺了两个多月，期间包发了十几个版本。
 *
 * 本用例只钉**接口面**：prop 名存在、类型对得上、两个 provider 能嵌套渲染。
 * 它不复刻 README 的文字（那样只会多一处要同步的副本），钉的是那段代码里唯一
 * 会悄悄失效的部分——**名字**。`tests` 已纳入 type-check，所以 prop 改名会在
 * 这里直接编译失败。
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FullscreenProvider } from "@vxture/design-ui";
import { ThemeProvider } from "../src/theme/ThemeProvider";

describe("README · Root Layout 示例", () => {
  it("照抄能跑：ThemeProvider + FullscreenProvider 嵌套", () => {
    render(
      <ThemeProvider defaultMode="system" defaultDensity="default">
        <FullscreenProvider>
          <span>内容</span>
        </FullscreenProvider>
      </ThemeProvider>,
    );

    // 不断言 container.textContent —— ThemeProvider 会内联渲染主题引导脚本，
    // 那段源码也在 textContent 里。要断言的是「孩子确实挂上了」。
    expect(screen.getByText("内容")).toBeInTheDocument();
  });

  /**
   * 三个档位名也是照抄的对象。写错不会报错——`defaultMode` 收的是联合类型里的
   * 字面量，传个不在集合里的值 TS 会拦；但**档位名本身改掉**（比如 default →
   * normal）不会有人发现 README 还写着旧的。
   */
  it("示例里用到的档位名都还在", () => {
    render(
      <ThemeProvider defaultMode="light" defaultDensity="compact">
        <span>a</span>
      </ThemeProvider>,
    );
    expect(screen.getByText("a")).toBeInTheDocument();
  });
});
