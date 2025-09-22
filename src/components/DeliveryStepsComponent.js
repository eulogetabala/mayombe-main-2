import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DeliveryStepsComponent = ({ currentStatus, orderStatus }) => {
  // Définir les étapes de livraison
  const deliverySteps = [
    {
      id: 'preparing',
      title: 'Préparation',
      description: 'Votre commande est en cours de préparation',
      icon: 'restaurant',
      status: 'preparing'
    },
    {
      id: 'assigned',
      title: 'Assigné',
      description: 'Un livreur a été assigné à votre commande',
      icon: 'person',
      status: 'assigned'
    },
    {
      id: 'picked_up',
      title: 'Récupéré',
      description: 'Le livreur a récupéré votre commande',
      icon: 'checkmark-circle',
      status: 'picked_up'
    },
    {
      id: 'in_transit',
      title: 'En route',
      description: 'Votre commande est en cours de livraison',
      icon: 'bicycle',
      status: 'in_transit'
    },
    {
      id: 'arrived',
      title: 'Arrivé',
      description: 'Le livreur est arrivé à destination',
      icon: 'location',
      status: 'arrived'
    },
    {
      id: 'delivered',
      title: 'Livré',
      description: 'Votre commande a été livrée',
      icon: 'checkmark-done',
      status: 'delivered'
    }
  ];

  // Déterminer l'étape actuelle basée sur le statut
  const getCurrentStepIndex = () => {
    const statusMapping = {
      'pending': 0,
      'preparing': 0,
      'assigned': 1,
      'picked_up': 2,
      'in_transit': 3,
      'en_cours': 3,
      'arrived': 4,
      'delivered': 5,
      'completed': 5,
      'livré': 5
    };

    return statusMapping[orderStatus] || statusMapping[currentStatus] || 0;
  };

  const currentStepIndex = getCurrentStepIndex();

  // Obtenir la couleur selon l'état de l'étape
  const getStepColor = (stepIndex) => {
    if (stepIndex < currentStepIndex) {
      return '#4CAF50'; // Complété
    } else if (stepIndex === currentStepIndex) {
      return '#FF9800'; // En cours
    } else {
      return '#E0E0E0'; // Pas encore atteint
    }
  };

  // Obtenir l'icône selon l'état de l'étape
  const getStepIcon = (step, stepIndex) => {
    if (stepIndex < currentStepIndex) {
      return 'checkmark-circle';
    } else if (stepIndex === currentStepIndex) {
      return step.icon;
    } else {
      return 'ellipse-outline';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Étapes de livraison</Text>
      
      {deliverySteps.map((step, index) => (
        <View key={step.id} style={styles.stepContainer}>
          {/* Ligne de connexion */}
          {index > 0 && (
            <View 
              style={[
                styles.connectionLine, 
                { backgroundColor: getStepColor(index - 1) }
              ]} 
            />
          )}
          
          {/* Icône de l'étape */}
          <View style={[styles.iconContainer, { backgroundColor: getStepColor(index) }]}>
            <Ionicons 
              name={getStepIcon(step, index)} 
              size={20} 
              color={index <= currentStepIndex ? '#FFF' : '#999'} 
            />
          </View>
          
          {/* Contenu de l'étape */}
          <View style={styles.stepContent}>
            <Text style={[
              styles.stepTitle,
              { color: index <= currentStepIndex ? '#333' : '#999' }
            ]}>
              {step.title}
            </Text>
            <Text style={[
              styles.stepDescription,
              { color: index <= currentStepIndex ? '#666' : '#BBB' }
            ]}>
              {step.description}
            </Text>
          </View>
          
          {/* Indicateur de temps */}
          {index === currentStepIndex && (
            <View style={styles.timeIndicator}>
              <Text style={styles.timeText}>En cours</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    position: 'relative',
  },
  connectionLine: {
    position: 'absolute',
    left: 19,
    top: 40,
    width: 2,
    height: 20,
    zIndex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    zIndex: 2,
  },
  stepContent: {
    flex: 1,
    paddingTop: 2,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  timeIndicator: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 2,
  },
  timeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default DeliveryStepsComponent;
