"use client";

/**
 * kit.tsx - 预览面自己的骨架件。
 * @package @vxture/design-preview
 *
 * ⚠ 这里的东西**不是设计系统的一部分**，只服务于这张预览页：分组标题、示例行、
 *   模式轴开关。它们刻意只用 DS 已有的件与工具类拼，不引入任何新样式来源——预览面
 *   一旦有自己的皮，看到的就不再是 DS 的真实产出了。
 *
 * 标题阶梯同样**直接用 DS 的结构件**（owner 2026-09-26：预览面的标题各写各的，
 * 页标题用了营销页的展示体、分组与条目两个 h2 字号倒挂）。预览面自己就是 DS
 * 标题阶梯的第一个消费方：
 *
 *   页（大类）   ViewHeader          level 1 · h1 · heading-3
 *   分组 / 基础  Section level 2     h2 · title-lg
 *   条目（组件） Section level 3     h3 · title-md
 *   示例行说明   Row label           不是标题，label-sm 弱化色
 */

import * as React from "react";
import { Section as DsSection } from "@vxture/design-system";

export const DENSITIES = ["compact", "default", "comfortable"] as const;
export const FONT_SIZES = ["small", "default", "large"] as const;

export type Density = (typeof DENSITIES)[number];
export type FontSize = (typeof FONT_SIZES)[number];

/** 密度与字号不是 provider，是 html 上的一个类——和产品运行时的机制一致。 */
export function useRootClass(
  prefix: string,
  value: string,
  all: readonly string[],
) {
  React.useEffect(() => {
    const root = document.documentElement;
    all.forEach((v) => root.classList.remove(`${prefix}${v}`));
    root.classList.add(`${prefix}${value}`);
  }, [all, prefix, value]);
}

export interface SectionProps {
  readonly id?: string;
  readonly title: string;
  /** 2：分组 / 基础页的板块；3（缺省）：一个组件条目。数字即 h 的数字。 */
  readonly level?: 2 | 3;
  readonly note?: React.ReactNode;
  readonly children: React.ReactNode;
}

/**
 * DS `Section` 加一个锚点 id（侧栏跳转用）。子项间距按层级给：分组之内是一条条
 * 组件，隔得开些（gap-xl）；条目之内是一行行示例（gap-lg）。
 */
export function Section({
  id,
  title,
  level = 3,
  note,
  children,
}: SectionProps) {
  return (
    <DsSection
      {...(id ? { id } : {})}
      level={level}
      title={title}
      description={note}
      className="scroll-mt-xl"
    >
      <div
        className={
          level === 2 ? "flex flex-col gap-xl" : "flex flex-col gap-lg"
        }
      >
        {children}
      </div>
    </DsSection>
  );
}

export interface RowProps {
  readonly label?: string;
  readonly stack?: boolean;
  readonly children: React.ReactNode;
}

/** 一条示例。label 说明这一行在验证什么，不写就是纯展示。 */
export function Row({ label, stack = false, children }: RowProps) {
  return (
    <div className="flex flex-col gap-xs">
      {label ? (
        <span className="text-label-sm text-muted-foreground">{label}</span>
      ) : null}
      <div
        className={
          stack
            ? "flex flex-col items-start gap-sm"
            : "flex flex-wrap items-center gap-sm"
        }
      >
        {children}
      </div>
    </div>
  );
}

/** 待重写组件的警示条。这些件还挂着已退役的类名，渲染无样式是预期内的。 */
export function PendingNote() {
  return (
    <p className="rounded-md border border-warning-border bg-warning-muted px-sm py-xs text-body-sm text-warning-text">
      以下组件尚未重写，仍依赖已退役的遗留类名——
      <strong>渲染无样式是预期结果</strong>， 它们的存在是为了让重写进度可见。
    </p>
  );
}
