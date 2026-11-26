/** Base URL for QR codes and share links. Production: https://turftime.craftlayer.store. */
export function appUrl(): string {
  const url = process.env.APP_URL?.trim();
  return (url && /^https?:\/\//.test(url) ? url : "http://localhost:3131").replace(/\/+$/, "");
}
