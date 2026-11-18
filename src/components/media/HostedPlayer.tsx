import { useCallback, useEffect, type RefObject, type SyntheticEvent } from 'react';
import { formatName, type HostedSource } from '../../lib/media';
import { withBase } from '../../lib/url';

const KIND_LABEL: Readonly<Record<HostedSource['kind'], string>> = {
  video: 'Video',
  audio: 'Audio',
};

/** A timeout with no delay runs in the next task, after the current one's microtasks. */
const NEXT_TASK_MS = 0;

/**
 * Whether no file can play: the medium reported an error (decoding, or the network once loaded),
 * or it tried every <source> and is left without one. Read one task after mounting: with the
 * sources in the server HTML that can happen before the island hydrates, and its error events are
 * missed; and a medium the client just created has no source only until its resource selection
 * starts (the next stable state), so it counts as failed only if it still has none a task later.
 */
function hasFailed(media: HTMLMediaElement): boolean {
  return Boolean(media.error) || media.networkState === HTMLMediaElement.NETWORK_NO_SOURCE;
}

interface HostedPlayerProps {
  source: HostedSource;
  mediaRef: RefObject<HTMLMediaElement | null>;
  /** The id the marker buttons and the real-speed toggle point at with aria-controls. */
  playerId: string;
  /** The playback position the medium reports, s: on every time update and every seek. */
  onTime(time: number): void;
  /** No file can play; called again harmlessly if the medium fails more than once. */
  onFail(): void;
}

/**
 * A video or an audio served by the site: native controls, one <source> per file in order of
 * preference (paths under public/ resolved against the deploy base), only the metadata preloaded
 * and nothing played until the reader asks. The error of the last <source> means none could play
 * (the browser tries them in order); an error on the medium itself, that it broke once loaded.
 */
export function HostedPlayer({ source, mediaRef, playerId, onTime, onFail }: HostedPlayerProps) {
  const attach = useCallback(
    (element: HTMLMediaElement | null) => {
      mediaRef.current = element;
    },
    [mediaRef],
  );
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return undefined;
    const check = window.setTimeout(() => {
      if (hasFailed(media)) onFail();
    }, NEXT_TASK_MS);
    return () => window.clearTimeout(check);
  }, [mediaRef, onFail]);

  const report = (event: SyntheticEvent<HTMLMediaElement>) =>
    onTime(event.currentTarget.currentTime);
  const last = source.files.length - 1;
  const sources = source.files.map((file, index) => (
    <source
      key={file.src}
      src={withBase(file.src)}
      type={file.type}
      onError={index === last ? onFail : undefined}
    />
  ));
  const media = {
    ref: attach,
    controls: true,
    preload: 'metadata',
    'aria-label': source.title,
    onTimeUpdate: report,
    onSeeking: report,
    // React passes a <source> error on to the medium's handler too: only the medium's own counts.
    onError: (event: SyntheticEvent<HTMLMediaElement>) => {
      if (event.target === event.currentTarget) onFail();
    },
  };

  return source.kind === 'video' ? (
    <div id={playerId} className="overflow-hidden rounded-base border border-border">
      <video
        {...media}
        poster={source.poster === undefined ? undefined : withBase(source.poster)}
        width={source.width}
        height={source.height}
        playsInline
        className="block h-auto w-full bg-black"
      >
        {sources}
      </video>
    </div>
  ) : (
    <div id={playerId}>
      <audio {...media} className="block w-full">
        {sources}
      </audio>
    </div>
  );
}

/**
 * Moves the medium to `time` and plays it (the reader pressed a marker). A refused or interrupted
 * play() needs nothing more: the reader keeps the native controls at the new position, and a
 * medium that cannot play at all already shows its failure line through its error event.
 */
export function seekAndPlay(media: HTMLMediaElement | null, time: number): void {
  if (!media) return;
  media.currentTime = time;
  media.play().catch(() => undefined);
}

/** The credit line: what kind of medium it is, then who made it and under which licence. */
export function HostedCredit({ source, testId }: { source: HostedSource; testId: string }) {
  return (
    <p data-testid={`${testId}-credit`} className="m-0 text-sm text-fg-muted">
      {`${KIND_LABEL[source.kind]}: ${source.credit}`}
    </p>
  );
}

interface PlaybackStatusProps {
  source: HostedSource;
  isFailed: boolean;
  testId: string;
}

/**
 * What a reader whose browser cannot play the medium (no codec, file missing, network off) sees
 * and hears: the first file, offered as a download. The live region is always there, empty and
 * without height until the failure fills it (a region announces changes, not its own insertion);
 * the line brings its own 16 px above it. The markers and their analyses stay as they are.
 */
export function PlaybackStatus({ source, isFailed, testId }: PlaybackStatusProps) {
  const file = source.files[0];
  return (
    <div role="status">
      {isFailed ? (
        <p data-testid={`${testId}-error`} className="m-0 mt-4 text-sm">
          {'No se pudo reproducir el archivo en este navegador: '}
          <a href={withBase(file.src)} download>{`descárgalo en ${formatName(file)}`}</a>.
        </p>
      ) : null}
    </div>
  );
}
