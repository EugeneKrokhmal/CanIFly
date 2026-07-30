/** Official Poland CAA (ULC) drones pages — locale-aware. */
export function ulcDronesUrl(locale: string): string {
  return locale === "pl"
    ? "https://ulc.gov.pl/pl/drony"
    : "https://ulc.gov.pl/en/drones/general-information";
}

export function ulcDronesLabel(locale: string): string {
  return locale === "pl"
    ? "ulc.gov.pl/pl/drony"
    : "ulc.gov.pl/en/drones/general-information";
}
