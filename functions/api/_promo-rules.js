/* ============================================================
   EATOUTS PROMO AGE RULES (server)

   Age-restricted promos are the ones that sell or push alcohol:
   beer, cider, spirits, wine and the drinks made from them.
   Only an account that is 18 or older may receive them.

   This file and js/eatouts-age.js hold the same word list;
   tests/age-gate.js asserts the two never drift apart.

   Files starting with "_" are not routed by Pages, so this module is
   import-only.
   ============================================================ */

/* Every word that marks a promo as age restricted. Keep this list
   identical to the one in js/eatouts-age.js. */
export var ALCOHOL_WORDS = [
  'beer', 'beers', 'lager', 'ale', 'stout', 'pilsner',
  'cider', 'ciders', 'perry',
  'wine', 'wines', 'champagne', 'prosecco', 'sherry', 'port',
  'spirit', 'spirits',
  'whisky', 'whiskey', 'bourbon', 'scotch',
  'vodka', 'gin', 'rum', 'brandy', 'cognac', 'tequila', 'mezcal',
  'liqueur', 'liquor', 'liquour',
  'cocktail', 'cocktails', 'mcc', 'martini', 'shandy', 'sake',
  'absinthe', 'ouzo', 'schnapps', 'grappa', 'vermouth'
];

/* Drinks that are not alcohol: the catalogue's own subtypes decide
   that before any text is read. */
export var NON_ALCOHOL_SUBTYPES = ['fizzydrinks', 'icedtea', 'softdrinks', 'juices',
  'fruitjuices', 'fruitjuice', 'nonalcoholic', 'mocktails', 'water', 'soda'];

function norm(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function text(v) { return String(v == null ? '' : v).toLowerCase(); }

/** Does this string name an alcoholic drink? */
export function mentionsAlcohol(value) {
  var t = text(value);
  if (!t) return false;
  /* "platter without beer" is food, so drop the negated tail */
  t = t.replace(/\bwithout\b[\s\S]*/g, ' ');
  if (!t) return false;
  for (var i = 0; i < ALCOHOL_WORDS.length; i++) {
    var w = ALCOHOL_WORDS[i];
    var re = new RegExp('(^|[^a-z])' + w + '([^a-z]|$)');
    if (re.test(t)) return true;
  }
  return false;
}

function isNonAlcoholSubtype(value) {
  return NON_ALCOHOL_SUBTYPES.indexOf(norm(value)) !== -1;
}

/** The explicit flag an operator can set on a promo. */
export function hasExplicitFlag(p) {
  if (!p) return false;
  var v = p.ageRestricted;
  if (v === undefined) v = p.age_restricted;
  if (v === undefined) v = p.ageRestrictedFlag;
  if (v === true || v === 1 || v === '1' || v === 'true') return true;
  return false;
}

/**
 * True when a promo must only be shown to an 18+ account.
 *
 * A promo is age restricted when the operator flagged it, or when its
 * type/subtype or wording names an alcoholic drink.
 */
export function isAgeRestrictedPromo(p) {
  if (!p) return false;
  if (hasExplicitFlag(p)) return true;

  var type = p.type;
  var subtype = p.subtype;
  var category = p.category;

  /* An explicit "food" category settles it: a food promo is not
     age restricted even when the copy mentions a drink it excludes. */
  var cat = text(category).trim();
  if (cat.indexOf('food') === 0) return false;

  /* The catalogue subtypes come first: Beers, Ciders and Spirits are
     age restricted, Fizzy Drinks and Iced Tea are not. */
  if (subtype && !isNonAlcoholSubtype(subtype) && mentionsAlcohol(subtype)) return true;
  if (type && !isNonAlcoholSubtype(type) && mentionsAlcohol(type)) return true;
  if (cat && cat.indexOf('bev') === 0 && mentionsAlcohol(p.title)) return true;

  /* Last resort: the wording of the promo itself. */
  var fields = [p.title, p.desc, p.description, p.details, p.brand, p.sponsor, p.terms];
  for (var i = 0; i < fields.length; i++) {
    if (mentionsAlcohol(fields[i])) return true;
  }
  return false;
}
