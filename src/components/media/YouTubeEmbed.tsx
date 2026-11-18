import { useState, type JSX, type SyntheticEvent } from 'react';
import type { YouTubeSource } from '../../lib/media';
import { formatVideoDate } from '../../lib/videoMarkers';
import { thumbnailUrl, watchUrl, type ThumbnailQuality } from '../../lib/youtube';
import type { YouTubePlayer } from './useYouTubePlayer';

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
    <svg viewBox="0 0 16 16" className="ml-1 inline size-4 align-[-2px]" aria-hidden="true">
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
  video: YouTubeSource;
  /** Before hydration the facade is a plain link to YouTube; after, a button that embeds. */
  isHydrated: boolean;
  testId: string;
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
function VideoFacade({ video, isHydrated, testId, onPlay }: FacadeProps): JSX.Element {
  const action = isHydrated ? 'Reproducir el video aquí' : 'Ver el video en YouTube';
  const body = (
    <>
      <span className="sr-only">{`${action}:`}</span> <VideoThumbnail id={video.id} />
      <span
        lang="en"
        className="absolute inset-x-0 top-0 bg-linear-to-b from-black/80 to-transparent px-4 pt-3 pb-8 text-left text-sm font-semibold text-white sm:text-base"
      >
        {video.title}
      </span>
      <span className="absolute inset-0 grid place-items-center">
        <PlayIcon />
      </span>
    </>
  );
  return isHydrated ? (
    <button type="button" data-testid={`${testId}-facade`} onClick={onPlay} className={FACADE}>
      {body}
    </button>
  ) : (
    <a data-testid={`${testId}-facade`} href={watchUrl(video.id)} className={FACADE}>
      {body}
    </a>
  );
}

function PlayerFrame({ video, player }: { video: YouTubeSource; player: YouTubePlayer }) {
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

interface YouTubeEmbedProps {
  video: YouTubeSource;
  player: YouTubePlayer;
  isHydrated: boolean;
  /** The id the marker buttons point at with aria-controls. */
  playerId: string;
  testId: string;
}

/** The video's box: the facade until the reader asks for the player, then the iframe. */
export function YouTubeEmbed({ video, player, isHydrated, playerId, testId }: YouTubeEmbedProps) {
  return (
    <div id={playerId} className="overflow-hidden rounded-base border border-border">
      {player.phase === 'facade' ? (
        <VideoFacade
          video={video}
          isHydrated={isHydrated}
          testId={testId}
          onPlay={() => player.play(0, true)}
        />
      ) : (
        <PlayerFrame video={video} player={player} />
      )}
    </div>
  );
}

/** The credit line: whose video it is, when it was published and where it lives. */
export function YouTubeCredit({ video, testId }: { video: YouTubeSource; testId: string }) {
  return (
    <p data-testid={`${testId}-credit`} className="m-0 text-sm text-fg-muted">
      {`Video: ${video.channel}, ${formatVideoDate(video.published)}. `}
      <a href={watchUrl(video.id)}>
        Ver en YouTube
        <ExternalIcon />
      </a>
    </p>
  );
}
