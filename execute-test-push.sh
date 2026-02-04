#!/bin/bash

# Token reconstruit (142 caractères)
TOKEN="dFKgYm2JPkxdlsrZr-49AS:APA91bEhsBwpHYujW8hmvOWWlNCPOf61eVnREfalf9Hmuyzhp3HTyBcDCfwoIXQQqQY4RfND1PouehRL_t6Q19TU89WLIs4hZQcLtI4nyqJ_thX4OjjcDnQ"

# Chemin vers la clé de service
SERVICE_ACCOUNT="/Users/smartvision2/Desktop/2025_Projet/mayombe-main-2-main/mayombe-ba11b-firebase-adminsdk-fbsvc-7928168601.json"

echo "🚀 Envoi de notification de test..."
echo "📱 Token: $TOKEN"
echo "----------------------------------------"

node src/send-fcm-admin.js "$SERVICE_ACCOUNT" "$TOKEN"
