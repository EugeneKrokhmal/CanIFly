import { describe, expect, it } from "vitest";
import {
  localeFromCountryCode,
  localeFromNavigatorLanguages,
} from "./preferred-locale";

describe("localeFromCountryCode", () => {
  it("maps Poland to pl", () => {
    expect(localeFromCountryCode("PL")).toBe("pl");
  });
  it("maps Spain to es", () => {
    expect(localeFromCountryCode("ES")).toBe("es");
  });
  it("maps Germany to de", () => {
    expect(localeFromCountryCode("DE")).toBe("de");
  });
});

describe("localeFromNavigatorLanguages", () => {
  it("picks pl from pl-PL", () => {
    expect(localeFromNavigatorLanguages(["pl-PL", "en-US"])).toBe("pl");
  });
  it("ignores unknown tags", () => {
    expect(localeFromNavigatorLanguages(["sv-SE"])).toBeNull();
  });
});
