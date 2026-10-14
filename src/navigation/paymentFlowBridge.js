/**
 * Callbacks de fin de flux paiement — stockés hors de route.params pour respecter
 * l’état de navigation sérialisable (React Navigation).
 */

let onPaymentSuccessHandler = null;
let onPaymentCancelHandler = null;

/**
 * @param {{ onSuccess?: (data: unknown) => void | Promise<void>, onCancel?: () => void }} handlers
 */
export function setPaymentFlowHandlers({ onSuccess, onCancel } = {}) {
  onPaymentSuccessHandler =
    typeof onSuccess === 'function' ? onSuccess : null;
  onPaymentCancelHandler =
    typeof onCancel === 'function' ? onCancel : null;
}

export function clearPaymentFlowHandlers() {
  onPaymentSuccessHandler = null;
  onPaymentCancelHandler = null;
}

export function hasPaymentSuccessHandler() {
  return typeof onPaymentSuccessHandler === 'function';
}

/** @returns {void|Promise<void>} */
export function invokePaymentSuccess(data) {
  if (typeof onPaymentSuccessHandler === 'function') {
    return onPaymentSuccessHandler(data);
  }
}

export function invokePaymentCancel() {
  if (typeof onPaymentCancelHandler === 'function') {
    onPaymentCancelHandler();
  }
}
