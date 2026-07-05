const currencyFormatter = new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: string | number): string {
  return currencyFormatter.format(Number(value));
}
