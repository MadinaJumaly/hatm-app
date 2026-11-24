import { useEffect } from "preact/hooks";
import { CopyLink } from "../../components/CopyLink.tsx";
import { formatDayMonth } from "../../format.ts";
import { navigate } from "../../router.ts";
import { groups, loadGroups, logout, notice, pageError } from "../../state/organizer.ts";
import { texts } from "../../texts.kk.ts";
import { usePageTitle } from "../../usePageTitle.ts";
import { deadlineText } from "./deadlineText.ts";

/** Mockup 5 (O-2): all khatms with their progress. */
export function OrgGroups() {
  usePageTitle(texts.org.groupsTitle);
  useEffect(() => {
    void loadGroups();
  }, []);
  const data = groups.value;

  return (
    <main class="page page--home stack-16">
      <header class="row-between home__header">
        <div class="intro intro--tight">
          <div class="hint">{texts.org.role}</div>
          <h1 class="title">{texts.org.groupsTitle}</h1>
        </div>
        <button type="button" class="button button--small" onClick={() => void logout()}>
          {texts.logout}
        </button>
      </header>
      <button
        type="button"
        class="button button--primary"
        onClick={() => {
          navigate("/org/new");
        }}
      >
        <PlusIcon />
        {texts.org.newKhatm}
      </button>
      {pageError.value && (
        <div class="message message--error" role="alert">
          {pageError.value}
        </div>
      )}
      <div class="visually-hidden" role="status">
        {notice.value ?? ""}
      </div>
      {data?.groups.length === 0 && <p class="hint">{texts.org.noGroups}</p>}
      {data?.groups.map((g) => {
        const finished = g.read >= g.total;
        return (
          <article key={g.id} class="card stack-12" aria-labelledby={`group-${String(g.id)}`}>
            <h2 id={`group-${String(g.id)}`} class="card__title card__title--group">
              {g.title}
            </h2>
            <div class="hint">
              {texts.org.deadlineLine(
                formatDayMonth(g.deadlineDate),
                deadlineText(g.deadlineDate, data.today, finished),
              )}
            </div>
            <div>
              <b class="progress__count">{g.read}</b> {texts.readOf}
            </div>
            <div class="bar" aria-hidden="true">
              <div
                class="bar__fill"
                style={{ width: `${String(Math.round((g.read / g.total) * 100))}%` }}
              />
            </div>
            <div class="row-buttons">
              <button
                type="button"
                class="button button--outline button--grow"
                onClick={() => {
                  navigate(`/org/groups/${String(g.id)}`);
                }}
                aria-label={`${texts.org.open}: ${g.title}`}
              >
                {texts.org.open}
              </button>
              <CopyLink link={g.link} label={texts.org.copyLink} class="button--grow-more" />
            </div>
          </article>
        );
      })}
    </main>
  );
}

function PlusIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}
