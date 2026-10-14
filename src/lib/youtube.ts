/**
 * A YouTube video embedded on the privacy-enhanced host (youtube-nocookie.com), driven with the
 * player's postMessage protocol (the one the official IFrame API speaks), so no extra script loads.
 */
export const YOUTUBE_EMBED_ORIGIN = 'https://www.youtube-nocookie.com';
const WATCH_URL = 'https://www.youtube.com/watch';
const THUMBNAIL_ORIGIN = 'https://i.ytimg.com';
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
/** Our player is the only one on the page; the widget protocol only needs a stable id. */
const PLAYER_ID = 1;
const WIDGET_CHANNEL = 'widget';
/** Events the player sends once it listens; each one proves the iframe answers. */
const PLAYER_EVENTS = new Set(['onReady', 'initialDelivery', 'infoDelivery', 'onStateChange']);
const TIME_EVENTS = new Set(['initialDelivery', 'infoDelivery']);

export type PlayerFunction = 'seekTo' | 'playVideo' | 'pauseVideo';

export interface EmbedOptions {
  /** First second to play. */
  start?: number;
  /** The page's origin, so the player posts its events back to it. */
  origin?: string;
}

/** What a message of the player says: it answered and, maybe, where the playback is (s). */
export interface PlayerMessage {
  currentTime?: number;
}

export function requireVideoId(id: string): string {
  if (!VIDEO_ID.test(id)) {
    throw new RangeError(`"${id}" no es un identificador de YouTube de 11 caracteres`);
  }
  return id;
}

const wholeSeconds = (seconds: number) => Math.max(0, Math.floor(seconds));

/** The video's page on youtube.com, at `startSeconds` if given: the link that works without JS. */
export function watchUrl(id: string, startSeconds = 0): string {
  const start = wholeSeconds(startSeconds);
  const query = new URLSearchParams({ v: requireVideoId(id) });
  if (start > 0) query.set('t', `${start}s`);
  return `${WATCH_URL}?${query.toString()}`;
}

/** maxresdefault is 1280 × 720 but not every video has it; hqdefault (480 × 360) always exists. */
export type ThumbnailQuality = 'maxresdefault' | 'hqdefault';

/** The video's still on YouTube's image host, linked (never copied into the repository). */
export function thumbnailUrl(id: string, quality: ThumbnailQuality = 'maxresdefault'): string {
  return `${THUMBNAIL_ORIGIN}/vi/${requireVideoId(id)}/${quality}.jpg`;
}

/**
 * The iframe source: plays on load (the reader asked for it), Spanish interface and captions when
 * available, no related videos from other channels, and the JS API so markers can seek.
 */
export function embedUrl(id: string, { start = 0, origin }: EmbedOptions = {}): string {
  const query = new URLSearchParams({
    autoplay: '1',
    enablejsapi: '1',
    rel: '0',
    playsinline: '1',
    cc_load_policy: '1',
    cc_lang_pref: 'es',
    hl: 'es',
    start: String(wholeSeconds(start)),
  });
  if (origin) query.set('origin', origin);
  return `${YOUTUBE_EMBED_ORIGIN}/embed/${requireVideoId(id)}?${query.toString()}`;
}

/** A player command, such as seekTo(255, true), as the iframe expects it. */
export function playerCommand(func: PlayerFunction, args: unknown[] = []): string {
  return JSON.stringify({ event: 'command', func, args, id: PLAYER_ID, channel: WIDGET_CHANNEL });
}

/** Asks the player to post its events (ready, playback time) to this page. */
export function listeningMessage(): string {
  return JSON.stringify({ event: 'listening', id: PLAYER_ID, channel: WIDGET_CHANNEL });
}

function asRecord(data: unknown): Record<string, unknown> | undefined {
  if (typeof data === 'string') {
    try {
      return asRecord(JSON.parse(data));
    } catch {
      return undefined;
    }
  }
  return typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : undefined;
}

/** The player's news in a message event's data, or undefined if it is not a player message. */
export function parsePlayerMessage(data: unknown): PlayerMessage | undefined {
  const message = asRecord(data);
  const event = message?.event;
  if (typeof event !== 'string' || !PLAYER_EVENTS.has(event)) return undefined;
  const time = asRecord(message?.info)?.currentTime;
  return TIME_EVENTS.has(event) && typeof time === 'number' && Number.isFinite(time)
    ? { currentTime: time }
    : {};
}
