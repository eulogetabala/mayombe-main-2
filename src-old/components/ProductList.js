import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { translations } from '../translations';

function ProductItem({ product, onAddToCart }) {
    const { currentLanguage } = useLanguage();
    const t = translations[currentLanguage];

    return (
        <View style={styles.productItem}>
            <Text>{product.name}</Text>
            <TouchableOpacity onPress={() => onAddToCart(product)}>
                <Text>{t.products.addToCart}</Text>
            </TouchableOpacity>
        </View>
    );
}

const ProductList = ({ products, onAddToCart, navigation }) => {
    const { currentLanguage } = useLanguage();
    const t = translations[currentLanguage];

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
                <Text style={styles.title}>{t.products.allProducts}</Text>
            </View>
            <FlatList
                data={products}
                renderItem={({ item }) => (
                    <ProductItem product={item} onAddToCart={onAddToCart} />
                )}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#fff',
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    backButton: {
        marginRight: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    list: {
        paddingBottom: 16,
    },
    productItem: {
        marginBottom: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
    },
});

export default ProductList; 