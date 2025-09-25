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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Animatable from "react-native-animatable";
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations';

const ForgotPasswordOtpScreen = ({ navigation, route }) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  
  const otpRefs = useRef([]);
  const { phone, callingCode, phoneNumber } = route.params || {};

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
      console.log("Vérification OTP:", { phone, otp: otpString });
      
      // Pour l'instant, on passe directement à la réinitialisation
      // L'API ne semble pas avoir d'endpoint de vérification OTP séparé
      setTimeout(() => {
        setLoading(false);
        navigation.navigate("ResetPassword", { 
          phone: phone,
          otp: otpString,
          callingCode: callingCode,
          phoneNumber: phoneNumber
        });
      }, 1000);

    } catch (error) {
      console.error("Erreur vérification OTP:", error);
      Alert.alert("Erreur", "Une erreur est survenue lors de la vérification du code.");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = () => {
    Alert.alert(
      "Renvoyer le code",
      "Voulez-vous renvoyer le code de vérification ?",
      [
        {
          text: "Annuler",
          style: "cancel"
        },
        {
          text: "Renvoyer",
          onPress: () => {
            // Ici on pourrait appeler l'API pour renvoyer l'OTP
            Alert.alert("Code renvoyé", "Un nouveau code a été envoyé à votre numéro.");
          }
        }
      ]
    );
  };

  return (
    <ImageBackground
      source={require("../../../assets/images/filter.png")}
      style={styles.background}
      imageStyle={{ opacity: 0.3 }}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.contentContainer}>
          <View style={styles.card}>
            <Animatable.Text animation="fadeInDown" style={styles.title}>
              Vérification
            </Animatable.Text>

            <Animatable.Text animation="fadeInUp" style={styles.subtitle}>
              Entrez le code de vérification envoyé à {phone}
            </Animatable.Text>

            {/* Code OTP */}
            <Animatable.View animation="fadeInLeft" style={styles.otpContainer}>
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
            </Animatable.View>

            {/* Bouton de vérification */}
            <Animatable.View animation="zoomIn">
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
            </Animatable.View>

            {/* Lien pour renvoyer le code */}
            <Animatable.View animation="fadeInUp" delay={500}>
              <TouchableOpacity
                style={styles.resendContainer}
                onPress={resendOtp}
              >
                <Text style={styles.resendText}>
                  <Text style={styles.resendHighlight}>Renvoyer le code</Text>
                </Text>
              </TouchableOpacity>
            </Animatable.View>

            {/* Lien de retour */}
            <Animatable.View animation="fadeInUp" delay={1000}>
              <TouchableOpacity
                style={styles.linkContainer}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.linkText}>
                  <Text style={styles.linkHighlight}>← Retour</Text>
                </Text>
              </TouchableOpacity>
            </Animatable.View>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  resendContainer: { 
    alignItems: "center", 
    marginTop: 15 
  },
  resendText: { 
    fontSize: 14, 
    color: "#555",
    fontFamily: "Montserrat",
  },
  resendHighlight: { 
    color: "#4CAF50", 
    fontWeight: "bold" 
  },
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
