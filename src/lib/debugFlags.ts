export const TEMPLATE_DEBUG_STORAGE_KEY = "lpEditor.templateDebug";
export const E2E_TEST_MODE_STORAGE_KEY = "aurbit:e2e";

export const isTemplateDebugEnabled = (): boolean => {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(TEMPLATE_DEBUG_STORAGE_KEY) === "1";
};

export const isE2ETestModeEnabled = (search?: string): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(search ?? window.location.search);
  const queryFlag = params.get("e2e") ?? params.get("testMode");
  if (queryFlag === "1" || queryFlag === "true") {
    return true;
  }

  return window.localStorage.getItem(E2E_TEST_MODE_STORAGE_KEY) === "1";
};
