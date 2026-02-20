"use client";

import type { ReactNode } from "react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import type { DndContextProps } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

type SectionTreeProps = {
  items: string[];
  sensors: DndContextProps["sensors"];
  onDragEnd: (event: DragEndEvent) => void;
  children: ReactNode;
};

export default function SectionTree({
  items,
  sensors,
  onDragEnd,
  children,
}: SectionTreeProps) {
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col">{children}</div>
      </SortableContext>
    </DndContext>
  );
}
