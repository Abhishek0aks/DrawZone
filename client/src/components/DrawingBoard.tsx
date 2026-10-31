import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { socket } from '../socket';
import { EVENTS } from '../types/events';
import type { Point } from '../types';
import DrawingToolbar, { COLORS } from './DrawingToolbar';

// The canvas has a FIXED logical size. Points are sent as fractions (0..1) of it, so every
// player sees the same picture no matter how big their screen is.
const W = 800;
const H = 600;
const BACKGROUND = '#FFFFFF';
const FLUSH_MS = 40;
const MAX_BATCH = 64;

function fillBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, W, H);
}
function paintDot(ctx: CanvasRenderingContext2D, p: Point, color: string, size: number) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x * W, p.y * H, size / 2, 0, Math.PI * 2);
  ctx.fill();
}
function paintLine(ctx: CanvasRenderingContext2D, a: Point, b: Point, color: string, size: number) {
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x * W, a.y * H);
  ctx.lineTo(b.x * W, b.y * H);
  ctx.stroke();
}
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

interface Props {
  canDraw: boolean;
}

export default function DrawingBoard({ canDraw }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [color, setColor] = useState(COLORS[0].value);
  const [size, setSize] = useState(8);
  const [eraser, setEraser] = useState(false);

  const isDrawing = useRef(false);
  const lastPoint = useRef<Point | null>(null);
  const buffer = useRef<Point[]>([]);
  const flushTimer = useRef<number | null>(null);
  const remote = useRef<{ last: Point | null; color: string; size: number }>({ last: null, color: '#172033', size: 8 });

  const getCtx = () => canvasRef.current?.getContext('2d') ?? null;

  // Receiving: paint what the drawer sends. Listeners are removed on unmount.
  useEffect(() => {
    const ctx = getCtx();
    if (ctx) fillBackground(ctx);

    const onStart = (d: { x: number; y: number; color: string; size: number }) => {
      const c = getCtx();
      if (!c) return;
      paintDot(c, d, d.color, d.size);
      remote.current = { last: { x: d.x, y: d.y }, color: d.color, size: d.size };
    };
    const onMove = (d: { points: Point[] }) => {
      const c = getCtx();
      if (!c) return;
      for (const p of d.points) {
        if (remote.current.last) paintLine(c, remote.current.last, p, remote.current.color, remote.current.size);
        else paintDot(c, p, remote.current.color, remote.current.size);
        remote.current.last = p;
      }
    };
    const onEnd = () => {
      remote.current.last = null;
    };
    const onClear = () => {
      const c = getCtx();
      if (c) fillBackground(c);
      remote.current.last = null;
    };

    socket.on(EVENTS.DRAWING_START, onStart);
    socket.on(EVENTS.DRAWING_MOVE, onMove);
    socket.on(EVENTS.DRAWING_END, onEnd);
    socket.on(EVENTS.CLEAR_CANVAS, onClear);
    return () => {
      socket.off(EVENTS.DRAWING_START, onStart);
      socket.off(EVENTS.DRAWING_MOVE, onMove);
      socket.off(EVENTS.DRAWING_END, onEnd);
      socket.off(EVENTS.CLEAR_CANVAS, onClear);
      if (flushTimer.current !== null) window.clearTimeout(flushTimer.current);
    };
  }, []);

  const flush = () => {
    flushTimer.current = null;
    while (buffer.current.length > 0) {
      socket.emit(EVENTS.DRAWING_MOVE, { points: buffer.current.splice(0, MAX_BATCH) });
    }
  };

  const toPoint = (e: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: clamp01((e.clientX - r.left) / r.width), y: clamp01((e.clientY - r.top) / r.height) };
  };
  const effective = () => ({ color: eraser ? BACKGROUND : color, size: eraser ? size * 3 : size });

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const ctx = getCtx();
    if (!ctx) return;
    const p = toPoint(e);
    const tool = effective();
    isDrawing.current = true;
    lastPoint.current = p;
    paintDot(ctx, p, tool.color, tool.size);
    socket.emit(EVENTS.DRAWING_START, { x: p.x, y: p.y, color: tool.color, size: tool.size });
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || !lastPoint.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const p = toPoint(e);
    const tool = effective();
    paintLine(ctx, lastPoint.current, p, tool.color, tool.size);
    lastPoint.current = p;
    buffer.current.push(p);
    if (flushTimer.current === null) flushTimer.current = window.setTimeout(flush, FLUSH_MS);
  };

  const endStroke = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPoint.current = null;
    flush();
    socket.emit(EVENTS.DRAWING_END, {});
  };

  const clear = () => {
    const ctx = getCtx();
    if (ctx) fillBackground(ctx);
    socket.emit(EVENTS.CLEAR_CANVAS, {});
  };

  return (
    <div className="board">
      {canDraw && (
        <DrawingToolbar color={color} size={size} eraser={eraser} onColor={setColor} onSize={setSize} onEraser={setEraser} onClear={clear} />
      )}
      <canvas
        ref={canvasRef}
        className={`canvas${canDraw ? ' canvas-live' : ''}`}
        width={W}
        height={H}
        role="img"
        aria-label={canDraw ? 'Drawing canvas. Draw with your mouse or finger.' : 'Drawing canvas. Watch the drawer and guess the word.'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
      />
    </div>
  );
}
