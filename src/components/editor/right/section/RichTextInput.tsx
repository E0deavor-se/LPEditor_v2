"use client";

import { useRef } from "react";

type RichTextInputProps = {
  value: string;
  onChange: (value: string) => void;
  sectionId?: string;
  itemId?: string;
  disabled?: boolean;
};

export default function RichTextInput({
  value,
  onChange,
  sectionId,
  itemId,
  disabled,
}: RichTextInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <input
      ref={inputRef}
      type="text"
      className="ui-input h-7 w-full text-[12px]"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      data-kind="title"
      data-section-id={sectionId}
      data-item-id={itemId}
    />
  );
}
