import React, { createContext, useState, useEffect, useContext } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { View, Text, StyleSheet } from 'react-native';

const ConnectivityContext = createContext();

export const ConnectivityProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Vérifier l'état initial
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected);
    });

    // S'abonner aux changements
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const checkConnection = async () => {
    const state = await NetInfo.fetch();
    setIsConnected(state.isConnected);
  };

  return (
    <ConnectivityContext.Provider value={{ isConnected, checkConnection }}>
      {children}
    </ConnectivityContext.Provider>
  );
};

export const useConnectivity = () => useContext(ConnectivityContext);
