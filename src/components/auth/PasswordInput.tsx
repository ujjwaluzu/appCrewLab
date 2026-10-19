"use client";

import { useEffect, useRef, useState } from "react";

type PasswordInputProps = {
  id: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete: string;
  placeholder?: string;
  invalid?: boolean;
};

export function PasswordInput({
  id,
  name,
  value,
  onChange,
  autoComplete,
  placeholder,
  invalid = false,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function toggleVisibility() {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }

    if (visible) {
      setVisible(false);
      return;
    }

    setVisible(true);
    timer.current = setTimeout(() => {
      setVisible(false);
      timer.current = null;
    }, 3000);
  }

  return (
    <div className="password-field-wrap">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        className="form-input password-input"
        placeholder={placeholder}
        aria-invalid={invalid}
      />
      <button
        type="button"
        className="password-visibility-toggle"
        aria-label={visible ? "Hide password" : "Show password for 3 seconds"}
        aria-pressed={visible}
        onMouseDown={(event) => event.preventDefault()}
        onClick={toggleVisibility}
      >
        {visible ? (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
            <path d="M9.9 5.2A11.7 11.7 0 0 1 12 5c5.2 0 8.7 4.3 9.8 6.1a1.6 1.6 0 0 1 0 1.8 15 15 0 0 1-3.3 3.5" />
            <path d="M6.2 6.2a15 15 0 0 0-4 4.9 1.6 1.6 0 0 0 0 1.8C3.3 14.7 6.8 19 12 19a11 11 0 0 0 4-.7" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2.2 12s3.5-7 9.8-7 9.8 7 9.8 7-3.5 7-9.8 7-9.8-7-9.8-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
