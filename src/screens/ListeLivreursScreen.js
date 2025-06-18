import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Linking, SafeAreaView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const livreurs = [
  {
    id: 1,
    name: 'Jean Livreur',
    phone: '+242061234567',
    avatar: require('../../assets/images/logo_mayombe.jpg'),
    status: 'Disponible',
    rating: 4.8,
  },
  {
    id: 2,
    name: 'Marie Express',
    phone: '+242061234568',
    avatar: require('../../assets/images/logo_mayombe.jpg'),
    status: 'Disponible',
    rating: 4.9,
  },
  {
    id: 3,
    name: 'Paul Rapide',
    phone: '+242061234569',
    avatar: require('../../assets/images/logo_mayombe.jpg'),
    status: 'Disponible',
    rating: 4.7,
  },
];

const ListeLivreursScreen = () => {
  const navigation = useNavigation();

  const handleCall = (phone) => {
    Linking.openURL(`tel:${phone}`);
  };

  const renderLivreur = ({ item }) => (
    <View style={styles.livreurCard}>
      <Image source={item.avatar} style={styles.avatar} />
      <View style={styles.livreurInfo}>
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFD700" />
            <Text style={styles.rating}>{item.rating}</Text>
          </View>
        </View>
        <View style={styles.statusContainer}>
          <View style={styles.statusDot} />
          <Text style={styles.status}>{item.status}</Text>
        </View>
        <Text style={styles.phone}>{item.phone}</Text>
      </View>
      <TouchableOpacity 
        style={styles.callButton}
        onPress={() => handleCall(item.phone)}
      >
        <Ionicons name="call" size={24} color="#51A905" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Livreurs disponibles</Text>
      </View>
      <FlatList
        data={livreurs}
        renderItem={renderLivreur}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  listContainer: {
    padding: 16,
  },
  livreurCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#51A905',
  },
  livreurInfo: {
    flex: 1,
    marginLeft: 16,
  },
  nameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat-Bold',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rating: {
    marginLeft: 4,
    fontSize: 14,
    color: '#FFA000',
    fontFamily: 'Montserrat-Bold',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  status: {
    fontSize: 14,
    color: '#4CAF50',
    fontFamily: 'Montserrat',
  },
  phone: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontFamily: 'Montserrat',
  },
  callButton: {
    padding: 12,
    borderRadius: 25,
    backgroundColor: '#F5F5F5',
    marginLeft: 8,
  },
});

export default ListeLivreursScreen; 