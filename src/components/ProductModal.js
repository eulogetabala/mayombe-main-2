import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { FontAwesome5 } from "@expo/vector-icons";
import { useCart } from '../context/CartContext';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

const ProductModal = ({ 
  visible = false, 
  product = null, 
  onClose = () => {} 
}) => {
  const cart = useCart();
  const navigation = useNavigation();
  const [internalVisible, setInternalVisible] = useState(false);

  useEffect(() => {
    console.log("🔍 ProductModal - useEffect déclenché, visible:", visible, "product:", product);
    return () => {
      console.log("🔍 ProductModal - Cleanup function appelée");
    };
  }, [visible, product]);
  
  // Gérer la visibilité interne
  useEffect(() => {
    if (visible && product) {
      console.log("🔍 ProductModal - Ouverture du modal avec produit:", product.name);
      setInternalVisible(true);
    } else {
      console.log("🔍 ProductModal - Fermeture du modal");
      setInternalVisible(false);
    }
  }, [visible, product]);
  
  // Log pour tracer les re-renders
  console.log("🔍 ProductModal - RENDER, visible:", visible, "product:", product?.name);

  const handleAddToCart = useCallback(() => {
    console.log("🛒 Ajout au panier déclenché");
    try {
      if (cart?.addToCart && product) {
        cart.addToCart(product);
        Toast.show({
          type: 'success',
          text1: 'Produit ajouté',
          text2: `${product.name} a été ajouté au panier !`,
          position: 'bottom',
          visibilityTime: 2000,
        });
        console.log("🛒 Produit ajouté au panier, fermeture du modal");
        setInternalVisible(false);
        onClose();
      }
    } catch (error) {
      console.error("❌ Erreur lors de l'ajout au panier:", error);
      Toast.show({
        type: 'error',
        text1: 'Erreur',
        text2: 'Impossible d\'ajouter le produit au panier',
        position: 'bottom',
      });
    }
  }, [cart, product, onClose]);

  const handleImageError = () => {
    // Handle image error
  };

  console.log("🔍 ProductModal - visible:", visible, "product:", product);
  
  if (!visible || !product) {
    console.log("🔍 ProductModal - Pas de produit ou modal fermé");
    return null;
  }

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={internalVisible}
      onRequestClose={() => {
        console.log("🔍 Modal onRequestClose appelé - IGNORÉ pour éviter la fermeture automatique");
        // Ne pas fermer automatiquement
      }}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => {
          console.log("🔍 Fermeture du modal via overlay");
          setInternalVisible(false);
          onClose();
        }}
      >
        <TouchableOpacity 
          style={styles.modalContent}
          activeOpacity={1}
          onPress={(e) => {
            console.log("🔍 Clic sur le contenu du modal - empêcher la propagation");
            e.stopPropagation();
          }}
        >
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => {
              console.log("🔍 Fermeture du modal via bouton X");
              setInternalVisible(false);
              onClose();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FontAwesome5 name="times" size={20} color="#333" />
          </TouchableOpacity>

          <View style={styles.contentContainer}>
            <Image 
              source={product.image || require('../../assets/images/2.jpg')}
              style={styles.productImage}
              onError={handleImageError}
            />
            
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productPrice}>{product.price}</Text>
              <Text style={styles.productDescription}>{product.description}</Text>
            </View>

            <TouchableOpacity 
              style={styles.addToCartButton}
              onPress={handleAddToCart}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <FontAwesome5 name="shopping-cart" size={16} color="#FFF" />
              <Text style={styles.addToCartText}>Ajouter au panier</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  contentContainer: {
    paddingTop: 40,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    zIndex: 1,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: 15,
    marginBottom: 20,
  },
  productInfo: {
    marginBottom: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    fontFamily: 'Montserrat-Bold',
  },
  productPrice: {
    fontSize: 20,
    color: '#4CAF50',
    marginBottom: 12,
    fontFamily: 'Montserrat-Bold',
  },
  productDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    fontFamily: 'Montserrat',
  },
  addToCartButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  addToCartText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
  },
});

export default React.memo(ProductModal);