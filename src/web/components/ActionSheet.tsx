import { useEffect, useRef, useState } from "preact/hooks";
import { juzPages } from "../../shared/juz.ts";
import {
  busy,
  closeSheet,
  displayStatus,
  group,
  resetPin,
  seat,
  setStatus,
  sheetSeatId,
} from "../state/organizer.ts";
import { texts } from "../texts.kk.ts";
import { ConfirmPanel } from "./ConfirmPanel.tsx";
import { CheckIcon } from "./Icons.tsx";

type Step = "actions" | "confirmUnmark" | "confirmReset";

/**
 * Mockup 6: the action sheet for one juz. A native <dialog>: focus stays inside, Esc closes it.
 * Everything that removes something asks first (design §J).
 */
export function ActionSheet() {
  const id = sheetSeatId.value;
  const dialog = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>("actions");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStep("actions");
    setError(null);
    if (id !== null && !dialog.current?.open) dialog.current?.showModal();
    if (id === null && dialog.current?.open) dialog.current.close();
  }, [id]);

  const value = id === null ? undefined : seat(id)?.value;
  const member =
    value?.memberId == null ? undefined : group.value?.members.find((m) => m.id === value.memberId);

  async function run(action: () => Promise<string | null>) {
    const failure = await action();
    if (failure) setError(failure);
    else closeSheet();
  }

  const body =
    value === undefined ? null : (
      <>
        <div class="sheet__handle" aria-hidden="true" />
        <div>
          <h2 id="sheet-title" class="sheet__title">
            {texts.org.sheetTitle(value.juz, value.name ?? texts.status.free)}
          </h2>
          <div class="hint">
            {texts.status[displayStatus(value)]} ·{" "}
            {texts.org.sheetPages(juzPages(value.juz).first, juzPages(value.juz).last)}
          </div>
        </div>

        {step === "confirmUnmark" && (
          <ConfirmPanel
            question={texts.removeQuestion}
            explain={texts.removeExplain(value.juz)}
            yes={texts.removeYes}
            no={texts.no}
            onYes={() => void run(() => setStatus(value.id, false))}
            onNo={() => {
              setStep("actions");
            }}
            disabled={busy.value}
            error={error}
          />
        )}

        {step === "confirmReset" && member && (
          <ConfirmPanel
            question={texts.org.resetPinQuestion}
            explain={texts.org.resetPinHint(member.name)}
            yes={texts.org.resetPinYes}
            no={texts.no}
            onYes={() => void run(() => resetPin(member.id, member.name))}
            onNo={() => {
              setStep("actions");
            }}
            disabled={busy.value}
            error={error}
          />
        )}

        {step === "actions" && (
          <>
            {error && (
              <div class="message message--error" role="alert">
                {error}
              </div>
            )}
            {value.status === "read" ? (
              <button
                type="button"
                class="button button--secondary"
                onClick={() => {
                  setStep("confirmUnmark");
                }}
              >
                {texts.org.unmarkOnBehalf}
              </button>
            ) : (
              <button
                type="button"
                class="button button--primary"
                onClick={() => void run(() => setStatus(value.id, true))}
                disabled={busy.value}
              >
                <CheckIcon size={22} />
                {texts.org.markOnBehalf}
              </button>
            )}
            {member &&
              (member.hasPin ? (
                <div class="stack-6">
                  <button
                    type="button"
                    class="button button--secondary"
                    onClick={() => {
                      setStep("confirmReset");
                    }}
                  >
                    {texts.org.resetPin}
                  </button>
                  <div class="hint hint--small">{texts.org.resetPinHint(member.name)}</div>
                </div>
              ) : (
                <div class="hint hint--small">{texts.org.noPinYet(member.name)}</div>
              ))}
          </>
        )}

        <button type="button" class="button button--muted" onClick={closeSheet}>
          {texts.org.close}
        </button>
      </>
    );

  return (
    <dialog
      ref={dialog}
      class="sheet"
      aria-labelledby="sheet-title"
      onClose={closeSheet}
      onClick={(event) => {
        if (event.target === dialog.current) closeSheet(); // a tap on the dark background
      }}
    >
      <div class="sheet__body">{body}</div>
    </dialog>
  );
}
