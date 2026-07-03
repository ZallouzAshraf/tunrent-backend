import slugify from 'slugify';

export function generateSlug(name: string): string {
  return slugify(name, { lower: true, strict: true, locale: 'fr' });
}

export function generateUniqueSlug(name: string, suffix?: string): string {
  const base = generateSlug(name);
  return suffix ? `${base}-${suffix}` : base;
}
