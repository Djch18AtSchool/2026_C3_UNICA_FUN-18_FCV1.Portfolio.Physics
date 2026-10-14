import type { Page } from '@playwright/test';

/** Any request to YouTube or its media and image hosts. */
const YOUTUBE_HOSTS =
  /^https:\/\/([a-z0-9-]+\.)*(youtube(-nocookie)?\.com|ytimg\.com|googlevideo\.com)\//;
const EMBED = /^https:\/\/www\.youtube-nocookie\.com\/embed\//;
/** The facade's still (i.ytimg.com/vi/<id>/<quality>.jpg). */
export const THUMBNAIL = /^https:\/\/i\.ytimg\.com\/vi\/[A-Za-z0-9_-]{11}\/[a-z]+\.jpg$/;

/** A 1280 × 720 grey stand-in for the still: wide enough not to read as YouTube's placeholder. */
const STUB_THUMBNAIL = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#5a6270"/></svg>`;

/**
 * A stand-in for the embedded player: it answers the widget protocol the page speaks (listening,
 * seekTo) with onReady and infoDelivery, and prints the time it was sent to, so no test needs the
 * network or YouTube.
 */
const STUB_PLAYER = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Reproductor de prueba</title></head>
<body style="margin:0;background:#000;color:#fff;font:16px sans-serif">
<p id="time">t = 0</p>
<script>
  const params = new URLSearchParams(location.search);
  let time = Number(params.get('start') || 0);
  const target = params.get('origin') || '*';
  const show = () => { document.getElementById('time').textContent = 't = ' + time; };
  const send = (event, info) => parent.postMessage(JSON.stringify({ event, info, id: 1, channel: 'widget' }), target);
  show();
  addEventListener('message', (message) => {
    const data = JSON.parse(message.data);
    if (data.event === 'listening') {
      send('onReady', null);
      send('infoDelivery', { currentTime: time });
    }
    if (data.event === 'command' && data.func === 'seekTo') {
      time = data.args[0];
      show();
      send('infoDelivery', { currentTime: time });
    }
  });
</script>
</body></html>`;

/**
 * Serves the stub for every embed URL and a grey image for the still, and aborts any other YouTube
 * request. Returns the URLs the page asked YouTube for, in order, so a test can check that only the
 * still loads before the reader presses play.
 */
export async function stubYouTube(page: Page): Promise<string[]> {
  const requested: string[] = [];
  await page.route(YOUTUBE_HOSTS, (route) => {
    const url = route.request().url();
    requested.push(url);
    if (EMBED.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: STUB_PLAYER,
      });
    }
    if (THUMBNAIL.test(url)) {
      return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: STUB_THUMBNAIL });
    }
    return route.abort();
  });
  return requested;
}
