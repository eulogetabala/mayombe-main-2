import { db, collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, Timestamp } from './firestore';

/**
 * Service pour gérer les notations de produits et restaurants
 */
class RatingsService {
  /**
   * Soumettre une notation
   * @param {string} itemId - ID du produit ou restaurant
   * @param {string} type - 'product' ou 'restaurant'
   * @param {number} rating - Note entre 1 et 5
   * @param {string} userId - ID de l'utilisateur (ou guestId)
   * @param {string} comment - Commentaire optionnel
   */
  async submitRating(itemId, type, rating, userId, comment = '') {
    try {
      const ratingId = `${userId}_${itemId}_${type}`;
      const ratingRef = doc(db, 'ratings', ratingId);
      
      const ratingData = {
        itemId: itemId.toString(),
        type,
        rating,
        userId,
        comment,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await setDoc(ratingRef, ratingData, { merge: true });
      
      // Mettre à jour les métadonnées
      await this.updateRatingMetadata(itemId, type);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erreur lors de la soumission de la notation:', error);
      throw error;
    }
  }

  /**
   * Récupérer toutes les notations d'un item
   */
  async getRatings(itemId, type) {
    try {
      const ratingsRef = collection(db, 'ratings');
      const q = query(
        ratingsRef,
        where('itemId', '==', itemId.toString()),
        where('type', '==', type)
      );
      
      const querySnapshot = await getDocs(q);
      const ratings = [];
      
      querySnapshot.forEach((doc) => {
        ratings.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      
      return ratings;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des notations:', error);
      // Fallback: requête simplifiée sans orderBy
      try {
        const ratingsRef = collection(db, 'ratings');
        const q = query(
          ratingsRef,
          where('itemId', '==', itemId.toString()),
          where('type', '==', type)
        );
        const querySnapshot = await getDocs(q);
        const ratings = [];
        querySnapshot.forEach((doc) => {
          ratings.push({
            id: doc.id,
            ...doc.data(),
          });
        });
        return ratings.sort((a, b) => {
          const aTime = a.updatedAt?.toMillis() || 0;
          const bTime = b.updatedAt?.toMillis() || 0;
          return bTime - aTime;
        });
      } catch (fallbackError) {
        console.error('❌ Erreur fallback:', fallbackError);
        return [];
      }
    }
  }

  /**
   * Calculer la note moyenne
   */
  async getAverageRating(itemId, type) {
    try {
      const ratings = await this.getRatings(itemId, type);
      
      if (ratings.length === 0) {
        return { averageRating: 0, totalRatings: 0 };
      }
      
      const sum = ratings.reduce((acc, r) => acc + (r.rating || 0), 0);
      const average = sum / ratings.length;
      
      return {
        averageRating: Math.round(average * 10) / 10, // Arrondir à 1 décimale
        totalRatings: ratings.length,
      };
    } catch (error) {
      console.error('❌ Erreur lors du calcul de la note moyenne:', error);
      return { averageRating: 0, totalRatings: 0 };
    }
  }

  /**
   * Récupérer les notes moyennes pour plusieurs items (batch)
   */
  async getBatchRatings(itemIds, type) {
    try {
      const ratingsMap = {};
      
      // Récupérer les métadonnées depuis Firestore
      const metadataCollection = type === 'product' ? 'products_metadata' : 'restaurants_metadata';
      
      const promises = itemIds.map(async (itemId) => {
        try {
          const metadataRef = doc(db, metadataCollection, itemId.toString());
          const metadataSnap = await getDoc(metadataRef);
          
          if (metadataSnap.exists()) {
            const data = metadataSnap.data();
            ratingsMap[itemId.toString()] = {
              averageRating: data.averageRating || 0,
              totalRatings: data.totalRatings || 0,
            };
          } else {
            ratingsMap[itemId.toString()] = {
              averageRating: 0,
              totalRatings: 0,
            };
          }
        } catch (error) {
          console.error(`❌ Erreur pour ${itemId}:`, error);
          ratingsMap[itemId.toString()] = {
            averageRating: 0,
            totalRatings: 0,
          };
        }
      });
      
      await Promise.all(promises);
      return ratingsMap;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération batch des notes:', error);
      return {};
    }
  }

  /**
   * Mettre à jour les métadonnées de notation
   */
  async updateRatingMetadata(itemId, type) {
    try {
      const { averageRating, totalRatings } = await this.getAverageRating(itemId, type);
      
      const metadataCollection = type === 'product' ? 'products_metadata' : 'restaurants_metadata';
      const metadataRef = doc(db, metadataCollection, itemId.toString());
      
      await setDoc(metadataRef, {
        itemId: itemId.toString(),
        averageRating,
        totalRatings,
        lastUpdated: Timestamp.now(),
      }, { merge: true });
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour des métadonnées:', error);
    }
  }
}

export default new RatingsService();
