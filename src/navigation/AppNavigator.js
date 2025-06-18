import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import BottomTabNavigator from './BottomTabNavigator';
import LanguageSelectionScreen from '../screens/LanguageSelectionScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import OtpScreen from '../screens/Auth/OtpScreen';
import ListeLivreursScreen from '../screens/ListeLivreursScreen';

const Stack = createStackNavigator();

const AppNavigator = ({ initialRoute }) => {
  return (
    <Stack.Navigator 
      initialRouteName={initialRoute} 
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Otp" component={OtpScreen} />
      <Stack.Screen name="MainApp" component={BottomTabNavigator} />
      <Stack.Screen 
        name="ListeLivreurs" 
        component={ListeLivreursScreen}
        options={{
          headerShown: true,
          title: 'Livreurs disponibles',
          headerTitleStyle: {
            fontFamily: 'Montserrat-Bold',
          },
        }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator; 