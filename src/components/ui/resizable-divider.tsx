'use client';

import { useCallback, useRef, useEffect, useState } from 'react';

interface ResizableDividerProps {
  direction: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
  onResizeEnd?: () => void;
  onDoubleClick?: () => void;
}

export function ResizableDivider({
  direction,
  onResize,
  onResizeEnd,
  onDoubleClick,
}: ResizableDividerProps) {
  const [dragging, setDragging] = useState(false);
  const startPos = useRef(0);
  const onResizeRef = useRef(onResize);
  const onResizeEndRef = useRef(onResizeEnd);

  // Refs aktuell halten, damit der Effect stabil bleibt
  useEffect(() => { onResizeRef.current = onResize; }, [onResize]);
  useEffect(() => { onResizeEndRef.current = onResizeEnd; }, [onResizeEnd]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);
      startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
    },
    [direction]
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - startPos.current;
      startPos.current = currentPos;
      onResizeRef.current(delta);
    };

    const handleMouseUp = () => {
      setDragging(false);
      onResizeEndRef.current?.();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, direction]);

  const isHorizontal = direction === 'horizontal';

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={onDoubleClick}
      className="shrink-0 relative group"
      style={{
        cursor: isHorizontal ? 'col-resize' : 'row-resize',
        width: isHorizontal ? '5px' : '100%',
        height: isHorizontal ? '100%' : '5px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Sichtbare Linie */}
      <div
        style={{
          position: 'absolute',
          ...(isHorizontal
            ? { top: 0, bottom: 0, left: '2px', width: '1px' }
            : { left: 0, right: 0, top: '2px', height: '1px' }),
          background: dragging ? '#22d3ee' : '#1a2028',
          transition: dragging ? 'none' : 'background 0.15s ease',
        }}
        className={dragging ? '' : 'group-hover:!bg-[#22d3ee]'}
      />
      {/* Breiterer Drag-Indikator */}
      {dragging && (
        <div
          style={{
            position: 'absolute',
            ...(isHorizontal
              ? { top: 0, bottom: 0, left: '1px', width: '3px' }
              : { left: 0, right: 0, top: '1px', height: '3px' }),
            background: '#22d3ee',
            opacity: 0.3,
          }}
        />
      )}
    </div>
  );
}
