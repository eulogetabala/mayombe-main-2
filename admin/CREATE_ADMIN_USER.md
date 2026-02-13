# Création de l'utilisateur admin

Pour accéder au dashboard admin, vous devez créer un utilisateur dans Firebase Authentication.

## Méthode 1 : Via Firebase Console (Recommandé)

1. Allez sur [Firebase Console](https://console.firebase.google.com)
2. Sélectionnez le projet **"mayombe-ba11b"**
3. Dans le menu de gauche, cliquez sur **Authentication**
4. Cliquez sur l'onglet **Users**
5. Cliquez sur le bouton **"Add user"** (ou "Ajouter un utilisateur")
6. Remplissez le formulaire :
   - **Email**: `contact@mayombe-app.com`
   - **Password**: `Mayombe1234`
   - Cochez "Set as administrator" si disponible (optionnel)
7. Cliquez sur **"Add user"**

## Méthode 2 : Via le script Node.js

Si vous avez Node.js installé et que vous êtes dans le dossier `admin` :

```bash
node create-admin-user.js
```

**Note**: Cette méthode peut nécessiter une configuration supplémentaire de Firebase Admin SDK.

## Vérification

Une fois l'utilisateur créé, vous pouvez vous connecter au dashboard avec :
- **Email**: `contact@mayombe-app.com`
- **Mot de passe**: `Mayombe1234`

## Sécurité

⚠️ **Important**: Changez le mot de passe par défaut après la première connexion si vous le souhaitez. Pour cela, vous pouvez utiliser Firebase Console > Authentication > Users > [Votre utilisateur] > Reset password.
