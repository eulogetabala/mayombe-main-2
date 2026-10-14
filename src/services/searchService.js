import {
  applyMarkup,
  formatPriceWithMarkup,
  getMarkupPercentageForRestaurant,
} from '../Utils/priceUtils';

const API_BASE_URL = 'https://www.api-mayombe.mayombe-app.com/public/api';
const UPLOADS_BASE_URL = 'https://www.mayombe-app.com/uploads_admin';
const CACHE_TTL_MS = 10 * 60 * 1000;
const FETCH_CONCURRENCY = 8;

const cache = {
  catalog: [],
  menus: [],
  loadedAt: 0,
  loading: null,
};

const normalizeText = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const resolveImageUrl = (cover) => {
  if (!cover) return null;
  if (typeof cover === 'string' && (cover.startsWith('http://') || cover.startsWith('https://'))) {
    return cover;
  }
  return `${UPLOADS_BASE_URL}/${String(cover).replace(/^\//, '')}`;
};

const fetchJson = async (url) => {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

const matchesQuery = (fields, query) => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return false;
  return fields.some((field) => normalizeText(field).includes(normalizedQuery));
};

const mapCatalogItem = (item) => {
  const name = String(item.name || item.libelle || 'Produit sans nom').trim();
  const rawPrice = item.price ?? item.prix ?? 0;
  const markupPct = getMarkupPercentageForRestaurant({
    id: item.restaurant_id ?? item.resto_id ?? item.resto?.id,
    name: item.restaurant_name ?? item.resto_name ?? item.resto?.name,
  });
  const restaurantName =
    item.restaurant_name ??
    item.resto_name ??
    item.resto?.name ??
    item.resto?.libelle ??
    null;

  return {
    searchKey: `catalog-${item.id}`,
    id: parseInt(item.id, 10) || item.id,
    name,
    price: formatPriceWithMarkup(rawPrice, 'FCFA', markupPct),
    description: String(item.desc || item.description || 'Aucune description').trim(),
    image: item.image_url
      ? { uri: resolveImageUrl(item.image_url) }
      : require('../../assets/images/2.jpg'),
    category: String(item.category?.libelle || item.category || 'Produit').trim(),
    rating: item.rating ? String(item.rating).trim() : null,
    productOrigin: 'catalog',
    type: 'product',
    rawPrice,
    unitPrice: applyMarkup(rawPrice, markupPct),
    markupPercentage: markupPct,
    restaurant_id: item.restaurant_id ?? item.resto_id ?? item.resto?.id ?? null,
    restaurant_name: restaurantName,
    complements: item.complements || [],
  };
};

const mapMenuItem = (menu, restaurant, subMenu) => {
  const name = String(menu.libelle || menu.name || 'Produit sans nom').trim();
  const rawPrice = menu.prix ?? menu.price ?? 0;
  const markupPct = getMarkupPercentageForRestaurant(restaurant);
  const restaurantName = restaurant.name || restaurant.libelle || 'Restaurant';
  const imageUrl = resolveImageUrl(menu.cover);

  return {
    searchKey: `menu-${restaurant.id}-${menu.id}-${subMenu.id}`,
    id: menu.id,
    name,
    price: formatPriceWithMarkup(rawPrice, 'FCFA', markupPct),
    description: String(menu.description || menu.desc || 'Aucune description').trim(),
    image: imageUrl ? { uri: imageUrl } : require('../../assets/images/2.jpg'),
    category: subMenu.libelle || subMenu.name || 'Menu restaurant',
    rating: null,
    productOrigin: 'restaurant',
    type: 'menu',
    rawPrice,
    unitPrice: applyMarkup(rawPrice, markupPct),
    markupPercentage: markupPct,
    restaurant_id: restaurant.id,
    restaurant_name: restaurantName,
    sub_menu_id: subMenu.id,
    subMenuName: subMenu.libelle || subMenu.name,
    complements: menu.complements || [],
  };
};

const loadCatalog = async () => {
  const data = await fetchJson(`${API_BASE_URL}/products-list`);
  const seen = new Set();
  const catalog = [];

  for (const item of data) {
    if (item.id == null || seen.has(item.id)) continue;
    seen.add(item.id);
    catalog.push(mapCatalogItem(item));
  }

  return catalog;
};

const loadRestaurantMenus = async () => {
  const [restaurants, subMenus] = await Promise.all([
    fetchJson(`${API_BASE_URL}/resto`),
    fetchJson(`${API_BASE_URL}/submenu-list`),
  ]);

  const jobs = [];
  for (const restaurant of restaurants) {
    for (const subMenu of subMenus) {
      const subMenuId = subMenu.id || subMenu.sub_menu_id;
      if (subMenuId) {
        jobs.push({ restaurant, subMenu, subMenuId });
      }
    }
  }

  const menuMap = new Map();
  const menus = [];

  const fetchJobMenus = async ({ restaurant, subMenu, subMenuId }) => {
    try {
      const data = await fetchJson(
        `${API_BASE_URL}/get-menu-by-resto?debut=2025-01-01&fin=2026-12-31&sub_menu_id=${subMenuId}&resto_id=${restaurant.id}`
      );
      return data.map((menu) => ({ menu, restaurant, subMenu }));
    } catch {
      return [];
    }
  };

  for (let i = 0; i < jobs.length; i += FETCH_CONCURRENCY) {
    const chunk = jobs.slice(i, i + FETCH_CONCURRENCY);
    const chunkResults = await Promise.all(chunk.map(fetchJobMenus));
    chunkResults.flat().forEach(({ menu, restaurant, subMenu }) => {
      const uniqueKey = `${restaurant.id}_${menu.id}_${menu.prix}`;
      if (menuMap.has(uniqueKey)) return;
      menuMap.set(uniqueKey, true);
      menus.push(mapMenuItem(menu, restaurant, subMenu));
    });
  }

  return menus;
};

const ensureCache = async () => {
  const isFresh = cache.loadedAt && Date.now() - cache.loadedAt < CACHE_TTL_MS;
  if (isFresh && (cache.catalog.length > 0 || cache.menus.length > 0)) {
    return cache;
  }

  if (cache.loading) {
    return cache.loading;
  }

  cache.loading = Promise.all([loadCatalog(), loadRestaurantMenus()])
    .then(([catalog, menus]) => {
      cache.catalog = catalog;
      cache.menus = menus;
      cache.loadedAt = Date.now();
      cache.loading = null;
      return cache;
    })
    .catch((error) => {
      cache.loading = null;
      throw error;
    });

  return cache.loading;
};

export const preloadSearchIndex = () => {
  ensureCache().catch(() => {});
};

export const searchAllProducts = async (query) => {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { catalog, menus } = await ensureCache();

  const catalogResults = catalog.filter((item) =>
    matchesQuery([item.name, item.description, item.category, item.restaurant_name], trimmed)
  );

  const menuResults = menus.filter((item) =>
    matchesQuery([item.name, item.description, item.category, item.restaurant_name], trimmed)
  );

  return [...catalogResults, ...menuResults];
};

export default {
  searchAllProducts,
  preloadSearchIndex,
};
