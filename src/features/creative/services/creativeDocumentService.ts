import type {
  CreativeDocument,
  CreativeInputValues,
} from "@/src/features/creative/types/document";

const documentInputMap = new Map<string, CreativeInputValues>();

const makeId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

export const createCreativeDocument = async (
  input: CreativeInputValues,
): Promise<CreativeDocument> => {
  try {
    const response = await fetch("/api/creative/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });

    if (response.ok) {
      const data = (await response.json()) as { id: string; createdAt?: string };
      const created: CreativeDocument = {
        id: data.id,
        input,
        createdAt: data.createdAt ?? new Date().toISOString(),
      };
      documentInputMap.set(created.id, input);
      return created;
    }
  } catch {
    // Fall back to local mock data for MVP.
  }

  const mockDoc: CreativeDocument = {
    id: makeId("doc"),
    input,
    createdAt: new Date().toISOString(),
  };
  documentInputMap.set(mockDoc.id, input);
  return mockDoc;
};

export const getCreativeDocumentInput = (documentId: string): CreativeInputValues | null =>
  documentInputMap.get(documentId) ?? null;
