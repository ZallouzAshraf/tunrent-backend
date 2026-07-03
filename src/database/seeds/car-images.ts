/**
 * Images locales dans tunrent-frontend/public/cars/
 * URLs servies par Next.js : /cars/<fichier>
 */

const PICANTO = [
  '/cars/kia-picanto-white.webp',
  '/cars/kia-picanto-grey.webp',
] as const;

const SWIFT = [
  '/cars/suzuki-swift-silver.webp',
  '/cars/suzuki-swift-blue.webp',
] as const;

/** Variantes par marque + modèle (ordre alterné pour les doublons) */
export const CAR_IMAGE_VARIANTS: Record<string, readonly string[]> = {
  'Kia|Picanto': PICANTO,
  'Kia|Rio': ['/cars/kia-rio-silver.webp'],
  'Hyundai|i10': ['/cars/hyundai-i10-red.webp'],
  // Pas d'i20 dédié — hatchback compacte (fichier renault-clio → hyundai-i20-style)
  'Hyundai|i20': ['/cars/hyundai-i20-style.webp'],
  'Suzuki|Swift': SWIFT,
  'Suzuki|Celerio': ['/cars/suzuki-swift-silver.webp'],
  'Suzuki|Ignis': ['/cars/suzuki-swift-blue.webp'],
  // Berline — Dacia Logan (visuel sedan)
  'Suzuki|Dzire': ['/cars/dacia-logan-silver.webp'],
};

export function resolveCarImageUrl(
  brand: string,
  model: string,
  indexWithinModel = 0,
): string {
  const key = `${brand}|${model}`;
  const variants = CAR_IMAGE_VARIANTS[key];
  if (!variants?.length) return '/placeholder-car.svg';
  return variants[indexWithinModel % variants.length];
}

export function carImagePayload(
  brand: string,
  model: string,
  indexWithinModel = 0,
): { photos: string[]; thumbnailUrl: string } {
  const url = resolveCarImageUrl(brand, model, indexWithinModel);
  return {
    photos: [url],
    thumbnailUrl: url,
  };
}
