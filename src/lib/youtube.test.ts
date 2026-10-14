import { describe, expect, test } from 'vitest';
import {
  embedUrl,
  listeningMessage,
  parsePlayerMessage,
  playerCommand,
  requireVideoId,
  thumbnailUrl,
  watchUrl,
  YOUTUBE_EMBED_ORIGIN,
} from './youtube';

const ID = 'CaPHUZapCTI';

describe('requireVideoId', () => {
  test('accepts an 11-character YouTube id', () => {
    expect(requireVideoId(ID)).toBe(ID);
    expect(requireVideoId('a-b_C123xyz')).toBe('a-b_C123xyz');
  });

  test('rejects ids of the wrong length or with other characters', () => {
    expect(() => requireVideoId('short')).toThrow(/identificador de YouTube/);
    expect(() => requireVideoId('CaPHUZapCTI&x')).toThrow(RangeError);
    expect(() => requireVideoId('CaPHUZ/pCTI')).toThrow(RangeError);
  });
});

describe('watchUrl', () => {
  test('links to the video on youtube.com', () => {
    expect(watchUrl(ID)).toBe(`https://www.youtube.com/watch?v=${ID}`);
  });

  test('adds the start in whole seconds, rounded down', () => {
    expect(watchUrl(ID, 255)).toBe(`https://www.youtube.com/watch?v=${ID}&t=255s`);
    expect(watchUrl(ID, 138.9)).toBe(`https://www.youtube.com/watch?v=${ID}&t=138s`);
  });

  test('a start of zero or less is the plain link', () => {
    expect(watchUrl(ID, 0)).toBe(`https://www.youtube.com/watch?v=${ID}`);
    expect(watchUrl(ID, -4)).toBe(`https://www.youtube.com/watch?v=${ID}`);
  });
});

describe('thumbnailUrl', () => {
  test('points at the video still on i.ytimg.com, the 1280 px one by default', () => {
    expect(thumbnailUrl(ID)).toBe(`https://i.ytimg.com/vi/${ID}/maxresdefault.jpg`);
    expect(thumbnailUrl(ID, 'hqdefault')).toBe(`https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
  });

  test('rejects an invalid id', () => {
    expect(() => thumbnailUrl('../x')).toThrow(RangeError);
  });
});

describe('embedUrl', () => {
  test('uses the privacy-enhanced host with the JS API, autoplay and Spanish captions', () => {
    const url = new URL(embedUrl(ID, { start: 198, origin: 'https://example.org' }));

    expect(url.origin).toBe(YOUTUBE_EMBED_ORIGIN);
    expect(url.pathname).toBe(`/embed/${ID}`);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      autoplay: '1',
      enablejsapi: '1',
      rel: '0',
      playsinline: '1',
      cc_load_policy: '1',
      cc_lang_pref: 'es',
      hl: 'es',
      start: '198',
      origin: 'https://example.org',
    });
  });

  test('starts at 0 by default, floors the start and omits a missing origin', () => {
    const url = new URL(embedUrl(ID));

    expect(url.searchParams.get('start')).toBe('0');
    expect(url.searchParams.has('origin')).toBe(false);
    expect(new URL(embedUrl(ID, { start: 4.8 })).searchParams.get('start')).toBe('4');
    expect(new URL(embedUrl(ID, { start: -3 })).searchParams.get('start')).toBe('0');
  });

  test('rejects an invalid id', () => {
    expect(() => embedUrl('nope')).toThrow(RangeError);
  });
});

describe('player messages', () => {
  test('a command names the function and its arguments on the widget channel', () => {
    expect(JSON.parse(playerCommand('seekTo', [255, true]))).toEqual({
      event: 'command',
      func: 'seekTo',
      args: [255, true],
      id: 1,
      channel: 'widget',
    });
    expect(JSON.parse(playerCommand('playVideo')).args).toEqual([]);
  });

  test('the listening message subscribes to the player events', () => {
    expect(JSON.parse(listeningMessage())).toEqual({
      event: 'listening',
      id: 1,
      channel: 'widget',
    });
  });
});

describe('parsePlayerMessage', () => {
  test('reads the playback time of an infoDelivery or initialDelivery message', () => {
    const info = JSON.stringify({ event: 'infoDelivery', info: { currentTime: 256.4 } });
    const initial = { event: 'initialDelivery', info: { currentTime: 0, duration: 610 } };

    expect(parsePlayerMessage(info)).toEqual({ currentTime: 256.4 });
    expect(parsePlayerMessage(initial)).toEqual({ currentTime: 0 });
  });

  test('a known event without a time still proves the player answers', () => {
    expect(parsePlayerMessage(JSON.stringify({ event: 'onReady', info: null }))).toEqual({});
    expect(parsePlayerMessage({ event: 'infoDelivery', info: { volume: 100 } })).toEqual({});
    expect(
      parsePlayerMessage({ event: 'infoDelivery', info: { currentTime: Number.NaN } }),
    ).toEqual({});
  });

  test('ignores anything that is not a player message', () => {
    expect(parsePlayerMessage('not json')).toBeUndefined();
    expect(parsePlayerMessage(JSON.stringify({ event: 'other' }))).toBeUndefined();
    expect(parsePlayerMessage(42)).toBeUndefined();
    expect(parsePlayerMessage(null)).toBeUndefined();
    expect(parsePlayerMessage(JSON.stringify('infoDelivery'))).toBeUndefined();
  });
});
