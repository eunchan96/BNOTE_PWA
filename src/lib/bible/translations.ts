export type TranslationOption = {
  code: string;
  displayName: string;
};

export const TRANSLATIONS: TranslationOption[] = [
  { code: "NKRV", displayName: "개역개정" },
  { code: "KRV", displayName: "개역한글" },
  { code: "KSB", displayName: "표준새번역" },
  { code: "KLB", displayName: "현대인의성경" },
  { code: "EASY", displayName: "쉬운성경" },
  { code: "NIV", displayName: "NIV" },
  { code: "KJV", displayName: "KJV" },
  { code: "ESV", displayName: "ESV" },
];