import { ref, get } from 'firebase/database';
import { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, Timestamp } from './firestore';
import { database } from './firebase';
import { formatPriceWithMarkup as defaultFormatPriceWithMarkup, getMarkupPercentageFromProduct } from '../Utils/priceUtils';

/** @param {object} val enregistrement RTDB `product_promos/{id}` */
export function isRtdbPromoActive(val) {
  if (val == null || typeof val !== 'object') return false;
  if (val.active === false) return false;
  const price = Number(val.promoPrice);
  if (Number.isNaN(price) || price <= 0) return false;
  const now = Date.now();
  if (val.endDate) {
    const end = new Date(val.endDate).getTime();
    if (!Number.isNaN(end) && end < now) return false;
  }
  if (val.startDate) {
    const start = new Date(val.startDate).getTime();
    if (!Number.isNaN(start) && start > now) return false;
  }
  return true;
}

/** Snapshot complet `product_promos` → map normalisée par productId (pour fusion / temps réel) */
export function buildActivePromosMapFromRtdbSnapshot(raw) {
  if (raw == null || typeof raw !== 'object') {
    return {};
  }
  const merged = {};
  Object.entries(raw).forEach(([key, val]) => {
    if (!isRtdbPromoActive(val)) return;
    const pid = String(val.productId != null ? val.productId : key);
    merged[pid] = {
      id: `rtdb_${pid}`,
      productId: pid,
      promoPrice: Number(val.promoPrice),
      discountPercentage: val.discountPercentage,
    };
  });
  return merged;
}

/**
 * Service pour gérer les promotions
 * - Firestore `promos` : promos datées (isActive, startDate, endDate)
 * - RTDB `product_promos` : prix promo définis depuis le **dashboard admin**
 */
class PromosService {
  async _mergeRtdbProductPromos(firestoreMap) {
    try {
      const snapshot = await get(ref(database, 'product_promos'));
      const raw = snapshot.exists() ? snapshot.val() : {};
      const rtdbMap = buildActivePromosMapFromRtdbSnapshot(raw);
      return { ...firestoreMap, ...rtdbMap };
    } catch (e) {
      console.warn('⚠️ promosService: lecture product_promos RTDB:', e?.message);
      return { ...firestoreMap };
    }
  }

  async _getFirestoreActivePromosMap() {
    try {
      const now = Timestamp.now();
      const promosRef = collection(db, 'promos');
      const q = query(
        promosRef,
        where('isActive', '==', true),
        where('startDate', '<=', now),
        where('endDate', '>=', now),
        orderBy('endDate', 'asc')
      );
      const querySnapshot = await getDocs(q);
      const promos = {};
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        promos[data.productId] = {
          id: docSnap.id,
          ...data,
        };
      });
      return promos;
    } catch (error) {
      if (error.code === 'failed-precondition') {
        if (error.message?.includes('index')) {
          console.log(
            'ℹ️ Index Firestore pour les promos en cours de construction ou manquant. Utilisation d\'une requête simplifiée.'
          );
        }
        return this._getFirestoreActivePromosMapFallback();
      }
      console.error('❌ Erreur lors de la récupération des promos:', error);
      return this._getFirestoreActivePromosMapFallback();
    }
  }

  async _getFirestoreActivePromosMapFallback() {
    try {
      const promosRef = collection(db, 'promos');
      const q = query(promosRef, where('isActive', '==', true));
      const querySnapshot = await getDocs(q);
      const now = Timestamp.now();
      const promos = {};
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const startDate = data.startDate?.toMillis() || 0;
        const endDate = data.endDate?.toMillis() || 0;
        const nowMillis = now.toMillis();
        if (startDate <= nowMillis && endDate >= nowMillis) {
          promos[data.productId] = {
            id: docSnap.id,
            ...data,
          };
        }
      });
      const sortedPromos = Object.values(promos).sort((a, b) => {
        const aEnd = a.endDate?.toMillis() || 0;
        const bEnd = b.endDate?.toMillis() || 0;
        return aEnd - bEnd;
      });
      const result = {};
      sortedPromos.forEach((promo) => {
        result[promo.productId] = promo;
      });
      return result;
    } catch (error) {
      console.error('❌ Erreur fallback promos:', error);
      return {};
    }
  }

  async createPromo(productId, promoPrice, discountPercentage, startDate, endDate) {
    try {
      const promoRef = doc(db, 'promos', productId.toString());
      const promoData = {
        productId: productId.toString(),
        promoPrice,
        discountPercentage,
        startDate: Timestamp.fromDate(new Date(startDate)),
        endDate: Timestamp.fromDate(new Date(endDate)),
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      await setDoc(promoRef, promoData);
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur lors de la création de la promo:', error);
      throw error;
    }
  }

  async updatePromo(productId, updates) {
    try {
      const promoRef = doc(db, 'promos', productId.toString());
      await updateDoc(promoRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de la promo:', error);
      throw error;
    }
  }

  async deletePromo(productId) {
    try {
      const promoRef = doc(db, 'promos', productId.toString());
      await deleteDoc(promoRef);
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur lors de la suppression de la promo:', error);
      throw error;
    }
  }

  async getActivePromos() {
    const fs = await this._getFirestoreActivePromosMap();
    return this._mergeRtdbProductPromos(fs);
  }

  async getActivePromosFallback() {
    const fs = await this._getFirestoreActivePromosMapFallback();
    return this._mergeRtdbProductPromos(fs);
  }

  async getProductPromo(productId) {
    const pid = productId.toString();
    try {
      const promoRef = doc(db, 'promos', pid);
      const promoSnap = await getDoc(promoRef);
      if (promoSnap.exists()) {
        const data = promoSnap.data();
        const now = Timestamp.now();
        if (data.isActive && data.startDate <= now && data.endDate >= now) {
          return {
            id: promoSnap.id,
            ...data,
          };
        }
      }
    } catch (error) {
      console.error('❌ Erreur Firestore promo produit:', error);
    }
    try {
      const snapshot = await get(ref(database, `product_promos/${pid}`));
      if (!snapshot.exists()) {
        return null;
      }
      const val = snapshot.val();
      if (!isRtdbPromoActive(val)) {
        return null;
      }
      return {
        id: `rtdb_${pid}`,
        productId: pid,
        promoPrice: Number(val.promoPrice),
        discountPercentage: val.discountPercentage,
      };
    } catch (e) {
      console.warn('⚠️ RTDB promo produit:', e?.message);
      return null;
    }
  }

  /** Promos Firestore uniquement, filtrées par ids (pour fusion avec RTDB temps réel côté UI) */
  async getBatchPromosFirestoreOnly(productIds) {
    try {
      const activePromos = await this._getFirestoreActivePromosMap();
      const promosMap = {};
      productIds.forEach((productId) => {
        const productIdStr = productId.toString();
        if (activePromos[productIdStr]) {
          promosMap[productIdStr] = activePromos[productIdStr];
        }
      });
      return promosMap;
    } catch (error) {
      console.error('❌ getBatchPromosFirestoreOnly:', error);
      return {};
    }
  }

  async getBatchPromos(productIds) {
    try {
      const activePromos = await this.getActivePromos();
      const promosMap = {};
      productIds.forEach((productId) => {
        const productIdStr = productId.toString();
        if (activePromos[productIdStr]) {
          promosMap[productIdStr] = activePromos[productIdStr];
        }
      });
      return promosMap;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération batch des promos:', error);
      return {};
    }
  }

  calculatePromoPrice(originalPrice, promo) {
    if (!promo) return originalPrice;
    return promo.promoPrice || (originalPrice * (1 - promo.discountPercentage / 100));
  }

  /**
   * Fusionne promos Firestore + RTDB temps réel (RTDB prioritaire si les deux existent).
   */
  mergePromoMapsForIds(fsMap, rtdbMap, productIds) {
    const out = {};
    productIds.forEach((id) => {
      const s = String(id);
      const promo = rtdbMap[s] ?? fsMap[s];
      if (promo) {
        out[s] = promo;
      }
    });
    return out;
  }

  /**
   * @param formatPriceWithMarkup - (price, currency?, pct?) => string
   * @param getMarkupPct - (product) => number ; défaut : selon restaurant produit (7 % ou 10 %)
   */
  applyPromosToProductRows(
    products,
    fsPromoMap,
    rtdbPromoMap,
    formatPriceWithMarkup = defaultFormatPriceWithMarkup,
    getMarkupPct = getMarkupPercentageFromProduct
  ) {
    return products.map((product) => {
      const id = String(product.id);
      const promo = rtdbPromoMap[id] ?? fsPromoMap[id];
      const priceAfterPromo = promo
        ? this.calculatePromoPrice(product.rawPrice, promo)
        : product.rawPrice;
      const pct = getMarkupPct(product);
      return {
        ...product,
        promo: promo || null,
        hasPromo: !!promo,
        promoPrice: priceAfterPromo,
        markupPercentage: pct,
        price: formatPriceWithMarkup(priceAfterPromo, 'FCFA', pct),
        oldPrice: promo ? formatPriceWithMarkup(product.rawPrice, 'FCFA', pct) : null,
      };
    });
  }
}

export default new PromosService();
