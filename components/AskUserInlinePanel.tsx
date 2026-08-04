"use client";

import { useState, useEffect, useRef } from "react";
import type { ExtensionUiRequest } from "@/lib/types";

type ExtensionUiDialogRequest = Extract<
  ExtensionUiRequest,
  { method: "select" | "confirm" | "input" | "editor" }
>;

export interface AskUserQuestion {
  question: string;
  type?: "select" | "confirm" | "input";
  options?: string[];
  default?: string;
  placeholder?: string;
}

export type AskUserResponse =
  | { value: string }
  | { confirmed: boolean }
  | { cancelled: true };

interface Props {
  questions: AskUserQuestion[];
  request: ExtensionUiDialogRequest;
  answers: Record<number, string>;
  onRespond: (
    request: ExtensionUiDialogRequest,
    response: AskUserResponse,
    questionIndex: number,
    displayValue: string,
    commit: boolean,
  ) => void;
}

const OTHER_OPTION = "Other (free input)";

/**
 * Inline panel for the ask_user tool. ask_user (pi-atlas extension) asks its
 * questions one at a time via ctx.ui.select/confirm/input, which pi-web surfaces
 * as extension_ui_request events. This panel renders all questions at once,
 * highlights the one currently being asked, shows committed answers, and lets
 * the user answer inline — mirroring the TUI multi-question experience.
 */
export function AskUserInlinePanel({ questions, request, answers, onRespond }: Props) {
  // Collapsed state lets the user reclaim the panel's vertical space to read
  // the agent's output above it, then re-expand to answer. Defaults to
  // expanded (current behavior); the user opts in to collapsing.
  const [collapsed, setCollapsed] = useState(false);

  // A new question arriving should surface itself: auto-expand on request change
  // so the user doesn't miss a freshly-asked question while collapsed.
  useEffect(() => {
    setCollapsed(false);
  }, [request.id]);
  // Correlate the current request to its question by matching the title.
  // ask_user passes the question text as the title; the select → "Other"
  // follow-up appends " (custom answer)".
  let currentIndex = 0;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i].question;
    if (request.title === q || request.title === `${q} (custom answer)`) {
      currentIndex = i;
      break;
    }
  }
  const total = questions.length;

  return (
    <div style={{ borderTop: "1px solid rgba(34,197,94,0.2)", background: "var(--bg)" }}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((c) => !c)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setCollapsed((c) => !c);
          }
        }}
        title={collapsed ? "Expand to answer" : "Collapse to view previous output"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "6px 10px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-panel)",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-dim)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: collapsed ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.15s" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 650, color: "var(--accent)" }}>
          ask_user
        </span>
        <span style={{ fontSize: 11, color: "var(--text-dim)" }}>
          Question {Math.min(currentIndex + 1, total)} of {total}
        </span>
        {collapsed && (
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-dim)", fontStyle: "italic" }}>
            Tap to answer
          </span>
        )}
      </div>

      {!collapsed && (
      <div style={{ padding: "8px 10px", display: "grid", gap: 9 }}>
        {questions.map((q, i) => {
          const answered = answers[i] !== undefined;
          const isCurrent = i === currentIndex && !answered;
          const isDone = answered;
          const isPending = !isCurrent && !isDone;

          return (
            <div key={i} style={{ minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "baseline",
                  fontSize: 12.5,
                  color: isPending ? "var(--text-dim)" : "var(--text)",
                  lineHeight: 1.45,
                }}
              >
                <span style={{ color: "var(--text-dim)", flexShrink: 0 }}>{i + 1}.</span>
                <span style={{ minWidth: 0, wordBreak: "break-word" }}>{q.question}</span>
                {isDone && (
                  <span
                    style={{
                      marginLeft: "auto",
                      paddingLeft: 8,
                      color: "#16a34a",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      whiteSpace: "pre-wrap",
                      textAlign: "right",
                    }}
                  >
                    → {answers[i]}
                  </span>
                )}
              </div>

              {isCurrent && (
                <div style={{ marginTop: 6 }}>
                  <CurrentControl
                    key={request.id}
                    request={request}
                    question={q}
                    onRespond={(response, displayValue, commit) =>
                      onRespond(request, response, i, displayValue, commit)
                    }
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

function CurrentControl({
  request,
  question,
  onRespond,
}: {
  request: ExtensionUiDialogRequest;
  question: AskUserQuestion;
  onRespond: (response: AskUserResponse, displayValue: string, commit: boolean) => void;
}) {
  if (request.method === "select") {
    return (
      <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
        {request.options.map((option) => {
          const isOther = option === OTHER_OPTION;
          return (
            <button
              key={option}
              onClick={() =>
                onRespond(
                  { value: option },
                  option,
                  !isOther, // "Other" spawns a follow-up input for the same question
                )
              }
              style={{ ...optionButtonStyle(false), width: "100%" }}
            >
              {option}
            </button>
          );
        })}
      </div>
    );
  }

  if (request.method === "confirm") {
    return (
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button
          onClick={() => onRespond({ confirmed: true }, "Yes", true)}
          style={optionButtonStyle(true)}
        >
          Yes
        </button>
        <button
          onClick={() => onRespond({ cancelled: true }, "No", true)}
          style={optionButtonStyle(false)}
        >
          No
        </button>
      </div>
    );
  }

  if (request.method === "input") {
    return (
      <InputControl
        request={request}
        question={question}
        onRespond={onRespond}
      />
    );
  }

  // editor (ask_user never uses this in rpc mode) — fall back to a text input.
  return (
    <InputControl request={request} question={question} onRespond={onRespond} />
  );
}

function InputControl({
  request,
  question,
  onRespond,
}: {
  request: Extract<ExtensionUiRequest, { method: "input" | "editor" }>;
  question: AskUserQuestion;
  onRespond: (response: AskUserResponse, displayValue: string, commit: boolean) => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const placeholder = request.method === "input" ? request.placeholder : undefined;

  useEffect(() => {
    setValue("");
    // Focus on mount / when the request changes.
    inputRef.current?.focus();
  }, [request.id]);

  const submit = () => {
    const v = value;
    onRespond({ value: v }, v.trim() ? v : "(empty)", true);
  };

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
      <input
        ref={inputRef}
        value={value}
        placeholder={placeholder ?? question.placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onRespond({ cancelled: true }, question.default ?? "(skipped)", true);
          }
        }}
        style={{
          flex: 1,
          minWidth: 0,
          padding: "7px 9px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "var(--bg-panel)",
          color: "var(--text)",
          outline: "none",
          fontSize: 12.5,
        }}
      />
      <button onClick={submit} style={optionButtonStyle(true)}>
        Send
      </button>
    </div>
  );
}

function optionButtonStyle(primary: boolean): React.CSSProperties {
  return {
    padding: "6px 11px",
    borderRadius: 6,
    border: primary ? "1px solid var(--accent)" : "1px solid var(--border)",
    background: primary ? "var(--accent)" : "var(--bg-panel)",
    color: primary ? "#fff" : "var(--text)",
    cursor: "pointer",
    fontSize: 12.5,
    fontWeight: primary ? 600 : 400,
    // Wrap long option text instead of forcing a single overflowing line.
    // Harmless for short Yes/No/Send labels.
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
    textAlign: "left",
  };
}
