// Slugs for public shop URLs (/shop/:slug on the Store).
// Rules: lowercase a-z, 0-9 and single hyphens, no leading/trailing hyphen, max 60 characters.
// A slug is generated once and then stays stable (renaming a shop must not break links people already shared).
const SLUG_MAX = 60;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(input) {
  const s = String(input ?? '')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '') // "Café" -> "Cafe"
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '');
  return s || 'shop'; // names with no latin letters/digits (e.g. only Urdu script) still get a valid slug
}

const isValidSlug = (s) => typeof s === 'string' && s.length > 0 && s.length <= 80 && SLUG_RE.test(s);

// Picks a free slug for `name`: base, base-2, base-3 ... `isTaken(slug)` is async and returns true when the slug is in use.
async function uniqueSlug(name, isTaken) {
  const base = slugify(name);
  if (!(await isTaken(base))) return base;
  for (let n = 2; n < 1000; n++) {
    const suffix = `-${n}`;
    const candidate = base.slice(0, SLUG_MAX - suffix.length).replace(/-+$/g, '') + suffix;
    if (!(await isTaken(candidate))) return candidate;
  }
  // practically unreachable; keeps the function total
  return `${base.slice(0, 40)}-${Date.now().toString(36)}`;
}

module.exports = { slugify, isValidSlug, uniqueSlug, SLUG_MAX };
