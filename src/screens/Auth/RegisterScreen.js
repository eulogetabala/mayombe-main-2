import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
  ImageBackground,
  Animated,
} from 'react-native';
import PhoneInput from 'react-native-phone-number-input';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import ModalOpt from '../../components/ModalOtp';
import { useLanguage } from '../../context/LanguageContext';
import { translations } from '../../translations';

const { width, height } = Dimensions.get('window');

const RegisterScreen = ({ navigation }) => {
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [alertTitle, setAlertTitle] = useState("");

  const phoneInput = React.useRef(null);
  const fadeAnim = useState(new Animated.Value(0))[0]; // Animation d'apparition.

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleRegister = async () => {
    if (!name || !phone || !password) {
      setAlertTitle("Erreur");
      setAlertMessage("Veuillez remplir tous les champs requis.");
      setAlertVisible(true);
      return;
    }
  
    if (!isPhoneValid) {
      setAlertTitle("Erreur");
      setAlertMessage("Entrez un numéro de téléphone valide.");
      setAlertVisible(true);
      return;
    }
  
    if (password !== confirmPassword) {
      setAlertTitle("Erreur");
      setAlertMessage("Les mots de passe ne correspondent pas.");
      setAlertVisible(true);
      return;
    }
  
    setLoading(true);
  
    try {
      const response = await fetch(
        'https://www.api-mayombe.mayombe-app.com/public/api/register',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            phone,
            password,
          }),
        }
      );
  
      const data = await response.json();
  
      if (response.ok) {
        setAlertTitle("Succès");
        setAlertMessage("Compte créé avec succès, vérifiez votre OTP.");
        setAlertVisible(true);
        navigation.navigate('Otp', { phoneNumber: phone });
      } else if (data.message?.toLowerCase().includes("existe déjà")) {
        // Message spécifique si le compte existe déjà
        setAlertTitle("Compte existant");
        setAlertMessage("Ce numéro est déjà enregistré. Veuillez vous connecter.");
        setAlertVisible(true);
        navigation.navigate('Login'); // Redirige vers la page de connexion
      } else {
        // Autres erreurs
        setAlertTitle("Erreur");
        setAlertMessage(data.message || 'Une erreur est survenue.');
        setAlertVisible(true);
      }
    } catch (error) {
      console.error('Erreur lors de la requête:', error);
      setAlertTitle("Erreur");
      setAlertMessage("Impossible de se connecter au serveur.");
      setAlertVisible(true);
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <ImageBackground
      source={require('../../../assets/images/filter.png')}
      style={styles.background}
      imageStyle={{ opacity: 0.3 }}
    >
      <Animated.View style={[styles.container]}>
        <ModalOpt
          visible={alertVisible}
          title={alertTitle}
          message={alertMessage}
          onClose={() => setAlertVisible(false)}
        />

        <View style={styles.card}>
          <Text style={styles.header}>{t.auth.register.title}</Text>

          <View style={styles.inputContainer}>
            <View style={styles.inputWithIcon}>
              <Ionicons name="person-outline" size={20} color="#4CAF50" style={styles.icon} />
              <TextInput
                style={styles.input}
                placeholder={t.auth.register.namePlaceholder}
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <PhoneInput
              ref={phoneInput}
              placeholder={t.auth.register.phonePlaceholder}
              defaultValue={phone}
              defaultCode="CG"
              layout="first"
              onChangeText={setPhone}
              onChangeFormattedText={(formattedPhone) => {
                setPhone(formattedPhone);
                setIsPhoneValid(phoneInput.current?.isValidNumber(formattedPhone));
              }}
              containerStyle={styles.phoneContainer}
              textContainerStyle={styles.phoneInput}
            />
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputWithIcon}>
              <Ionicons name="lock-closed-outline" size={20} color="#4CAF50" style={styles.icon} />
              <TextInput
                style={styles.inputPassword}
                placeholder={t.auth.register.createPassword}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <FontAwesome
                  name={showPassword ? 'eye' : 'eye-slash'}
                  size={20}
                  color="#4CAF50"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <View style={styles.inputWithIcon}>
              <Ionicons name="lock-closed-outline" size={20} color="#4CAF50" style={styles.icon} />
              <TextInput
                style={styles.inputPassword}
                placeholder={t.auth.register.confirmPasswordPlaceholder}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <FontAwesome
                  name={showConfirmPassword ? 'eye' : 'eye-slash'}
                  size={20}
                  color="#4CAF50"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.registerButtonText}>{t.auth.register.registerButton}</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.termsText}>
            {t.auth.register.termsText}{' '}
            <Text style={styles.termsLink}>{t.auth.register.termsLink}</Text>
          </Text>

          <TouchableOpacity
            style={styles.linkContainer}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.linkText}>
              {t.auth.register.alreadyAccount} <Text style={styles.linkHighlight}>{t.auth.register.connectLink}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  header: {
    fontSize: 29,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: 'Montserrat',
  },
  inputContainer: {
    marginBottom: 16,
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 40,
  },
  phoneContainer: {
    width: '100%',
    marginVertical: 10,
  },
  phoneInput: {
    height: height * 0.08,  // Ajuster à 8% de la hauteur de l'écran
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 2,  // Ajouter du padding vertical pour centrer le texte
    justifyContent: 'center',
    alignItems: 'center',
    textAlignVertical: 'center', 
  },
  inputPassword: {
    flex: 1,
    height: 40,
  },
  termsText: {
    textAlign: 'center',
    fontSize: 10,
    color: '#666',
    marginVertical: 10,
    fontFamily: 'Montserrat',
  },
  termsLink: {
    color: '#FF9800',
  },
  registerButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: 'center',
    marginTop: 10,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
  linkContainer: {
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#000',
  },
  linkHighlight: {
    color: '#FF9800',
  },
});

export default RegisterScreen;
