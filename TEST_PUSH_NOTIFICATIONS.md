# Guide de Test des Notifications Push

## Méthode 1 : Via l'application (Recommandé)

### Étape 1 : Obtenir le Token FCM

1. **Démarrer l'application mobile**
2. **Se connecter** (le token sera automatiquement enregistré)
3. **Aller dans le profil** ou utiliser l'écran de test FCM
4. **Le token FCM sera affiché dans la console** avec ce format :
   ```
   ╔════════════════════════════════════════════════════════════════════════════════╗
   ║                    🔑 TOKEN FCM POUR FIREBASE CONSOLE 🔑                      ║
   ╠════════════════════════════════════════════════════════════════════════════════╣
   ║  [VOTRE TOKEN ICI]                                                             ║
   ╚════════════════════════════════════════════════════════════════════════════════╝
   ```

### Étape 2 : Tester depuis Firebase Console

1. **Aller sur Firebase Console** : https://console.firebase.google.com/project/mayombe-ba11b
2. **Cloud Messaging** > **Envoyer votre premier message**
3. **Créer une notification de test** :
   - Titre : `Test Push Notification`
   - Texte : `Ceci est un test de notification push`
4. **Cibler un appareil** > **Token FCM unique**
5. **Coller le token** obtenu à l'étape 1
6. **Envoyer le message**

## Méthode 2 : Via le script Node.js

### Prérequis

1. **Installer firebase-admin** :
   ```bash
   npm install firebase-admin
   ```

2. **Avoir le fichier serviceAccount.json** dans le projet (si disponible)

### Utilisation

```bash
# Depuis la racine du projet
node src/send-fcm-admin.js [TOKEN_FCM]

# Exemple
node src/send-fcm-admin.js eyJhbGciOiJSUzI1NiIsImtpZCI6Ij...
```

### Avec fichier serviceAccount personnalisé

```bash
node src/send-fcm-admin.js ./path/to/serviceAccount.json [TOKEN_FCM]
```

## Méthode 3 : Via Firebase Functions

### Depuis Firebase Console

1. **Aller dans Firebase Console** > **Functions**
2. **Tester la fonction** `sendNotificationToUser`
3. **Paramètres** :
   ```json
   {
     "userId": "VOTRE_USER_ID",
     "title": "Test Notification",
     "body": "Ceci est un test"
   }
   ```

## Vérification

### Dans l'application mobile

- ✅ La notification doit apparaître dans la barre de notifications
- ✅ En cliquant sur la notification, l'app doit s'ouvrir
- ✅ Les logs dans la console doivent afficher la réception

### Logs à vérifier

```
🔔 Notification reçue: {title: "...", body: "..."}
👆 Notification cliquée dans NotificationHandler
```

## Dépannage

### Le token n'apparaît pas

1. **Vérifier les permissions** : Les notifications doivent être autorisées
2. **Vérifier la connexion** : L'utilisateur doit être connecté
3. **Vérifier les logs** : Chercher les messages `📱 TOKEN FCM` dans la console

### La notification n'arrive pas

1. **Vérifier le token** : S'assurer que le token est correct et à jour
2. **Vérifier Firebase** : S'assurer que le projet Firebase est correct
3. **Vérifier les permissions** : Les notifications doivent être activées sur l'appareil
4. **Vérifier la connexion internet** : L'appareil doit être connecté

### Erreur "Token not found"

1. **Réinitialiser le token** : Se déconnecter et reconnecter
2. **Forcer l'obtention** : Utiliser `await forceGetFCMToken()` dans la console
3. **Vérifier AsyncStorage** : Le token doit être stocké dans `fcmToken`

## Commandes utiles dans la console React Native

```javascript
// Afficher le token FCM
await showFCMToken()

// Forcer l'obtention d'un nouveau token
await forceGetFCMToken()

// Vérifier le service FCM
fcmService.getToken()
```
