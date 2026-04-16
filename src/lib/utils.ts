import { clsx, type ClassValue } from "clsx";

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

export const formatDateTime = (value: string | Date) =>
  new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export const getInitials = (value: string) => {
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "??";
  }

  return parts
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
};

export const getAvatarGradient = (seed: string) => {
  let hash = 0;

  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) % 360;
  }

  const hue = Math.abs(hash);
  const secondHue = (hue + 42) % 360;

  return `linear-gradient(135deg, hsl(${hue} 70% 58%) 0%, hsl(${secondHue} 78% 64%) 100%)`;
};

export const getAvatarUrl = (url?: string | null) => {
  if (!url) {
    return null;
  }

  return `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
};
