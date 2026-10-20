import { SkillIcon, skillForLabel } from "./SkillIcon";
import {
  Children,
  Fragment,
  isValidElement,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { ChevronDown, Search } from "lucide-react";
import { choiceIcon, fieldIcon } from "./AssessmentSelect";

function textOf(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) =>
      typeof child === "string" || typeof child === "number"
        ? String(child)
        : isValidElement<{ children?: ReactNode }>(child)
          ? textOf(child.props.children)
          : "",
    )
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
export function cardOptions(
  children: ReactNode,
  inheritedDisabled = false,
): { value: string; label: string; disabled: boolean }[] {
  return Children.toArray(children).flatMap((child) => {
    if (
      !isValidElement<{
        value?: string | number;
        children?: ReactNode;
        disabled?: boolean;
        label?: string;
      }>(child)
    )
      return [];
    if (child.type === Fragment || child.type === "optgroup")
      return cardOptions(
        child.props.children,
        inheritedDisabled || Boolean(child.props.disabled),
      );
    if (child.type !== "option") return [];
    const label = child.props.label ?? textOf(child.props.children);
    return [
      {
        value: String(child.props.value ?? label),
        label,
        disabled: inheritedDisabled || Boolean(child.props.disabled),
      },
    ];
  });
}

// Retains a hidden native control for forms and genuine change events. All visible choices are cards.
export function CardSelect({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const control = useRef<HTMLSelectElement>(null),
    details = useRef<HTMLDetailsElement>(null);
  const [inferredLabel, setInferredLabel] = useState("Escolher opção"),
    [query, setQuery] = useState("");
  const options = cardOptions(children);
  const [uncontrolled, setUncontrolled] = useState(() =>
    String(props.defaultValue ?? options[0]?.value ?? ""),
  );
  const value = String(props.value ?? uncontrolled);
  const selected = options.find((o) => o.value === value);
  const label = props["aria-label"] ?? inferredLabel;
  const Icon = fieldIcon(label);
  useLayoutEffect(() => {
    const parent = control.current?.closest("label");
    if (!parent) return;
    const clone = parent.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".card-select").forEach((n) => n.remove());
    setInferredLabel(
      clone.textContent?.replace(/\s+/g, " ").trim() || "Escolher opção",
    );
  }, [children]);
  const close = () => {
    if (details.current) {
      details.current.open = false;
      details.current.querySelector("summary")?.focus();
    }
  };
  const filtered = options.filter((o) =>
    o.label
      .toLocaleLowerCase("pt-BR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .includes(
        query
          .toLocaleLowerCase("pt-BR")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, ""),
      ),
  );
  return (
    <div
      className="card-select"
      style={props.style}
      onKeyDown={(e) => {
        if (e.key === "Escape" && details.current?.open) {
          e.stopPropagation();
          e.preventDefault();
          close();
        }
        if (
          ["ArrowDown", "ArrowUp"].includes(e.key) &&
          e.target instanceof HTMLButtonElement
        ) {
          const buttons = [
            ...(details.current?.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ) ?? []),
          ];
          const index = buttons.indexOf(e.target);
          if (index >= 0 && buttons.length) {
            e.preventDefault();
            buttons[
              (index + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) %
                buttons.length
            ].focus();
          }
        }
      }}
    >
      <select {...props} ref={control} hidden aria-hidden="true" tabIndex={-1}>
        {children}
      </select>
      <details
        ref={details}
        className="assessment-choice card-select-panel"
        onToggle={() => {
          if (!details.current?.open) setQuery("");
        }}
      >
        <summary
          aria-label={`${label}: ${selected?.label ?? "Escolher"}`}
          aria-disabled={props.disabled || undefined}
          tabIndex={props.disabled ? -1 : 0}
          onClick={(e) => {
            if (props.disabled) e.preventDefault();
          }}
          onKeyDown={(e) => {
            if (props.disabled) e.preventDefault();
          }}
        >
          {selected && skillForLabel(selected.label) ? (
            <SkillIcon skill={skillForLabel(selected.label)} />
          ) : (
            <Icon size={18} aria-hidden="true" />
          )}
          <strong>{selected?.label ?? "Escolher"}</strong>
          <ChevronDown
            size={18}
            className="assessment-choice-chevron"
            aria-hidden="true"
          />
        </summary>
        {options.length > 8 && (
          <div className="card-select-search">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              aria-label={`Buscar em ${label}`}
              placeholder="Buscar opção…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        )}
        <div className="assessment-choice-grid" role="group" aria-label={label}>
          {filtered.map((o, i) => {
            const ChoiceIcon = choiceIcon(o.value, o.label);
            return (
              <button
                type="button"
                key={`${o.value}:${i}`}
                disabled={props.disabled || o.disabled}
                aria-pressed={value === o.value}
                aria-label={`${label}: ${o.label}`}
                onClick={() => {
                  const select = control.current;
                  if (!select) return;
                  if (select.value === o.value) {
                    close();
                    return;
                  }
                  select.value = o.value;
                  select.dispatchEvent(new Event("change", { bubbles: true }));
                  if (props.value === undefined) setUncontrolled(o.value);
                  close();
                }}
              >
                {skillForLabel(o.label) ? (
                  <SkillIcon skill={skillForLabel(o.label)} />
                ) : (
                  <ChoiceIcon size={19} aria-hidden="true" />
                )}
                <span>{o.label}</span>
              </button>
            );
          })}
        </div>
        {!filtered.length && (
          <p className="ui-note">Nenhuma opção encontrada.</p>
        )}
      </details>
    </div>
  );
}
