import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../src/services/firebase';
import { buildActivePromosMapFromRtdbSnapshot } from '../src/services/promosService';

const ProductPromosContext = createContext(null);

export function ProductPromosProvider({ children }) {
  const [rawProductPromos, setRawProductPromos] = useState({});

  useEffect(() => {
    const r = ref(database, 'product_promos');
    const unsub = onValue(r, (snap) => {
      setRawProductPromos(snap.exists() ? snap.val() : {});
    });
    return unsub;
  }, []);

  const rtdbPromoById = useMemo(
    () => buildActivePromosMapFromRtdbSnapshot(rawProductPromos),
    [rawProductPromos]
  );

  const value = useMemo(
    () => ({ rawProductPromos, rtdbPromoById }),
    [rawProductPromos, rtdbPromoById]
  );

  return (
    <ProductPromosContext.Provider value={value}>
      {children}
    </ProductPromosContext.Provider>
  );
}

export function useProductPromosLive() {
  const ctx = useContext(ProductPromosContext);
  if (ctx == null) {
    throw new Error('useProductPromosLive doit être utilisé dans un ProductPromosProvider');
  }
  return ctx;
}
