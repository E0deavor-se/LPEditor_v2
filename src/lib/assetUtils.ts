export type ParsedDataUrl = {
  mimeType: string;
  buffer: ArrayBuffer;
};

const DATA_URL_PREFIX = "data:";

export const parseDataUrl = (value: string): ParsedDataUrl | null => {
  if (!value || !value.startsWith(DATA_URL_PREFIX)) {
    return null;
  }
  const commaIndex = value.indexOf(",");
  if (commaIndex === -1) {
    return null;
  }
  const header = value.slice(DATA_URL_PREFIX.length, commaIndex);
  const data = value.slice(commaIndex + 1);
  const isBase64 = header.includes(";base64");
  const mimeType = header.split(";")[0] || "application/octet-stream";
  try {
    if (isBase64) {
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      return { mimeType, buffer: bytes.buffer };
    }
    const decoded = decodeURIComponent(data);
    const bytes = new TextEncoder().encode(decoded);
    return { mimeType, buffer: bytes.buffer };
  } catch {
    return null;
  }
};

export const hashBuffer = async (buffer: ArrayBuffer): Promise<string> => {
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const getExtensionFromMime = (mimeType: string): string => {
  if (!mimeType) {
    return "";
  }
  if (mimeType === "image/jpeg") {
    return "jpg";
  }
  if (mimeType === "image/png") {
    return "png";
  }
  if (mimeType === "image/gif") {
    return "gif";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  if (mimeType === "image/svg+xml") {
    return "svg";
  }
  if (mimeType === "video/mp4") {
    return "mp4";
  }
  if (mimeType === "video/webm") {
    return "webm";
  }
  if (mimeType === "font/woff") {
    return "woff";
  }
  if (mimeType === "font/woff2") {
    return "woff2";
  }
  if (mimeType === "text/csv") {
    return "csv";
  }
  return mimeType.split("/").pop() ?? "";
};

export const getExtensionFromFilename = (filename: string): string => {
  const parts = filename.split(".");
  if (parts.length < 2) {
    return "";
  }
  return parts[parts.length - 1].toLowerCase();
};

export const getAssetKind = (mimeType: string, filename: string) => {
  const extension = getExtensionFromFilename(filename);
  if (mimeType.startsWith("image/")) {
    return "image" as const;
  }
  if (mimeType.startsWith("video/")) {
    return "video" as const;
  }
  if (mimeType.startsWith("font/")) {
    return "font" as const;
  }
  if (extension === "csv" || mimeType === "text/csv") {
    return "data" as const;
  }
  return "other" as const;
};
