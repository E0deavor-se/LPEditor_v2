"use client";

import { createContext, useContext, type PropsWithChildren } from "react";
import {
  useTextSelectionManager,
  type TextSelectionCommand,
} from "@/src/components/editor/useTextSelectionManager";

type TextSelectionContextValue = {
  saveSelection: (editorId: string, editorEl: EventTarget | null) => void;
  restoreSelection: () => unknown;
  clearSelection: () => void;
  hasSelection: () => boolean;
  hasActiveEditor: () => boolean;
  applyCommand: (command: TextSelectionCommand) => boolean;
};

const TextSelectionContext = createContext<TextSelectionContextValue | null>(null);

export function TextSelectionProvider({ children }: PropsWithChildren) {
  const manager = useTextSelectionManager();
  return <TextSelectionContext.Provider value={manager}>{children}</TextSelectionContext.Provider>;
}

export const useTextSelection = () => {
  const context = useContext(TextSelectionContext);
  if (!context) {
    throw new Error("useTextSelection must be used within TextSelectionProvider");
  }
  return context;
};
