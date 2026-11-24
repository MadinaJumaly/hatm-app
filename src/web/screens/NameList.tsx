import type { GroupPublicView } from "../../shared/api.ts";
import { ChevronRightIcon } from "../components/Icons.tsx";
import { formatUntil } from "../format.ts";
import { chooseMember } from "../state/participant.ts";
import { texts } from "../texts.kk.ts";
import { usePageTitle } from "../usePageTitle.ts";

/** Mockup 1: pick your name (A–Я, with your juz). P-1. */
export function NameList({ group }: { group: GroupPublicView }) {
  usePageTitle(texts.chooseName);
  return (
    <main class="page stack-20">
      <header class="intro">
        <div class="hint">{texts.welcome}</div>
        <h1 class="title">{group.title}</h1>
        <div class="hint">
          {texts.untilDate(group.round.durationDays, formatUntil(group.round.deadlineDate))}
        </div>
      </header>
      <section class="card card--compact" aria-labelledby="choose-title">
        <h2 id="choose-title" class="card__title card__title--large">
          {texts.chooseName}
        </h2>
        <p class="hint">{texts.chooseNameHint}</p>
      </section>
      <ul class="names" aria-labelledby="choose-title">
        {group.members.map((member) => (
          <li key={member.id}>
            <button
              type="button"
              class="name"
              onClick={() => {
                chooseMember(group, member);
              }}
            >
              <span class="name__text">{member.name}</span>
              <span class="name__juz">
                {member.juz !== null && texts.juzLabel(member.juz)}
                <ChevronRightIcon />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
