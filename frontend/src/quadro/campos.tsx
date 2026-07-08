import { useEffect, useRef, useState } from "react";
import { STATUS_OPCOES, type SugestaoCampo } from "./tipos";

function useAutoAltura(valor: string) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [valor]);

  return ref;
}

export function EditableField({
  label,
  value,
  onSave,
  placeholder = "—",
  sugestao,
}: {
  label: string;
  value: string;
  onSave: (valor: string) => void;
  placeholder?: string;
  sugestao?: SugestaoCampo;
}) {
  const [local, setLocal] = useState(value);
  const textareaRef = useAutoAltura(local);

  useEffect(() => setLocal(value), [value]);

  function salvarSeMudou() {
    if (local !== value) onSave(local);
  }

  return (
    <div className="sr-field">
      {label && <div className="sr-field__label">{label}</div>}
      <textarea
        ref={textareaRef}
        className="sr-field__input"
        value={local}
        placeholder={placeholder}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={salvarSeMudou}
        rows={2}
      />
      {sugestao && sugestao.valor !== value && (
        <div className="sr-field__sugestao">
          <div className="sr-field__sugestao-texto">{sugestao.valor}</div>
          <div className="sr-field__sugestao-acoes">
            <button
              type="button"
              className="sr-field__sugestao-btn"
              title="Aceitar sugestão"
              onClick={sugestao.aceitar}
            >
              ✓
            </button>
            <button
              type="button"
              className="sr-field__sugestao-btn"
              title="Rejeitar sugestão"
              onClick={sugestao.rejeitar}
            >
              ✕
            </button>
          </div>
        </div>
      )}
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
