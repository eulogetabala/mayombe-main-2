import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

const RestaurantMenu = ({ route }) => {
  const { restaurant } = route.params;

  const menuItems = [
    { id: 1, name: 'Poulet Grillé', price: '10,000 FCFA' },
    { id: 2, name: 'Poisson Fumé', price: '8,000 FCFA' },
    { id: 3, name: 'Salade César', price: '5,000 FCFA' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Menu de {restaurant.name}</Text>
      <FlatList
        data={menuItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.menuItem}>
            <Text style={styles.menuName}>{item.name}</Text>
            <Text style={styles.menuPrice}>{item.price}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#f8f8f8' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, borderBottomWidth: 1, borderColor: '#ddd' },
  menuName: { fontSize: 16 },
  menuPrice: { fontSize: 16, fontWeight: 'bold', color: '#FF9800' },
});

export default RestaurantMenu;
