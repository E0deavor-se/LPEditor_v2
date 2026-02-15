"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TooltipPlacement = "top" | "bottom";

type TooltipState = {
  text: string;
  visible: boolean;
  x: number;
  y: number;
  placement: TooltipPlacement;
};

const TOOLTIP_MARGIN = 8;

const getTooltipText = (el: HTMLElement) => {
  const aria = el.getAttribute("aria-label");
  if (aria && aria.trim()) {
    return aria.trim();
  }
  const stored = el.dataset.tooltipTitle;
  if (stored && stored.trim()) {
    return stored.trim();
  }
  const title = el.getAttribute("title");
  if (title && title.trim()) {
    el.dataset.tooltipTitle = title;
    el.removeAttribute("title");
    return title.trim();
  }
  return "";
};

const restoreTitle = (el: HTMLElement | null) => {
  if (!el) {
    return;
  }
  const stored = el.dataset.tooltipTitle;
  if (stored) {
    el.setAttribute("title", stored);
    delete el.dataset.tooltipTitle;
  }
};

export default function TooltipLayer() {
  const [mounted, setMounted] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>({
    text: "",
    visible: false,
    x: 0,
    y: 0,
    placement: "top",
  });
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const hideTooltip = () => {
    restoreTitle(targetRef.current);
    targetRef.current = null;
    setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  };

  const showTooltipFor = (el: HTMLElement) => {
    const text = getTooltipText(el);
    if (!text) {
      return;
    }
    if (targetRef.current && targetRef.current !== el) {
      restoreTitle(targetRef.current);
    }
    targetRef.current = el;
    setTooltip((prev) => ({
      ...prev,
      text,
      visible: true,
    }));
  };

  const updatePosition = () => {
    if (!tooltipRef.current || !targetRef.current) {
      return;
    }
    const rect = targetRef.current.getBoundingClientRect();
    const tooltipEl = tooltipRef.current;
    const width = tooltipEl.offsetWidth;
    const height = tooltipEl.offsetHeight;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const spaceAbove = rect.top - TOOLTIP_MARGIN;
    const spaceBelow = viewportHeight - rect.bottom - TOOLTIP_MARGIN;

    let placement: TooltipPlacement = "top";
    if (spaceAbove < height && spaceBelow > spaceAbove) {
      placement = "bottom";
    }

    let top =
      placement === "top"
        ? rect.top - height - TOOLTIP_MARGIN
        : rect.bottom + TOOLTIP_MARGIN;

    let left = rect.left + rect.width / 2 - width / 2;
    const minLeft = TOOLTIP_MARGIN;
    const maxLeft = Math.max(TOOLTIP_MARGIN, viewportWidth - width - TOOLTIP_MARGIN);
    left = Math.max(minLeft, Math.min(left, maxLeft));

    const minTop = TOOLTIP_MARGIN;
    const maxTop = Math.max(TOOLTIP_MARGIN, viewportHeight - height - TOOLTIP_MARGIN);
    top = Math.max(minTop, Math.min(top, maxTop));

    setTooltip((prev) => ({
      ...prev,
      x: left,
      y: top,
      placement,
    }));
  };

  useEffect(() => {
    if (!tooltip.visible) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      updatePosition();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [tooltip.visible, tooltip.text]);

  useEffect(() => {
    if (!tooltip.visible) {
      return;
    }
    const handleScroll = () => updatePosition();
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [tooltip.visible, tooltip.text]);

  useEffect(() => {
    const root = document.querySelector(".lp-editor");
    if (!root) {
      return;
    }

    const isDisabled = (el: HTMLElement) => {
      if (el.getAttribute("aria-disabled") === "true") {
        return true;
      }
      if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
        return el.disabled;
      }
      return false;
    };

    const handlePointerOver = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      const el = target.closest<HTMLElement>(
        "[aria-label], [title], [data-tooltip-title]"
      );
      if (!el || !root.contains(el) || isDisabled(el)) {
        return;
      }
      showTooltipFor(el);
    };

    const handlePointerOut = (event: PointerEvent) => {
      if (!targetRef.current) {
        return;
      }
      const related = event.relatedTarget as HTMLElement | null;
      if (related && targetRef.current.contains(related)) {
        return;
      }
      hideTooltip();
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      const el = target.closest<HTMLElement>(
        "[aria-label], [title], [data-tooltip-title]"
      );
      if (!el || !root.contains(el) || isDisabled(el)) {
        return;
      }
      showTooltipFor(el);
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (!targetRef.current) {
        return;
      }
      const related = event.relatedTarget as HTMLElement | null;
      if (related && targetRef.current.contains(related)) {
        return;
      }
      hideTooltip();
    };

    root.addEventListener("pointerover", handlePointerOver);
    root.addEventListener("pointerout", handlePointerOut);
    root.addEventListener("focusin", handleFocusIn);
    root.addEventListener("focusout", handleFocusOut);

    return () => {
      root.removeEventListener("pointerover", handlePointerOver);
      root.removeEventListener("pointerout", handlePointerOut);
      root.removeEventListener("focusin", handleFocusIn);
      root.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  if (!mounted) {
    return null;
  }

  const tooltipNode = (
    <div
      ref={tooltipRef}
      className={
        tooltip.visible ? "lp-editor-tooltip is-visible" : "lp-editor-tooltip"
      }
      data-placement={tooltip.placement}
      style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
      role="tooltip"
    >
      {tooltip.text}
    </div>
  );

  return createPortal(tooltipNode, document.body);
}
