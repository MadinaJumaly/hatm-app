import { useEffect, useRef, useState } from "preact/hooks";
import type { GroupPublicView } from "../../shared/api.ts";
import { isValidPin } from "../../shared/validation.ts";
import { BackIcon } from "../components/Icons.tsx";
import { submitPin } from "../state/participant.ts";
import { texts } from "../texts.kk.ts";
import { usePageTitle } from "../usePageTitle.ts";

type Props = { group: GroupPublicView; member: GroupPublicView["members"][number] };

/** Mockup 2: create a PIN (first visit), or enter it (next visits). P-1. */
export function PinForm({ group, member }: Props) {
  usePageTitle(texts.pinLabel);
  const [creating, setCreating] = useState(!member.hasPin);
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => firstField.current?.focus(), [creating]);

  async function onSubmit(event: Event) {
    event.preventDefault();
    if (!isValidPin(pin) || (creating && !isValidPin(pinConfirm))) {
      setError(texts.pinNeedFourDigits);
      return;
    }
    if (creating && pin !== pinConfirm) {
      setError(texts.pinMismatch);
      return;
    }
    setSending(true);
    setError(null);
    const result = await submitPin(member, pin, creating ? pinConfirm : undefined);
    setSending(false);
    if (result.ok) return;
    setError(result.message);
    setPin("");
    setPinConfirm("");
    if (result.switchToEnter) setCreating(false);
    firstField.current?.focus();
  }

  const digitsOnly = (value: string) => value.replace(/\D/g, "").slice(0, 4);

  return (
    <main class="page page--top stack-20">
      <div>
        <button
          type="button"
          class="link-button"
          onClick={() => {
            history.back();
          }}
        >
          <BackIcon />
          {texts.chooseOtherName}
        </button>
      </div>
      <header class="intro stack-8">
        <div class="hint">{group.title}</div>
        <h1 class="title title--large">{member.name}</h1>
        <p>{creating ? texts.pinCreateHint : texts.pinEnterHint}</p>
      </header>
      <form class="card stack-18" onSubmit={(event) => void onSubmit(event)} noValidate>
        <div class="field">
          <label for="pin1">{texts.pinLabel}</label>
          <input
            id="pin1"
            ref={firstField}
            class="pin-input"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoComplete="off"
            value={pin}
            onInput={(event) => {
              setPin(digitsOnly(event.currentTarget.value));
            }}
            aria-invalid={error !== null}
            aria-describedby="pin-error"
          />
        </div>
        {creating && (
          <div class="field">
            <label for="pin2">{texts.pinRepeatLabel}</label>
            <input
              id="pin2"
              class="pin-input"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoComplete="off"
              value={pinConfirm}
              onInput={(event) => {
                setPinConfirm(digitsOnly(event.currentTarget.value));
              }}
              aria-invalid={error !== null}
              aria-describedby="pin-error"
            />
          </div>
        )}
        <div
          id="pin-error"
          class={error ? "message message--error" : "visually-hidden"}
          role="alert"
        >
          {error ?? ""}
        </div>
        <button
          type="submit"
          class="button button--primary button--big"
          disabled={sending}
          aria-busy={sending}
        >
          {creating ? texts.pinCreateButton : texts.pinEnterButton}
        </button>
      </form>
      <p class="hint intro">{texts.pinForgot}</p>
    </main>
  );
}
