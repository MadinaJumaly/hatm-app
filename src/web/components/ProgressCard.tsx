import { formatUpdatedAt } from "../format.ts";
import { groupProgress, refresh, refreshing, updatedAt } from "../state/participant.ts";
import { texts } from "../texts.kk.ts";
import { RefreshIcon } from "./Icons.tsx";

/** "X / 30 оқылды", the bar, and «Жаңарту» (P-5, BR-6). */
export function ProgressCard() {
  const { read, total, finished } = groupProgress.value;
  const percent = Math.round((read / total) * 100);
  const time = updatedAt.value;

  return (
    <section class="card stack-12" aria-labelledby="progress-title">
      <div class="row-between">
        <h2 id="progress-title" class="card__title">
          {texts.progress}
        </h2>
        <button
          type="button"
          class="button button--small"
          onClick={() => void refresh()}
          disabled={refreshing.value}
          aria-busy={refreshing.value}
        >
          <RefreshIcon />
          {refreshing.value ? texts.refreshing : texts.refresh}
        </button>
      </div>
      <div>
        <b class="progress__count">{read}</b> {texts.readOf}
      </div>
      <div
        class="bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={read}
        aria-label={texts.progress}
      >
        {/* The only inline style: a dynamic width, set as an object (CSP-safe, design §I). */}
        <div class="bar__fill" style={{ width: `${String(percent)}%` }} />
      </div>
      {finished && <div class="thanks">{texts.finished}</div>}
      {time && (
        <div class="hint hint--small">{texts.updatedAt(formatUpdatedAt(time, new Date()))}</div>
      )}
    </section>
  );
}
