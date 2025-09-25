import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import TopRatedRestaurants from '../screens/TopRatedRestaurants';
import Categories from '../screens/Categories';

const Stack = createStackNavigator();

const StackNavigator = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="TopRatedRestaurants" 
        component={TopRatedRestaurants}
        options={{
          headerShown: true,
        }}
      />
      <Stack.Screen 
        name="Categories" 
        component={Categories} 
        options={{ 
          headerShown: false 
        }} 
      />
      
    </Stack.Navigator>
  );
};

export default StackNavigator; 