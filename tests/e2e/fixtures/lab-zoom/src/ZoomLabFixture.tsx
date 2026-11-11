/**
 * A zoomable lab for tests/e2e/zoom-pan.spec.ts: a 40 km wide map (grid, route and base) in a group
 * with the view's transform, a handle drawn at the view's screen point (it keeps its size) that is
 * dragged or moved with the arrows, the zoom buttons in the bottom-right corner and the scale bar
 * («10 km», «500 m») in the bottom-left.
 */
import { useState, type JSX, type KeyboardEvent } from 'react';
import { formatNumber } from '../../../../../src/lib/format';
import { useElementWidth } from '../../../../../src/components/hooks/useElementWidth';
import LabShell from '../../../../../src/components/lab/LabShell';
import ScaleBar from '../../../../../src/components/lab/ScaleBar';
import type { ScaleUnit } from '../../../../../src/components/lab/scaleBarMath';
import { useDrag } from '../../../../../src/components/lab/useDrag';
import { useZoomPan } from '../../../../../src/components/lab/useZoomPan';
import ZoomControls from '../../../../../src/components/lab/ZoomControls';

/** The server draws at this width until the scene measures its own. */
const FALLBACK_WIDTH = 720;
const SCENE_HEIGHT = 320;
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

function Grid({ width, pxPerKm }: { width: number; pxPerKm: number }): JSX.Element {
  const rows = Math.ceil(SCENE_HEIGHT / (GRID_KM * pxPerKm));
  const columns = WORLD_WIDTH_KM / GRID_KM;
  return (
    <g stroke="var(--grid)" strokeWidth={1}>
      {Array.from({ length: columns + 1 }, (_, i) => (
        <line
          key={`c${i}`}
          vectorEffect="non-scaling-stroke"
          x1={i * GRID_KM * pxPerKm}
          x2={i * GRID_KM * pxPerKm}
          y2={SCENE_HEIGHT}
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

export default function ZoomLabFixture(): JSX.Element {
  const [wrapperRef, width] = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const zoom = useZoomPan({ label: 'Mapa de prueba' });
  const [handle, setHandle] = useState<{ x: number; y: number }>(START);
  const pxPerKm = width / WORLD_WIDTH_KM;
  const drag = useDrag((point) => {
    const world = zoom.toWorld(point);
    setHandle({ x: world.x / pxPerKm, y: world.y / pxPerKm });
  });
  const onHandleKey = (event: KeyboardEvent<SVGGElement>) => {
    const step = ARROWS[event.key];
    if (!step) return;
    event.preventDefault();
    setHandle((last) => ({ x: last.x + step.x, y: last.y + step.y }));
  };
  const at = zoom.toScreen({ x: handle.x * pxPerKm, y: handle.y * pxPerKm });
  const route = ROUTE_KM.map(([x, y]) => `${x * pxPerKm},${y * pxPerKm}`).join(' ');

  return (
    <LabShell
      title="Laboratorio de prueba del zoom"
      testId="zoom-fixture-lab"
      readouts={[
        { id: 'x', label: 'Punto, x', value: handle.x, unit: 'km', precision: 1 },
        { id: 'y', label: 'Punto, y', value: handle.y, unit: 'km', precision: 1 },
      ]}
      onReset={() => {
        zoom.fit();
        setHandle(START);
      }}
      levels={{ params: <p className="text-sm">Sin parámetros.</p>, display: [] }}
      notes={{ usage: ['Acerca el mapa con los botones, la rueda con Ctrl o el pellizco.'] }}
    >
      <div ref={wrapperRef}>
        <div {...zoom.viewportProps} className="relative">
          <svg
            data-testid="zoom-scene"
            viewBox={`0 0 ${width} ${SCENE_HEIGHT}`}
            width="100%"
            height={SCENE_HEIGHT}
            className="block"
          >
            <rect width={width} height={SCENE_HEIGHT} fill="var(--bg-elevated)" />
            <g data-zoom-content="" transform={zoom.transform}>
              <Grid width={width} pxPerKm={pxPerKm} />
              <polyline
                points={route}
                fill="none"
                stroke="var(--chart-2)"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
              <circle
                data-testid="zoom-base"
                cx={20 * pxPerKm}
                cy={15 * pxPerKm}
                r={2 * pxPerKm}
                fill="var(--chart-1)"
              />
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
              onKeyDown={onHandleKey}
              {...drag}
            >
              <circle cx={at.x} cy={at.y} r={HANDLE_RADIUS} fill="var(--fg)" />
            </g>
          </svg>
          <ScaleBar pxPerUnit={(pxPerKm / M_PER_KM) * zoom.view.scale} units={UNITS} />
          <ZoomControls zoom={zoom} />
        </div>
      </div>
    </LabShell>
  );
}
