import type { RenderResult } from "@/src/lib/renderers/shared/types";

const esc = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const buildHtmlDocument = (
  title: string,
  render: RenderResult,
  extraHead = ""
) => {
  const cssText = render.css.join("\n");
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(title)}</title>
    ${extraHead}
    <style>${cssText}</style>
  </head>
  <body>
    ${render.html}
  </body>
</html>`;
};
