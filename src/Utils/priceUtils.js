/**
 * Utilitaires pour la gestion des prix avec majoration
 */

/** Majoration par défaut (la plupart des restaurants) */
export const MARKUP_PERCENTAGE = 10;

/** Majoration réduite (restaurants partenaires spécifiques) */
export const REDUCED_MARKUP_PERCENTAGE = 7;

/**
 * IDs restaurant (API) avec majoration 7 % — compléter si tu les connais.
 * La détection par nom ci-dessous fonctionne même sans ID.
 */
const REDUCED_MARKUP_RESTAURANT_IDS = new Set(
  [
    // exemple : 12, 34
  ].filter(Boolean)
);

function normalizeName(name) {
  if (!name || typeof name !== 'string') return '';
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Correspondance par nom (insensible à la casse / accents légers).
 * Chocolat Sarayi + Clucks → 7 %
 */
function matchesReducedMarkupName(normalized) {
  if (!normalized) return false;
  if (normalized.includes('clucks')) return true;
  if (normalized.includes('chocolat') && normalized.includes('sarayi')) return true;
  return false;
}

/**
 * @param {object} restaurantLike - { id, name } ou équivalent API
 * @returns {number} pourcentage de majoration à appliquer
 */
export function getMarkupPercentageForRestaurant(restaurantLike) {
  if (!restaurantLike) return MARKUP_PERCENTAGE;

  const id = restaurantLike.id ?? restaurantLike.restaurant_id ?? restaurantLike.resto_id;
  if (id != null && id !== '') {
    const n = Number(id);
    if (!Number.isNaN(n) && REDUCED_MARKUP_RESTAURANT_IDS.has(n)) {
      return REDUCED_MARKUP_PERCENTAGE;
    }
    if (REDUCED_MARKUP_RESTAURANT_IDS.has(String(id))) {
      return REDUCED_MARKUP_PERCENTAGE;
    }
  }

  const name =
    restaurantLike.name ??
    restaurantLike.nom ??
    restaurantLike.libelle ??
    '';
  const normalized = normalizeName(name);
  if (matchesReducedMarkupName(normalized)) {
    return REDUCED_MARKUP_PERCENTAGE;
  }

  return MARKUP_PERCENTAGE;
}

/**
 * Produit panier / liste : utilise markupPercentage si déjà fixé, sinon restaurant lié.
 */
export function getMarkupPercentageFromProduct(product) {
  if (!product) return MARKUP_PERCENTAGE;
  if (typeof product.markupPercentage === 'number' && !Number.isNaN(product.markupPercentage)) {
    return product.markupPercentage;
  }
  if (product.restaurant) {
    return getMarkupPercentageForRestaurant(product.restaurant);
  }
  return getMarkupPercentageForRestaurant({
    id: product.restaurant_id ?? product.resto_id,
    name:
      product.restaurant_name ??
      product.restaurantName ??
      (typeof product.restaurant === 'string' ? product.restaurant : null),
  });
}

/**
 * Applique une majoration à un prix
 * @param {number|string} price - Le prix de base (peut être un nombre ou une string)
 * @param {number} percentage - Le pourcentage de majoration (défaut: 10%)
 * @returns {number} Le prix avec majoration arrondi à 2 décimales
 */
export const applyMarkup = (price, percentage = MARKUP_PERCENTAGE) => {
  let numericPrice = price;
  if (typeof price === 'string') {
    numericPrice = parseFloat(price.replace(/[^\d.-]/g, '')) || 0;
  } else if (typeof price !== 'number') {
    numericPrice = Number(price) || 0;
  }

  if (isNaN(numericPrice) || numericPrice <= 0) {
    return 0;
  }

  const priceWithMarkup = numericPrice * (1 + percentage / 100);
  return Math.round(priceWithMarkup);
};

/**
 * Formate un prix avec majoration pour l'affichage
 */
export const formatPriceWithMarkup = (price, currency = 'FCFA', percentage = MARKUP_PERCENTAGE) => {
  const priceWithMarkup = applyMarkup(price, percentage);
  return `${priceWithMarkup.toLocaleString()} ${currency}`;
};

/**
 * Applique la majoration à un tableau d'objets avec une propriété 'price'
 */
export const applyMarkupToArray = (items, percentage = MARKUP_PERCENTAGE) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    ...item,
    price: applyMarkup(item.price, percentage),
    originalPrice: item.price,
  }));
};
