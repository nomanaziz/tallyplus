import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Standardized action-button class tokens. Use everywhere for consistency.
 * - btnToolbar: page header + toolbar buttons (h-10 with icon + label)
 * - btnRowIcon: row-level icon-only buttons inside table/list rows
 * - btnFooter: dialog/sheet footer buttons (full width on mobile)
 */
export const btnToolbar = "h-10 gap-2";
export const btnRowIcon = "h-8 w-8";
export const btnFooter = "h-10 gap-2 flex-1 sm:flex-none";