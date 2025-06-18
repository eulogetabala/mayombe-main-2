// src/components/BottomNavigation.js
import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';

// Import des écrans
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CartScreen from '../screens/CartScreen';
import OrderScreen from '../screens/OrderScreen';
import PaymentScreen from '../screens/PaymentScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import CategorieList from '../screens/CategorieList';
import RestaurantMenu from '../screens/RestaurantMenu';
import RestaurantDetailsScreen from '../screens/RestaurantDetailsScreen';
import AllProducts from '../screens/AllProducts';
import AllRestaurants from '../screens/AllRestaurants';
import MapScreen from '../screens/MapScreen';
import Categories from '../screens/Categories';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const HomeStack = () => {
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];

  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: true,
        presentation: 'card',
      }}
    >
      <Stack.Screen 
        name="MainScreen" 
        component={HomeScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="Categories" 
        component={Categories} 
        options={{ 
          title: t.categories.title,
          headerBackTitleVisible: false,
        }} 
      />
      <Stack.Screen 
        name="CategorieList" 
        component={CategorieList} 
        options={{ 
          title: t.categories.products,
          headerBackTitleVisible: false,
        }} 
      />
      <Stack.Screen 
        name="RestaurantMenu" 
        component={RestaurantMenu}
        options={{ title: t.restaurants.menu }} 
      />
      <Stack.Screen 
        name="RestaurantDetails" 
        component={RestaurantDetailsScreen} 
        options={{ title: t.restaurants.information }} 
      />
      <Stack.Screen 
        name="AllProducts" 
        component={AllProducts} 
        options={{ title: t.products.allProducts }} 
      />
      <Stack.Screen 
        name="AllRestaurants" 
        component={AllRestaurants} 
        options={{ title: t.restaurants.all }} 
      />
      <Stack.Screen 
        name="Map" 
        component={MapScreen} 
        options={{ title: t.restaurants.nearby }} 
      />
    </Stack.Navigator>
  );
};

const CartStack = () => {
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];

  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen 
        name="CartScreen" 
        component={CartScreen} 
        options={{ 
          headerShown: false,
          title: t.cart.title
        }} 
      />
      <Stack.Screen 
        name="Order" 
        component={OrderScreen} 
        options={{ title: t.order.title }} 
      />
      <Stack.Screen 
        name="Payment" 
        component={PaymentScreen} 
        options={{ title: t.order.paymentMethod }} 
      />
    </Stack.Navigator>
  );
};

const BottomNavigation = () => {
  const { currentLanguage } = useLanguage();
  const t = translations[currentLanguage];

  const getTabScreenOptions = (route) => ({
    headerShown: false,
    tabBarLabel: (() => {
      switch (route.name) {
        case 'HomeTab':
          return t.bottomNav.home;
        case 'FavoritesTab':
          return t.bottomNav.favorites;
        case 'CartTab':
          return t.bottomNav.cart;
        case 'ProfileTab':
          return t.bottomNav.profile;
        default:
          return '';
      }
    })(),
  });

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          height: 60,
          backgroundColor: '#fff',
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          paddingBottom: 5,
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 999,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case 'HomeTab':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'FavoritesTab':
              iconName = focused ? 'heart' : 'heart-outline';
              break;
            case 'CartTab':
              iconName = focused ? 'cart' : 'cart-outline';
              break;
            case 'ProfileTab':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#51A905',
        tabBarInactiveTintColor: 'gray',
        tabBarLabelStyle: {
          fontSize: 12,
          marginBottom: 3,
        },
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: true,
        tabBarPressColor: 'transparent',
        tabBarPressOpacity: 1,
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeStack}
        options={({ route }) => getTabScreenOptions(route)}
      />
      <Tab.Screen 
        name="FavoritesTab" 
        component={FavoritesScreen}
        options={({ route }) => getTabScreenOptions(route)}
      />
      <Tab.Screen 
        name="CartTab" 
        component={CartStack}
        options={({ route }) => getTabScreenOptions(route)}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen}
        options={({ route }) => getTabScreenOptions(route)}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BottomNavigation;
