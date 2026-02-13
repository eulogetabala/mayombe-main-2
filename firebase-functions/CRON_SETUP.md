# Configuration du Cron pour les Notifications Programmées

## 📋 Prérequis

1. **Déployer la fonction** :
   ```bash
   firebase login
   firebase deploy --only functions:checkScheduledNotifications
   ```

2. **Récupérer l'URL de la fonction** :
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

- Le plan gratuit de Firebase ne supporte pas `functions.pubsub.schedule()`
- Cette solution utilise une fonction HTTP appelée par un service externe
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
