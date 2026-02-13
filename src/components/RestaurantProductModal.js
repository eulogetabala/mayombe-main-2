import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { useCart } from '../context/CartContext';
import { applyMarkup, formatPriceWithMarkup } from '../Utils/priceUtils';

const RestaurantProductModal = ({ 
  visible, 
  product, 
  onClose,
  onAddToCart
}) => {
  const { addToCart } = useCart();
  const [selectedComplements, setSelectedComplements] = useState([]);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!visible) {
      setSelectedComplements([]);
      setQuantity(1);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setSelectedComplements([]);
      setQuantity(1);
    }
  }, [visible]);

  const handleAddToCart = async () => {
    // Calculer le prix de base avec majoration (utiliser promoPrice si dispo)
    const hasPromo = product?.hasPromo === true || product?.hasPromo === 'true';
    const promoPrice = product?.promoPrice;
    const basePriceToUse = hasPromo && promoPrice ? promoPrice : product.price;
    
    const basePriceNumeric = typeof basePriceToUse === 'string' 
      ? parseFloat(basePriceToUse.toString().replace(/[^\d.-]/g, ''))
      : (typeof basePriceToUse === 'number' ? basePriceToUse : parseFloat(basePriceToUse) || 0);
    
    const priceWithMarkup = applyMarkup(basePriceNumeric);
    
    // Calculer le prix des compléments avec majoration
    const complementsWithMarkup = selectedComplements.map(comp => ({
      ...comp,
      price: applyMarkup(parseFloat(comp.price) || 0)
    }));
    
    const complementsPrice = complementsWithMarkup.reduce((sum, comp) => 
      sum + comp.price, 0);
    
    // Prix unitaire total (déjà avec majoration)
    const unitPrice = priceWithMarkup + complementsPrice;
    
    // Extraire le prix original (sans formatage)
    const originalPriceNumeric = typeof product.price === 'string' 
      ? parseFloat(product.price.toString().replace(/[^\d.-]/g, ''))
      : (typeof product.price === 'number' ? product.price : parseFloat(product.price) || 0);
    
    const productWithComplements = {
      ...product,
      quantity,
      complements: complementsWithMarkup, // Compléments avec prix déjà majorés
      unitPrice, // Prix unitaire pré-calculé avec majoration
      totalPrice: unitPrice * quantity,
      // Conserver les informations de promo pour le panier
      hasPromo: hasPromo,
      promoPrice: promoPrice ? (typeof promoPrice === 'string' ? parseFloat(promoPrice.toString().replace(/[^\d.-]/g, '')) : promoPrice) : null,
      // Conserver le prix original pour référence (numérique)
      originalPrice: originalPriceNumeric,
      price: originalPriceNumeric, // S'assurer que price est numérique
    };
    
    await onAddToCart(productWithComplements);
    onClose();
  };

  const toggleComplement = (complement) => {
    setSelectedComplements((prev) => {
      if (prev.find(c => c.id === complement.id)) {
        return prev.filter(c => c.id !== complement.id);
      } else {
        return [...prev, complement];
      }
    });
  };

  const calculateTotalPrice = () => {
    const basePriceToUse = product.hasPromo && product.promoPrice ? product.promoPrice : product.price;
    const basePriceNumeric = typeof basePriceToUse === 'string' 
      ? parseFloat(basePriceToUse.replace(/[^\d.-]/g, ''))
      : basePriceToUse;
    
    // Appliquer la majoration de 7% au prix de base
    const priceWithMarkup = applyMarkup(basePriceNumeric);
    
    // Appliquer la majoration aux compléments
    const complementsPrice = selectedComplements.reduce((sum, comp) => 
      sum + applyMarkup(parseFloat(comp.price) || 0), 0);
    
    return (priceWithMarkup + complementsPrice) * quantity;
  };

  if (!product) return null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {product.image && (
              <Image 
                source={product.image}
                defaultSource={require('../../assets/images/2.jpg')}
                style={styles.productImage}
                resizeMode="cover"
              />
            )}

            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              {product.hasPromo ? (
                <View style={styles.promoPriceContainer}>
                  <Text style={styles.productPricePromo}>{formatPriceWithMarkup(product.promoPrice)}</Text>
                  <Text style={styles.productPriceOriginal}>{formatPriceWithMarkup(product.price)}</Text>
                </View>
              ) : (
                <Text style={styles.productPrice}>{formatPriceWithMarkup(product.price)}</Text>
              )}
              <Text style={styles.description}>{product.description}</Text>
            </View>

            <View style={styles.quantitySection}>
              <Text style={styles.sectionTitle}>Quantité</Text>
              <View style={styles.quantityControls}>
                <TouchableOpacity 
                  style={styles.quantityButton}
                  onPress={() => setQuantity(prev => Math.max(1, prev - 1))}
                >
                  <Ionicons name="remove" size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity 
                  style={styles.quantityButton}
                  onPress={() => setQuantity(prev => prev + 1)}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {product.complements && product.complements.length > 0 ? (
              <View style={styles.complementsSection}>
                <Text style={styles.sectionTitle}>Compléments</Text>
                {product.complements.map((complement) => {
                  return (
                    <TouchableOpacity
                      key={complement.id}
                      style={[
                        styles.complementOption,
                        selectedComplements.find(c => c.id === complement.id) && styles.complementSelected
                      ]}
                      onPress={() => toggleComplement(complement)}
                    >
                      <View style={styles.complementInfo}>
                        {complement.image && (
                          <Image 
                            source={complement.image}
                            style={styles.complementImage}
                            defaultSource={require('../../assets/images/2.jpg')}
                          />
                        )}
                        <Ionicons
                          name={selectedComplements.find(c => c.id === complement.id) ? 'checkmark-circle' : 'ellipse-outline'}
                          size={24}
                          color={selectedComplements.find(c => c.id === complement.id) ? "#51A905" : "#666"}
                        />
                        <Text style={styles.complementName}>{complement.name}</Text>
                      </View>
                      <Text style={styles.complementPrice}>+{formatPriceWithMarkup(complement.price)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.noComplementsText}>Aucun complément disponible</Text>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalPrice}>{calculateTotalPrice()} FCFA</Text>
            </View>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddToCart}
            >
              <Text style={styles.addButtonText}>Ajouter au panier</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
    paddingBottom: 30,
    maxHeight: '90%',
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 15,
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: 15,
    marginBottom: 20,
  },
  productInfo: {
    marginBottom: 25,
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
    color: '#FF9800',
    marginBottom: 12,
    fontFamily: 'Montserrat-SemiBold',
  },
  promoPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  productPricePromo: {
    fontSize: 22,
    color: '#51A905',
    marginRight: 10,
    fontFamily: 'Montserrat-Bold',
  },
  productPriceOriginal: {
    fontSize: 16,
    color: '#999',
    textDecorationLine: 'line-through',
    fontFamily: 'Montserrat',
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    fontFamily: 'Montserrat',
  },
  quantitySection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButton: {
    backgroundColor: '#51A905',
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginHorizontal: 20,
  },
  complementsSection: {
    marginBottom: 20,
  },
  complementOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#f8f8f8',
  },
  complementSelected: {
    backgroundColor: '#e8f5e9',
  },
  complementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  complementImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 10,
  },
  complementName: {
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  complementPrice: {
    fontSize: 14,
    color: '#51A905',
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#51A905',
  },
  addButton: {
    backgroundColor: '#51A905',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  noComplementsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default RestaurantProductModal; 