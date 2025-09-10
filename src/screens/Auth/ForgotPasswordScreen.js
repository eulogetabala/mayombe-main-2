import React, { useState } from "react";
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
import CountryPicker, { 
  CountryModalProvider,
  DARK_THEME,
  DEFAULT_THEME
} from "react-native-country-picker-modal";
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations';
import { api } from '../../services/api';

const ForgotPasswordScreen = ({ navigation }) => {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [countryCode, setCountryCode] = useState("CG");
  const [callingCode, setCallingCode] = useState("242");

  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];

  const validatePhone = () => {
    if (!phone.trim()) {
      Alert.alert("Erreur", "Veuillez entrer votre numéro de téléphone.");
      return false;
    }
    // Validation pour le format congolais (9 chiffres)
    if (!/^\d{9}$/.test(phone)) {
      Alert.alert("Erreur", "Veuillez entrer un numéro de téléphone valide (9 chiffres).");
      return false;
    }
    return true;
  };

  const handleForgotPassword = async () => {
    if (!validatePhone()) return;

    setLoading(true);

    try {
      const fullPhone = `+${callingCode}${phone}`;
      console.log("Envoi de la demande pour:", fullPhone);
      
      const response = await api.forgotPassword(fullPhone);
      console.log("Réponse API forgot password:", response);

      if (response.status === 200 || response.data?.success) {
        Alert.alert(
          "Code envoyé",
          "Un code de vérification a été envoyé à votre numéro de téléphone.",
          [
            {
              text: "OK",
              onPress: () => navigation.navigate("ForgotPasswordOtp", { 
                phone: fullPhone,
                callingCode: callingCode,
                phoneNumber: phone
              })
            }
          ]
        );
      } else {
        Alert.alert("Erreur", response.data?.message || "Une erreur est survenue lors de l'envoi du code.");
      }
    } catch (error) {
      console.error("Erreur API forgot password:", error);
      Alert.alert("Erreur", "Une erreur est survenue lors de l'envoi du code. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  const onSelectCountry = (country) => {
    setCountryCode(country.cca2);
    setCallingCode(country.callingCode[0]);
  };

  return (
    <CountryModalProvider theme={Platform.OS === 'ios' ? DEFAULT_THEME : DARK_THEME}>
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
                Mot de passe oublié
              </Animatable.Text>

              <Animatable.Text animation="fadeInUp" style={styles.subtitle}>
                Entrez votre numéro de téléphone pour recevoir un code de récupération
              </Animatable.Text>

              {/* Champ de numéro de téléphone avec Country Picker */}
              <Animatable.View animation="fadeInLeft" style={styles.inputContainer}>
                <CountryPicker
                  containerButtonStyle={styles.countryButton}
                  countryCode={countryCode}
                  withFilter
                  withFlag
                  withCallingCode
                  withCallingCodeButton
                  onSelect={onSelectCountry}
                  translation={currentLanguage}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Numéro de téléphone"
                  placeholderTextColor="#aaa"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  maxLength={9}
                />
              </Animatable.View>

              {/* Bouton d'envoi */}
              <Animatable.View animation="zoomIn">
                <TouchableOpacity
                  style={[styles.button, loading && styles.disabledButton]}
                  onPress={handleForgotPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Envoyer le code</Text>
                  )}
                </TouchableOpacity>
              </Animatable.View>

              {/* Lien de retour */}
              <Animatable.View animation="fadeInUp" delay={1000}>
                <TouchableOpacity
                  style={styles.linkContainer}
                  onPress={() => navigation.goBack()}
                >
                  <Text style={styles.linkText}>
                    <Text style={styles.linkHighlight}>← Retour à la connexion</Text>
                  </Text>
                </TouchableOpacity>
              </Animatable.View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ImageBackground>
    </CountryModalProvider>
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
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 30,
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
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    marginBottom: 25,
    height: 50,
  },
  countryButton: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginTop: 4,
  },
  input: { 
    flex: 1,
    height: 40,
    fontSize: 16,
    fontFamily: 'Montserrat',
    color: '#333',
    paddingVertical: 0,
    marginTop: 4,
    includeFontPadding: false,
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

export default ForgotPasswordScreen;
