# Configuration du Cron pour les Notifications Programmées

## 📋 Prérequis

1. **Déployer les fonctions** :
   ```bash
   firebase login
   firebase deploy --only functions:checkScheduledNotifications,functions:scheduledNotificationsCron
   ```
   - `checkScheduledNotifications` : URL HTTP pour un cron externe (ou tests manuels).
   - `scheduledNotificationsCron` : exécution **automatique chaque minute** via Cloud Scheduler (Gen2, **plan Blaze** requis). Si vous n’avez pas Blaze, ne déployez que `checkScheduledNotifications` et gardez cron-job.org.

2. **Sécuriser l’URL HTTP (optionnel)** : dans la console Firebase (Functions) ou en local, définir la variable d’environnement `CRON_SECRET`. Ensuite appeler :
   `https://.../checkScheduledNotifications?key=VOTRE_SECRET`  
   ou envoyer le header `x-cron-key: VOTRE_SECRET`. Sans `CRON_SECRET`, l’URL reste publique comme avant.

3. **Récupérer l'URL de la fonction** :
   Après le déploiement, vous obtiendrez une URL comme :
   ```
   https://us-central1-mayombe-ba11b.cloudfunctions.net/checkScheduledNotifications
   ```

## 🔧 Configuration avec cron-job.org (Gratuit)

1. **Créer un compte** sur https://cron-job.org (gratuit)

2. **Créer un nouveau cron job** :
   - **Title** : `Check Scheduled Notifications`
   - **Address (URL)** : `https://us-central1-mayombe-ba11b.cloudfunctions.net/checkScheduledNotifications`
   - **Schedule** : Toutes les minutes (`* * * * *`)
   - **Request method** : `GET`
   - **Activate** : ✅

3. **Sauvegarder** le cron job

## 🔧 Configuration avec EasyCron (Gratuit)

1. **Créer un compte** sur https://www.easycron.com

2. **Créer un nouveau cron job** :
   - **Cron Job Name** : `Check Scheduled Notifications`
   - **URL** : `https://us-central1-mayombe-ba11b.cloudfunctions.net/checkScheduledNotifications`
   - **Schedule** : `* * * * *` (toutes les minutes)
   - **HTTP Method** : `GET`
   - **Status** : `Enabled`

3. **Sauvegarder** le cron job

## 🔧 Configuration avec UptimeRobot (Gratuit - 50 monitors)

1. **Créer un compte** sur https://uptimerobot.com

2. **Ajouter un monitor** :
   - **Monitor Type** : HTTP(s)
   - **Friendly Name** : `Check Scheduled Notifications`
   - **URL** : `https://us-central1-mayombe-ba11b.cloudfunctions.net/checkScheduledNotifications`
   - **Monitoring Interval** : 5 minutes (minimum gratuit)

## ⚠️ Note importante

- Le plan gratuit ne permet pas Cloud Scheduler intégré pour une fonction **Gen2 planifiée** : sans Blaze, utilisez uniquement l’URL HTTP + cron externe.
- Avec Blaze, `scheduledNotificationsCron` remplace avantageusement cron-job.org (une exécution par minute en UTC).
- Les services de cron gratuits ont généralement des limitations (fréquence minimale, nombre de jobs, etc.)
- **cron-job.org** permet des appels toutes les minutes en gratuit
- **EasyCron** permet aussi des appels fréquents en gratuit

## 🧪 Tester manuellement

Vous pouvez tester la fonction manuellement en appelant l'URL dans votre navigateur ou avec curl :

```bash
curl https://us-central1-mayombe-ba11b.cloudfunctions.net/checkScheduledNotifications
```

La réponse devrait être :
```json
{
  "success": true,
  "checked": 0,
  "message": "0 notification(s) vérifiée(s)"
}
```
