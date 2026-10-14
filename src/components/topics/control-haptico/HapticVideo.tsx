import { useEffect, useId, useState, type JSX, type SyntheticEvent } from 'react';
import {
  activeMarkerIndex,
  formatTimestamp,
  formatVideoDate,
  requireEmbeddedVideo,
  type EmbeddedVideo,
  type VideoMarker,
} from '../../../lib/videoMarkers';
import { thumbnailUrl, watchUrl, type ThumbnailQuality } from '../../../lib/youtube';
import { useYouTubePlayer, type YouTubePlayer } from './useYouTubePlayer';

export interface HapticVideoProps {
  /** The video, embedded from YouTube. */
  video: EmbeddedVideo;
  /** The analysed instants, in ascending time. */
  markers: VideoMarker[];
}

const NO_MARKER = -1;
const MARKER_BASE =
  'inline-flex min-h-9 items-center gap-2 self-start rounded-base border px-3 py-1.5 text-left text-sm font-medium text-fg no-underline motion-safe:transition-colors';
const MARKER_ACTIVE = 'border-accent bg-accent/10';
const MARKER_IDLE = 'border-border bg-bg-elevated hover:border-fg-muted';
const FACADE = 'group relative block aspect-video w-full overflow-hidden bg-black no-underline';
/** YouTube answers a missing maxresdefault with a 120 × 90 grey placeholder, not always an error. */
const MISSING_THUMBNAIL_WIDTH = 120;
/** The declared size of the still (16:9); the box is aspect-video, so nothing shifts on load. */
const THUMBNAIL_WIDTH = 1280;
const THUMBNAIL_HEIGHT = 720;
const IFRAME_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';

function PlayIcon(): JSX.Element {
  return (
    <svg
      viewBox="0 0 48 48"
      className="size-16 shrink-0 text-accent drop-shadow-lg motion-safe:transition-transform motion-safe:group-hover:scale-105"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="23" fill="currentColor" />
      <path d="M19 15.5v17l14-8.5z" style={{ fill: 'var(--bg)' }} />
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

/**
 * The video's still, linked from i.ytimg.com (not copied into the repository): the 1280 px one,
 * falling back to hqdefault when YouTube has none. Privacy trade-off: this image is the one request
 * the page makes to YouTube before the reader presses play; the player itself still waits for it.
 */
function VideoThumbnail({ id }: { id: string }): JSX.Element {
  const [quality, setQuality] = useState<ThumbnailQuality>('maxresdefault');
  const fallBack = () => setQuality('hqdefault');
  const checkSize = (event: SyntheticEvent<HTMLImageElement>) => {
    if (event.currentTarget.naturalWidth <= MISSING_THUMBNAIL_WIDTH) fallBack();
  };
  return (
    <img
      src={thumbnailUrl(id, quality)}
      alt=""
      width={THUMBNAIL_WIDTH}
      height={THUMBNAIL_HEIGHT}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={fallBack}
      onLoad={checkSize}
      className="absolute inset-0 size-full object-cover"
    />
  );
}

/**
 * The facade: the video's still, its title and a play button. The still is decorative (alt="")
 * because the control already reads "Reproducir el video aquí" and the title.
 */
function VideoFacade({ video, isHydrated, onPlay }: FacadeProps): JSX.Element {
  const action = isHydrated ? 'Reproducir el video aquí' : 'Ver el video en YouTube';
  const body = (
    <>
      <span className="sr-only">{`${action}:`}</span> <VideoThumbnail id={video.id} />
      <span
        lang="en"
        className="absolute inset-x-0 top-0 bg-linear-to-b from-black/80 to-transparent px-4 pt-3 pb-10 text-left text-sm font-semibold text-white sm:text-base"
      >
        {video.title}
      </span>
      <span className="absolute inset-0 grid place-items-center">
        <PlayIcon />
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
      key={player.frameKey}
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
      {`Video: ${video.channel}, ${formatVideoDate(video.published)}. `}
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

interface MarkerListProps {
  markers: VideoMarker[];
  videoId: string;
  playerId: string;
  active: number;
  /** Seeks to marker `index`; undefined before hydration, when the markers are links. */
  onSeek?: (index: number) => void;
}

/** The "Análisis por instante" box: every marker with its analysis, in time order. */
function MarkerList({ markers, videoId, playerId, active, onSeek }: MarkerListProps) {
  return (
    <div className="flex flex-col gap-3 rounded-base border border-border bg-bg-elevated p-4">
      <p className="m-0 text-xs font-medium uppercase tracking-wider text-fg-muted">
        Análisis por instante
      </p>
      <ol data-testid="haptic-video-markers" className="m-0 flex list-none flex-col gap-4 p-0">
        {markers.map((marker, index) => (
          <MarkerItem
            key={marker.time}
            marker={marker}
            videoId={videoId}
            playerId={playerId}
            isActive={index === active}
            onSeek={onSeek ? () => onSeek(index) : undefined}
          />
        ))}
      </ol>
    </div>
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
 * Tema 5's multimedia resource: a YouTube video behind a facade (its still, title and play
 * button), its credit line and the timestamped analysis. Each marker seeks the
 * player (or opens it at that instant) and stays highlighted while playback is past it; without
 * JS every control is a link to YouTube and the written analysis reads the same.
 */
export default function HapticVideo({ video, markers }: HapticVideoProps) {
  requireEmbeddedVideo(video, markers);
  const playerId = useId();
  const [isHydrated, setIsHydrated] = useState(false);
  const player = useYouTubePlayer(video.id);
  const { active, pick } = useActiveMarker(markers, player);
  useEffect(() => setIsHydrated(true), []);
  const seekMarker = (index: number) => {
    pick(index);
    player.seek(markers[index].time);
  };

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
      <MarkerList
        markers={markers}
        videoId={video.id}
        playerId={playerId}
        active={active}
        onSeek={isHydrated ? seekMarker : undefined}
      />
    </div>
  );
}
