type TabOption<T extends string> = { key: T; label: string };

type InspectorSecondaryTabsProps<T extends string> = {
  value: T;
  options: TabOption<T>[];
  onChange: (value: T) => void;
};

export default function InspectorSecondaryTabs<T extends string>({ value, options, onChange }: InspectorSecondaryTabsProps<T>) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-[var(--ui-border)]/80 bg-[var(--surface-2)] p-1 text-[11px]">
      {options.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={
            "h-7 flex-1 rounded-sm border px-2 font-semibold tracking-wide transition-colors duration-150 ease-out " +
            (value === tab.key
              ? " border-[var(--ui-border)] bg-[var(--surface)] text-[var(--ui-text)] shadow-sm"
              : " border-transparent text-[var(--ui-muted)] hover:border-[var(--ui-border)]/70 hover:bg-[var(--surface)] hover:text-[var(--ui-text)]")
          }
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
