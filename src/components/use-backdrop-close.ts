"use client";

import { useRef } from "react";

/**
 * Sluit een <dialog> bij een klik op de achtergrond, maar alleen als de muis daar ook
 * is ingedrukt. Tekst selecteren en buiten het vak loslaten sluit de popup dus niet.
 */
export function useBackdropClose(close: () => void) {
  const pressedOnBackdrop = useRef(false);
  return {
    onMouseDown: (e: React.MouseEvent<HTMLDialogElement>) => {
      pressedOnBackdrop.current = e.target === e.currentTarget;
    },
    onClick: (e: React.MouseEvent<HTMLDialogElement>) => {
      if (pressedOnBackdrop.current && e.target === e.currentTarget) close();
      pressedOnBackdrop.current = false;
    },
  };
}
