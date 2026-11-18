import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  requireMedia,
  requireRealSpeed,
  type HostedSource,
  type MediaMarker,
  type MediaSource,
  type RealSpeed,
  type YouTubeSource,
} from '../../lib/media';
import { withBase } from '../../lib/url';
import { activeMarkerIndex, formatTimestamp } from '../../lib/videoMarkers';
import { watchUrl } from '../../lib/youtube';
import InlineMath from '../lab/InlineMath';
import { HostedCredit, HostedPlayer, PlaybackFailure, seekAndPlay } from './HostedPlayer';
import { useRealSpeed, type RealSpeedToggle } from './useRealSpeed';
import { useYouTubePlayer } from './useYouTubePlayer';
import { YouTubeCredit, YouTubeEmbed } from './YouTubeEmbed';

export interface AnalyzedMediaProps {
  /** A YouTube video behind a facade, or a video or an audio served by the site. */
  source: MediaSource;
  /** The analysed instants, in ascending time. */
  markers: readonly MediaMarker[];
  /** Hosted media only: a toggle that changes the rate inside its ranges. */
  realSpeed?: RealSpeed;
  /** Prefix of the test ids: `-player`, `-facade`, `-credit`, `-markers`, `-real-speed`, `-error`. */
  testId: string;
}

const NO_MARKER = -1;
const MARKER_BASE =
  'inline-flex min-h-10 items-center gap-2 self-start rounded-base border px-3 py-2 text-left text-sm font-medium text-fg no-underline motion-safe:transition-colors';
const MARKER_ACTIVE = 'border-accent bg-accent/10';
const MARKER_IDLE = 'border-border bg-bg-elevated hover:border-fg-muted';
const PLAYER = 'flex min-w-0 flex-col gap-4';

interface MarkerItemProps {
  marker: MediaMarker;
  /** Where the label links before hydration (and without JS): the instant on YouTube or in the file. */
  href: string;
  playerId: string;
  isActive: boolean;
  /** Hydrated, the label seeks the player in place. */
  onSeek?: () => void;
}

/** One analysed instant: a seek control (or link) and its always-visible paragraph. */
function MarkerItem({ marker, href, playerId, isActive, onSeek }: MarkerItemProps) {
  const label = (
    <>
      <span className="tabular-nums">{formatTimestamp(marker.time)}</span>
      {` · ${marker.title}`}
    </>
  );
  const className = `${MARKER_BASE} ${isActive ? MARKER_ACTIVE : MARKER_IDLE}`;
  return (
    <li className="m-0 flex flex-col gap-2">
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
        <a data-testid="marker-label" href={href} className={className}>
          {label}
        </a>
      )}
      <p data-testid="marker-analysis" className="m-0 text-sm">
        <InlineMath text={marker.analysis} />
      </p>
    </li>
  );
}

interface MarkerListProps {
  markers: readonly MediaMarker[];
  hrefAt: (time: number) => string;
  playerId: string;
  active: number;
  /** What the polite region says: the instant the last seek went to. */
  announcement: string;
  testId: string;
  /** Seeks to marker `index`; undefined before hydration, when the markers are links. */
  onSeek?: (index: number) => void;
}

/** The "Análisis por instante" box: every marker with its analysis, in time order. */
function MarkerList({
  markers,
  hrefAt,
  playerId,
  active,
  announcement,
  testId,
  onSeek,
}: MarkerListProps) {
  return (
    <div className="flex flex-col gap-3 rounded-base border border-border bg-bg-elevated p-4">
      <p className="m-0 text-xs font-medium uppercase tracking-wider text-fg-muted">
        Análisis por instante
      </p>
      <ol data-testid={`${testId}-markers`} className="m-0 flex list-none flex-col gap-4 p-0">
        {markers.map((marker, index) => (
          <MarkerItem
            key={marker.time}
            marker={marker}
            href={hrefAt(marker.time)}
            playerId={playerId}
            isActive={index === active}
            onSeek={onSeek ? () => onSeek(index) : undefined}
          />
        ))}
      </ol>
      <p aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

/**
 * The highlighted marker (the playback position once the player reports it, else the last pick)
 * and the seek of a marker: pick it, announce its instant and title, move the player there.
 */
function useMarkers(
  markers: readonly MediaMarker[],
  currentTime: number | undefined,
  seek: (time: number) => void,
) {
  const [picked, setPicked] = useState(NO_MARKER);
  const [announcement, setAnnouncement] = useState('');
  const times = markers.map(({ time }) => time);
  const active = currentTime === undefined ? picked : activeMarkerIndex(times, currentTime);
  const seekMarker = (index: number) => {
    const { time, title } = markers[index];
    setPicked(index);
    setAnnouncement(`Instante ${formatTimestamp(time)}: ${title}`);
    seek(time);
  };
  return { active, announcement, seekMarker };
}

/** False in the server HTML and until the island hydrates; the markers are links until then. */
function useHydrated(): boolean {
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => setIsHydrated(true), []);
  return isHydrated;
}

interface YouTubeMediaProps {
  video: YouTubeSource;
  markers: readonly MediaMarker[];
  testId: string;
}

/**
 * A YouTube video behind a facade (its still, title and play button), its credit line and the
 * timestamped analysis. Each marker seeks the player (or opens it at that instant) and stays
 * highlighted while playback is past it; without JS every control is a link to YouTube.
 */
function YouTubeMedia({ video, markers, testId }: YouTubeMediaProps) {
  const playerId = useId();
  const isHydrated = useHydrated();
  const player = useYouTubePlayer(video.id);
  const { active, announcement, seekMarker } = useMarkers(markers, player.currentTime, player.seek);

  return (
    <div data-testid={`${testId}-player`} data-state={player.phase} className={PLAYER}>
      <YouTubeEmbed
        video={video}
        player={player}
        isHydrated={isHydrated}
        playerId={playerId}
        testId={testId}
      />
      <YouTubeCredit video={video} testId={testId} />
      <MarkerList
        markers={markers}
        hrefAt={(time) => watchUrl(video.id, time)}
        playerId={playerId}
        active={active}
        announcement={announcement}
        testId={testId}
        onSeek={isHydrated ? seekMarker : undefined}
      />
    </div>
  );
}

interface RealSpeedButtonProps {
  label: string;
  toggle: RealSpeedToggle;
  playerId: string;
  testId: string;
}

/** The real-speed toggle, a pressed button with a square that fills while it is on. */
function RealSpeedButton({ label, toggle, playerId, testId }: RealSpeedButtonProps) {
  return (
    <button
      type="button"
      data-testid={`${testId}-real-speed`}
      aria-pressed={toggle.isOn}
      aria-controls={playerId}
      onClick={toggle.toggle}
      className={`${MARKER_BASE} ${toggle.isOn ? MARKER_ACTIVE : MARKER_IDLE}`}
    >
      <span
        aria-hidden="true"
        className={`size-2 shrink-0 border ${toggle.isOn ? 'border-accent bg-accent' : 'border-fg-muted'}`}
      />
      {label}
    </button>
  );
}

interface HostedMediaProps {
  source: HostedSource;
  markers: readonly MediaMarker[];
  realSpeed?: RealSpeed;
  testId: string;
}

/**
 * A video or an audio served by the site, its real-speed toggle (if any), its credit line and the
 * timestamped analysis. If no file can play, a line offers the first one as a download and the
 * markers and analyses stay as they are; without JS the markers link to the file at their instant.
 */
function HostedMedia({ source, markers, realSpeed, testId }: HostedMediaProps) {
  const playerId = useId();
  const isHydrated = useHydrated();
  const mediaRef = useRef<HTMLMediaElement>(null);
  const [reportedTime, setReportedTime] = useState<number | undefined>(undefined);
  const [isFailed, setIsFailed] = useState(false);
  const fail = useCallback(() => setIsFailed(true), []);
  const realSpeedToggle = useRealSpeed(mediaRef, realSpeed);
  const { active, announcement, seekMarker } = useMarkers(markers, reportedTime, (time) =>
    seekAndPlay(mediaRef.current, time),
  );
  const fileUrl = withBase(source.files[0].src);

  return (
    <div data-testid={`${testId}-player`} className={PLAYER}>
      <HostedPlayer
        source={source}
        mediaRef={mediaRef}
        playerId={playerId}
        onTime={setReportedTime}
        onFail={fail}
      />
      {isFailed ? <PlaybackFailure source={source} testId={testId} /> : null}
      {realSpeed && !isFailed ? (
        <RealSpeedButton
          label={realSpeed.label}
          toggle={realSpeedToggle}
          playerId={playerId}
          testId={testId}
        />
      ) : null}
      <HostedCredit source={source} testId={testId} />
      <MarkerList
        markers={markers}
        hrefAt={(time) => `${fileUrl}#t=${time}`}
        playerId={playerId}
        active={active}
        announcement={announcement}
        testId={testId}
        onSeek={isHydrated ? seekMarker : undefined}
      />
    </div>
  );
}

/**
 * A multimedia resource with its written analysis by instant: a YouTube video (Tema 5) or a video
 * or audio hosted by the site (Temas 11 and 12). Invalid data fails the build with a clear message.
 */
export default function AnalyzedMedia({ source, markers, realSpeed, testId }: AnalyzedMediaProps) {
  requireMedia(source, markers);
  requireRealSpeed(source, realSpeed);
  return source.kind === 'youtube' ? (
    <YouTubeMedia video={source} markers={markers} testId={testId} />
  ) : (
    <HostedMedia source={source} markers={markers} realSpeed={realSpeed} testId={testId} />
  );
}
