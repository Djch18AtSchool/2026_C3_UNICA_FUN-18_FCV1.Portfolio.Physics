import { useEffect, useId, useRef, useState } from 'react';
import type { HapticVideoProps, VideoMarker } from '../../../lib/data/triggerModel';
import { withBase } from '../../../lib/url';

const SECONDS_PER_MINUTE = 60;
/** A seek lands on the nearest frame, a few ms before the requested time; still "at" the marker. */
const SEEK_TOLERANCE_S = 0.05;

const BUTTON_BASE =
  'inline-flex min-h-9 items-center gap-2 self-start rounded-base border px-3 py-1.5 text-left text-sm font-medium text-fg transition-colors';
const BUTTON_ACTIVE = 'border-accent bg-accent/10';
const BUTTON_IDLE = 'border-border bg-bg-elevated hover:border-fg-muted';

/** 18 → "0:18", 75 → "1:15". */
function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);
  const rest = Math.floor(seconds % SECONDS_PER_MINUTE);
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

/** Index of the last marker (in ascending time order) the playback has reached, or −1. */
function activeMarkerIndex(markers: VideoMarker[], time: number): number {
  return markers.map((marker) => marker.time <= time + SEEK_TOLERANCE_S).lastIndexOf(true);
}

interface FallbackProps {
  videoUrl: string;
  transcript: string;
}

/** Shown when the video cannot load (or is not published yet): transcript and a download link. */
function VideoFallback({ videoUrl, transcript }: FallbackProps) {
  return (
    <div
      data-testid="haptic-video-fallback"
      className="flex flex-col justify-center gap-4 p-5 sm:min-h-80 sm:p-8"
    >
      <div className="flex items-center gap-3">
        <svg
          viewBox="0 0 24 24"
          className="size-8 shrink-0 text-fg-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
        >
          <rect x="2.5" y="5" width="19" height="14" rx="1.5" strokeDasharray="3 2" />
          <path d="M10 9.5v5l4-2.5z" fill="currentColor" stroke="none" />
        </svg>
        <div>
          <p className="m-0 font-mono text-xs uppercase tracking-wider text-fg-muted">
            Video no disponible
          </p>
          <p className="m-0 text-base font-medium">
            El clip del DualSense aparecerá aquí en cuanto lo publique.
          </p>
        </div>
      </div>
      <p className="m-0 text-sm text-fg-muted">
        Mientras tanto, la transcripción describe la secuencia grabada y cada marca de tiempo de
        abajo conserva su análisis completo.
      </p>
      <div className="border-l-2 border-border pl-3">
        <p className="m-0 mb-1 text-xs font-medium uppercase tracking-wider text-fg-muted">
          Transcripción
        </p>
        <p data-testid="haptic-video-transcript" className="m-0 text-sm">
          {transcript}
        </p>
      </div>
      <a href={videoUrl} download className="self-start text-sm">
        Descargar el video (MP4)
      </a>
    </div>
  );
}

/**
 * The Tema 5 video with its timestamped analysis. Each marker seeks the video and stays
 * highlighted while playback is past it; the analysis paragraphs never depend on the video.
 */
export default function HapticVideo({ src, poster, markers, transcript }: HapticVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const transcriptId = useId();
  const [hasError, setHasError] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const videoUrl = withBase(src);
  const posterUrl = poster ? withBase(poster) : undefined;
  const activeIndex = activeMarkerIndex(markers, currentTime);

  useEffect(() => {
    setIsReady(true);
    // The server-rendered <video> starts loading before hydration; a 404 may already be in.
    if (videoRef.current?.error) setHasError(true);
  }, []);

  const seekTo = (time: number) => {
    if (videoRef.current) videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  return (
    <div
      data-testid="haptic-video-player"
      data-state={hasError ? 'error' : 'ok'}
      data-ready={isReady}
      className="flex min-w-0 flex-col gap-4"
    >
      <div className="overflow-hidden rounded-base border border-border bg-bg-elevated">
        {hasError ? (
          <VideoFallback videoUrl={videoUrl} transcript={transcript} />
        ) : (
          <video
            ref={videoRef}
            data-testid="haptic-video"
            controls
            preload="metadata"
            playsInline
            src={videoUrl}
            poster={posterUrl}
            aria-describedby={transcriptId}
            onError={() => setHasError(true)}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            className="block aspect-video w-full bg-black"
          />
        )}
      </div>
      {hasError ? null : (
        <details className="text-sm">
          <summary className="cursor-pointer text-fg-muted">Transcripción del video</summary>
          <p id={transcriptId} className="mb-0 mt-2">
            {transcript}
          </p>
        </details>
      )}
      <div className="flex flex-col gap-3 rounded-base border border-border bg-bg-elevated p-4">
        <p className="m-0 text-xs font-medium uppercase tracking-wider text-fg-muted">
          Análisis por instante
        </p>
        <ol data-testid="haptic-video-markers" className="m-0 flex list-none flex-col gap-4 p-0">
          {markers.map((marker, index) => {
            const isActive = index === activeIndex;
            return (
              <li key={marker.time} className="m-0 flex flex-col gap-1.5">
                <button
                  type="button"
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => seekTo(marker.time)}
                  className={`${BUTTON_BASE} ${isActive ? BUTTON_ACTIVE : BUTTON_IDLE}`}
                >
                  <span className="font-mono tabular-nums">{formatTimestamp(marker.time)}</span>
                  {` · ${marker.title}`}
                </button>
                <p data-testid="marker-analysis" className="m-0 text-sm">
                  {marker.analysis}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
