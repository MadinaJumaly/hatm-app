import { useEffect, useRef } from "preact/hooks";
import { juzPages } from "../../shared/juz.ts";
import { seatDisplayStatus } from "../../shared/progress.ts";
import { formatDeadline } from "../format.ts";
import {
  askRemoveMark,
  busy,
  cancelRemoveMark,
  cardMessage,
  cardStep,
  deadline,
  home,
  markRead,
  mySeat,
  removeMark,
  undoMark,
} from "../state/participant.ts";
import { texts } from "../texts.kk.ts";
import { ConfirmPanel } from "./ConfirmPanel.tsx";
import { CheckIcon } from "./Icons.tsx";
import { StatusChip } from "./StatusChip.tsx";

/** The participant's own juz and the «Оқыдым» flow (mockups 3 and 4, P-2…P-4). */
export function JuzCard() {
  const data = home.value;
  const seat = mySeat.value;
  const state = deadline.value;
  if (!data || !state) return null;
  if (!seat) {
    return (
      <section class="card">
        <p>{texts.noSeat}</p>
      </section>
    );
  }

  const pages = juzPages(seat.juz);
  const status = seatDisplayStatus(seat, state.kind === "overdue");
  const isRead = seat.status === "read";

  return (
    <section class="card juz" aria-labelledby="juz-title">
      <div class="juz__head">
        <h2 id="juz-title" class="juz__number">
          {texts.juzLabel(seat.juz)}
        </h2>
        <StatusChip status={status} large />
      </div>
      <div class="juz__pages">{texts.pages(pages.first, pages.last)}</div>
      <div class="juz__facts">
        <div class="fact">
          <div class="fact__label">{texts.deadline}</div>
          <div class="fact__value">{formatDeadline(data.round.deadlineDate)}</div>
        </div>
        <div class="fact">
          <div class="fact__label">{texts.left}</div>
          <div class="fact__value">
            {state.kind === "open"
              ? texts.daysLeft(state.daysLeft)
              : state.kind === "lastDay"
                ? texts.lastDay
                : texts.status.overdue}
          </div>
        </div>
      </div>
      <CardAction isRead={isRead} juz={seat.juz} />
    </section>
  );
}

function CardAction({ isRead, juz }: { isRead: boolean; juz: number }) {
  const step = cardStep.value;
  const message = cardMessage.value;
  const undoButton = useRef<HTMLButtonElement>(null);
  const markButton = useRef<HTMLButtonElement>(null);

  // Keep keyboard and screen-reader focus on the button that replaced the one just pressed.
  useEffect(() => {
    if (step === "undo") undoButton.current?.focus();
    else if (!isRead && document.activeElement === document.body) markButton.current?.focus();
  }, [step, isRead]);

  const error = message?.isError ? message.text : null;
  const live = (
    <div
      class={error ? "message message--error" : "visually-hidden"}
      role="status"
      aria-live="polite"
    >
      {message?.text ?? ""}
    </div>
  );

  if (isRead && step === "undo") {
    return (
      <div class="stack-8">
        <div class="undo">
          <div class="undo__text">
            <CheckIcon size={22} />
            {texts.marked}
          </div>
          <button
            type="button"
            class="button button--outline"
            ref={undoButton}
            onClick={() => void undoMark()}
            disabled={busy.value}
          >
            {texts.undo}
          </button>
        </div>
        <div class="hint">{texts.undoHint}</div>
        {live}
      </div>
    );
  }

  if (isRead && step === "confirmRemove") {
    return (
      <ConfirmPanel
        question={texts.removeQuestion}
        explain={texts.removeExplain(juz)}
        yes={texts.removeYes}
        no={texts.no}
        onYes={() => void removeMark()}
        onNo={cancelRemoveMark}
        disabled={busy.value}
        error={error}
      />
    );
  }

  if (isRead) {
    return (
      <div class="stack-10">
        <div class="thanks">{texts.thanks}</div>
        <button type="button" class="button button--secondary" onClick={askRemoveMark}>
          {texts.removeMark}
        </button>
        {live}
      </div>
    );
  }

  return (
    <div class="stack-8">
      <button
        type="button"
        class="button button--primary button--big"
        ref={markButton}
        onClick={() => void markRead()}
        disabled={busy.value}
        aria-busy={busy.value}
      >
        <CheckIcon size={24} />
        {texts.markRead}
      </button>
      {live}
    </div>
  );
}
