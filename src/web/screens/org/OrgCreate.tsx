import { useMemo, useState } from "preact/hooks";
import type { KhatmFieldErrors } from "../../../shared/api.ts";
import { planSeats } from "../../../shared/khatm.ts";
import { DURATIONS, type Duration } from "../../../shared/types.ts";
import {
  type NamesError,
  validateDuration,
  validateNames,
  validateTitle,
} from "../../../shared/validation.ts";
import { BackIcon } from "../../components/Icons.tsx";
import { navigate } from "../../router.ts";
import { createKhatm } from "../../state/organizer.ts";
import { texts } from "../../texts.kk.ts";
import { usePageTitle } from "../../usePageTitle.ts";

function namesErrorText(error: NamesError): string {
  switch (error.code) {
    case "empty":
      return texts.org.namesEmpty;
    case "invalid":
      return texts.org.namesInvalid;
    case "too_many":
      return texts.org.namesTooMany(error.count);
    case "too_long":
      return texts.org.nameTooLong(error.line);
    case "bad_chars":
      return texts.org.nameBadChars(error.line);
    case "duplicate":
      return texts.org.nameDuplicate(error.line, error.firstLine);
  }
}

function fieldTexts(fields: KhatmFieldErrors) {
  return {
    title:
      fields.title === "too_long"
        ? texts.org.titleTooLong
        : fields.title
          ? texts.org.titleRequired
          : null,
    duration: fields.durationDays ? texts.org.durationInvalid : null,
    names: fields.names ? namesErrorText(fields.names) : null,
  };
}

/** O-7: create a khatm, with a live preview (juz → name) and line-numbered errors. */
export function OrgCreate() {
  usePageTitle(texts.org.createTitle);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState<Duration | null>(null);
  const [namesText, setNamesText] = useState("");
  const [errors, setErrors] = useState<KhatmFieldErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const lines = namesText.split(/\r?\n/);
  const names = useMemo(() => validateNames(namesText.split(/\r?\n/)), [namesText]);
  const shown = fieldTexts(errors);

  async function onSubmit(event: Event) {
    event.preventDefault();
    const check: KhatmFieldErrors = {};
    const titleResult = validateTitle(title);
    const durationResult = validateDuration(duration);
    if (!titleResult.ok) check.title = titleResult.error;
    if (!durationResult.ok) check.durationDays = durationResult.error;
    if (!names.ok) check.names = names.error;
    setErrors(check);
    setFailure(null);
    if (Object.keys(check).length > 0) {
      document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }

    setSending(true);
    const result = await createKhatm({ title, durationDays: duration ?? 0, names: lines });
    setSending(false);
    if (result.ok) navigate(`/org/groups/${String(result.groupId)}`);
    else if (result.fields) setErrors(result.fields);
    else if (result.message) setFailure(result.message);
  }

  return (
    <main class="page page--top stack-20">
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
      <h1 class="title">{texts.org.createTitle}</h1>
      <form class="card stack-18" onSubmit={(event) => void onSubmit(event)} noValidate>
        <div class="field">
          <label for="khatm-title">{texts.org.titleLabel}</label>
          <input
            id="khatm-title"
            class="input"
            value={title}
            onInput={(event) => {
              setTitle(event.currentTarget.value);
            }}
            aria-invalid={shown.title !== null}
            aria-describedby="khatm-title-error"
          />
          <FieldError id="khatm-title-error" text={shown.title} />
        </div>

        <fieldset class="field fieldset" aria-describedby="khatm-duration-error">
          <legend>{texts.org.durationLabel}</legend>
          <div class="options">
            {DURATIONS.map((days) => (
              <label key={days} class="option">
                <input
                  type="radio"
                  name="duration"
                  value={days}
                  checked={duration === days}
                  onChange={() => {
                    setDuration(days);
                  }}
                  aria-invalid={shown.duration !== null}
                />
                {texts.org.durationOption(days)}
              </label>
            ))}
          </div>
          <FieldError id="khatm-duration-error" text={shown.duration} />
        </fieldset>

        <div class="field">
          <label for="khatm-names">{texts.org.namesLabel}</label>
          <div id="khatm-names-hint" class="hint">
            {texts.org.namesHint}
          </div>
          <textarea
            id="khatm-names"
            class="input textarea"
            rows={10}
            value={namesText}
            onInput={(event) => {
              setNamesText(event.currentTarget.value);
            }}
            aria-invalid={shown.names !== null}
            aria-describedby="khatm-names-hint khatm-names-error"
          />
          <FieldError id="khatm-names-error" text={shown.names} />
        </div>

        {names.ok && (
          <section class="preview" aria-labelledby="preview-title">
            <h2 id="preview-title" class="card__title">
              {texts.org.preview}
            </h2>
            <ol class="preview__list">
              {planSeats(names.value)
                .filter((s) => s.name !== null)
                .map((s) => (
                  <li key={s.juz}>
                    {texts.juzLabel(s.juz)} → {s.name}
                  </li>
                ))}
            </ol>
            {names.value.length < 30 && (
              <div class="hint">{texts.org.previewFree(30 - names.value.length)}</div>
            )}
          </section>
        )}

        {failure && (
          <div class="message message--error" role="alert">
            {failure}
          </div>
        )}
        <button type="submit" class="button button--primary" disabled={sending} aria-busy={sending}>
          {texts.org.create}
        </button>
      </form>
    </main>
  );
}

function FieldError({ id, text }: { id: string; text: string | null }) {
  return (
    <div id={id} class={text ? "message message--error" : "visually-hidden"} role="alert">
      {text ?? ""}
    </div>
  );
}
