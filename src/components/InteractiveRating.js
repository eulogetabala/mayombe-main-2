import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRatings } from '../context/RatingsContext';
import Toast from 'react-native-toast-message';

const InteractiveRating = ({ itemId, type, rating = 0, totalRatings = 0, size = 16, onRatingSubmitted }) => {
  const { submitRating } = useRatings();
  const [selectedRating, setSelectedRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionTimeout, setSubmissionTimeout] = useState(null);

  useEffect(() => {
    // Réinitialiser la sélection visuelle après soumission
    if (!isSubmitting) {
      setSelectedRating(0);
    }
  }, [isSubmitting]);

  const handleStarPress = async (starIndex) => {
    const newRating = starIndex + 1; // 1-5
    
    // Mettre à jour la sélection visuelle immédiatement
    setSelectedRating(newRating);
    
    // Annuler le timeout précédent s'il existe
    if (submissionTimeout) {
      clearTimeout(submissionTimeout);
    }
    
    // Créer un nouveau timeout pour la soumission
    const timeout = setTimeout(async () => {
      setIsSubmitting(true);
      try {
        await submitRating(itemId, type, newRating);
        Toast.show({
          type: 'success',
          text1: 'Merci !',
          text2: 'Votre notation a été enregistrée',
          position: 'bottom',
        });
        if (onRatingSubmitted) {
          onRatingSubmitted();
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: 'Erreur',
          text2: 'Impossible d\'enregistrer la notation',
          position: 'bottom',
        });
      } finally {
        setIsSubmitting(false);
        setSelectedRating(0);
      }
    }, 1500); // Délai de 1.5 secondes
    
    setSubmissionTimeout(timeout);
  };

  const displayRating = selectedRating > 0 ? selectedRating : rating;
  const displayTotalRatings = totalRatings;

  return (
    <View style={styles.container}>
      <View style={styles.starsContainer}>
        {[0, 1, 2, 3, 4].map((starIndex) => {
          const isFilled = starIndex < displayRating;
          const isSelected = starIndex < selectedRating;
          
          return (
            <Pressable
              key={starIndex}
              onPress={() => handleStarPress(starIndex)}
              style={({ pressed }) => [
                styles.starButton,
                { opacity: pressed ? 0.6 : 1 }
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={isSubmitting}
            >
              <Ionicons
                name={isFilled || isSelected ? 'star' : 'star-outline'}
                size={size}
                color={isFilled || isSelected ? '#FFD700' : '#DDD'}
              />
            </Pressable>
          );
        })}
      </View>
      {displayTotalRatings > 0 && (
        <Text style={[styles.ratingText, { fontSize: size - 4 }]}>
          {displayRating.toFixed(1)} ({displayTotalRatings})
        </Text>
      )}
      {isSubmitting && (
        <ActivityIndicator size="small" color="#FFD700" style={styles.loader} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  starButton: {
    padding: 2,
  },
  ratingText: {
    marginLeft: 4,
    color: '#666',
    fontWeight: '500',
  },
  loader: {
    marginLeft: 4,
  },
});

export default InteractiveRating;
