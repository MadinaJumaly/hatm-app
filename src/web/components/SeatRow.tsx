import { seatDisplayStatus } from "../../shared/progress.ts";
import { deadline, home, seat } from "../state/participant.ts";
import { texts } from "../texts.kk.ts";
import { StatusChip } from "./StatusChip.tsx";

/** One row of «Барлық паралар». Reads only its own seat signal, so it re-renders alone. */
export function SeatRow({ id }: { id: number }) {
  const value = seat(id)?.value;
  if (!value) return null;
  const status = seatDisplayStatus(value, deadline.value?.kind === "overdue");
  const isMe = value.memberId !== null && value.memberId === home.value?.me.memberId;

  return (
    <li class={`seat${isMe ? " seat--me" : ""}`}>
      <span class={`seat__juz${status === "read" ? " seat__juz--read" : ""}`}>{value.juz}</span>
      <span class={`seat__name${value.name === null ? " seat__name--free" : ""}`}>
        {value.name ?? texts.nobody}
        {isMe && <span class="seat__you">{texts.you}</span>}
      </span>
      <StatusChip status={status} />
    </li>
  );
}
