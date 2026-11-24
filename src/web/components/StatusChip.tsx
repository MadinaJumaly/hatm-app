import type { SeatDisplayStatus } from "../../shared/types.ts";
import { texts } from "../texts.kk.ts";
import { CheckIcon } from "./Icons.tsx";

/** A seat status as a chip: always text, plus a check icon for «Оқылды» (never colour alone). */
export function StatusChip({
  status,
  large = false,
}: {
  status: SeatDisplayStatus;
  large?: boolean;
}) {
  return (
    <span class={`chip chip--${status}${large ? " chip--large" : ""}`}>
      {status === "read" && <CheckIcon size={large ? 18 : 15} strokeWidth={large ? 2.5 : 3} />}
      {texts.status[status]}
    </span>
  );
}
