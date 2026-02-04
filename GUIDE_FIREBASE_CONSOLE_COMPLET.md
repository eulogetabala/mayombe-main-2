# 🔍 Guide Complet - Vérification Firebase Console pour iOS

## 📋 Informations de votre projet

- **Projet Firebase** : `mayombe-ba11b`
- **Bundle ID iOS** : `com.thprojet.mayombeclient`
- **App ID Firebase** : `1:784517096614:ios:fd753638c478ef5f3fc067`
- **Team ID Apple** : `9W3MSS5RZ9`
- **APNs Key ID** : `8K2WGV9VVG`

---

## ✅ ÉTAPE 1 : Vérifier le projet Firebase

### 1.1 Accéder à Firebase Console

1. Allez sur [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Connectez-vous avec votre compte Google
3. **Sélectionnez le projet** : `mayombe-ba11b`

### 1.2 Vérifier les informations générales

1. Cliquez sur l'icône ⚙️ (Paramètres du projet) en haut à gauche
2. Allez dans l'onglet **Général**
3. Vérifiez que vous voyez :
   - **Nom du projet** : mayombe-ba11b
   - **ID du projet** : mayombe-ba11b
   - **Numéro de projet** : 784517096614

---

## ✅ ÉTAPE 2 : Vérifier la configuration iOS

### 2.1 Accéder aux paramètres iOS

1. Toujours dans **Paramètres du projet** (⚙️)
2. Allez dans l'onglet **Vos applications**
3. Cherchez l'application iOS avec :
   - **Bundle ID** : `com.thprojet.mayombeclient`
   - **App ID** : `1:784517096614:ios:fd753638c478ef5f3fc067`

### 2.2 Vérifier le fichier GoogleService-Info.plist

1. Si vous voyez l'app iOS, cliquez dessus
2. Vérifiez que le **GoogleService-Info.plist** est bien téléchargé
3. Comparez avec votre fichier local : `ios/MayombeApp/GoogleService-Info.plist`

**Vérifications à faire** :
- ✅ `PROJECT_ID` = `mayombe-ba11b`
- ✅ `BUNDLE_ID` = `com.thprojet.mayombeclient`
- ✅ `GOOGLE_APP_ID` = `1:784517096614:ios:fd753638c478ef5f3fc067`
- ✅ `GCM_SENDER_ID` = `784517096614`

---

## ✅ ÉTAPE 3 : Configurer Cloud Messaging (FCM)

### 3.1 Accéder à Cloud Messaging

1. Dans **Paramètres du projet** (⚙️)
2. Allez dans l'onglet **Cloud Messaging**

### 3.2 Vérifier la configuration Apple (APNs)

Dans la section **Apple app configuration**, vous devriez voir :

#### A. APNs Authentication Key (Recommandé - .p8)

✅ **Vérifiez que c'est configuré** :
- **Key ID** : `8K2WGV9VVG`
- **Team ID** : `9W3MSS5RZ9`
- **Fichier .p8** : Uploadé (vous devriez voir une date d'upload)

**Si ce n'est PAS configuré** :
1. Cliquez sur **Upload** à côté de "APNs Authentication Key"
2. Uploader votre fichier `.p8`
3. Entrer :
   - **Key ID** : `8K2WGV9VVG`
   - **Team ID** : `9W3MSS5RZ9`
4. Cliquez sur **Upload**

#### B. APNs Certificates (Optionnel - .p12)

Si vous avez aussi des certificats APNs (.p12), vérifiez :
- ✅ Certificat de développement (si vous testez en debug)
- ✅ Certificat de production (si vous testez en release)
- ✅ Les certificats ne sont pas expirés
- ✅ Les certificats correspondent au Bundle ID : `com.thprojet.mayombeclient`

**Note** : La clé APNs (.p8) est généralement suffisante et plus simple à gérer.

### 3.3 Obtenir la Server Key (pour l'API REST)

1. Toujours dans **Cloud Messaging**
2. Descendez jusqu'à la section **Cloud Messaging API (Legacy)**
3. Cherchez **Server Key**
4. **Copiez cette clé** (vous en aurez besoin pour tester avec l'API REST)

⚠️ **Important** : Cette clé est sensible, ne la partagez pas publiquement.

---

## ✅ ÉTAPE 4 : Vérifier les règles de sécurité

### 4.1 Vérifier Realtime Database

1. Dans le menu de gauche, allez dans **Realtime Database**
2. Allez dans l'onglet **Règles**
3. Vérifiez que les règles permettent l'écriture des tokens FCM :

```json
{
  "rules": {
    "fcm_tokens": {
      "$userId": {
        ".read": "auth != null && auth.uid == $userId",
        ".write": "auth != null && auth.uid == $userId"
      }
    }
  }
}
```

**Ou pour le développement (moins sécurisé mais plus simple)** :
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

---

## ✅ ÉTAPE 5 : Tester depuis Firebase Console

### 5.1 Envoyer une notification de test

1. Dans le menu de gauche, allez dans **Cloud Messaging**
2. Cliquez sur **"Envoyer votre premier message"** ou **"Nouvelle campagne"**
3. Remplissez le formulaire :
   - **Titre de notification** : "Test FCM iOS"
   - **Texte de notification** : "Ceci est un test depuis Firebase Console"
4. Cliquez sur **"Suivant"**
5. Dans **"Cible"**, sélectionnez **"Appareil de test"**
6. **Collez votre token FCM** :
   ```
   dFKgYm2JPkxdlsrZr-49AS:APA91bEhsBwpHYujW8hmvOWWlNCPOf61eVnREfalf9Hmuyzhp3HTyBcDCfwoIXQQqQY4RfND1PouehRL_t6Q19TU89WLIs4hZQcLtI4nyqJ_thX4OjjcDnQ
   ```
7. Cliquez sur **"Tester"**

### 5.2 Vérifier le résultat

**Si ça fonctionne** :
- ✅ Vous devriez voir "Message envoyé avec succès"
- ✅ La notification devrait apparaître sur votre appareil iOS

**Si ça ne fonctionne PAS** :
- ❌ Vérifiez que la clé APNs (.p8) est bien uploadée (Étape 3.2)
- ❌ Vérifiez que le Bundle ID correspond : `com.thprojet.mayombeclient`
- ❌ Vérifiez que les entitlements sont corrects (development pour debug, production pour release)
- ❌ Utilisez l'API FCM REST à la place (plus fiable)

---

## ✅ ÉTAPE 6 : Tester avec l'API FCM REST (Alternative plus fiable)

Si Firebase Console ne fonctionne pas, l'API REST est généralement plus fiable.

### 6.1 Depuis l'app (Console JavaScript)

1. Dans l'app, appuyez sur **Cmd+D** (iOS) ou secouez l'appareil
2. Sélectionnez **"Debug"** ou **"Open Debugger"**
3. Dans la console Chrome DevTools, tapez :
   ```javascript
   await fcmService.sendTestNotificationViaFCM("VOTRE_SERVER_KEY")
   ```
   (Remplacez `VOTRE_SERVER_KEY` par la Server Key obtenue à l'Étape 3.3)

### 6.2 Depuis le terminal

```bash
node test-push-notification.js dFKgYm2JPkxdlsrZr-49AS:APA91bEhsBwpHYujW8hmvOWWlNCPOf61eVnREfalf9Hmuyzhp3HTyBcDCfwoIXQQqQY4RfND1PouehRL_t6Q19TU89WLIs4hZQcLtI4nyqJ_thX4OjjcDnQ --serverKey VOTRE_SERVER_KEY
```

### 6.3 Via curl

```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=VOTRE_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "dFKgYm2JPkxdlsrZr-49AS:APA91bEhsBwpHYujW8hmvOWWlNCPOf61eVnREfalf9Hmuyzhp3HTyBcDCfwoIXQQqQY4RfND1PouehRL_t6Q19TU89WLIs4hZQcLtI4nyqJ_thX4OjjcDnQ",
    "notification": {
      "title": "Test FCM iOS",
      "body": "Notification de test depuis curl",
      "sound": "default"
    },
    "data": {
      "type": "test",
      "timestamp": "'$(date +%s)'"
    },
    "priority": "high",
    "apns": {
      "headers": {
        "apns-priority": "10"
      },
      "payload": {
        "aps": {
          "alert": {
            "title": "Test FCM iOS",
            "body": "Notification de test depuis curl"
          },
          "sound": "default",
          "badge": 1
        }
      }
    }
  }'
```

---

## 📋 Checklist Complète

Cochez chaque point au fur et à mesure :

### Configuration Firebase
- [ ] Projet Firebase sélectionné : `mayombe-ba11b`
- [ ] App iOS trouvée avec Bundle ID : `com.thprojet.mayombeclient`
- [ ] GoogleService-Info.plist vérifié et correspond

### Cloud Messaging
- [ ] Clé APNs (.p8) uploadée dans Firebase Console
- [ ] Key ID correct : `8K2WGV9VVG`
- [ ] Team ID correct : `9W3MSS5RZ9`
- [ ] Server Key copiée (pour l'API REST)

### Configuration iOS locale
- [ ] Entitlements corrects :
  - Debug : `aps-environment: development`
  - Release : `aps-environment: production`
- [ ] App reconstruite : `npx expo run:ios`
- [ ] Permissions de notifications accordées dans iOS

### Test
- [ ] Token FCM obtenu et affiché
- [ ] Test depuis Firebase Console (si possible)
- [ ] Test via API FCM REST (plus fiable)

---

## 🔧 Dépannage

### Erreur : "Invalid APNs credentials"

**Solution** :
1. Vérifiez que la clé APNs (.p8) est bien uploadée
2. Vérifiez que le Key ID et Team ID sont corrects
3. Vérifiez que le Bundle ID correspond

### Erreur : "MismatchSenderId"

**Solution** :
1. Vérifiez que le `GCM_SENDER_ID` dans GoogleService-Info.plist correspond
2. Reconstruisez l'app : `npx expo run:ios`

### Les notifications ne fonctionnent pas depuis Firebase Console mais fonctionnent via API REST

**C'est normal !** L'API REST est plus fiable. Utilisez-la pour vos tests.

---

## 💡 Résumé

1. **Vérifiez** que la clé APNs (.p8) est uploadée dans Firebase Console
2. **Copiez** la Server Key pour utiliser l'API REST
3. **Testez** avec l'API REST (plus fiable que Firebase Console)
4. **Vérifiez** que les entitlements correspondent à votre environnement

Si tout est configuré correctement, les notifications devraient fonctionner ! 🎉




