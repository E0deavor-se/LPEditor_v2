export const TEMPLATE_DEBUG_STORAGE_KEY = "lpEditor.templateDebug";

export const isTemplateDebugEnabled = (): boolean => {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(TEMPLATE_DEBUG_STORAGE_KEY) === "1";
};
