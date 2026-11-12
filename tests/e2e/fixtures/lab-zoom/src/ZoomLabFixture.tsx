/**
 * A zoomable lab for tests/e2e/zoom-pan.spec.ts: a 40 km wide map (grid, route and base) in a group
 * with the view's transform, a handle drawn at the view's screen point (it keeps its size) that is
 * dragged or moved with the arrows (and revealed when they take it out of view), «Ajustar» framing
 * the route, the time badge in the top-right corner and ZoomOverlay along the bottom: the scale
 * bar («10 km», «500 m») and the buttons. `variant="row"` is a short canvas (200 px) with the
 * buttons in a row, the hard case for the corners.
 */
import { useState, type JSX, type KeyboardEvent } from 'react';
import { formatNumber } from '../../../../../src/lib/format';
import { useElementWidth } from '../../../../../src/components/hooks/useElementWidth';
import LabShell from '../../../../../src/components/lab/LabShell';
import type { ScaleUnit } from '../../../../../src/components/lab/scaleBarMath';
import TimeScaleBadge from '../../../../../src/components/lab/TimeScaleBadge';
import { useDrag } from '../../../../../src/components/lab/useDrag';
import { useZoomPan, type ZoomPan } from '../../../../../src/components/lab/useZoomPan';
import ZoomOverlay from '../../../../../src/components/lab/ZoomOverlay';

/** The server draws at this width until the scene measures its own. */
const FALLBACK_WIDTH = 720;
const VARIANTS = {
  column: { height: 320, testId: 'zoom-fixture-lab', title: 'Laboratorio de prueba del zoom' },
  row: {
    height: 200,
    testId: 'zoom-fixture-lab-row',
    title: 'Laboratorio de prueba del zoom en fila',
  },
} as const;
type Variant = keyof typeof VARIANTS;
/** The time badge declares a fixed factor here: this lab has no clock. */
const TIME_FACTOR = 20;
/** «Ajustar» frames the route, padded: km. */
const ROUTE_BOX_KM = { x: 2, y: 4, width: 37, height: 24 } as const;
const WORLD_WIDTH_KM = 40;
const GRID_KM = 5;
const M_PER_KM = 1000;
const HANDLE_RADIUS = 10;
const KEY_STEP_KM = 1;
const START = { x: 10, y: 10 } as const;
const UNITS: readonly ScaleUnit[] = [
  { label: 'm', size: 1 },
  { label: 'km', size: M_PER_KM },
];
const ROUTE_KM = [
  [4, 26],
  [10, 10],
  [20, 15],
  [31, 6],
  [37, 22],
] as const;
const ARROWS: Readonly<Record<string, { x: number; y: number }>> = {
  ArrowLeft: { x: -KEY_STEP_KM, y: 0 },
  ArrowRight: { x: KEY_STEP_KM, y: 0 },
  ArrowUp: { x: 0, y: -KEY_STEP_KM },
  ArrowDown: { x: 0, y: KEY_STEP_KM },
};

interface SceneSize {
  width: number;
  height: number;
  pxPerKm: number;
}

function Grid({ width, height, pxPerKm }: SceneSize): JSX.Element {
  const rows = Math.ceil(height / (GRID_KM * pxPerKm));
  const columns = WORLD_WIDTH_KM / GRID_KM;
  return (
    <g stroke="var(--grid)" strokeWidth={1}>
      {Array.from({ length: columns + 1 }, (_, i) => (
        <line
          key={`c${i}`}
          vectorEffect="non-scaling-stroke"
          x1={i * GRID_KM * pxPerKm}
          x2={i * GRID_KM * pxPerKm}
          y2={height}
        />
      ))}
      {Array.from({ length: rows + 1 }, (_, i) => (
        <line
          key={`r${i}`}
          vectorEffect="non-scaling-stroke"
          y1={i * GRID_KM * pxPerKm}
          y2={i * GRID_KM * pxPerKm}
          x2={width}
        />
      ))}
    </g>
  );
}

/** The arrows move the handle a kilometre and bring it back into view if they took it out. */
function handleKeysFor(zoom: ZoomPan, pxPerKm: number, move: (next: Point) => void) {
  return (event: KeyboardEvent<SVGGElement>, at: Point) => {
    const step = ARROWS[event.key];
    if (!step) return;
    event.preventDefault();
    const next = { x: at.x + step.x, y: at.y + step.y };
    move(next);
    const radius = HANDLE_RADIUS / zoom.view.scale;
    const centre = { x: next.x * pxPerKm, y: next.y * pxPerKm };
    zoom.reveal({
      x: centre.x - radius,
      y: centre.y - radius,
      width: 2 * radius,
      height: 2 * radius,
    });
  };
}

interface Point {
  x: number;
  y: number;
}

function Scene({
  zoom,
  size,
  handle,
  setHandle,
}: {
  zoom: ZoomPan;
  size: SceneSize;
  handle: Point;
  setHandle(next: Point): void;
}): JSX.Element {
  const { width, height, pxPerKm } = size;
  const drag = useDrag((point) => {
    const world = zoom.toWorld(point);
    setHandle({ x: world.x / pxPerKm, y: world.y / pxPerKm });
  });
  const onHandleKey = handleKeysFor(zoom, pxPerKm, setHandle);
  const at = zoom.toScreen({ x: handle.x * pxPerKm, y: handle.y * pxPerKm });
  const route = ROUTE_KM.map(([x, y]) => `${x * pxPerKm},${y * pxPerKm}`).join(' ');
  return (
    <svg
      data-testid="zoom-scene"
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      className="block"
    >
      <rect width={width} height={height} fill="var(--bg-elevated)" />
      <g data-zoom-content="" transform={zoom.transform}>
        <Grid {...size} />
        <polyline
          points={route}
          fill="none"
          stroke="var(--chart-2)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={20 * pxPerKm} cy={15 * pxPerKm} r={2 * pxPerKm} fill="var(--chart-1)" />
      </g>
      <g
        data-testid="zoom-handle"
        role="slider"
        tabIndex={0}
        aria-label="Punto de prueba"
        aria-valuemin={0}
        aria-valuemax={WORLD_WIDTH_KM}
        aria-valuenow={Number(handle.x.toFixed(1))}
        aria-valuetext={`x = ${formatNumber(handle.x, { precision: 1, unit: 'km' })}`}
        className="cursor-grab outline-none"
        onKeyDown={(event) => onHandleKey(event, handle)}
        {...drag}
      >
        <circle cx={at.x} cy={at.y} r={HANDLE_RADIUS} fill="var(--fg)" />
      </g>
    </svg>
  );
}

export default function ZoomLabFixture({ variant = 'column' }: { variant?: Variant }): JSX.Element {
  const { height, testId, title } = VARIANTS[variant];
  const [wrapperRef, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const pxPerKm = width / WORLD_WIDTH_KM;
  const fit = {
    x: ROUTE_BOX_KM.x * pxPerKm,
    y: ROUTE_BOX_KM.y * pxPerKm,
    width: ROUTE_BOX_KM.width * pxPerKm,
    height: ROUTE_BOX_KM.height * pxPerKm,
  };
  const zoom = useZoomPan({ label: 'Mapa de prueba', fit });
  const [handle, setHandle] = useState<Point>(START);

  return (
    <LabShell
      title={title}
      testId={testId}
      readouts={[
        { id: 'x', label: 'Punto, x', value: handle.x, unit: 'km', precision: 1 },
        { id: 'y', label: 'Punto, y', value: handle.y, unit: 'km', precision: 1 },
      ]}
      onReset={() => {
        zoom.fit();
        setHandle(START);
      }}
      levels={{ params: <p className="text-sm">Sin parámetros.</p>, display: [] }}
      notes={{
        usage: [
          'Acerca el mapa con los botones, con Ctrl y la rueda o pellizcando; arrastra el fondo para desplazarlo. Con el lienzo enfocado con el teclado: + y − acercan y alejan, 0 ajusta y las flechas desplazan (entonces también la rueda sola acerca).',
        ],
      }}
    >
      <div ref={wrapperRef}>
        <div {...zoom.viewportProps} className="relative">
          <Scene
            zoom={zoom}
            size={{ width, height, pxPerKm }}
            handle={handle}
            setHandle={setHandle}
          />
          <TimeScaleBadge factor={TIME_FACTOR} />
          <ZoomOverlay
            zoom={zoom}
            orientation={variant}
            scaleBar={{ pxPerUnit: (pxPerKm / M_PER_KM) * zoom.view.scale, units: UNITS }}
          />
        </div>
      </div>
    </LabShell>
  );
}
