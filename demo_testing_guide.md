# RENTDRIVE DEMO & TESTING SCRIPT

## 1. Local setup & Startup
Run the following commands in the project root:
```bash
# Install dependencies
npm install --legacy-peer-deps

# Run local development server
npm run dev
```
Open `http://localhost:3000` in browser.

---

## 2. Test Wallet Setup
1. Configure your MetaMask / Web3 Wallet to connect to **Arc Testnet**.
2. Grab testnet USDC from the faucet link in the footer.
3. Link your wallet using the **Connect Wallet** button.

---

## 3. Step 1: Owner Portal (Registering Vehicle)
1. Navigate to **Launch App** -> **Owner Portal**.
2. Fill out the "Register New Vehicle" form:
   * Brand & Model: `Audi e-tron GT`
   * License Plate: `30K-888.88`
   * Deposit: `150`
   * Hourly Rate: `10`
   * Distance Rate: `1.5`
   * Speed Limit: `90`
   * Violation Penalty: `30`
3. Click **REGISTER VEHICLE ASSET**.
4. Confirm wallet popup transactions.
5. Verify vehicle appears in "Registered Vehicles" list.

---

## 4. Step 2: Marketplace (Locking Escrow Deposit)
1. Switch to the **Marketplace** tab.
2. Select the registered `Audi e-tron GT` and click **RENT & LOCK ESCROW**.
3. Verify transaction modal progress steps:
   * Approve USDC allowance.
   * Lock escrow deposit on-chain.
   * Sync local database.
4. Verify success screen and click **LAUNCH TELEMATICS**.

---

## 5. Step 3: Telematics Simulator (Odometer & Penalties)
1. Switch to **Telematics Simulator** tab.
2. Select the active rental from the dropdown.
3. Drag the **Speed Slider** to `110 km/h` (exceeding the `90 km/h` limit).
4. Wait 6 seconds and verify **Speed Penalties** increases by `30 USDC`.
5. Verify **Odometer** increments, and **Distance Charges** accrue dynamically.

---

## 6. Step 4: Closing Lease & Escrow Refund
1. Switch to **My Rentals** tab.
2. Locate the active rental card.
3. Click **CLOSE LEASE & REFUND ESCROW**.
4. Click **PROCEED SETTLEMENT** inside the confirmation modal.
5. Authorize the settlement transaction popup in your wallet.
6. Verify success modal displaying refund breakdown:
   * Refunded collateral amount.
   * Settled distance & penalty fees.

---

## 7. Step 5: Collision Dispute & Settle Claim (Alternate flow)
1. Start another rental lease.
2. Navigate to **Telematics Simulator** and click **TRIGGER IMPACT COLLISION**.
3. Verify telemetry state shifts to **DISPUTED (Crash Detected)**.
4. Go to **Owner Portal**.
5. Locate the dispute card under **Active Escrow Collision Claims**.
6. Set custom disbursement split:
   * Owner Payout: `100 USDC`
   * Renter Refund: `50 USDC`
7. Click **DISBURSE ESCROW COLLATERAL** -> **DISBURSE FUNDS**.
8. Verify escrow unlocks and distributes values accordingly.
