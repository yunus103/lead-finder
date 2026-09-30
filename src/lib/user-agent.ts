// Coarse, dependency-free UA parsing: enough to tell "iPhone Safari" from "Windows Chrome".

const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|facebookexternalhit|^WhatsApp\//i;

export function isBotUserAgent(ua: string): boolean {
  return !ua || BOT_UA.test(ua);
}

export function parseUserAgent(ua: string): { device: string; os: string; browser: string } {
  const device = /iPad|Tablet/i.test(ua) ? "tablet" : /Mobi|iPhone|Android/i.test(ua) ? "mobile" : "desktop";

  const os = /iPhone|iPad|iPod/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
    ? "Android"
    : /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
    ? "macOS"
    : /Linux/.test(ua)
    ? "Linux"
    : "Diğer";

  // In-app browsers first: their UAs also contain Safari/Chrome.
  const browser = /Instagram/.test(ua)
    ? "Instagram"
    : /FBAN|FBAV/.test(ua)
    ? "Facebook"
    : /WhatsApp/.test(ua)
    ? "WhatsApp"
    : /Edg\//.test(ua)
    ? "Edge"
    : /SamsungBrowser/.test(ua)
    ? "Samsung"
    : /OPR\/|Opera/.test(ua)
    ? "Opera"
    : /YaBrowser/.test(ua)
    ? "Yandex"
    : /CriOS|Chrome/.test(ua)
    ? "Chrome"
    : /FxiOS|Firefox/.test(ua)
    ? "Firefox"
    : /Safari/.test(ua)
    ? "Safari"
    : "Diğer";

  return { device, os, browser };
}
