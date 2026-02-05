# Mayombe Platform

Plateforme complète de livraison de repas avec application mobile et dashboard d'administration.

## Structure du Projet

Le projet est organisé en deux applications distinctes et indépendantes :

### 📱 Mobile (`/mobile`)
Application React Native (Expo) pour les utilisateurs finaux.

**Technologies :**
- React Native / Expo
- Firebase (Firestore, Realtime Database, Cloud Messaging)
- React Navigation
- NativeWind / Tailwind CSS

**Démarrage :**
```bash
cd mobile
npm install
npm start
```

Voir `mobile/README.md` pour plus de détails.

### 🖥️ Backoffice (`/backoffice`)
Dashboard web d'administration pour gérer la plateforme.

**Technologies :**
- React + Vite
- Firebase (Firestore, Realtime Database)
- CSS moderne

**Démarrage :**
```bash
cd backoffice
npm install
npm run dev
```

Voir `backoffice/README.md` pour plus de détails.

## Fonctionnalités

### Mobile
- ✅ Système de notation (produits et restaurants)
- ✅ Promotions avec prix barrés
- ✅ Statuts ouverts/fermés des restaurants
- ✅ Tri par note moyenne
- ✅ Géolocalisation et cartes
- ✅ Panier et commandes
- ✅ Notifications push

### Backoffice
- ✅ Gestion des promos
- ✅ Gestion des statuts restaurants
- ✅ Visualisation des annotations/ratings

## Configuration Firebase

Les deux applications partagent la même configuration Firebase :
- **Firestore** : Ratings, Promos, Métadonnées
- **Realtime Database** : Statuts restaurants en temps réel

## Déploiement

Les deux applications peuvent être déployées indépendamment :
- **Mobile** : Expo EAS Build, App Store, Google Play
- **Backoffice** : Vercel, Netlify, ou tout hébergeur web
