import React from 'react';
import { View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

// Composants simples pour tester
const HomeScreen = () => <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><Text>Accueil</Text></View>;
const FavoritesScreen = () => <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><Text>Favoris</Text></View>;
const CartScreen = () => <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><Text>Panier</Text></View>;
const ProfileScreen = () => <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}><Text>Profil</Text></View>;

const SimpleNavigator = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
        }}
      />
      <Tab.Screen 
        name="Favorites" 
        component={FavoritesScreen}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="heart-outline" size={24} color={color} />,
        }}
      />
      <Tab.Screen 
        name="Cart" 
        component={CartScreen}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="cart-outline" size={24} color={color} />,
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default SimpleNavigator; 