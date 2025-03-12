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

export default function OtpScreen({ navigation, route }) {
  const phoneNumber = route?.params?.phoneNumber || 'Numéro inconnu';

  const [otp, setOtp] = useState(['', '', '', '']); // 4 champs pour OTP
  const [timer, setTimer] = useState(59); // Timer pour le renvoi
  const inputRefs = useRef([]); // Utilisation de useRef pour gérer les références

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval); // Nettoyer l'intervalle
    }
  }, [timer]);

  const handleInputChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Passer automatiquement au champ suivant
    if (text && index < otp.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Revenir au champ précédent si l'utilisateur supprime
    if (!text && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleActivateAccount = async () => {
    const enteredOtp = otp.join(''); // Combine les 4 champs OTP
    if (enteredOtp.length < 4) {
      Alert.alert('Erreur', 'Veuillez entrer un code OTP complet.');
      return;
    }

    try {
      const response = await fetch(
        'https://www.api-mayombe.mayombe-app.com/public/api/activate-account',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ otp: enteredOtp }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Succès', 'Compte activé avec succès !');
        navigation.navigate('Home'); // Redirige vers la page de connexion
      } else {
        Alert.alert('Erreur', data.message || 'Activation échouée.');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de se connecter au serveur.');
      console.error(error);
    }
  };

  const handleResendCode = () => {
    setTimer(59);
    // Logique pour renvoyer le code OTP
    Alert.alert('Code renvoyé', 'Un nouveau code OTP a été envoyé.');
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

      {timer > 0 ? (
        <Text style={styles.resendText}>
          Pas encore reçu de code? Renvoyer dans ({timer} secondes)
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
