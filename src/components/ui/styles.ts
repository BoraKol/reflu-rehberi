/**
 * Centralised design tokens as Tailwind class strings (DRY).
 * Keeps the clinical light-blue palette consistent and guarantees
 * touch-friendly (≥40px) hit areas on mobile devices.
 */
const BASE_BUTTON =
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D6FD6]';

export const BUTTON_SIZE = {
  sm: 'min-h-9 px-3 py-1.5 text-xs',
  md: 'min-h-10 px-4 py-2 text-sm',
  lg: 'min-h-11 px-5 py-2.5 text-sm',
} as const;

export const BUTTON_VARIANT = {
  primary: 'bg-[#1D6FD6] text-white hover:bg-[#1659B3]',
  secondary: 'border border-[#BBD6F7] bg-[#F0F7FF] text-[#155CC0] hover:bg-[#E2EEF9]',
  outline: 'border border-[#DCE7F3] bg-white text-[#455D75] hover:text-[#0F233A] hover:bg-[#F4F8FC]',
  ghost: 'text-[#455D75] hover:text-[#0F233A] hover:bg-[#F4F8FC]',
  danger: 'bg-[#B91C1C] text-white hover:bg-[#991B1B]',
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANT;
export type ButtonSize = keyof typeof BUTTON_SIZE;

export function buttonClass(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra = ''
): string {
  return `${BASE_BUTTON} ${BUTTON_SIZE[size]} ${BUTTON_VARIANT[variant]} ${extra}`.trim();
}

export const CARD = 'bg-white border border-[#DCE7F3] rounded-2xl';
export const CARD_PADDING = 'p-4 sm:p-6';
export const LINK_BUTTON =
  'font-medium text-[#155CC0] hover:text-[#1D6FD6] underline underline-offset-2 cursor-pointer';
