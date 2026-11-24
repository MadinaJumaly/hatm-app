import { useRef, useState } from "preact/hooks";
import { texts } from "../texts.kk.ts";

type Props = { link: string; label: string; class?: string };

/**
 * O-5: copies the group link and says «Көшірілді». If the browser can't copy, the link is
 * shown in a field, already selected, so it can be copied by hand.
 */
export function CopyLink({ link, label, class: className = "" }: Props) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const field = useRef<HTMLInputElement>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setState("copied");
      setTimeout(() => {
        setState("idle");
      }, 2500);
    } catch {
      setState("manual");
      setTimeout(() => field.current?.select(), 0);
    }
  }

  return (
    <>
      <button type="button" class={`button ${className}`} onClick={() => void copy()}>
        <CopyIcon />
        <span aria-live="polite">{state === "copied" ? texts.org.copied : label}</span>
      </button>
      {state === "manual" && (
        <div class="copy-manual">
          <label for="copy-field" class="hint">
            {texts.org.copyByHand}
          </label>
          <input id="copy-field" ref={field} class="input" readOnly value={link} />
        </div>
      )}
    </>
  );
}

function CopyIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}
