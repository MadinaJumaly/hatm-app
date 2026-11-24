import { useEffect } from "preact/hooks";
import { ConfirmPanel } from "../components/ConfirmPanel.tsx";
import { InstallHelp } from "../components/InstallHelp.tsx";
import { JuzCard } from "../components/JuzCard.tsx";
import { ProgressCard } from "../components/ProgressCard.tsx";
import { SeatRow } from "../components/SeatRow.tsx";
import { usePullToRefresh } from "../pullToRefresh.ts";
import {
  busy,
  confirmingLogout,
  home,
  logout,
  logoutError,
  offline,
  refresh,
  seatIds,
} from "../state/participant.ts";
import { texts } from "../texts.kk.ts";
import { usePageTitle } from "../usePageTitle.ts";

/** Mockups 3 and 4: the participant's home (P-2…P-5, P-7). */
export function Home() {
  const data = home.value;
  usePageTitle(data?.group.title ?? null);
  const pulling = usePullToRefresh(refresh);

  // P-5: coming back to the app (e.g. from WhatsApp) refreshes the data.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!data) return null;

  return (
    <main class="page page--home stack-16">
      {pulling && (
        <div class="pull" role="status">
          {texts.pullToRefresh}
        </div>
      )}
      {offline.value && (
        <div class="offline" role="status">
          {texts.offlineBanner}
        </div>
      )}
      <header class="row-between home__header">
        <h1 class="title title--home">{texts.hello(data.me.name)}</h1>
        <button
          type="button"
          class="button button--small"
          onClick={() => {
            logoutError.value = null;
            confirmingLogout.value = true;
          }}
        >
          {texts.logout}
        </button>
      </header>
      {confirmingLogout.value && (
        <ConfirmPanel
          question={texts.logoutQuestion}
          yes={texts.logoutYes}
          no={texts.no}
          onYes={() => void logout()}
          onNo={() => (confirmingLogout.value = false)}
          disabled={busy.value}
          error={logoutError.value}
        />
      )}
      <JuzCard />
      <ProgressCard />
      <section class="stack-8" aria-labelledby="all-title">
        <h2 id="all-title" class="card__title section-title">
          {texts.allJuz}
        </h2>
        <ul class="seats">
          {seatIds.value.map((id) => (
            <SeatRow key={id} id={id} />
          ))}
        </ul>
      </section>
      <InstallHelp />
    </main>
  );
}
