"use client";

import { useLayoutEffect, useRef } from "react";

export function useFlipRows(flipKey: unknown) {
  const bodyRef = useRef<HTMLTableSectionElement>(null);
  const positionsRef = useRef<Map<string, number>>(new Map());

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;

    const rows = body.querySelectorAll<HTMLElement>("[data-flip-id]");
    const nextPositions = new Map<string, number>();

    rows.forEach((row) => {
      const id = row.dataset.flipId;
      if (!id) return;

      const top = row.getBoundingClientRect().top;
      nextPositions.set(id, top);

      const previousTop = positionsRef.current.get(id);
      if (previousTop !== undefined) {
        const deltaY = previousTop - top;
        if (Math.abs(deltaY) > 1) {
          row.style.transform = `translateY(${deltaY}px)`;
          row.style.transition = "transform 0s";

          requestAnimationFrame(() => {
            row.style.transition =
              "transform 350ms cubic-bezier(0.4, 0, 0.2, 1)";
            row.style.transform = "";
          });
        }
      }
    });

    positionsRef.current = nextPositions;
  }, [flipKey]);

  return bodyRef;
}
