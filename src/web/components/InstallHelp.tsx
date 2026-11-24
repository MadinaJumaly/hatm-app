import { useState } from "preact/hooks";
import { installPrompt, isInstalledApp, platform } from "../install.ts";
import { texts } from "../texts.kk.ts";

const CLOSED_KEY = "hatm.installHelpClosed";

function readClosed(): boolean {
  try {
    return localStorage.getItem(CLOSED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Mockup 3, P-6: how to add the site to the home screen. Shows the steps for this phone (both
 * on a computer), Chrome's install button when it is offered, and nothing when already installed.
 */
export function InstallHelp() {
  const [open, setOpen] = useState(() => !readClosed());
  if (isInstalledApp()) return null;
  const device = platform();
  const prompt = installPrompt.value;

  return (
    <details
      class="card install"
      open={open}
      onToggle={(event) => {
        const isOpen = event.currentTarget.open;
        setOpen(isOpen);
        try {
          localStorage.setItem(CLOSED_KEY, isOpen ? "0" : "1");
        } catch {
          // remembering is only a convenience
        }
      }}
    >
      <summary class="install__summary">{texts.install.title}</summary>
      <div class="stack-16">
        {device !== "android" && (
          <div>
            <h3 class="install__heading">{texts.install.iphone}</h3>
            <ol class="install__steps">
              {texts.install.iphoneSteps.map((step, index) => (
                <li key={step}>
                  {step}
                  {index === 0 && <ShareIcon />}
                </li>
              ))}
            </ol>
            <div class="install__note">{texts.install.iphoneNote}</div>
          </div>
        )}
        {device !== "iphone" && (
          <div>
            <h3 class="install__heading">{texts.install.android}</h3>
            {prompt ? (
              <button
                type="button"
                class="button button--primary"
                onClick={() => {
                  void prompt.prompt();
                  installPrompt.value = null;
                }}
              >
                {texts.install.androidButton}
              </button>
            ) : (
              <ol class="install__steps">
                {texts.install.androidSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </details>
  );
}

function ShareIcon() {
  return (
    <svg
      class="install__icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      role="img"
      aria-label={texts.install.shareIcon}
    >
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}
