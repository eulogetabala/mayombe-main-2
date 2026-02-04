/**
 * Utilitaires pour la gestion des prix avec majoration
 */

// Pourcentage de majoration (7%)
export const MARKUP_PERCENTAGE = 7;

/**
 * Applique une majoration à un prix
 * @param {number|string} price - Le prix de base (peut être un nombre ou une string)
 * @param {number} percentage - Le pourcentage de majoration (défaut: 7%)
 * @returns {number} Le prix avec majoration arrondi à 2 décimales
 */
export const applyMarkup = (price, percentage = MARKUP_PERCENTAGE) => {
  // Convertir le prix en nombre si c'est une string
  let numericPrice = price;
  if (typeof price === 'string') {
    // Extraire les chiffres et points décimaux
    numericPrice = parseFloat(price.replace(/[^\d.-]/g, '')) || 0;
  } else if (typeof price !== 'number') {
    numericPrice = Number(price) || 0;
  }
  
  if (isNaN(numericPrice) || numericPrice <= 0) {
    return 0;
  }
  
  // Appliquer la majoration : prix × (1 + pourcentage/100)
  const priceWithMarkup = numericPrice * (1 + percentage / 100);
  
  // Arrondir à l'entier le plus proche (pour les FCFA)
  return Math.round(priceWithMarkup);
};

/**
 * Formate un prix avec majoration pour l'affichage
 * @param {number|string} price - Le prix de base
 * @param {string} currency - La devise (défaut: 'FCFA')
 * @param {number} percentage - Le pourcentage de majoration (défaut: 7%)
 * @returns {string} Le prix formaté avec majoration
 */
export const formatPriceWithMarkup = (price, currency = 'FCFA', percentage = MARKUP_PERCENTAGE) => {
  const priceWithMarkup = applyMarkup(price, percentage);
  return `${priceWithMarkup.toLocaleString()} ${currency}`;
};

/**
 * Applique la majoration à un tableau de prix (pour les compléments par exemple)
 * @param {Array} items - Tableau d'objets avec une propriété 'price'
 * @param {number} percentage - Le pourcentage de majoration (défaut: 7%)
 * @returns {Array} Tableau avec les prix majorés
 */
export const applyMarkupToArray = (items, percentage = MARKUP_PERCENTAGE) => {
  if (!Array.isArray(items)) {
    return [];
  }
  
  return items.map(item => ({
    ...item,
    price: applyMarkup(item.price, percentage),
    originalPrice: item.price // Conserver le prix original si besoin
  }));
};
