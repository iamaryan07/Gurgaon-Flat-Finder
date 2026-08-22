"use client";

import { useEffect, useRef, useState } from "react";

export function MultiSelect({ options, value, onChange, max = 5, placeholder = "Select sectors" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(option) {
    if (value.includes(option)) {
      onChange(value.filter((item) => item !== option));
    } else if (value.length < max) {
      onChange([...value, option]);
    }
  }

  return (
    <div className="multi-select" ref={ref}>
      <button
        type="button"
        className="multi-select-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="multi-select-label">{value.length ? value.join(", ") : placeholder}</span>
        <span className="multi-select-count">
          {value.length}/{max}
        </span>
        <span className={`multi-select-caret${open ? " open" : ""}`} aria-hidden="true" />
      </button>
      {open && (
        <div className="multi-select-menu" role="listbox" aria-multiselectable="true">
          {options.map((option) => {
            const checked = value.includes(option);
            const disabled = !checked && value.length >= max;
            return (
              <label
                key={option}
                role="option"
                aria-selected={checked}
                className={`multi-select-option${disabled ? " disabled" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(option)}
                />
                {option}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
