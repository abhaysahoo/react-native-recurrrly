import dayjs from "dayjs";

/**
 * Formats a number as a currency amount with up to 2 decimal places.
 * Uses the runtime locale for grouping/separators.
 */
export function formatCurrency(
  value: number,
  currency: string,
  locale?: string,
): string {
  if (!Number.isFinite(value)) {
    throw new RangeError(
      `formatCurrency: value must be a finite number, got ${value}`,
    );
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export const formatSubscriptionDateTime = (value?: string): string => {
  if (!value) return "Not provided";
  const parsedDate = dayjs(value);
  return parsedDate.isValid()
    ? parsedDate.format("MM/DD/YYYY")
    : "Not provided";
};

export const formatStatusLabel = (value?: string): string => {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
};
