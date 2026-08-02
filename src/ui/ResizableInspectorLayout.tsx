/**
 * ResizableInspectorLayout — split layout with draggable divider and persisted width.
 * BX.2 implementation: replaces App ownership of .split/.single with a single
 * layout component that manages the inspector width through SettingsStore.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SidecarDb } from '../core/accompaniment/store.ts';
import { clampInspectorWidth, isNarrowViewport, getMaxInspectorWidth } from '../core/ui/inspectorLayout.ts';
import type { InspectorWidth } from '../core/ui/inspectorLayout.ts';

interface Props {
  main: React.ReactNode;
  inspector: React.ReactNode; // MeaningPanel or JournalSidecar or null
  sidecar: SidecarDb | null;
}

export default function ResizableInspectorLayout({ main, inspector, sidecar }: Props) {
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [inspectorWidth, setInspectorWidthState] = useState<InspectorWidth>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);
  const widthAtDragStart = useRef(0);

  // Hydrate inspectorWidth from SettingsStore on mount
  useEffect(() => {
    if (!sidecar) return;

    const stored = sidecar.getSetting('layout.inspectorWidth');
    if (stored !== null) {
      const parsed = JSON.parse(stored) as InspectorWidth;
      const clamped = clampInspectorWidth(parsed, viewportWidth);
      setInspectorWidthState(clamped);
    } else {
      // No stored preference, start with default
      setInspectorWidthState(clampInspectorWidth(null, viewportWidth));
    }
  }, [sidecar, viewportWidth]);

  // Persist inspectorWidth to SettingsStore after hydration
  const persistWidth = useCallback((width: InspectorWidth) => {
    if (sidecar) {
      sidecar.setSetting('layout.inspectorWidth', JSON.stringify(width));
    }
  }, [sidecar]);

  // Track viewport width changes for responsive clamping
  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setViewportWidth(newWidth);
      // Re-clamp current preference on viewport change
      setInspectorWidthState(prev => clampInspectorWidth(prev, newWidth));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pointer capture drag handling
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current) return;

    dragStartX.current = e.clientX;
    widthAtDragStart.current = inspectorWidth ?? 340;
    setIsDragging(true);

    const divider = dividerRef.current;
    if (divider) {
      divider.setPointerCapture(e.pointerId);
    }
  }, [inspectorWidth]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;

    const deltaX = dragStartX.current - e.clientX;
    const newWidth = Math.max(0, widthAtDragStart.current + deltaX);
    const clamped = clampInspectorWidth(newWidth, viewportWidth);
    setInspectorWidthState(clamped);
  }, [isDragging, viewportWidth]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;

    const divider = dividerRef.current;
    if (divider) {
      divider.releasePointerCapture(e.pointerId);
    }

    setIsDragging(false);
    // Persist final width after drag completes
    if (inspectorWidth !== null) {
      persistWidth(inspectorWidth);
    }
  }, [isDragging, inspectorWidth, persistWidth]);

  // Keyboard navigation (ArrowLeft/Right: 16px, Home/End: limits)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const maxWidth = getMaxInspectorWidth(viewportWidth);

    switch (e.key) {
      case 'ArrowLeft': {
        e.preventDefault();
        const step = 16;
        const newWidth = inspectorWidth === null ? 340 : Math.max(280, inspectorWidth - step);
        const clamped = clampInspectorWidth(newWidth, viewportWidth);
        setInspectorWidthState(clamped);
        break;
      }
      case 'ArrowRight': {
        e.preventDefault();
        const step = 16;
        const newWidth = inspectorWidth === null ? 340 : Math.min(maxWidth, inspectorWidth + step);
        const clamped = clampInspectorWidth(newWidth, viewportWidth);
        setInspectorWidthState(clamped);
        break;
      }
      case 'Home': {
        e.preventDefault();
        const minWidth = 280;
        setInspectorWidthState(minWidth);
        break;
      }
      case 'End': {
        e.preventDefault();
        setInspectorWidthState(maxWidth);
        break;
      }
    }
  }, [inspectorWidth, viewportWidth]);

  const maxWidth = getMaxInspectorWidth(viewportWidth);
  const minWidth = 280;

  // At narrow width, show inspector as closable overlay
  const isNarrow = isNarrowViewport(viewportWidth);
  const hasInspector = inspector !== null;

  if (!hasInspector) {
    return (
      <div className="single resizable-inspector-layout">
        {main}
      </div>
    );
  }

  if (isNarrow) {
    return (
      <div className="single resizable-inspector-layout narrow">
        {main}
        {isOverlayOpen && (
          <div className="inspector-overlay">
            <button
              className="inspector-overlay-close"
              onClick={() => setIsOverlayOpen(false)}
              aria-label="Close inspector"
            >
              ✕
            </button>
            {inspector}
          </div>
        )}
        {!isOverlayOpen && (
          <button
            className="inspector-open-btn"
            onClick={() => setIsOverlayOpen(true)}
            aria-label="Open inspector"
          >
            ℹ
          </button>
        )}
      </div>
    );
  }

  // Desktop split layout
  const currentWidth = inspectorWidth ?? 340;

  return (
    <div
      className="split resizable-inspector-layout"
      ref={containerRef}
      style={{
        '--inspector-width': `${currentWidth}px`,
      } as React.CSSProperties}
    >
      <div className="content inspector-main">
        {main}
      </div>

      <div
        ref={dividerRef}
        className="inspector-divider"
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={currentWidth}
        aria-valuemin={minWidth}
        aria-valuemax={maxWidth}
        aria-label={`Inspector width: ${currentWidth}px`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <div className="divider-handle" />
      </div>

      <div className="exegesis inspector-pane">
        {inspector}
      </div>
    </div>
  );
}