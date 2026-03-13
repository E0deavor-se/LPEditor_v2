import {
  useCallback,
  useLayoutEffect,
  useRef,
  type TextareaHTMLAttributes,
} from "react";
import { autoGrowTextarea } from "@/src/lib/editor/textareaAutoGrow";

type InspectorTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  autoGrow?: boolean;
  minAutoGrowHeight?: number;
};

export default function InspectorTextarea({
  className = "",
  autoGrow = false,
  minAutoGrowHeight = 44,
  onInput,
  value,
  ...props
}: InspectorTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const resize = useCallback(() => {
    if (!autoGrow || !textareaRef.current) {
      return;
    }
    autoGrowTextarea(textareaRef.current, minAutoGrowHeight);
  }, [autoGrow, minAutoGrowHeight]);

  useLayoutEffect(() => {
    resize();
  }, [resize, value]);

  return (
    <textarea
      {...props}
      value={value}
      ref={(node) => {
        textareaRef.current = node;
      }}
      onInput={(event) => {
        resize();
        onInput?.(event);
      }}
      className={
        "ui-textarea w-full rounded border border-[var(--ui-border)] bg-[var(--surface)] px-1.5 py-1 text-[11px] " +
        className
      }
    />
  );
}
