import { useEffect } from "preact/hooks";
import { ActionSheet } from "../../components/ActionSheet.tsx";
import { CopyLink } from "../../components/CopyLink.tsx";
import { BackIcon } from "../../components/Icons.tsx";
import { formatDeadline } from "../../format.ts";
import { navigate } from "../../router.ts";
import {
  displayStatus,
  group,
  groupProgress,
  loadGroup,
  notice,
  onlyUnread,
  openSheet,
  pageError,
  seat,
  unreadIds,
  visibleIds,
} from "../../state/organizer.ts";
import { texts } from "../../texts.kk.ts";
import { usePageTitle } from "../../usePageTitle.ts";
import { deadlineText } from "./deadlineText.ts";

/** Mockup 6 (O-3, O-4, O-5, O-6): one group, the "only unread" filter, and the action sheet. */
export function OrgGroup({ id }: { id: number }) {
  useEffect(() => {
    group.value = null;
    void loadGroup(id);
  }, [id]);
  const data = group.value?.id === id ? group.value : null;
  usePageTitle(data?.title ?? null);
  const { read, finished } = groupProgress.value;

  return (
    <main class="page page--top stack-14">
      <div>
        <button
          type="button"
          class="link-button"
          onClick={() => {
            navigate("/org");
          }}
        >
          <BackIcon />
          {texts.org.groupsTitle}
        </button>
      </div>
      {pageError.value && (
        <div class="message message--error" role="alert">
          {pageError.value}
        </div>
      )}
      {data && (
        <>
          <header class="intro intro--tight">
            <h1 class="title title--home">{data.title}</h1>
            <div class="hint">
              {texts.org.deadlineLine(
                formatDeadline(data.round.deadlineDate),
                deadlineText(data.round.deadlineDate, data.today, finished),
              )}
            </div>
            <div>
              <b class="progress__count progress__count--small">{read}</b> {texts.readOf}
            </div>
          </header>
          {notice.value && (
            <div class="thanks" role="status">
              {notice.value}
            </div>
          )}
          <div class="card link-card">
            <div class="link-card__text">
              <div class="hint hint--small">{texts.org.groupLink}</div>
              <div class="link-card__url">{data.link.replace(/^https:\/\//, "")}</div>
            </div>
            <CopyLink
              link={data.link}
              label={texts.org.copy}
              class="button--outline button--compact"
            />
          </div>
          <label class="checkbox">
            <input
              type="checkbox"
              checked={onlyUnread.value}
              onChange={(event) => (onlyUnread.value = event.currentTarget.checked)}
            />
            {texts.org.onlyUnread(unreadIds.value.length)}
          </label>
          <ul class="seats">
            {visibleIds.value.map((seatId) => (
              <OrgSeatRow key={seatId} id={seatId} />
            ))}
          </ul>
          <ActionSheet />
        </>
      )}
    </main>
  );
}

function OrgSeatRow({ id }: { id: number }) {
  const value = seat(id)?.value;
  if (!value) return null;
  const status = displayStatus(value);
  return (
    <li class="seat seat--org">
      <span class={`seat__juz${status === "read" ? " seat__juz--read" : ""}`}>{value.juz}</span>
      <span class="seat__text">
        <span class={`seat__name${value.name === null ? " seat__name--free" : ""}`}>
          {value.name ?? texts.nobody}
        </span>
        <span class={`seat__status seat__status--${status}`}>{texts.status[status]}</span>
      </span>
      <button
        type="button"
        class="button button--small"
        onClick={() => {
          openSheet(value.id);
        }}
        aria-label={texts.org.changeLabel(value.juz)}
      >
        {texts.org.change}
      </button>
    </li>
  );
}
