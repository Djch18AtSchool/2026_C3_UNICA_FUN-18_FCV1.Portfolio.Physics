import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  embedUrl,
  listeningMessage,
  parsePlayerMessage,
  playerCommand,
  YOUTUBE_EMBED_ORIGIN,
} from '../../../lib/youtube';

/** No iframe yet (privacy facade); an iframe that has not answered; a player that answers. */
export type PlayerPhase = 'facade' | 'loading' | 'connected';

/**
 * After each load the subscription is re-sent this often until the player answers, at most
 * LISTEN_ATTEMPTS times (10 s); the official IFrame API keeps asking the same way.
 */
const LISTEN_RETRY_MS = 500;
const LISTEN_ATTEMPTS = 20;

export interface YouTubePlayer {
  phase: PlayerPhase;
  /** The iframe source; undefined behind the facade. */
  src?: string;
  /**
   * Changes on every (re)load: as the iframe's key it gives each load a fresh element and window,
   * so a repeated start still reloads and late messages from the previous document are ignored.
   */
  frameKey: number;
  /** The last playback time the player reported, s; undefined until it reports one. */
  currentTime?: number;
  frameRef: RefObject<HTMLIFrameElement | null>;
  /** Replaces the facade with the player from `start` (s); `focus` moves the focus into it. */
  play(start: number, focus?: boolean): void;
  /** Plays from `time` (s): in place once the player answers, by reloading the embed before. */
  seek(time: number): void;
  /** The iframe loaded: ask it for its events (before the load, it is a blank page of ours). */
  subscribe(): void;
}

/** Posts to the embedded player, and only to its origin. */
function postTo(frame: HTMLIFrameElement | null, message: string): void {
  frame?.contentWindow?.postMessage(message, YOUTUBE_EMBED_ORIGIN);
}

/** Listens to the player's messages while an iframe exists; `onMessage` gets its playback time. */
function usePlayerMessages(
  frameRef: RefObject<HTMLIFrameElement | null>,
  isEmbedded: boolean,
  onMessage: (currentTime?: number) => void,
): void {
  useEffect(() => {
    if (!isEmbedded) return undefined;
    const listener = (event: MessageEvent) => {
      if (event.origin !== YOUTUBE_EMBED_ORIGIN) return;
      if (!frameRef.current || event.source !== frameRef.current.contentWindow) return;
      const message = parsePlayerMessage(event.data);
      if (message) onMessage(message.currentTime);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [frameRef, isEmbedded, onMessage]);
}

/** Re-sends the subscription while a loaded iframe has not answered, a bounded number of times. */
function useListenRetry(
  frameRef: RefObject<HTMLIFrameElement | null>,
  isWaiting: boolean,
  load: number,
): void {
  useEffect(() => {
    if (!isWaiting) return undefined;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      postTo(frameRef.current, listeningMessage());
      if (attempts >= LISTEN_ATTEMPTS) window.clearInterval(timer);
    }, LISTEN_RETRY_MS);
    return () => window.clearInterval(timer);
  }, [frameRef, isWaiting, load]);
}

/**
 * A YouTube video behind a facade: nothing loads until `play` or `seek`; then an iframe from
 * youtube-nocookie.com, subscribed to its events so markers can seek in place and follow playback.
 */
export function useYouTubePlayer(videoId: string): YouTubePlayer {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const shouldFocus = useRef(false);
  const [phase, setPhase] = useState<PlayerPhase>('facade');
  const [embed, setEmbed] = useState({ start: 0, load: 0 });
  const [loaded, setLoaded] = useState<number | undefined>(undefined);
  const [currentTime, setCurrentTime] = useState<number | undefined>(undefined);

  const onMessage = useCallback((time?: number) => {
    setPhase('connected');
    if (time !== undefined) setCurrentTime(time);
  }, []);
  usePlayerMessages(frameRef, phase !== 'facade', onMessage);
  useListenRetry(frameRef, phase === 'loading' && loaded === embed.load, embed.load);

  useEffect(() => {
    if (phase === 'facade' || !shouldFocus.current) return;
    shouldFocus.current = false;
    frameRef.current?.focus();
  }, [phase]);

  const play = (from: number, focus = false) => {
    shouldFocus.current = focus;
    setEmbed(({ load }) => ({ start: from, load: load + 1 }));
    setLoaded(undefined);
    setCurrentTime(undefined);
    setPhase('loading');
  };
  const seek = (time: number) => {
    if (phase !== 'connected') return play(time);
    postTo(frameRef.current, playerCommand('seekTo', [time, true]));
    postTo(frameRef.current, playerCommand('playVideo'));
    setCurrentTime(time);
  };

  return {
    phase,
    src:
      phase === 'facade'
        ? undefined
        : embedUrl(videoId, { start: embed.start, origin: window.location.origin }),
    frameKey: embed.load,
    currentTime,
    frameRef,
    play,
    seek,
    subscribe: () => {
      setLoaded(embed.load);
      postTo(frameRef.current, listeningMessage());
    },
  };
}
