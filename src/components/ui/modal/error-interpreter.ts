'use client';

export interface InterpretedError {
  title: string;
  message: string;
  code: string;
  suggestion: string;
  severity: 'warning' | 'destructive' | 'neutral';
}

export function interpretError(error: any): InterpretedError {
  if (!error) {
    return {
      title: 'UNKNOWN OPERATION EXCEPTION',
      message: 'An unspecified error occurred during the transaction flow.',
      code: 'ERR_UNKNOWN_NULL',
      suggestion: 'Please close this prompt and try executing the action again.',
      severity: 'neutral',
    };
  }

  // Extract message string from nested objects (e.g. Error object, Custom error context)
  let rawMsg = '';
  if (typeof error === 'string') {
    rawMsg = error;
  } else if (error.message) {
    rawMsg = error.message;
  } else if (error.toString) {
    rawMsg = error.toString();
  }

  const msgLower = rawMsg.toLowerCase();

  // 1. User Rejection
  if (
    msgLower.includes('user rejected') ||
    msgLower.includes('rejected by user') ||
    msgLower.includes('cancelled') ||
    msgLower.includes('declined') ||
    msgLower.includes('user_rejected') ||
    error.code === 4001
  ) {
    return {
      title: 'SIGNATURE REQUEST DECLINED',
      message: 'The authorization or contract transaction was cancelled in your wallet interface.',
      code: 'ERR_WALLET_USER_REJECTED',
      suggestion: 'Click the action button again and approve the signature request inside your wallet wallet extension.',
      severity: 'warning',
    };
  }

  // 2. Insufficient funds / Gas
  if (msgLower.includes('insufficient funds') || msgLower.includes('funds') || msgLower.includes('exceeds balance')) {
    return {
      title: 'INSUFFICIENT WALLET BALANCE',
      message: 'Your wallet does not contain enough USDC, EURC, or native gas token to cover this transaction.',
      code: 'ERR_WALLET_INSUFFICIENT_FUNDS',
      suggestion: 'Please fund your connected wallet address or reduce the contract stake parameters before re-attempting.',
      severity: 'destructive',
    };
  }

  // 3. Rate limiting / Throttling
  if (msgLower.includes('429') || msgLower.includes('rate limit') || msgLower.includes('too many requests')) {
    return {
      title: 'NETWORK RATE LIMIT EXCEEDED',
      message: 'The RPC connection or server API is experiencing unusually high traffic. Your connection is throttled.',
      code: 'ERR_RPC_RATE_LIMITED',
      suggestion: 'Wait 10–15 seconds for the queue to clear and try again. Your wallet balances are unaffected.',
      severity: 'warning',
    };
  }

  // 4. Authentication / Session
  if (msgLower.includes('401') || msgLower.includes('unauthorized') || msgLower.includes('expired session')) {
    return {
      title: 'AUTHENTICATION SESSION EXPIRED',
      message: 'Your cryptographic login signature is no longer valid or has timed out.',
      code: 'ERR_AUTH_EXPIRED',
      suggestion: 'Disconnect your wallet, log in again to sign a fresh session, and restart this action.',
      severity: 'warning',
    };
  }

  // 5. Insurance Pool reserve compliance
  if (msgLower.includes('insurance') || msgLower.includes('reserve') || msgLower.includes('payout exceed')) {
    return {
      title: 'CONTRACT RESERVE BREACH',
      message: 'The requested withdrawal size violates compliance rules. A minimum 10% reserve of all historical premiums must remain locked.',
      code: 'ERR_CONTRACT_RESERVE_VIOLATION',
      suggestion: 'Reduce the withdrawal amount to maintain the minimum 10% reserve ratio required by the Pool registry.',
      severity: 'destructive',
    };
  }

  // 6. Execution Reverted / Smart Contract Rule Breach
  if (msgLower.includes('revert') || msgLower.includes('execution reverted') || msgLower.includes('rule violation')) {
    return {
      title: 'BLOCKCHAIN TRANSACTION REVERTED',
      message: 'The blockchain network rejected the transaction because it failed to satisfy smart contract validation rules.',
      code: 'ERR_CONTRACT_REVERTED',
      suggestion: 'Ensure telemetry metrics are up-to-date and that geofencing bounds or speeds comply with listing terms.',
      severity: 'destructive',
    };
  }

  // 7. Network / RPC Offline
  if (
    msgLower.includes('failed to fetch') ||
    msgLower.includes('network') ||
    msgLower.includes('offline') ||
    msgLower.includes('rpc') ||
    msgLower.includes('timeout')
  ) {
    return {
      title: 'RPC NODE CONNECTION ERROR',
      message: 'Unable to connect to the Arc blockchain network node or the RentDrive database services.',
      code: 'ERR_NETWORK_DISCONNECTED',
      suggestion: 'Check your network connectivity, wait for the Arc testnet nodes to resume, and reload the application.',
      severity: 'warning',
    };
  }

  // Default Fallback
  return {
    title: 'TRANSACTION EXECUTION FAILED',
    message: rawMsg || 'An unexpected failure occurred while processing this smart contract request.',
    code: 'ERR_GENERIC_EXCEPTION',
    suggestion: 'Verify your wallet connection status and balance, and contact support if this issue persists.',
    severity: 'destructive',
  };
}
