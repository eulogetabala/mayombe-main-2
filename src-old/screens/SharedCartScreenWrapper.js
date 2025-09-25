import React from 'react';
import { CartProvider } from '../context/CartContext';
import SharedCartScreen from './SharedCartScreen';

/**
 * Wrapper pour SharedCartScreen qui fournit le contexte CartProvider
 * Ceci est nécessaire car SharedCartScreen est utilisé dans AppNavigator
 * qui n'a pas accès au CartProvider
 */
const SharedCartScreenWrapper = (props) => {
  return (
    <CartProvider>
      <SharedCartScreen {...props} />
    </CartProvider>
  );
};

export default SharedCartScreenWrapper;


