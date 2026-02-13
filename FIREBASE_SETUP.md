# Configuration Firebase Storage pour le Développement Local

Si vous rencontrez des problèmes d'upload d'images (Timeout, Erreurs) depuis votre environnement local (http://localhost:...), suivez ces deux étapes.

## Étape 0 : Activer le Stockage (Si ce n'est pas fait)
D'après votre message, le service Storage n'est pas encore activé.

1.  Sur la page **Storage**, cliquez sur le bouton **Commencer** (Get Started).
2.  Une fenêtre s'ouvre : choisissez **Démarrer en mode test** (Start in test mode).
3.  Cliquez sur **Suivant**.
4.  Laissez l'emplacement par défaut (ex: `us-central1` ou `eur3`) et cliquez sur **Terminé**.

Une fois activé, passez à l'étape 1 ci-dessous.

## Étape 1 : Configurer les Règles de Sécurité
Cela permet à votre application d'écrire dans le stockage.

1.  Allez sur la [Console Firebase](https://console.firebase.google.com/)
2.  Sélectionnez votre projet **mayombe-ba11b**
3.  Dans le menu gauche, cliquez sur **Storage**
4.  Cliquez sur l'onglet **Rules**
5.  Remplacez tout le contenu par ceci (règles de développement) :

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // Autoriser lecture/eriture pour tout le monde (TEMPORAIRE POUR DEV)
      allow read, write: if true;
    }
  }
}
```
6.  Cliquez sur **Publish**

## Étape 2 : Configurer les CORS (Cross-Origin Resource Sharing)
C'est souvent la cause des blocages "silencieux" ou des timeouts en local.

1.  Si vous avez `gsutil` installé (Google Cloud SDK), lancez cette commande dans votre terminal :
    ```bash
    gsutil cors set cors.json gs://mayombe-ba11b.firebasestorage.app
    ```

2.  **Si vous n'avez pas gsutil** (le plus probable), vous pouvez le faire via la console Google Cloud :
    - Aller sur [Google Cloud Console](https://console.cloud.google.com/)
    - Activer le Cloud Shell (icône en haut à droite >_ )
    - Créer un fichier cors.json :
      ```bash
      echo '[{"origin": ["*"],"method": ["GET", "HEAD", "PUT", "POST", "DELETE"],"responseHeader": ["Content-Type"],"maxAgeSeconds": 3600}]' > cors.json
      ```
    - Appliquer la configuration :
      ```bash
      gsutil cors set cors.json gs://mayombe-ba11b.firebasestorage.app
      ```

## Astuce de dépannage
Si tout échoue, utilisez le bouton **"Annuler"** (qui devient **"Fermer (force)"**) dans l'interface pour ne pas rester bloqué.
