import ja from "./ja";

export type I18n = typeof ja;

export const useI18n = (): I18n => ja;
