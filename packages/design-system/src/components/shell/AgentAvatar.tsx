"use client";

import { useEffect, useState } from "react";
import { cn } from "@vxture/design-ui";
import { agentStaticSrc, agentAnimatedSrc } from "./agent-assets";

export type AgentAvatarSize = "sm" | "md" | "lg" | "xl";
export interface AgentAvatarProps {
  size?: AgentAvatarSize;
  /** Only actual background execution should set this flag. */
  running?: boolean;
  staticSrc?: string | undefined;
  animatedSrc?: string | undefined;
  alt?: string;
  className?: string;
}

const sizes = { sm: 16, md: 20, lg: 24, xl: 32 } as const;
const sizeClasses = {
  sm: "size-icon-sm",
  md: "size-icon-md",
  lg: "size-icon-lg",
  xl: "size-icon-xl",
} as const;

/** Shared agent identity, static by default and safe during SSR and reduced motion. */
export function AgentAvatar({
  size = "lg",
  running = false,
  staticSrc = agentStaticSrc,
  animatedSrc = agentAnimatedSrc,
  alt = "",
  className,
}: AgentAvatarProps) {
  const [motionAllowed, setMotionAllowed] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionAllowed(!preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  const animated = running && motionAllowed;
  return (
    <img
      src={animated ? animatedSrc : staticSrc}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      width={sizes[size]}
      height={sizes[size]}
      draggable={false}
      data-agent-state={animated ? "running" : "idle"}
      className={cn(
        "inline-block shrink-0 object-contain",
        sizeClasses[size],
        className,
      )}
    />
  );
}
