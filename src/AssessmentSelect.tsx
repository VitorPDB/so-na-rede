import { ChevronDown } from "lucide-react";
export function AssessmentSelect({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  options: Record<string, string>;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <label className="assessment-select">
      <span>{label}</span>
      <div className="assessment-select-control">
        <select
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {Object.entries(options).map(([id, text]) => (
            <option key={id} value={id}>
              {text}
            </option>
          ))}
        </select>
        <ChevronDown size={19} aria-hidden="true" />
      </div>
      {hint && <small>{hint}</small>}
    </label>
  );
}
