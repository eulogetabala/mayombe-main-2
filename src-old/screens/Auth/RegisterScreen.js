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
    // Validation du nom
    if (!name || name.trim().length < 2) {
      setAlertTitle("Nom invalide");
      setAlertMessage("Veuillez entrer un nom valide (minimum 2 caractères).");
      setAlertVisible(true);
      return;
    }

    // Validation du téléphone
    if (!phone) {
      setAlertTitle("Téléphone requis");
      setAlertMessage("Veuillez entrer votre numéro de téléphone.");
      setAlertVisible(true);
      return;
    }

    if (!isPhoneValid) {
      setAlertTitle("Numéro invalide");
      setAlertMessage("Veuillez entrer un numéro de téléphone valide.");
      setAlertVisible(true);
      return;
    }

    // Validation du mot de passe
    if (!password) {
      setAlertTitle("Mot de passe requis");
      setAlertMessage("Veuillez entrer un mot de passe.");
      setAlertVisible(true);
      return;
    }

    if (password.length < 8) {
      setAlertTitle("Mot de passe trop court");
      setAlertMessage("Le mot de passe doit contenir au moins 8 caractères.");
      setAlertVisible(true);
      return;
    }

    // Validation de la confirmation du mot de passe
    if (!confirmPassword) {
      setAlertTitle("Confirmation requise");
      setAlertMessage("Veuillez confirmer votre mot de passe.");
      setAlertVisible(true);
      return;
    }

    if (password !== confirmPassword) {
      setAlertTitle("Mots de passe différents");
      setAlertMessage("Les mots de passe ne correspondent pas. Veuillez vérifier votre saisie.");
      setAlertVisible(true);
      return;
    }
  
    setLoading(true);
  
    try {
      const response = await fetch(
        ' ',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: name.trim(),
            phone,
            password,
          }),
        }
      );
  
      const data = await response.json();
      console.log('📡 Réponse serveur complète:', { 
        status: response.status, 
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        data: data 
      });
  
      if (response.ok) {
        setAlertTitle("Inscription réussie");
        setAlertMessage("Votre compte a été créé avec succès ! Vérifiez votre téléphone pour recevoir le code de vérification.");
        setAlertVisible(true);
        navigation.navigate('Otp', { phoneNumber: phone });
      } else {
        // Gestion des erreurs spécifiques du serveur
        console.log('🔍 Erreur serveur reçue:', data);
        
        let errorTitle = "Erreur d'inscription";
        let errorMessage = "Une erreur est survenue lors de la création de votre compte.";

        // Gestion basée sur le code de statut HTTP
        if (response.status === 422) {
          errorTitle = "Données invalides";
          errorMessage = "Les informations saisies ne sont pas valides.";
        } else if (response.status === 409) {
          errorTitle = "Conflit";
          errorMessage = "Ce numéro de téléphone est déjà enregistré.";
        } else if (response.status === 400) {
          errorTitle = "Requête invalide";
          errorMessage = "Les données envoyées ne sont pas correctes.";
        } else if (response.status === 500) {
          errorTitle = "Erreur serveur";
          errorMessage = "Une erreur s'est produite sur le serveur. Veuillez réessayer plus tard.";
        }

        // Vérifier d'abord les erreurs de validation Laravel
        if (data.errors) {
          console.log('🔍 Erreurs de validation détectées:', data.errors);
          
          // Gestion des erreurs de téléphone
          if (data.errors.phone) {
            const phoneError = Array.isArray(data.errors.phone) ? data.errors.phone[0] : data.errors.phone;
            if (phoneError.includes("existe déjà") || phoneError.includes("already exists") || phoneError.includes("déjà enregistré") || phoneError.includes("already registered") || phoneError.includes("has already been taken")) {
              errorTitle = "Numéro déjà utilisé";
              errorMessage = "Ce numéro de téléphone est déjà enregistré. Veuillez vous connecter ou utiliser un autre numéro.";
            } else if (phoneError.includes("invalide") || phoneError.includes("invalid") || phoneError.includes("format")) {
              errorTitle = "Numéro invalide";
              errorMessage = "Le numéro de téléphone saisi n'est pas valide. Veuillez vérifier votre saisie.";
            } else {
              errorTitle = "Erreur téléphone";
              errorMessage = phoneError;
            }
          } 
          // Gestion des erreurs d'email
          else if (data.errors.email) {
            const emailError = Array.isArray(data.errors.email) ? data.errors.email[0] : data.errors.email;
            if (emailError.includes("existe déjà") || emailError.includes("already exists") || emailError.includes("déjà enregistré")) {
              errorTitle = "Email déjà utilisé";
              errorMessage = "Cette adresse email est déjà enregistrée. Veuillez vous connecter ou utiliser une autre adresse.";
            } else {
              errorTitle = "Erreur email";
              errorMessage = emailError;
            }
          } 
          // Gestion des erreurs de mot de passe
          else if (data.errors.password) {
            const passwordError = Array.isArray(data.errors.password) ? data.errors.password[0] : data.errors.password;
            if (passwordError.includes("faible") || passwordError.includes("weak") || passwordError.includes("court")) {
              errorTitle = "Mot de passe faible";
              errorMessage = "Le mot de passe choisi n'est pas assez sécurisé. Utilisez au moins 8 caractères avec des lettres et des chiffres.";
            } else {
              errorTitle = "Erreur mot de passe";
              errorMessage = passwordError;
            }
          } 
          // Gestion des erreurs de nom
          else if (data.errors.name) {
            const nameError = Array.isArray(data.errors.name) ? data.errors.name[0] : data.errors.name;
            errorTitle = "Nom invalide";
            errorMessage = nameError;
          }
          // Gestion d'autres erreurs de validation
          else {
            // Prendre la première erreur disponible
            const firstError = Object.values(data.errors)[0];
            const errorText = Array.isArray(firstError) ? firstError[0] : firstError;
            errorTitle = "Données invalides";
            errorMessage = errorText;
          }
        }
        // Vérifier le message principal
        else if (data.message) {
          console.log('🔍 Message d\'erreur principal:', data.message);
          const message = data.message.toLowerCase();
          
          if (message.includes("existe déjà") || message.includes("already exists") || message.includes("déjà enregistré") || message.includes("already registered") || message.includes("has already been taken")) {
            errorTitle = "Numéro déjà utilisé";
            errorMessage = "Ce numéro de téléphone est déjà enregistré. Veuillez vous connecter ou utiliser un autre numéro.";
          } else if (message.includes("email") && (message.includes("existe") || message.includes("exists") || message.includes("has already been taken"))) {
            errorTitle = "Email déjà utilisé";
            errorMessage = "Cette adresse email est déjà enregistrée. Veuillez vous connecter ou utiliser une autre adresse.";
          } else if (message.includes("phone") && (message.includes("invalid") || message.includes("invalide") || message.includes("format"))) {
            errorTitle = "Numéro invalide";
            errorMessage = "Le numéro de téléphone saisi n'est pas valide. Veuillez vérifier votre saisie.";
          } else if (message.includes("password") && (message.includes("weak") || message.includes("faible") || message.includes("too short"))) {
            errorTitle = "Mot de passe faible";
            errorMessage = "Le mot de passe choisi n'est pas assez sécurisé. Utilisez au moins 8 caractères avec des lettres et des chiffres.";
          } else if (message.includes("validation") || message.includes("required") || message.includes("manquant") || message.includes("missing")) {
            errorTitle = "Données manquantes";
            errorMessage = "Certaines informations requises sont manquantes. Veuillez vérifier tous les champs.";
          } else if (message.includes("server") || message.includes("serveur") || message.includes("internal error")) {
            errorTitle = "Erreur serveur";
            errorMessage = "Une erreur s'est produite sur le serveur. Veuillez réessayer plus tard.";
          } else if (message.includes("name") && (message.includes("required") || message.includes("manquant"))) {
            errorTitle = "Nom requis";
            errorMessage = "Veuillez entrer votre nom complet.";
          } else {
            // Utiliser le message exact du serveur
            errorTitle = "Erreur d'inscription";
            errorMessage = data.message;
          }
        }

        // Fallback final - s'assurer qu'on n'affiche jamais le message générique
        if (errorTitle === "Erreur d'inscription" && errorMessage === "Une erreur est survenue lors de la création de votre compte.") {
          // Si on arrive ici, c'est qu'aucune erreur spécifique n'a été détectée
          // Utiliser le message du serveur ou un message par défaut
          if (data.message) {
            errorMessage = data.message;
          } else {
            errorTitle = "Erreur inconnue";
            errorMessage = "Une erreur inattendue s'est produite. Veuillez réessayer.";
          }
        }

        console.log('📤 Affichage de l\'erreur:', { errorTitle, errorMessage });
        setAlertTitle(errorTitle);
        setAlertMessage(errorMessage);
        setAlertVisible(true);
      }
    } catch (error) {
      console.error('Erreur lors de la requête:', error);
      
      let errorTitle = "Erreur de connexion";
      let errorMessage = "Impossible de se connecter au serveur.";

      if (error.message) {
        if (error.message.includes("timeout")) {
          errorMessage = "Délai d'attente dépassé. Vérifiez votre connexion internet et réessayez.";
        } else if (error.message.includes("Network request failed")) {
          errorMessage = "Problème de connexion réseau. Vérifiez votre connexion internet.";
        } else if (error.message.includes("fetch")) {
          errorMessage = "Erreur de communication avec le serveur. Veuillez réessayer.";
        }
      }

      setAlertTitle(errorTitle);
      setAlertMessage(errorMessage);
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
          buttonText="OK"
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
            {password.length > 0 && password.length < 8 && (
              <Text style={styles.passwordHint}>
                Le mot de passe doit contenir au moins 8 caractères
              </Text>
            )}
            {password.length >= 8 && (
              <Text style={styles.passwordValid}>
                ✓ Mot de passe valide
              </Text>
            )}
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
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <Text style={styles.passwordMismatch}>
                Les mots de passe ne correspondent pas
              </Text>
            )}
            {confirmPassword.length > 0 && password === confirmPassword && password.length >= 8 && (
              <Text style={styles.passwordMatch}>
                ✓ Les mots de passe correspondent
              </Text>
            )}
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

          <View style={styles.separator} />
          
          <TouchableOpacity
            style={styles.linkContainer}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.linkText}>
              {t.auth.register.haveAccount} <Text style={styles.linkHighlight}>{t.auth.register.login}</Text>
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
    fontSize: 14,
    fontFamily: 'Montserrat',
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
    fontSize: 14,
    fontFamily: 'Montserrat',
  },
  inputPassword: {
    flex: 1,
    height: 40,
    fontSize: 14,
    fontFamily: 'Montserrat',
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
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  linkText: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    fontWeight: '600',
  },
        linkHighlight: {
        color: '#FF8C00',
        fontWeight: 'bold',
        textDecorationLine: 'underline',
        fontSize: 17,
      },
  separator: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 15,
    width: '100%',
  },
  passwordHint: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 4,
    marginLeft: 30,
    fontFamily: 'Montserrat',
  },
  passwordValid: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
    marginLeft: 30,
    fontFamily: 'Montserrat',
  },
  passwordMismatch: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
    marginLeft: 30,
    fontFamily: 'Montserrat',
  },
  passwordMatch: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
    marginLeft: 30,
    fontFamily: 'Montserrat',
  },
});

export default RegisterScreen;
