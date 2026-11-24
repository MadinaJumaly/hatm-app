import { texts } from "../texts.kk.ts";
import { usePageTitle } from "../usePageTitle.ts";

type Props = { title: string; hint?: string; onRetry?: () => void };

/** Full-page message: «Сілтеме қате», loading, or an error with «Қайталау». */
export function Message({ title, hint, onRetry }: Props) {
  usePageTitle(title === texts.appName ? null : title);
  return (
    <main class="page stack-16">
      <h1 class="title">{title}</h1>
      {hint && <p class="hint">{hint}</p>}
      {onRetry && (
        <button type="button" class="button button--primary" onClick={onRetry}>
          {texts.retry}
        </button>
      )}
    </main>
  );
}
