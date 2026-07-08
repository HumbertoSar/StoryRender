import { useEffect, useState } from "react";
import { STATUS_OPCOES } from "./tipos";

export function EditableField({
  label,
  value,
  onSave,
  placeholder = "—",
}: {
  label: string;
  value: string;
  onSave: (valor: string) => void;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(value);

  useEffect(() => setLocal(value), [value]);

  function salvarSeMudou() {
    if (local !== value) onSave(local);
  }

  return (
    <div className="sr-field">
      {label && <div className="sr-field__label">{label}</div>}
      <textarea
        className="sr-field__input"
        value={local}
        placeholder={placeholder}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={salvarSeMudou}
        rows={2}
      />
    </div>
  );
}

export function StatusSelect({ value, onSave }: { value: string; onSave: (valor: string) => void }) {
  return (
    <select
      className={`sr-status-select sr-badge sr-badge--${value}`}
      value={value}
      onChange={(e) => onSave(e.target.value)}
    >
      {STATUS_OPCOES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

export function ChipsField({
  label,
  opcoes,
  valores,
  onSave,
}: {
  label: string;
  opcoes: string[];
  valores: string[];
  onSave: (valores: string[]) => void;
}) {
  function alternar(o: string) {
    onSave(valores.includes(o) ? valores.filter((v) => v !== o) : [...valores, o]);
  }

  return (
    <div className="sr-field">
      <div className="sr-field__label">{label}</div>
      <div className="sr-chip-row">
        {opcoes.map((o) => (
          <button
            key={o}
            type="button"
            className={`sr-chip sr-chip--papel ${valores.includes(o) ? "sr-chip--papel-ativo" : ""}`}
            onClick={() => alternar(o)}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
