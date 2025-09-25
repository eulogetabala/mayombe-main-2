import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const formatPhoneNumber = (phone) => {
  // Nettoyer le numéro de téléphone (enlever les espaces, tirets, etc.)
  let cleanNumber = phone.replace(/[\s-]/g, '');
  
  // Si le numéro commence déjà par un +, on le garde tel quel
  if (cleanNumber.startsWith('+')) {
    return cleanNumber;
  }

  // Si le numéro commence par 00, on remplace par +
  if (cleanNumber.startsWith('00')) {
    return '+' + cleanNumber.substring(2);
  }

  // Pour les numéros congolais sans indicatif
  if (cleanNumber.startsWith('0')) {
    cleanNumber = cleanNumber.substring(1);
  }
  
  // Si le numéro commence par 242, on ajoute juste le +
  if (cleanNumber.startsWith('242')) {
    return '+' + cleanNumber;
  }
  
  // Par défaut, on ajoute l'indicatif du Congo
  return '+242' + cleanNumber;
};

export default function OtpScreen({ navigation, route }) {
  const rawPhoneNumber = route?.params?.phoneNumber || 'Numéro inconnu';
  const phoneNumber = formatPhoneNumber(rawPhoneNumber);

  const [otp, setOtp] = useState(['', '', '', '']); // 4 champs pour OTP
  const [timer, setTimer] = useState(300); // Timer pour le renvoi (5 minutes)
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleInputChange = (text, index) => {
    // Accepter uniquement les chiffres
    if (!/^\d*$/.test(text)) return;

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    if (text && index < otp.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (!text && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Vérification automatique quand tous les 4 chiffres sont saisis
    if (text && index === otp.length - 1) {
      const completeOtp = newOtp.join('');
      if (completeOtp.length === 4) {
        // Attendre un peu pour que l'utilisateur voie le dernier chiffre
        setTimeout(() => {
          handleActivateAccount();
        }, 500);
      }
    }
  };

  const handleActivateAccount = async () => {
    const enteredOtp = otp.join('');
    if (enteredOtp.length < 4) {
      Alert.alert('Erreur', 'Veuillez entrer un code OTP complet.');
      return;
    }

    try {
      console.log('Tentative d\'activation avec le numéro:', phoneNumber);
      const response = await fetch(
        'https://www.api-mayombe.mayombe-app.com/public/api/activate-account',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ 
            otp: enteredOtp,
            phone: phoneNumber
          }),
        }
      );

      const data = await response.json();
      console.log('Réponse activation:', data);

      if (response.ok) {
        // Redirection automatique sans Alert bloquant
        console.log('Compte activé avec succès, redirection vers MainApp...');
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp' }],
        });
      } else {
        console.error('Erreur activation:', data);
        Alert.alert('Erreur', data.message || 'Code OTP invalide ou expiré.');
      }
    } catch (error) {
      console.error('Erreur activation:', error);
      Alert.alert('Erreur', 'Impossible de se connecter au serveur.');
    }
  };

  const handleResendCode = async () => {
    if (isResending) return;
    
    setIsResending(true);
    try {
      console.log('Tentative de renvoi du code au numéro:', phoneNumber);
      const response = await fetch(
        'https://www.api-mayombe.mayombe-app.com/public/api/resend-otp',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ 
            phone: phoneNumber
          }),
        }
      );

      const data = await response.json();
      console.log('Réponse renvoi:', data);

      if (response.ok) {
        setTimer(59);
        Alert.alert('Succès', 'Un nouveau code OTP a été envoyé.');
      } else {
        console.error('Erreur renvoi:', data);
        Alert.alert('Erreur', data.message || 'Impossible de renvoyer le code.');
      }
    } catch (error) {
      console.error('Erreur renvoi:', error);
      Alert.alert('Erreur', 'Impossible de se connecter au serveur.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={24} color="black" />
      </TouchableOpacity>
      <Text style={styles.header}>Vérification OTP</Text>

      <Text style={styles.instruction}>Entrez le code de confirmation</Text>

      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={styles.otpInput}
            keyboardType="number-pad"
            maxLength={1}
            value={digit}
            onChangeText={(text) => handleInputChange(text, index)}
          />
        ))}
      </View>

      <Text style={styles.infoText}>
        Le code de vérification a été envoyé au{' '}
        <Text style={styles.phoneNumber}>{phoneNumber}</Text>
      </Text>
      
      <Text style={styles.delayInfo}>
        ⏰ Les SMS peuvent prendre 1-5 minutes selon votre opérateur et votre localisation.
      </Text>
      
    

      {timer > 0 ? (
        <Text style={styles.resendText}>
          Pas encore reçu de code? Renvoyer dans ({Math.floor(timer/60)}:{(timer%60).toString().padStart(2, '0')})
        </Text>
      ) : (
        <TouchableOpacity onPress={handleResendCode}>
          <Text style={styles.resendLink}>Renvoyer maintenant</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.continueButton} onPress={handleActivateAccount}>
        <Text style={styles.continueButtonText}>Continuer</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginTop: 20,
    marginLeft: 10,
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginVertical: 20,
  },
  instruction: {
    fontSize: 16,
    color: '#777',
    marginBottom: 20,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginBottom: 30,
  },
  otpInput: {
    width: width * 0.12,
    height: width * 0.12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CCC',
    textAlign: 'center',
    fontSize: 18,
    backgroundColor: '#FFF',
    marginHorizontal: 3,
    elevation: 2,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    marginBottom: 10,
  },
  phoneNumber: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  resendText: {
    fontSize: 14,
    color: '#777',
    marginVertical: 10,
  },
  resendLink: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  delayInfo: {
    color: '#FF6B35',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
  tipInfo: {
    color: '#2196F3',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
  },
  continueButton: {
    marginTop: 20,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
  },
  continueButtonText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: 'bold',
  },
});
