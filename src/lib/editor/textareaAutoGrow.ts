export const autoGrowTextarea = (
  element: HTMLTextAreaElement | null,
  minHeight = 44
) => {
  if (!element) {
    return;
  }
  element.style.height = "0px";
  element.style.height = `${Math.max(minHeight, element.scrollHeight)}px`;
};
