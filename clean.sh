#!/bin/bash

echo "🧹 Nettoyage du projet Mayombe Client..."

# Supprimer les dossiers de build
echo "📦 Suppression des dossiers de build..."
rm -rf node_modules
rm -rf .expo
rm -rf android/build
rm -rf android/app/build
rm -rf ios/build
rm -rf dist

# Supprimer les fichiers temporaires
echo "🗑️ Suppression des fichiers temporaires..."
find . -name "*.log" -delete
find . -name "*.tmp" -delete
find . -name ".DS_Store" -delete
find . -name "*.swp" -delete
find . -name "*.swo" -delete

# Réinstaller les dépendances
echo "📦 Réinstallation des dépendances..."
npm install

echo "✅ Nettoyage terminé !"
echo "🚀 Le projet est prêt pour le déploiement."
