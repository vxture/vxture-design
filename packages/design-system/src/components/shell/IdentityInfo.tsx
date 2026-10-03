/**
 * IdentityInfo.tsx - 可嵌入列表、下拉选择与正文的租户/用户身份摘要。
 * @package @vxture/design-system
 * @layer Presentation
 * @category Components - Shell / Identity
 *
 * 这四个组件对应 05 · Component Groups 的 TenantInfo/UserInfo simple 与
 * oneline 语法。它们只表达身份的排版，不携带选择、导航或业务状态。
 */

import type { ReactNode } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Icon,
  UserAvatar,
  cn,
} from "@vxture/design-ui";
import type { IconName } from "@vxture/design-ui";

type IdentityInfoBaseProps = {
  className?: string | undefined;
};

export interface TenantInfoSimpleProps extends IdentityInfoBaseProps {
  name: ReactNode;
  tenantId?: ReactNode | undefined;
  icon?: IconName | undefined;
}

export interface TenantInfoOnelineProps extends IdentityInfoBaseProps {
  name: ReactNode;
  icon?: IconName | undefined;
  /** md 保留 Figma 的 24px 形态；sm 与 20px 正文行高对齐。 */
  size?: "sm" | "md" | undefined;
}

export interface UserInfoSimpleProps extends IdentityInfoBaseProps {
  name: ReactNode;
  phone?: ReactNode | undefined;
  avatarSrc?: string | null | undefined;
  avatarAlt?: string | undefined;
  avatarFallback?: ReactNode | undefined;
}

export interface UserInfoOnelineProps extends IdentityInfoBaseProps {
  name: ReactNode;
  avatarSrc?: string | null | undefined;
  avatarAlt?: string | undefined;
  avatarFallback?: ReactNode | undefined;
  /** md 保留 Figma 的 24px 形态；sm 与 20px 正文行高对齐。 */
  size?: "sm" | "md" | undefined;
}

const onelineSize = {
  sm: {
    root: "min-h-control-sm gap-2xs px-2xs",
    identity: "size-icon-sm",
  },
  md: {
    root: "h-control-md gap-xs px-xs",
    identity: "size-icon-lg",
  },
} as const;

function IdentityCopy({
  name,
  secondary,
  className,
}: Readonly<{
  name: ReactNode;
  secondary?: ReactNode | undefined;
  className?: string | undefined;
}>) {
  return (
    <span className={cn("flex min-w-0 flex-col gap-0", className)}>
      <span className="truncate text-label">{name}</span>
      {secondary !== undefined && secondary !== null ? (
        <span className="truncate text-label-micro font-normal text-muted-foreground">
          {secondary}
        </span>
      ) : null}
    </span>
  );
}

function TenantMark({
  icon,
  size,
}: Readonly<{ icon: IconName; size: "sm" | "md" }>) {
  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center text-muted-foreground",
        onelineSize[size].identity,
      )}
      aria-hidden="true"
    >
      <Icon name={icon} size={size === "sm" ? "sm" : "lg"} />
    </span>
  );
}

function UserMark({
  src,
  alt,
  fallback,
  size,
}: Readonly<{
  src?: string | null | undefined;
  alt?: string | undefined;
  fallback?: ReactNode | undefined;
  size: "sm" | "md";
}>) {
  if (fallback === undefined || fallback === null) {
    return (
      <UserAvatar
        className={cn("shrink-0", onelineSize[size].identity)}
        {...(src !== undefined ? { src } : {})}
        {...(alt !== undefined ? { alt } : {})}
      />
    );
  }

  return (
    <Avatar
      key={src ?? "__default__"}
      className={cn("shrink-0", onelineSize[size].identity)}
    >
      {src ? <AvatarImage src={src} alt={alt ?? ""} /> : null}
      <AvatarFallback delayMs={0} aria-label={alt ?? "User avatar"}>
        {fallback}
      </AvatarFallback>
    </Avatar>
  );
}

/** 两行租户摘要：24px 标识 + 名称 + 10px 租户 ID。 */
export function TenantInfoSimple({
  name,
  tenantId,
  icon = "buildings",
  className,
}: Readonly<TenantInfoSimpleProps>) {
  return (
    <span className={cn("flex min-w-0 items-center gap-xs px-xs", className)}>
      <TenantMark icon={icon} size="md" />
      <IdentityCopy name={name} secondary={tenantId} />
    </span>
  );
}

/** 单行租户摘要；sm 档默认与正文 20px 行高对齐，放大字体时随文字增长。 */
export function TenantInfoOneline({
  name,
  icon = "buildings",
  size = "md",
  className,
}: Readonly<TenantInfoOnelineProps>) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full min-w-0 items-center",
        onelineSize[size].root,
        className,
      )}
    >
      <TenantMark icon={icon} size={size} />
      <span className="min-w-0 truncate text-label">{name}</span>
    </span>
  );
}

/** 两行用户摘要：24px 头像 + 名称 + 10px 电话/副身份信息。 */
export function UserInfoSimple({
  name,
  phone,
  avatarSrc,
  avatarAlt,
  avatarFallback,
  className,
}: Readonly<UserInfoSimpleProps>) {
  return (
    <span className={cn("flex min-w-0 items-center gap-xs px-xs", className)}>
      <UserMark
        src={avatarSrc}
        alt={avatarAlt ?? (typeof name === "string" ? name : undefined)}
        fallback={avatarFallback}
        size="md"
      />
      <IdentityCopy name={name} secondary={phone} />
    </span>
  );
}

/** 单行用户摘要；sm 档默认与正文 20px 行高对齐，放大字体时随文字增长。 */
export function UserInfoOneline({
  name,
  avatarSrc,
  avatarAlt,
  avatarFallback,
  size = "md",
  className,
}: Readonly<UserInfoOnelineProps>) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full min-w-0 items-center",
        onelineSize[size].root,
        className,
      )}
    >
      <UserMark
        src={avatarSrc}
        alt={avatarAlt ?? (typeof name === "string" ? name : undefined)}
        fallback={avatarFallback}
        size={size}
      />
      <span className="min-w-0 truncate text-label">{name}</span>
    </span>
  );
}
