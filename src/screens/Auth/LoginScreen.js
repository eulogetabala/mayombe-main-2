import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

const LoginScreen = ({ navigation }) => {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [countryCode, setCountryCode] = useState("CG"); // Code pays par défaut
  const [callingCode, setCallingCode] = useState("242"); // Indicatif par défaut

  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];

  useEffect(() => {
    const checkUserLoggedIn = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (token) {
          navigation.replace("MainApp");
        }
      } catch (error) {
        console.error("Erreur lors de la vérification du token :", error);
      }
    };
    checkUserLoggedIn();
  }, []);

  const validateInputs = () => {
    if (!phone.trim()) {
      Alert.alert(t.common.error, t.auth.validation.phoneRequired);
      return false;
    }
    if (!/^\d{9,}$/.test(phone)) {
      Alert.alert(t.common.error, t.auth.validation.phoneInvalid);
      return false;
    }
    if (!password.trim()) {
      Alert.alert(t.common.error, t.auth.validation.passwordRequired);
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validateInputs()) return;

    setLoading(true);

    try {
      const fullPhone = `+${callingCode}${phone}`;
      console.log("Tentative de connexion avec:", { phone: fullPhone, passwordLength: password.length });
      
      const result = await api.login(fullPhone, password);
      console.log("Résultat API login:", result);

      if (result.status === 200) {
        await AsyncStorage.setItem("userToken", result.data.token);
        navigation.replace("MainApp");
      } else {
        const errorMessage = result.data.data?.erreur || result.data.message || "Échec de la connexion.";
        console.log("Échec de connexion:", errorMessage);
        Alert.alert("Erreur", errorMessage);
      }
    } catch (error) {
      console.error("Erreur lors de la connexion:", error);
      Alert.alert("Erreur", "Une erreur est survenue lors de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  const onSelectCountry = (country) => {
    setCountryCode(country.cca2);
    setCallingCode(country.callingCode[0]);
  };

  const renderCountryPicker = () => (
    <View style={styles.countryPickerContainer}>
      <CountryPicker
        containerButtonStyle={styles.countryButton}
        countryCode={countryCode}
        withFilter
        withFlag
        withCallingCode
        withCallingCodeButton
        withFlagButton
        withAlphaFilter
        onSelect={onSelectCountry}
        translation={currentLanguage}
        theme={Platform.OS === 'ios' ? DEFAULT_THEME : DARK_THEME}
        renderFlagButton={() => (
          <View style={styles.callingCodeContainer}>
            <CountryPicker
              countryCode={countryCode}
              withFlag
              withFlagButton={false}
              withFilter={false}
              withCallingCode={false}
              onSelect={() => {}}
              theme={Platform.OS === 'ios' ? DEFAULT_THEME : DARK_THEME}
            />
            <Text style={styles.callingCodeText}>+{callingCode}</Text>
          </View>
        )}
      />
    </View>
  );

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
                {t.auth.login.title}
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
                  onSelect={(country) => {
                    setCountryCode(country.cca2);
                    setCallingCode(country.callingCode[0]);
                  }}
                  translation={currentLanguage}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t.auth.login.phone}
                  placeholderTextColor="#aaa"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </Animatable.View>

              {/* Champ de mot de passe */}
              <Animatable.View
                animation="fadeInRight"
                style={styles.inputContainer}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#aaa"
                  style={styles.icon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t.auth.login.password}
                  placeholderTextColor="#aaa"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#aaa"
                  />
                </TouchableOpacity>
              </Animatable.View>

              {/* Bouton de connexion */}
              <Animatable.View animation="zoomIn">
                <TouchableOpacity
                  style={[styles.button, loading && styles.disabledButton]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>{t.auth.login.loginButton}</Text>
                  )}
                </TouchableOpacity>
              </Animatable.View>

              {/* Lien mot de passe oublié */}
              <Animatable.View animation="fadeInUp" delay={800}>
                <TouchableOpacity
                  style={styles.linkContainer}
                  onPress={() => navigation.navigate("ForgotPassword")}
                >
                  <Text style={styles.linkText}>
                    <Text style={styles.linkHighlight}>Mot de passe oublié ?</Text>
                  </Text>
                </TouchableOpacity>
              </Animatable.View>

              {/* Lien vers l'inscription */}
              <Animatable.View animation="fadeInUp" delay={1000}>
                <TouchableOpacity
                  style={styles.linkContainer}
                  onPress={() => navigation.navigate("Register")}
                >
                  <Text style={styles.linkText}>
                    {t.auth.login.noAccount}{" "}
                    <Text style={styles.linkHighlight}>{t.auth.login.register}</Text>
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
  countryPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    minWidth: 100,
  },
  countryButton: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginTop: 4,
  },
  callingCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
  },
  callingCodeText: {
    fontSize: 16,
    color: '#333',
    fontFamily: 'Montserrat',
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
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  disabledButton: { backgroundColor: "#ccc" },
  linkContainer: { alignItems: "center", marginTop: 10 },
  linkText: { fontSize: 14, color: "#555" },
  linkHighlight: { color: "#FF9800", fontWeight: "bold" },
});

export default LoginScreen;
