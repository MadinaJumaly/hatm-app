import { useRef, useState } from "preact/hooks";
import { login } from "../../state/organizer.ts";
import { texts } from "../../texts.kk.ts";
import { usePageTitle } from "../../usePageTitle.ts";

/** O-1: organizer login (not drawn in the mockups; uses their form style). */
export function OrgLogin({ onLoggedIn }: { onLoggedIn: () => void }) {
  usePageTitle(texts.org.loginTitle);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const usernameField = useRef<HTMLInputElement>(null);

  async function onSubmit(event: Event) {
    event.preventDefault();
    setSending(true);
    setError(null);
    const result = await login(username.trim(), password);
    setSending(false);
    if (result.ok) {
      onLoggedIn();
      return;
    }
    setError(result.message);
    setPassword("");
    usernameField.current?.focus();
  }

  return (
    <main class="page stack-20">
      <h1 class="title">{texts.org.loginTitle}</h1>
      <form class="card stack-18" onSubmit={(event) => void onSubmit(event)}>
        <div class="field">
          <label for="org-username">{texts.org.username}</label>
          <input
            id="org-username"
            ref={usernameField}
            class="input"
            autoComplete="username"
            autoCapitalize="none"
            spellcheck={false}
            value={username}
            onInput={(event) => {
              setUsername(event.currentTarget.value);
            }}
            aria-describedby="org-error"
            required
          />
        </div>
        <div class="field">
          <label for="org-password">{texts.org.password}</label>
          <input
            id="org-password"
            class="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onInput={(event) => {
              setPassword(event.currentTarget.value);
            }}
            aria-describedby="org-error"
            required
          />
        </div>
        <div
          id="org-error"
          class={error ? "message message--error" : "visually-hidden"}
          role="alert"
        >
          {error ?? ""}
        </div>
        <button type="submit" class="button button--primary" disabled={sending} aria-busy={sending}>
          {texts.org.login}
        </button>
      </form>
    </main>
  );
}
