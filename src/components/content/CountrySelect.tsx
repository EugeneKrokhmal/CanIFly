"use client";

export type ContentCountryId =
  | "ES"
  | "DE"
  | "FR"
  | "DK"
  | "CH"
  | "PT"
  | "AT"
  | "CZ"
  | "PL"
  | "SE"
  | "IE"
  | "LV"
  | "LT"
  | "EE"
  | "SK"
  | "SI";

const OPTIONS: ContentCountryId[] = [
  "ES",
  "DE",
  "FR",
  "DK",
  "CH",
  "PT",
  "AT",
  "CZ",
  "PL",
  "SE",
  "IE",
  "LV",
  "LT",
  "EE",
  "SK",
  "SI",
];

type Props = {
  value: ContentCountryId;
  onChange: (id: ContentCountryId) => void;
  label: string;
  names: Record<ContentCountryId, string>;
};

export function CountrySelect({ value, onChange, label, names }: Props) {
  return (
    <label className="mt-5 flex flex-col gap-1.5 sm:max-w-xs">
      <span className="text-[12px] font-semibold text-[var(--as-ink-soft)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ContentCountryId)}
        className="rounded-xl border border-[var(--as-line-soft)] bg-[var(--as-surface)] px-3 py-2.5 text-[14px] font-medium text-[var(--as-ink)] outline-none focus:border-[#ff385c]"
      >
        {OPTIONS.map((id) => (
          <option key={id} value={id}>
            {names[id] ?? id}
          </option>
        ))}
      </select>
    </label>
  );
}
