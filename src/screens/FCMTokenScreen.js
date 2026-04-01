import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import fcmService, { FCM_IOS_BROADCAST_TOPIC } from '../services/fcmService';

/**
 * Debug push Firebase Cloud Messaging : token, topic iOS, userId session.
 */
const FCMTokenScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const t = await fcmService.forceGetAndShowToken();
      const stored = await AsyncStorage.getItem('fcmToken');
      const resolved = t || stored || null;
      setToken(resolved);

      let uid = await AsyncStorage.getItem('fcmUserId');
      if (!uid) uid = await AsyncStorage.getItem('userId');
      setUserId(uid || null);

      if (!resolved) {
        setError('Aucun token FCM (permissions refusées ou appareil non enregistré pour les push).');
      }
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const shareToken = async () => {
    if (!token) return;
    try {
      await Share.share({
        message: token,
        title: 'Token FCM Mayombe',
      });
    } catch (_) {
      /* annulé */
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Push (Firebase)</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <Text style={styles.label}>Topic campagne iOS (abonnement auto)</Text>
          <Text style={styles.mono} selectable>
            {FCM_IOS_BROADCAST_TOPIC}
          </Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#FF9800" />
            </View>
          ) : (
            <>
              <Text style={[styles.label, { marginTop: 20 }]}>Token FCM</Text>
              <Text style={styles.mono} selectable>
                {token || error || '—'}
              </Text>

              <Text style={[styles.label, { marginTop: 16 }]}>User ID (session)</Text>
              <Text style={styles.mono} selectable>
                {userId || '— (non connecté : token peut ne pas être en base)'}
              </Text>

              <Text style={styles.hint}>
                Pour un test dans la console Firebase : Messagerie → message de test → colle ce token
                FCM. Les campagnes peuvent cibler l’app ou le topic{' '}
                <Text style={styles.hintMono}>{FCM_IOS_BROADCAST_TOPIC}</Text> sur iOS.
              </Text>
            </>
          )}

          {token ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={shareToken}>
              <Ionicons name="share-outline" size={20} color="#FF9800" />
              <Text style={styles.secondaryButtonText}>Partager le token</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.refreshButton} onPress={load}>
            <Ionicons name="refresh" size={20} color="#FFF" />
            <Text style={styles.refreshButtonText}>Actualiser</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontFamily: 'Montserrat-Bold', color: '#333' },
  placeholder: { width: 40 },
  scrollView: { flex: 1 },
  content: { padding: 20 },
  label: { fontFamily: 'Montserrat-Bold', color: '#333', marginBottom: 8 },
  mono: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: '#333',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  hintMono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 13 },
  hint: {
    marginTop: 20,
    color: '#666',
    fontSize: 14,
    fontFamily: 'Montserrat',
    lineHeight: 20,
  },
  loadingBox: { paddingVertical: 40, alignItems: 'center' },
  refreshButton: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  refreshButtonText: { color: '#fff', fontFamily: 'Montserrat-Bold' },
  secondaryButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF9800',
    gap: 8,
  },
  secondaryButtonText: { color: '#FF9800', fontFamily: 'Montserrat-Bold' },
});

export default FCMTokenScreen;
