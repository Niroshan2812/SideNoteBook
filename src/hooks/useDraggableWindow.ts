import { useState, useEffect, useCallback, useRef } from 'react';
import { StickyWindowGeometry } from '@/types';

const MIN_WIDTH = 260;
const MIN_HEIGHT = 190;
const HEADER_VISIBLE_MARGIN = 48;

export type ResizeDirection = 'se' | 'e' | 's';

interface UseDraggableWindowProps {
  geometry: StickyWindowGeometry;
  isPinned: boolean;
  isCollapsed: boolean;
  onGeometryCommit: (next: StickyWindowGeometry) => void;
}

export function clampGeometryToViewport(
  geo: StickyWindowGeometry,
  isCollapsed: boolean
): StickyWindowGeometry {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  const width = Math.max(MIN_WIDTH, Math.min(geo.width, vw - 24));
  const height = Math.max(MIN_HEIGHT, Math.min(geo.height, vh - 24));
  const effectiveHeight = isCollapsed ? 40 : height;

  const x = Math.max(8, Math.min(geo.x, vw - Math.min(width, 120)));
  const y = Math.max(
    8,
    Math.min(geo.y, vh - Math.min(effectiveHeight, HEADER_VISIBLE_MARGIN))
  );

  return { x, y, width, height };
}

export function useDraggableWindow({
  geometry,
  isPinned,
  isCollapsed,
  onGeometryCommit,
}: UseDraggableWindowProps) {
  const [liveGeo, setLiveGeo] = useState<StickyWindowGeometry>(() =>
    clampGeometryToViewport(geometry, isCollapsed)
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const interactionRef = useRef<{
    mode: 'drag' | 'resize' | null;
    resizeDir?: ResizeDirection;
    startX: number;
    startY: number;
    initialGeo: StickyWindowGeometry;
  }>({
    mode: null,
    startX: 0,
    startY: 0,
    initialGeo: geometry,
  });

  // Sync external storage geometry changes when not actively dragging/resizing
  useEffect(() => {
    if (!isDragging && !isResizing) {
      setLiveGeo(clampGeometryToViewport(geometry, isCollapsed));
    }
  }, [geometry, isCollapsed, isDragging, isResizing]);

  // Keep window inside viewport on browser resize
  useEffect(() => {
    const handleWindowResize = () => {
      setLiveGeo((prev) => clampGeometryToViewport(prev, isCollapsed));
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [isCollapsed]);

  const startDrag = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (isPinned) return;
      if (e.button !== 0) return;

      const target = e.target as HTMLElement;
      if (target.closest('[data-no-drag="true"]')) {
        return;
      }

      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);

      interactionRef.current = {
        mode: 'drag',
        startX: e.clientX,
        startY: e.clientY,
        initialGeo: liveGeo,
      };
      setIsDragging(true);
    },
    [isPinned, liveGeo]
  );

  const startResize = useCallback(
    (e: React.PointerEvent<HTMLElement>, dir: ResizeDirection) => {
      if (isPinned || isCollapsed) return;
      if (e.button !== 0) return;

      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);

      interactionRef.current = {
        mode: 'resize',
        resizeDir: dir,
        startX: e.clientX,
        startY: e.clientY,
        initialGeo: liveGeo,
      };
      setIsResizing(true);
    },
    [isPinned, isCollapsed, liveGeo]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const current = interactionRef.current;
      if (!current.mode) return;

      const dx = e.clientX - current.startX;
      const dy = e.clientY - current.startY;

      if (current.mode === 'drag') {
        const nextGeo = clampGeometryToViewport(
          {
            ...current.initialGeo,
            x: current.initialGeo.x + dx,
            y: current.initialGeo.y + dy,
          },
          isCollapsed
        );
        setLiveGeo(nextGeo);
      } else if (current.mode === 'resize') {
        const dir = current.resizeDir || 'se';
        const nextWidth =
          dir === 'se' || dir === 'e'
            ? Math.max(MIN_WIDTH, current.initialGeo.width + dx)
            : current.initialGeo.width;
        const nextHeight =
          dir === 'se' || dir === 's'
            ? Math.max(MIN_HEIGHT, current.initialGeo.height + dy)
            : current.initialGeo.height;

        const nextGeo = clampGeometryToViewport(
          {
            ...current.initialGeo,
            width: nextWidth,
            height: nextHeight,
          },
          isCollapsed
        );
        setLiveGeo(nextGeo);
      }
    },
    [isCollapsed]
  );

  const endInteraction = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!interactionRef.current.mode) return;

      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore pointer capture release errors
      }

      interactionRef.current.mode = null;
      setIsDragging(false);
      setIsResizing(false);
      onGeometryCommit(liveGeo);
    },
    [liveGeo, onGeometryCommit]
  );

  return {
    liveGeo,
    isDragging,
    isResizing,
    startDrag,
    startResize,
    onPointerMove,
    endInteraction,
  };
}
