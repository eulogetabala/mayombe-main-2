import React, { createContext, useContext, useState } from 'react';

const RefreshContext = createContext(null);

export const RefreshProvider = ({ children }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());

  const refreshApp = async () => {
    setRefreshing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setRefreshTimestamp(Date.now());
    } finally {
      setRefreshing(false);
    }
  };

  const value = {
    refreshing,
    refreshApp,
    refreshTimestamp
  };

  return (
    <RefreshContext.Provider value={value}>
      {children}
    </RefreshContext.Provider>
  );
};

export const useRefresh = () => {
  const context = useContext(RefreshContext);
  if (context === undefined) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
}; 