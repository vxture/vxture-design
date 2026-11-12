/**
 * Structured phone display; parsing and normalization belong to the caller.
 * @package @vxture/design-ui
 * @layer Presentation
 * @category component
 * @author AI-Generated
 * @date 2026-11-12
 */
import { cn } from "../../../utils/cn";

export interface PhoneNumberProps {
  callingCode?: string | undefined;
  number: string;
  className?: string | undefined;
}

/** Keep the country code visually secondary without masking or rewriting data. */
export function PhoneNumber({
  callingCode,
  number,
  className,
}: PhoneNumberProps) {
  return (
    <span
      dir="ltr"
      data-slot="phone-number"
      className={cn("inline whitespace-nowrap tabular-nums", className)}
    >
      {callingCode ? (
        <>
          <span className="text-muted-foreground">{callingCode}</span>{" "}
        </>
      ) : null}
      <span className="text-foreground">{number}</span>
    </span>
  );
}
