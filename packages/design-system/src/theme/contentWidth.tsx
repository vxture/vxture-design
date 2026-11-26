import {
  createContext,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export const CONTENT_WIDTH_LIMITS = {
  narrow: 1200,
  default: 1536,
  wide: 1920,
} as const;
export type ContentWidth = keyof typeof CONTENT_WIDTH_LIMITS;
export const CONTENT_WIDTH_STORAGE_KEY = "vx-content-width";
const changed = "vx:content-width";
const valid = (value: unknown): value is ContentWidth =>
  value === "narrow" || value === "default" || value === "wide";
type WidthContext = {
  value: ContentWidth;
  setValue: (value: ContentWidth) => void;
  limits: Record<ContentWidth, number>;
};
const Context = createContext<WidthContext | null>(null);

/** Controlled values outrank saved preference; limits and storage can be host-specific. */
export function ContentWidthProvider({
  children,
  value,
  onValueChange,
  defaultValue = "default",
  storageKey = CONTENT_WIDTH_STORAGE_KEY,
  limits,
}: {
  children: ReactNode;
  value?: ContentWidth;
  onValueChange?: (value: ContentWidth) => void;
  defaultValue?: ContentWidth;
  storageKey?: string;
  limits?: Partial<Record<ContentWidth, number>>;
}) {
  const [saved, setSaved] = useState(defaultValue);
  useEffect(() => {
    const update = () => {
      try {
        const next = localStorage.getItem(storageKey);
        setSaved(valid(next) ? next : defaultValue);
      } catch {
        /* Keep session preference when storage is unavailable. */
      }
    };
    update();
    const storage = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null) update();
    };
    const local = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.key === storageKey && valid(detail.value))
        setSaved(detail.value);
    };
    window.addEventListener("storage", storage);
    window.addEventListener(changed, local);
    return () => {
      window.removeEventListener("storage", storage);
      window.removeEventListener(changed, local);
    };
  }, [storageKey, defaultValue]);
  const resolved = { ...CONTENT_WIDTH_LIMITS } as Record<ContentWidth, number>;
  for (const key of Object.keys(resolved) as ContentWidth[]) {
    const next = limits?.[key];
    if (typeof next === "number" && Number.isFinite(next) && next > 0)
      resolved[key] = next;
  }
  return (
    <Context.Provider
      value={{
        value: value ?? saved,
        limits: resolved,
        setValue: (next) => {
          onValueChange?.(next);
          if (value !== undefined) return;
          setSaved(next);
          try {
            localStorage.setItem(storageKey, next);
          } catch {
            /* Session state remains usable. */
          }
          window.dispatchEvent(
            new CustomEvent(changed, {
              detail: { key: storageKey, value: next },
            }),
          );
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}

export function useContentWidth() {
  const context = useContext(Context);
  if (!context)
    throw new Error("useContentWidth requires ContentWidthProvider");
  return context;
}

/** Apply inside the center region; sidebars stay outside this width boundary. */
export function ContentWidthContainer({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const { value, limits } = useContentWidth();
  return (
    <div
      data-content-width={value}
      className={className}
      style={{
        width: "100%",
        maxWidth: limits[value],
        minWidth: 0,
        boxSizing: "border-box",
        marginInline: "auto",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function useOptionalContentWidth() {
  return useContext(Context);
}
