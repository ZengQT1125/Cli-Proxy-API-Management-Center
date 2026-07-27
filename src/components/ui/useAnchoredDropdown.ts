import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';

const DEFAULT_VIEWPORT_MARGIN = 8;
const DEFAULT_DROPDOWN_OFFSET = 6;
const DEFAULT_DROPDOWN_MAX_HEIGHT = 240;
const DEFAULT_DROPDOWN_Z_INDEX = 2010;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const resolveDropdownStyle = (element: HTMLElement, maxDropdownHeight: number): CSSProperties => {
  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(rect.width, Math.max(0, viewportWidth - DEFAULT_VIEWPORT_MARGIN * 2));
  const left = clamp(
    rect.left,
    DEFAULT_VIEWPORT_MARGIN,
    Math.max(DEFAULT_VIEWPORT_MARGIN, viewportWidth - width - DEFAULT_VIEWPORT_MARGIN)
  );
  const spaceBelow =
    viewportHeight - rect.bottom - DEFAULT_VIEWPORT_MARGIN - DEFAULT_DROPDOWN_OFFSET;
  const spaceAbove = rect.top - DEFAULT_VIEWPORT_MARGIN - DEFAULT_DROPDOWN_OFFSET;
  const direction = spaceBelow >= maxDropdownHeight || spaceBelow >= spaceAbove ? 'down' : 'up';
  const maxHeight = Math.max(
    0,
    Math.min(maxDropdownHeight, direction === 'down' ? spaceBelow : spaceAbove)
  );

  return direction === 'down'
    ? {
        position: 'fixed',
        top: rect.bottom + DEFAULT_DROPDOWN_OFFSET,
        left,
        width,
        maxHeight,
        zIndex: DEFAULT_DROPDOWN_Z_INDEX,
      }
    : {
        position: 'fixed',
        bottom: viewportHeight - rect.top + DEFAULT_DROPDOWN_OFFSET,
        left,
        width,
        maxHeight,
        zIndex: DEFAULT_DROPDOWN_Z_INDEX,
      };
};

export function useAnchoredDropdown<T extends HTMLElement>(
  anchorRef: RefObject<T | null>,
  open: boolean,
  maxHeight = DEFAULT_DROPDOWN_MAX_HEIGHT
): CSSProperties | null {
  const rafRef = useRef<number | null>(null);
  const [style, setStyle] = useState<CSSProperties | null>(null);

  const updateStyle = useCallback(() => {
    if (!anchorRef.current) return;
    setStyle(resolveDropdownStyle(anchorRef.current, maxHeight));
  }, [anchorRef, maxHeight]);

  const scheduleUpdate = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      updateStyle();
    });
  }, [updateStyle]);

  useLayoutEffect(() => {
    if (!open) {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    updateStyle();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' && anchorRef.current
        ? new ResizeObserver(scheduleUpdate)
        : null;

    if (resizeObserver && anchorRef.current) {
      resizeObserver.observe(anchorRef.current);
    }

    window.addEventListener('resize', scheduleUpdate);
    window.addEventListener('scroll', scheduleUpdate, true);

    return () => {
      window.removeEventListener('resize', scheduleUpdate);
      window.removeEventListener('scroll', scheduleUpdate, true);
      resizeObserver?.disconnect();
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [anchorRef, open, scheduleUpdate, updateStyle]);

  return style;
}
