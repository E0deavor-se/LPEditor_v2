type TabOption<T extends string> = { key: T; label: string; disabled?: boolean };

type InspectorPrimaryTabsProps<T extends string> = {
  value: T;
  options: TabOption<T>[];
  onChange: (value: T) => void;
};

export default function InspectorPrimaryTabs<T extends string>({ value, options, onChange }: InspectorPrimaryTabsProps<T>) {
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-[var(--ui-border)]/70 bg-[var(--surface-2)] p-1 text-[11px]">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          className={
            "h-6 rounded-sm border px-2 transition-colors " +
            (value === option.key
              ? "border-[var(--ui-border)] bg-[var(--ui-panel)] text-[var(--ui-text)]"
              : "border-transparent text-[var(--ui-muted)] hover:border-[var(--ui-border)]/60 hover:text-[var(--ui-text)]")
          }
          disabled={option.disabled}
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
