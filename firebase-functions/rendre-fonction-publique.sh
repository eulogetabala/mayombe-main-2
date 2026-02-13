#!/bin/bash
# Script pour rendre la fonction apiProxy publique

# Configurer Python pour gcloud
export CLOUDSDK_PYTHON=/usr/local/Cellar/python@3.10/3.10.17_1/libexec/bin/python3

echo "🔐 Configuration de gcloud..."
echo ""

# Configurer le projet
/usr/local/share/google-cloud-sdk/bin/gcloud config set project mayombe-ba11b

echo ""
echo "🔑 Authentification nécessaire..."
echo "Vous allez être redirigé vers votre navigateur pour vous connecter."
echo ""

# S'authentifier
/usr/local/share/google-cloud-sdk/bin/gcloud auth login

echo ""
echo "🔓 Rendre la fonction apiProxy accessible publiquement..."
echo ""

# Ajouter la permission
/usr/local/share/google-cloud-sdk/bin/gcloud functions add-iam-policy-binding apiProxy \
  --region=us-central1 \
  --member=allUsers \
  --role=roles/cloudfunctions.invoker \
  --project=mayombe-ba11b

echo ""
echo "✅ Terminé ! La fonction devrait maintenant être accessible publiquement."
echo ""
echo "🧪 Testez maintenant: https://mayombe-ba11b.web.app"
