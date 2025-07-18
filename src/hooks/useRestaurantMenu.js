import { useState, useCallback } from 'react';
import { API_BASE_URL, ENDPOINTS } from '../constants/api';

export const useRestaurantMenu = (restaurantId) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMenus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const today = new Date();
      const jour = today.toISOString().split('T')[0];

      const subMenuIds = [2, 3]; // Repas et Boissons
      const allMenus = new Map();

      for (const subMenuId of subMenuIds) {
        const url = `${API_BASE_URL}/get-menu-by-resto?jour=${jour}&sub_menu_id=${subMenuId}&resto_id=${restaurantId}`;
        console.log('Requête API:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });

        const data = await response.json();
        
        // Afficher la structure complète du premier menu pour debug
        if (data && data.length > 0) {
          console.log('Structure complète du premier menu:', JSON.stringify(data[0], null, 2));
        }
        
        if (Array.isArray(data)) {
          data.forEach(menu => {
            const key = `${menu.libelle}_${menu.prix}`;
            if (!allMenus.has(key)) {
              allMenus.set(key, menu);
            }
          });
        }
      }

      const uniqueMenus = Array.from(allMenus.values());
      const mappedProducts = uniqueMenus.map(menu => {
        // Analyser le chemin de l'image
        const coverPath = menu.cover || '';
        console.log('Chemin original de l\'image:', coverPath);

        // Construire l'URL de l'image selon différents cas
        const imageUrl = (() => {
          if (!coverPath) return null;
          
          // Si c'est déjà une URL complète
          if (coverPath.startsWith('http')) {
            return coverPath;
          }
          
          // Utiliser le bon format d'URL pour les images
          return `https://www.mayombe-app.com/uploads_admin/${coverPath}`;
        })();

        console.log('URL finale de l\'image:', imageUrl);

        return {
          id: menu.id,
          name: menu.libelle || "Sans nom",
          description: menu.description || "Aucune description",
          price: menu.prix || "0",
          image: imageUrl ? { uri: imageUrl } : require('../../assets/images/2.jpg'),
          category: menu.category,
          sub_menu_id: menu.sub_menu_id,
          restaurant_id: menu.resto_id,
          complements: (menu.complements || []).map(complement => ({
            id: complement.id,
            name: complement.libelle || "Sans nom",
            description: complement.description || "",
            price: complement.prix || "0",
            image: complement.cover 
              ? { uri: `https://www.mayombe-app.com/uploads_admin/${complement.cover}` }
              : null,
            status: complement.status,
            created_at: complement.created_at,
            updated_at: complement.updated_at
          }))
        };
      });

      console.log('Premier produit mappé:', JSON.stringify(mappedProducts[0], null, 2));
      setProducts(mappedProducts);
      return mappedProducts;
    } catch (error) {
      console.error('Erreur détaillée:', error);
      setError('Impossible de charger les menus');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  return { products, loading, error, fetchMenus };
};

const mapMenuToProduct = (menu) => ({
  id: menu.id,
  name: menu.libelle || "Sans nom",
  description: menu.description || "Aucune description",
  price: menu.prix || "0",
  image: menu.cover ? { uri: menu.cover } : require('../../assets/images/2.jpg'),
  category: menu.category,
  sub_menu_id: menu.sub_menu_id,
  restaurant_id: menu.resto_id,
  complements: (menu.complements || []).map(mapComplementToProduct),
  status: menu.status,
  created_at: menu.created_at,
  updated_at: menu.updated_at
});

const mapComplementToProduct = (complement) => ({
  id: complement.id,
  name: complement.libelle || "Sans nom",
  description: complement.description || "",
  price: complement.prix || "0",
  image: complement.cover ? { uri: complement.cover } : null,
  status: complement.status,
  created_at: complement.created_at,
  updated_at: complement.updated_at
}); 