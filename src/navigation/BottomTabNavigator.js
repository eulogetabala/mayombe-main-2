import React from 'react';
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import CartScreen from '../screens/CartScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import LanguageSettingsScreen from '../screens/LanguageSettingsScreen';
import RestaurantDetailsScreen from '../screens/RestaurantDetailsScreen';
import RestaurantList from '../screens/RestaurantList';
import TopRatedRestaurants from '../screens/TopRatedRestaurants';
import CategorieList from '../screens/CategorieList';
import Categories from '../screens/Categories';
import FavoritesScreen from '../screens/FavoritesScreen';
import OrderScreen from '../screens/OrderScreen';
import PaymentScreen from '../screens/PaymentScreen';
import OrderSuccess from '../screens/OrderSuccess';
import OrdersHistory from '../screens/OrdersHistory';
import OrderDetails from '../screens/OrderDetails';
import OrderTrackingScreen from '../screens/OrderTrackingScreen';
import AllRestaurants from '../screens/AllRestaurants';
import AllProducts from '../screens/AllProducts';
import MapScreen from '../screens/MapScreen';
import ProcessPayment from '../screens/ProcessPayment';
import StripePaymentScreen from '../screens/StripePaymentScreen';
import ListeLivreursScreen from '../screens/ListeLivreursScreen';
import FCMTokenScreen from '../screens/FCMTokenScreen';


const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function CartStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="Cart" 
        component={CartScreen} 
        options={{ 
          headerShown: false,
          title: "Panier"
        }}
      />
      <Stack.Screen 
        name="PaymentScreen" 
        component={PaymentScreen}
        options={{
          title: "Paiement",
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="ProcessPayment" 
        component={ProcessPayment}
        options={{
          title: "Traitement du paiement",
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="StripePaymentScreen" 
        component={StripePaymentScreen}
        options={{
          title: "Paiement par carte",
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="OrderSuccess" 
        component={OrderSuccess}
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="OrderTracking" 
        component={OrderTrackingScreen}
        options={{
          headerShown: false
        }}
      />
    </Stack.Navigator>
  );
}

function HomeStackScreen() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="HomeMain" 
        component={HomeScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="RestaurantDetails" 
        component={RestaurantDetailsScreen}
        options={{
          title: "Détails du restaurant",
          headerTitleStyle: {
            fontFamily: 'Montserrat-Bold',
          },
        }}
      />
      <Stack.Screen 
        name="AllRestaurants" 
        component={AllRestaurants}
        options={{
          title: "Tous les Restaurants",
          headerTitleStyle: {
            fontFamily: 'Montserrat-Bold',
          },
        }}
      />
      <Stack.Screen 
        name="AllProducts" 
        component={AllProducts}
        options={{
          title: "Tous les produits",
          headerTitleStyle: {
            fontFamily: 'Montserrat-Bold',
          },
        }}
      />
     
      <Stack.Screen 
        name="TopRatedRestaurants" 
        component={TopRatedRestaurants}
        options={{
          title: "Restaurants bien notés",
          headerTitleStyle: {
            fontFamily: 'Montserrat-Bold',
          },
        }}
      />
      <Stack.Screen 
        name="CategorieList" 
        component={CategorieList}
      />
      <Stack.Screen 
        name="Categories" 
        component={Categories}
      />
      <Stack.Screen 
        name="Map" 
        component={MapScreen}
        options={{
          headerShown: false,
          title: "Restaurants à proximité",
          headerTitleStyle: {
            fontFamily: 'Montserrat-Bold',
          },
        }}
      />

    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false
      }}
    >
      <Stack.Screen 
        name="ProfileMain" 
        component={ProfileScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="LanguageSettings" 
        component={LanguageSettingsScreen}
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="OrdersHistory" 
        component={OrdersHistory}
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="OrderDetails" 
        component={OrderDetails}
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="OrderTracking" 
        component={OrderTrackingScreen}
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen 
        name="FCMToken" 
        component={FCMTokenScreen}
        options={{
          headerShown: false
        }}
      />
    </Stack.Navigator>
  );
}

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#51A905',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
          position: 'absolute',
          backgroundColor: '#fff',
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          marginHorizontal: 10,
          marginBottom: Platform.OS === 'android' ? 0 : 20,
        },
        tabBarLabelStyle: {
          fontFamily: 'Montserrat',
          fontSize: 12,
          marginBottom: Platform.OS === 'android' ? 5 : 0,
        },
        tabBarItemStyle: {
          padding: 5,
        },
        tabBarIconStyle: {
          marginBottom: -3,
        },
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStackScreen}
        options={{
          headerShown: false,
          tabBarLabel: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
       <Tab.Screen 
        name="Favorites" 
        component={FavoritesScreen}
        options={{
          headerShown: false,
          tabBarLabel: 'Favoris',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="CartTab" 
        component={CartStack}
        options={{
          headerShown: false,
          tabBarLabel: 'Panier',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack}
        options={{
          headerShown: false,
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
