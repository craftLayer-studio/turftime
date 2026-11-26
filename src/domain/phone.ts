/**
 * Indian mobile numbers in E.164 form (+91 followed by 10 digits starting 6-9).
 * Accepts common inputs: "98765 43210", "098765-43210", "+91 98765 43210", "919876543210".
 */
export function normalizeIndianPhone(input: string): string | null {
  if (typeof input !== "string" || input.length > 25) return null;
  let digits = input.replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) {
    if (!digits.startsWith("+91")) return null;
    digits = digits.slice(3);
  } else if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return `+91${digits}`;
}

/** "+919876543210" -> "+91 98765 43210". */
export function formatPhone(e164: string): string {
  if (!/^\+91\d{10}$/.test(e164)) return e164;
  return `+91 ${e164.slice(3, 8)} ${e164.slice(8)}`;
}

/** "+919876543210" -> "+91 98xxx xx210" for places where the full number is not needed. */
export function maskPhone(e164: string): string {
  if (!/^\+91\d{10}$/.test(e164)) return "hidden";
  return `+91 ${e164.slice(3, 5)}xxx xx${e164.slice(10)}`;
}

/** wa.me click-to-chat link (free, no API). Digits only, no plus sign. */
export function waMeLink(e164: string, text: string): string {
  return `https://wa.me/${e164.replace(/^\+/, "")}?text=${encodeURIComponent(text)}`;
}
