import { useEffect, useId, useState, type JSX } from 'react';
import {
  activeMarkerIndex,
  formatTimestamp,
  formatVideoDate,
  requireEmbeddedVideo,
  type EmbeddedVideo,
  type VideoMarker,
} from '../../../lib/videoMarkers';
import { watchUrl } from '../../../lib/youtube';
import { useYouTubePlayer, type YouTubePlayer } from './useYouTubePlayer';

export interface HapticVideoProps {
  /** The third-party video, embedded from YouTube. */
  video: EmbeddedVideo;
  /** The analysed instants, in ascending time. */
  markers: VideoMarker[];
  /** What is seen and heard in the analysed fragments, for readers who cannot play the video. */
  transcript: string;
}

const NO_MARKER = -1;
const MARKER_BASE =
  'inline-flex min-h-9 items-center gap-2 self-start rounded-base border px-3 py-1.5 text-left text-sm font-medium text-fg no-underline motion-safe:transition-colors';
const MARKER_ACTIVE = 'border-accent bg-accent/10';
const MARKER_IDLE = 'border-border bg-bg-elevated hover:border-fg-muted';
const FACADE =
  'group flex aspect-video w-full flex-col items-center justify-center gap-3 bg-bg p-5 text-center text-fg no-underline sm:p-8';
const IFRAME_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';

function PlayIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 48 48"
      className="size-14 shrink-0 text-accent motion-safe:transition-transform motion-safe:group-hover:scale-105"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="23" fill="currentColor" />
      <path d="M19 15.5v17l14-8.5z" fill="var(--bg)" />
    </svg>
  );
}

function ExternalIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 16 16" className="ml-1 inline size-3.5 align-[-2px]" aria-hidden="true">
      <path
        d="M6 3H3v10h10v-3M9 3h4v4M13 3 7.5 8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface FacadeProps {
  video: EmbeddedVideo;
  /** Before hydration the facade is a plain link to YouTube; after, a button that embeds. */
  isHydrated: boolean;
  onPlay(): void;
}

/** The privacy facade: names the video and loads nothing from YouTube until it is pressed. */
function VideoFacade({ video, isHydrated, onPlay }: FacadeProps): JSX.Element {
  const action = isHydrated ? 'Reproducir el video aquí' : 'Ver el video en YouTube';
  const body = (
    <>
      <PlayIcon />
      <span className="text-base font-semibold">{action}</span>
      <span lang="en" className="max-w-[34rem] text-sm font-medium">
        {video.title}
      </span>
      <span className="text-xs text-fg-muted">
        {`${video.channel} · ${formatTimestamp(video.duration)} · ${video.language}`}
      </span>
      <span className="text-xs text-fg-muted">
        Se carga desde youtube-nocookie.com solo al pulsar.
      </span>
    </>
  );
  return isHydrated ? (
    <button type="button" data-testid="haptic-video-facade" onClick={onPlay} className={FACADE}>
      {body}
    </button>
  ) : (
    <a data-testid="haptic-video-facade" href={watchUrl(video.id)} className={FACADE}>
      {body}
    </a>
  );
}

function PlayerFrame({ video, player }: { video: EmbeddedVideo; player: YouTubePlayer }) {
  return (
    <iframe
      ref={player.frameRef}
      src={player.src}
      title={`Video de YouTube: «${video.title}», de ${video.channel}`}
      allow={IFRAME_ALLOW}
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      onLoad={player.subscribe}
      className="block aspect-video w-full border-0 bg-black"
    />
  );
}

/** The credit line: whose video it is, when it was published and where it lives. */
function VideoCredit({ video }: { video: EmbeddedVideo }): JSX.Element {
  return (
    <p data-testid="haptic-video-credit" className="m-0 text-sm text-fg-muted">
      {`Video de terceros; no es de mi autoría: ${video.channel}, ${formatVideoDate(video.published)}. `}
      <a href={watchUrl(video.id)}>
        Ver en YouTube
        <ExternalIcon />
      </a>
    </p>
  );
}

interface MarkerItemProps {
  marker: VideoMarker;
  videoId: string;
  playerId: string;
  isActive: boolean;
  /** Without JS the label links to the instant on YouTube; hydrated, it seeks the player. */
  onSeek?: () => void;
}

/** One analysed instant: a seek control (or link) and its always-visible paragraph. */
function MarkerItem({ marker, videoId, playerId, isActive, onSeek }: MarkerItemProps) {
  const label = (
    <>
      <span className="font-mono tabular-nums">{formatTimestamp(marker.time)}</span>
      {` · ${marker.title}`}
    </>
  );
  const className = `${MARKER_BASE} ${isActive ? MARKER_ACTIVE : MARKER_IDLE}`;
  return (
    <li className="m-0 flex flex-col gap-1.5">
      {onSeek ? (
        <button
          type="button"
          data-testid="marker-label"
          aria-current={isActive ? 'true' : undefined}
          aria-controls={playerId}
          onClick={onSeek}
          className={className}
        >
          {label}
        </button>
      ) : (
        <a data-testid="marker-label" href={watchUrl(videoId, marker.time)} className={className}>
          {label}
        </a>
      )}
      <p data-testid="marker-analysis" className="m-0 text-sm">
        {marker.analysis}
      </p>
    </li>
  );
}

/** The highlighted marker: the playback position once the player reports it, else the last pick. */
function useActiveMarker(markers: VideoMarker[], player: YouTubePlayer) {
  const [picked, setPicked] = useState(NO_MARKER);
  const times = markers.map(({ time }) => time);
  const active =
    player.currentTime === undefined ? picked : activeMarkerIndex(times, player.currentTime);
  return { active, pick: setPicked };
}

/**
 * Tema 5's multimedia resource: a third-party YouTube video behind a privacy facade, its credit,
 * a description of the analysed fragments and the timestamped analysis. Each marker seeks the
 * player (or opens it at that instant) and stays highlighted while playback is past it; without
 * JS every control is a link to YouTube and the written analysis reads the same.
 */
export default function HapticVideo({ video, markers, transcript }: HapticVideoProps) {
  requireEmbeddedVideo(video, markers);
  const playerId = useId();
  const [isHydrated, setIsHydrated] = useState(false);
  const player = useYouTubePlayer(video.id);
  const { active, pick } = useActiveMarker(markers, player);
  useEffect(() => setIsHydrated(true), []);

  return (
    <div
      data-testid="haptic-video-player"
      data-state={player.phase}
      className="flex min-w-0 flex-col gap-4"
    >
      <div id={playerId} className="overflow-hidden rounded-base border border-border">
        {player.phase === 'facade' ? (
          <VideoFacade video={video} isHydrated={isHydrated} onPlay={() => player.play(0, true)} />
        ) : (
          <PlayerFrame video={video} player={player} />
        )}
      </div>
      <VideoCredit video={video} />
      <details className="text-sm">
        <summary className="cursor-pointer text-fg-muted">
          Descripción de los fragmentos analizados
        </summary>
        <p className="mb-0 mt-2">{transcript}</p>
      </details>
      <div className="flex flex-col gap-3 rounded-base border border-border bg-bg-elevated p-4">
        <p className="m-0 text-xs font-medium uppercase tracking-wider text-fg-muted">
          Análisis por instante
        </p>
        <ol data-testid="haptic-video-markers" className="m-0 flex list-none flex-col gap-4 p-0">
          {markers.map((marker, index) => (
            <MarkerItem
              key={marker.time}
              marker={marker}
              videoId={video.id}
              playerId={playerId}
              isActive={index === active}
              onSeek={
                isHydrated
                  ? () => {
                      pick(index);
                      player.seek(marker.time);
                    }
                  : undefined
              }
            />
          ))}
        </ol>
      </div>
    </div>
  );
}
