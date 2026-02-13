/**
 * Script pour créer l'utilisateur admin dans Firebase Authentication
 * 
 * Exécuter ce script une seule fois pour créer le compte admin :
 * node create-admin-user.js
 * 
 * OU utiliser Firebase Console :
 * 1. Aller sur https://console.firebase.google.com
 * 2. Sélectionner le projet "mayombe-ba11b"
 * 3. Aller dans Authentication > Users
 * 4. Cliquer sur "Add user"
 * 5. Email: contact@mayombe-app.com
 * 6. Password: Mayombe1234
 */

import { initializeApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyB6Foh29YS-VQLMhw-gO83L_OSVullVvI8",
  authDomain: "mayombe-ba11b.firebaseapp.com",
  databaseURL: "https://mayombe-ba11b-default-rtdb.firebaseio.com",
  projectId: "mayombe-ba11b",
  storageBucket: "mayombe-ba11b.firebasestorage.app",
  messagingSenderId: "784517096614",
  appId: "1:784517096614:android:41b02898b40426e23fc067"
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)

const ADMIN_EMAIL = 'contact@mayombe-app.com'
const ADMIN_PASSWORD = 'Mayombe1234'

async function createAdminUser() {
  try {
    console.log('🔐 Création de l\'utilisateur admin...')
    console.log(`📧 Email: ${ADMIN_EMAIL}`)
    
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      ADMIN_EMAIL,
      ADMIN_PASSWORD
    )
    
    console.log('✅ Utilisateur admin créé avec succès!')
    console.log(`👤 UID: ${userCredential.user.uid}`)
    console.log(`📧 Email: ${userCredential.user.email}`)
    console.log('\n🎉 Vous pouvez maintenant vous connecter au dashboard admin!')
    
    process.exit(0)
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('ℹ️  L\'utilisateur admin existe déjà.')
      console.log('✅ Vous pouvez vous connecter avec:')
      console.log(`   Email: ${ADMIN_EMAIL}`)
      console.log(`   Mot de passe: ${ADMIN_PASSWORD}`)
    } else {
      console.error('❌ Erreur lors de la création de l\'utilisateur:', error.message)
      console.error('\n💡 Alternative: Créez l\'utilisateur manuellement via Firebase Console')
      console.error('   1. Allez sur https://console.firebase.google.com')
      console.error('   2. Sélectionnez le projet "mayombe-ba11b"')
      console.error('   3. Allez dans Authentication > Users')
      console.error('   4. Cliquez sur "Add user"')
      console.error(`   5. Email: ${ADMIN_EMAIL}`)
      console.error(`   6. Password: ${ADMIN_PASSWORD}`)
    }
    process.exit(1)
  }
}

createAdminUser()
