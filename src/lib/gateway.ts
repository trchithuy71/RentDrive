import { db } from './supabase';

export interface NanopaymentState {
  rentalId: number;
  gatewayDeposit: number;
  nanopaymentsAccumulated: number;
  telemetryUpdateCount: number;
  onchainSettlementCount: number;
  gasSavedUsdc: number;
}

const GAS_COST_PER_TX = 0.0015; // Arc Testnet estimated gas cost in USDC

export const gateway = {
  /**
   * Initialize a renter's Circle Gateway nanopayment escrow balance
   */
  initializeBalance: async (rentalId: number, depositAmount: number): Promise<NanopaymentState> => {
    const rental = await db.getRental(rentalId);
    if (!rental) {
      throw new Error(`Rental #${rentalId} not found`);
    }

    const state: Partial<any> = {
      gateway_deposit: Number(depositAmount),
      nanopayments_accumulated: 0,
      telemetry_update_count: 0,
      onchain_settlement_count: 0,
      gas_saved_usdc: 0,
    };

    await db.updateRental(rentalId, state);

    return {
      rentalId,
      gatewayDeposit: Number(depositAmount),
      nanopaymentsAccumulated: 0,
      telemetryUpdateCount: 0,
      onchainSettlementCount: 0,
      gasSavedUsdc: 0,
    };
  },

  /**
   * Get the current off-chain nanopayment statistics for a rental
   */
  getState: async (rentalId: number): Promise<NanopaymentState | null> => {
    const rental = await db.getRental(rentalId);
    if (!rental) return null;

    const gatewayDeposit = Number(rental.gateway_deposit || 0);
    const nanopaymentsAccumulated = Number(rental.nanopayments_accumulated || 0);
    const telemetryUpdateCount = Number(rental.telemetry_update_count || 0);
    const onchainSettlementCount = Number(rental.onchain_settlement_count || 0);
    const gasSavedUsdc = Number(rental.gas_saved_usdc || 0);

    return {
      rentalId,
      gatewayDeposit,
      nanopaymentsAccumulated,
      telemetryUpdateCount,
      onchainSettlementCount,
      gasSavedUsdc,
    };
  },

  /**
   * Register a new micro-billing nanopayment.
   * Decrements renter gateway deposit, increments owner accrued payments.
   */
  registerNanopayment: async (rentalId: number, amount: number): Promise<NanopaymentState> => {
    const state = await gateway.getState(rentalId);
    if (!state) {
      throw new Error(`Gateway state for rental #${rentalId} not initialized`);
    }

    const newAccumulated = state.nanopaymentsAccumulated + amount;
    const newDeposit = Math.max(0, state.gatewayDeposit - amount);
    const newUpdatesCount = state.telemetryUpdateCount + 1;
    
    // Gas savings logic: we saved a transaction compared to standard on-chain reporting
    const potentialSavedCount = newUpdatesCount - state.onchainSettlementCount;
    const newGasSaved = potentialSavedCount * GAS_COST_PER_TX;

    await db.updateRental(rentalId, {
      gateway_deposit: newDeposit,
      nanopayments_accumulated: newAccumulated,
      telemetry_update_count: newUpdatesCount,
      gas_saved_usdc: newGasSaved,
    });

    return {
      rentalId,
      gatewayDeposit: newDeposit,
      nanopaymentsAccumulated: newAccumulated,
      telemetryUpdateCount: newUpdatesCount,
      onchainSettlementCount: state.onchainSettlementCount,
      gasSavedUsdc: newGasSaved,
    };
  },

  /**
   * Record that an on-chain settlement occurred, resetting potential gas saving counters
   */
  recordOnChainSettlement: async (rentalId: number): Promise<NanopaymentState> => {
    const state = await gateway.getState(rentalId);
    if (!state) {
      throw new Error(`Gateway state for rental #${rentalId} not initialized`);
    }

    const newSettlementCount = state.onchainSettlementCount + 1;

    await db.updateRental(rentalId, {
      onchain_settlement_count: newSettlementCount,
    });

    return {
      ...state,
      onchainSettlementCount: newSettlementCount,
    };
  }
};
