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
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations';
import { api } from '../../services/api';

const ResetPasswordScreen = ({ navigation, route }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { phone, otp: receivedOtp, callingCode, phoneNumber } = route.params || {};

  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];

  // Log des paramètres reçus pour debug
  console.log("🔍 ResetPasswordScreen - Paramètres reçus:", {
    phone,
    receivedOtp,
    callingCode,
    phoneNumber,
    allParams: route.params
  });

  const validateInputs = () => {
    if (!newPassword.trim()) {
      Alert.alert("Erreur", "Veuillez entrer un nouveau mot de passe.");
      return false;
    }
    if (newPassword.length < 6) {
      Alert.alert("Erreur", "Le mot de passe doit contenir au moins 6 caractères.");
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas.");
      return false;
    }
    return true;
  };

  const handleResetPassword = async () => {
    if (!validateInputs()) return;

    // Vérifier que l'OTP est présent
    if (!receivedOtp) {
      Alert.alert("Erreur", "Code OTP manquant. Veuillez recommencer le processus.");
      return;
    }

    setLoading(true);

    try {
      console.log("🔑 Réinitialisation avec OTP:", {
        receivedOtp,
        otpType: typeof receivedOtp,
        otpLength: receivedOtp.length,
        newPassword
      });
      
      const response = await api.resetPassword(receivedOtp, newPassword);
      console.log("📥 Réponse API reset password:", response);

      if (response.status === 200 || response.data?.success) {
        Alert.alert(
          "Succès",
          "Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.",
          [
            {
              text: "OK",
              onPress: () => navigation.navigate("Login")
            }
          ]
        );
      } else {
        Alert.alert("Erreur", response.data?.message || "Erreur de réinitialisation.");
      }
    } catch (error) {
      console.error("Erreur API reset password:", error);
      Alert.alert("Erreur", "Une erreur est survenue lors de la réinitialisation.");
    } finally {
      setLoading(false);
    }
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
              Réinitialiser le mot de passe
            </Animatable.Text>

            <Animatable.Text animation="fadeInUp" style={styles.subtitle}>
              Entrez votre nouveau mot de passe
            </Animatable.Text>

            <Animatable.Text animation="fadeInUp" style={styles.hint}>
              🔒 Choisissez un mot de passe sécurisé (minimum 6 caractères)
            </Animatable.Text>

            <Animatable.Text animation="fadeInUp" style={styles.info}>
              💡 Vous pouvez utiliser des lettres, chiffres et caractères spéciaux pour plus de sécurité.
            </Animatable.Text>

            {/* Nouveau mot de passe */}
            <Animatable.View animation="fadeInRight" style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#aaa"
                style={styles.icon}
              />
              <TextInput
                style={styles.input}
                placeholder="Nouveau mot de passe"
                placeholderTextColor="#aaa"
                secureTextEntry={!showPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#aaa"
                />
              </TouchableOpacity>
            </Animatable.View>

            {/* Confirmation du mot de passe */}
            <Animatable.View animation="fadeInRight" style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#aaa"
                style={styles.icon}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirmer le mot de passe"
                placeholderTextColor="#aaa"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#aaa"
                />
              </TouchableOpacity>
            </Animatable.View>

            {/* Bouton de réinitialisation */}
            <Animatable.View animation="zoomIn">
              <TouchableOpacity
                style={[styles.button, loading && styles.disabledButton]}
                onPress={handleResetPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Réinitialiser le mot de passe</Text>
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
    marginBottom: 15,
    fontFamily: "Montserrat",
  },
  hint: {
    fontSize: 14,
    color: "#FF9800",
    textAlign: "center",
    marginBottom: 10,
    fontFamily: "Montserrat",
    fontWeight: "500",
    backgroundColor: "#FFF3E0",
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  info: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "Montserrat",
    fontStyle: "italic",
    backgroundColor: "#F5F5F5",
    padding: 8,
    borderRadius: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    marginBottom: 25,
    height: 50,
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
  icon: { marginRight: 10 },
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

export default ResetPasswordScreen;
