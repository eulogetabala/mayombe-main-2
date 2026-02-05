import { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, Timestamp } from './firestore';

/**
 * Service pour gérer les promotions
 */
class PromosService {
  /**
   * Créer une promotion
   */
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

  /**
   * Mettre à jour une promotion
   */
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

  /**
   * Supprimer une promotion
   */
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

  /**
   * Récupérer les promotions actives
   */
  async getActivePromos() {
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
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        promos[data.productId] = {
          id: doc.id,
          ...data,
        };
      });
      
      return promos;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des promos:', error);
      // Fallback: récupérer toutes les promos et filtrer côté client
      return this.getActivePromosFallback();
    }
  }

  /**
   * Fallback pour récupérer les promos actives (sans index)
   */
  async getActivePromosFallback() {
    try {
      const promosRef = collection(db, 'promos');
      const q = query(promosRef, where('isActive', '==', true));
      
      const querySnapshot = await getDocs(q);
      const now = Timestamp.now();
      const promos = {};
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const startDate = data.startDate?.toMillis() || 0;
        const endDate = data.endDate?.toMillis() || 0;
        const nowMillis = now.toMillis();
        
        if (startDate <= nowMillis && endDate >= nowMillis) {
          promos[data.productId] = {
            id: doc.id,
            ...data,
          };
        }
      });
      
      // Trier par endDate côté client
      const sortedPromos = Object.values(promos).sort((a, b) => {
        const aEnd = a.endDate?.toMillis() || 0;
        const bEnd = b.endDate?.toMillis() || 0;
        return aEnd - bEnd;
      });
      
      const result = {};
      sortedPromos.forEach(promo => {
        result[promo.productId] = promo;
      });
      
      return result;
    } catch (error) {
      console.error('❌ Erreur fallback promos:', error);
      return {};
    }
  }

  /**
   * Récupérer la promo d'un produit spécifique
   */
  async getProductPromo(productId) {
    try {
      const promoRef = doc(db, 'promos', productId.toString());
      const promoSnap = await getDoc(promoRef);
      
      if (!promoSnap.exists()) {
        return null;
      }
      
      const data = promoSnap.data();
      const now = Timestamp.now();
      
      // Vérifier si la promo est active
      if (
        data.isActive &&
        data.startDate <= now &&
        data.endDate >= now
      ) {
        return {
          id: promoSnap.id,
          ...data,
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de la promo:', error);
      return null;
    }
  }

  /**
   * Récupérer les promos pour plusieurs produits (batch)
   */
  async getBatchPromos(productIds) {
    try {
      const promosMap = {};
      const activePromos = await this.getActivePromos();
      
      productIds.forEach(productId => {
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

  /**
   * Calculer le prix après promo
   */
  calculatePromoPrice(originalPrice, promo) {
    if (!promo) return originalPrice;
    return promo.promoPrice || (originalPrice * (1 - promo.discountPercentage / 100));
  }
}

export default new PromosService();
