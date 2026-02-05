import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, StyleSheet, LogBox } from "react-native";

// Import conditionnel de NetInfo (peut ne pas être disponible si l'app n'est pas reconstruite)
let NetInfo = null;
try {
  NetInfo = require("@react-native-community/netinfo").default;
} catch (error) {
  console.log("⚠️ NetInfo non disponible - l'app fonctionnera sans détection de connexion");
}

// Désactiver l'inspecteur de développement
if (!__DEV__) {
  LogBox.ignoreAllLogs(true);
}
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as Animatable from "react-native-animatable";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CartProvider } from './src/context/CartContext';
import Toast from 'react-native-toast-message';
import { RefreshProvider } from './src/context/RefreshContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import { StripeProvider } from '@stripe/stripe-react-native';
import getStripePublishableKey from './src/config/stripe';
import { initializeImageCache } from './src/config/ImageCacheConfig';
import { showFCMTokenOnStartup } from './src/Utils/showFCMToken';

import OnboardingScreen from "./src/screens/OnboardingScreen";
import LoginScreen from "./src/screens/Auth/LoginScreen";
import RegisterScreen from "./src/screens/Auth/RegisterScreen";
import ForgotPasswordScreen from "./src/screens/Auth/ForgotPasswordScreen";
import ForgotPasswordOtpScreen from "./src/screens/Auth/ForgotPasswordOtpScreen";
import ResetPasswordScreen from "./src/screens/Auth/ResetPasswordScreen";
import OtpScreen from "./src/screens/Auth/OtpScreen";
import BottomNavigation from "./src/components/BottomNavigation";
import RestaurantListScreen from "./src/screens/RestaurantListScreen";
import RestaurantDetailsScreen from "./src/screens/RestaurantDetailsScreen";
import OrderScreen from './src/screens/OrderScreen';
import CategorieList from "./src/screens/CategorieList";
import Categories from "./src/screens/Categories";
import TopRatedRestaurants from "./src/screens/TopRatedRestaurants";
import OrderSuccess from './src/screens/OrderSuccess';

import LanguageSelectionScreen from "./src/screens/LanguageSelectionScreen";
import HomeScreen from "./src/screens/HomeScreen";
import { useNavigation } from '@react-navigation/native';
import ProductSection from "./src/components/Home/ProductSection";
import AllProducts from "./src/screens/AllProducts";
import BottomTabNavigator from './src/navigation/BottomTabNavigator';
import ListeLivreursScreen from './src/screens/ListeLivreursScreen';
import AllRestaurants from './src/screens/AllRestaurants';
import SharedCartScreen from './src/screens/SharedCartScreen';
import CommanderLivreurScreen from './src/screens/CommanderLivreurScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import ProcessPayment from './src/screens/ProcessPayment';
import DeliveryCompleteScreen from './src/screens/DeliveryCompleteScreen';
import LivreurSimulatorScreen from './src/screens/LivreurSimulatorScreen';
import OrderTrackingScreen from './src/screens/OrderTrackingScreen';
import DriverRatingScreen from './src/screens/DriverRatingScreen';
import StripeTest from './src/components/StripeTest';
import StripePaymentScreen from './src/screens/StripePaymentScreen';
import NoConnectionScreen from './src/components/common/NoConnectionScreen';
import ConnectivityBanner from './src/components/common/ConnectivityBanner';

SplashScreen.preventAutoHideAsync();
const Stack = createNativeStackNavigator();

const  AppNavigator = ({ initialRoute }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <Stack.Navigator 
      initialRouteName={initialRoute} 
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ForgotPasswordOtp" component={ForgotPasswordOtpScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="MainApp" component={BottomTabNavigator} />
      <Stack.Screen name="RestaurantList" component={RestaurantListScreen} />
      <Stack.Screen name="RestaurantDetails" component={RestaurantDetailsScreen} />
      <Stack.Screen name="OrderScreen" component={OrderScreen} />
      <Stack.Screen name="CategorieScreen" component={Categories} />
      <Stack.Screen name="AllProducts" component={AllProducts} />
      <Stack.Screen name="CategorieList" component={CategorieList} />
      <Stack.Screen 
        name="TopRatedRestaurants" 
        component={TopRatedRestaurants}
        options={{
          headerShown: true,
          title: "Restaurants bien notés",
          headerTitleStyle: {
            fontFamily: 'Montserrat-Bold',
          },
        }}
      />
      <Stack.Screen 
        name="OrderSuccess" 
        component={OrderSuccess} 
        options={{ headerShown: false }}
      />

      <Stack.Screen 
        name="ListeLivreurs" 
        component={ListeLivreursScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AllRestaurants" 
        component={AllRestaurants}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="SharedCart" 
        component={SharedCartScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PaymentScreen" 
        component={PaymentScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ProcessPayment" 
        component={ProcessPayment}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="DeliveryComplete" 
        component={DeliveryCompleteScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="LivreurSimulator" 
        component={LivreurSimulatorScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="OrderTracking" 
        component={OrderTrackingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="DriverRating" 
        component={DriverRatingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="StripeTest" 
        component={StripeTest}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="StripePaymentScreen" 
        component={StripePaymentScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState("LanguageSelection");
  const [isConnected, setIsConnected] = useState(true);
  
  // Détecter l'état de la connexion réseau (si NetInfo est disponible)
  useEffect(() => {
    if (!NetInfo) {
      setIsConnected(true);
      return;
    }

    const checkApiReachability = async () => {
      try {
        // En plus de NetInfo, on vérifie si on peut atteindre le serveur (Heartbeat)
        const response = await fetch("https://www.api-mayombe.mayombe-app.com/public/api/categories", {
          method: 'HEAD', // Léger
        });
        return response.ok;
      } catch (error) {
        return false;
      }
    };

    const updateConnectionState = async (state) => {
      const isInternetReachable = state.isInternetReachable !== false;
      const isConnectedToNetwork = state.isConnected;
      
      if (isConnectedToNetwork && isInternetReachable) {
        // Optionnel: Double check avec un ping API si on veut être ultra-sûr
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    };

    // Vérifier l'état initial
    NetInfo.fetch().then(updateConnectionState);

    // Écouter les changements de connexion
    const unsubscribe = NetInfo.addEventListener(updateConnectionState);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    const prepareApp = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
        const isGuest = await AsyncStorage.getItem('isGuest');
        const hasCompletedOnboarding = await AsyncStorage.getItem('hasCompletedOnboarding');
        const hasSelectedLanguage = await AsyncStorage.getItem('selectedLanguage');

        let route = "LanguageSelection";

        if (userToken || isGuest) {
          route = "MainApp";
        } else if (hasSelectedLanguage && hasCompletedOnboarding) {
          route = "Login";
        } else if (hasSelectedLanguage) {
          route = "Onboarding";
        }

        setInitialRoute(route);

        await Promise.all([
          Font.loadAsync({
            'Montserrat-Regular': require("./assets/fonts/Montserrat-Regular.ttf"),
            'Montserrat-Bold': require("./assets/fonts/Montserrat-Bold.ttf"),
            'Montserrat-Medium': require("./assets/fonts/Montserrat-Medium.ttf"),
            'Montserrat-SemiBold': require("./assets/fonts/Montserrat-SemiBold.ttf"),
            'Montserrat-Light': require("./assets/fonts/Montserrat-Light.ttf"),
            'Montserrat-ExtraLight': require("./assets/fonts/Montserrat-ExtraLight.ttf"),
            'Montserrat-Thin': require("./assets/fonts/Montserrat-Thin.ttf"),
            'Montserrat-Black': require("./assets/fonts/Montserrat-Black.ttf"),
          }),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);

        await initializeImageCache();
        showFCMTokenOnStartup();
      } catch (error) {
        console.error("Erreur de chargement des polices:", error);
      } finally {
        setIsAppReady(true);
        await SplashScreen.hideAsync();
      }
    };

    prepareApp();
  }, []);

  if (!isAppReady) {
    return (
      <View style={styles.splashContainer}>
        <Animatable.Image
          animation="zoomIn"
          duration={4500}
          iterationCount={1}
          style={styles.logo}
          source={require("./assets/images/logo_mayombe.jpg")}
        />
      </View>
    );
  }

  // Si pas de connexion au DÉMARRAGE de l'app, afficher l'écran bloquant
  // Sinon, on utilisera la bannière discrète (ConnectivityBanner)
  if (!isConnected && !isAppReady) {
    return (
      <NoConnectionScreen
        onRetry={async () => {
          if (NetInfo) {
            const netInfoState = await NetInfo.fetch();
            setIsConnected(netInfoState.isConnected ?? false);
          }
        }}
      />
    );
  }

  return (
    <StripeProvider publishableKey={getStripePublishableKey()}>
      <LanguageProvider>
        <AuthProvider>
          <RefreshProvider>
            <CartProvider>
              <FavoritesProvider>
                <ConnectivityBanner isConnected={isConnected} />
                <NavigationContainer>
                  <AppNavigator initialRoute={initialRoute} />
                </NavigationContainer>
                <Toast />
              </FavoritesProvider>
            </CartProvider>
          </RefreshProvider>
        </AuthProvider>
      </LanguageProvider>
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  logo: {
    width: 200,
    height: 200,
    resizeMode: "contain",
  },
});
