# Mayombe Admin Dashboard

Dashboard d'administration pour gérer la plateforme Mayombe.

## Technologies

- React 18
- Vite
- Firebase (Firestore + Realtime Database)

## Installation

```bash
cd admin
npm install
```

## Démarrage

```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

## Build pour production

```bash
npm run build
```

Les fichiers seront générés dans le dossier `dist/`

## Fonctionnalités

### 🎯 Gestion des Promotions
- Créer des promotions pour les produits
- Définir prix promotionnel et pourcentage de réduction
- Définir dates de début et fin
- Supprimer des promotions

### 🍽️ Gestion des Statuts Restaurants
- Voir tous les restaurants (Brazzaville et Pointe-Noire)
- Basculer le statut Ouvert/Fermé en temps réel
- Rechercher des restaurants

### ⭐ Visualisation des Annotations
- Voir les notes moyennes des produits et restaurants
- Filtrer par type (Produits / Restaurants)
- Rechercher par nom
- Trier par note moyenne décroissante

## Configuration Firebase

Le dashboard utilise la même configuration Firebase que l'application mobile :
- **Firestore** : Promos, Ratings, Métadonnées
- **Realtime Database** : Statuts restaurants

## Déploiement

Le dashboard peut être déployé sur :
- Vercel
- Netlify
- Firebase Hosting
- Tout hébergeur web statique
