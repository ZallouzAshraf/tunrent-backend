export function generateBookingReference(sequence: number): string {
  const year = new Date().getFullYear();
  const padded = String(sequence).padStart(5, '0');
  return `LOC-${year}-${padded}`;
}
