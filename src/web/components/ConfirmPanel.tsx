import { useEffect, useId, useRef } from "preact/hooks";

type Props = {
  question: string;
  explain?: string;
  yes: string;
  no: string;
  onYes: () => void;
  onNo: () => void;
  disabled: boolean;
  error?: string | null;
};

/** Inline confirmation from the mockups (design §J). Focus moves here when it opens. */
export function ConfirmPanel({ question, explain, yes, no, onYes, onNo, disabled, error }: Props) {
  const heading = useRef<HTMLDivElement>(null);
  const questionId = useId(); // unique, because two panels can be open at once
  useEffect(() => heading.current?.focus(), []);

  return (
    <div class="confirm" role="group" aria-labelledby={questionId}>
      <div id={questionId} class="confirm__question" tabIndex={-1} ref={heading}>
        {question}
      </div>
      {explain && <div class="confirm__explain">{explain}</div>}
      {error && (
        <div class="message message--error" role="alert">
          {error}
        </div>
      )}
      <div class="confirm__buttons">
        <button type="button" class="button button--danger" onClick={onYes} disabled={disabled}>
          {yes}
        </button>
        <button type="button" class="button button--secondary" onClick={onNo} disabled={disabled}>
          {no}
        </button>
      </div>
    </div>
  );
}
