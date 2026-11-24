import { deadlineState } from "../../../shared/dates.ts";
import { texts } from "../../texts.kk.ts";

/** "4 күн қалды" / «Бүгін соңғы күн» / «Мерзімі өтті» / «Хатм аяқталды». */
export function deadlineText(deadline: string, today: string, finished: boolean): string {
  if (finished) return texts.finished;
  const state = deadlineState(deadline, today);
  if (state.kind === "open") return texts.org.daysLeft(state.daysLeft);
  return state.kind === "lastDay" ? texts.lastDay : texts.status.overdue;
}
