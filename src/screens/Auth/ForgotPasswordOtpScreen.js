import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Animatable from "react-native-animatable";
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations';
import { api } from '../../services/api';

const ForgotPasswordOtpScreen = ({ navigation, route }) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  
  const otpRefs = useRef([]);
  const { phone } = route.params || {};

  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];

  const handleOtpChange = (text, index) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-focus next input
    if (text && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const validateOtp = () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) {
      Alert.alert("Erreur", "Veuillez entrer le code à 6 chiffres.");
      return false;
    }
    return true;
  };

  const handleVerifyOtp = async () => {
    if (!validateOtp()) return;

    setLoading(true);

    try {
      const otpString = otp.join("");
      // Ici on peut ajouter une vérification OTP si nécessaire
      // Pour l'instant, on passe directement à la réinitialisation
      
      // Simuler une vérification réussie
      setTimeout(() => {
        setLoading(false);
        navigation.navigate("ResetPassword", { 
          phone: phone,
          otp: otpString 
        });
      }, 1000);

    } catch (error) {
      Alert.alert("Erreur", "Une erreur est survenue lors de la vérification.");
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("../../../assets/images/filter.png")}
      style={styles.background}
      imageStyle={{ opacity: 0.3 }}
    >
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          <View style={styles.card}>
            <Text style={styles.title}>
              Vérification
            </Text>

            <Text style={styles.subtitle}>
              Entrez le code de vérification envoyé à {phone}
            </Text>

            {/* Code OTP */}
            <View style={styles.otpContainer}>
              <Text style={styles.otpLabel}>Code de vérification</Text>
              <View style={styles.otpInputs}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (otpRefs.current[index] = ref)}
                    style={styles.otpInput}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, index)}
                    onKeyPress={(e) => handleOtpKeyPress(e, index)}
                    keyboardType="numeric"
                    maxLength={1}
                    textAlign="center"
                    autoFocus={index === 0}
                  />
                ))}
              </View>
            </View>

            {/* Bouton de vérification */}
            <TouchableOpacity
              style={[styles.button, loading && styles.disabledButton]}
              onPress={handleVerifyOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Vérifier le code</Text>
              )}
            </TouchableOpacity>

            {/* Lien de retour */}
            <TouchableOpacity
              style={styles.linkContainer}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.linkText}>
                <Text style={styles.linkHighlight}>← Retour</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 25,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  title: {
    fontSize: 29,
    fontWeight: "bold",
    color: "#4CAF50",
    textAlign: "center",
    marginBottom: 10,
    fontFamily: "Montserrat",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 30,
    fontFamily: "Montserrat",
  },
  otpContainer: {
    marginBottom: 25,
  },
  otpLabel: {
    fontSize: 16,
    color: "#333",
    marginBottom: 10,
    fontFamily: "Montserrat",
  },
  otpInputs: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 5,
    marginTop: 10,
  },
  otpInput: {
    flex: 1,
    height: 55,
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 8,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    fontFamily: "Montserrat",
    backgroundColor: "#fff",
    marginHorizontal: 2,
    minWidth: 40,
  },
  button: {
    backgroundColor: "#FF9800",
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "bold",
    fontFamily: "Montserrat",
  },
  disabledButton: { backgroundColor: "#ccc" },
  linkContainer: { 
    alignItems: "center", 
    marginTop: 20 
  },
  linkText: { 
    fontSize: 14, 
    color: "#555",
    fontFamily: "Montserrat",
  },
  linkHighlight: { 
    color: "#FF9800", 
    fontWeight: "bold" 
  },
});

export default ForgotPasswordOtpScreen;
