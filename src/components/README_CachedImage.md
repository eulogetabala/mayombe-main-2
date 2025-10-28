# Cache d'Images - Guide d'utilisation

## 🎯 **Objectif**
Améliorer les performances de l'application en mettant en cache les images, particulièrement utile avec un débit faible.

## 📦 **Composants**

### `CachedImage`
Composant de remplacement pour `<Image>` avec cache automatique.

**Utilisation :**
```jsx
import CachedImage from '../components/CachedImage';

// Au lieu de :
<Image source={{ uri: imageUrl }} style={styles.image} />

// Utilisez :
<CachedImage source={{ uri: imageUrl }} style={styles.image} />
```

### `ImagePlaceholder`
Composant d'image de remplacement en cas d'erreur.

## ⚙️ **Configuration**

### Cache automatique
- **Taille maximale :** 50MB
- **Durée de vie :** 30 jours
- **Compression :** 80% de qualité
- **Nettoyage automatique :** Activé

### Gestion des erreurs
- **Placeholder automatique** si l'image ne charge pas
- **Indicateur de chargement** pendant le téléchargement
- **Fallback** vers image locale si nécessaire

## 🚀 **Bénéfices**

### Performance
- ✅ **Chargement instantané** des images déjà vues
- ✅ **Économie de données** (pas de re-téléchargement)
- ✅ **Cache persistant** même après redémarrage

### Expérience utilisateur
- ✅ **Meilleure UX** avec débit faible
- ✅ **Chargement progressif** des images
- ✅ **Gestion d'erreurs** élégante

## 🔧 **Fonctions utilitaires**

### Vider le cache
```javascript
import { clearImageCache } from '../config/ImageCacheConfig';

// Vider le cache si nécessaire
await clearImageCache();
```

### Vérifier la taille du cache
```javascript
import { getCacheSize } from '../config/ImageCacheConfig';

// Obtenir la taille du cache
const size = await getCacheSize();
console.log(`Cache: ${(size / 1024 / 1024).toFixed(2)} MB`);
```

### Précharger des images
```javascript
import { preloadImportantImages } from '../config/ImageCacheConfig';

// Précharger des images importantes
await preloadImportantImages([
  'https://example.com/image1.jpg',
  'https://example.com/image2.jpg'
]);
```

## 📱 **Écrans mis à jour**

- ✅ `CartScreen` - Images des produits dans le panier
- ✅ `AllProducts` - Images des produits dans la liste
- ✅ `CategorieList` - Images des produits par catégorie
- 🔄 `RestaurantDetails` - À mettre à jour
- 🔄 `Categories` - À mettre à jour
- 🔄 `HomeScreen` - À mettre à jour

## 🎉 **Résultat**

L'application est maintenant optimisée pour les connexions lentes :
- **Premier chargement** : Normal (téléchargement)
- **Chargements suivants** : Instantané (cache)
- **Débit faible** : Problème résolu
- **Performance** : Améliorée drastiquement
