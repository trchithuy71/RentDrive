'use client';

import { useEffect, useRef } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { useNotifications } from '@/contexts/NotificationContext';
import { Address } from 'viem';

const contractAddress = process.env.NEXT_PUBLIC_RENTDRIVE_CONTRACT_ADDRESS as Address;
let rentDriveArtifact: any;
try {
  rentDriveArtifact = require('../contracts/RentDrive.json');
} catch (e) {
  rentDriveArtifact = { abi: [] };
}

export function useContractEvents() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { addNotification, emitEvent } = useNotifications();
  
  // Track active watches to clean up properly
  const unwatchCallbacks = useRef<Array<() => void>>([]);

  useEffect(() => {
    if (!publicClient || !contractAddress || !contractAddress.startsWith('0x') || !address) {
      return;
    }

    const abi = rentDriveArtifact.abi;
    if (!abi || abi.length === 0) return;

    const currentUnwatch: Array<() => void> = [];

    // Helper to fetch rental details if we need to verify ownership/renter roles
    const checkRentalRelevance = async (rentalId: bigint): Promise<{ isRelevant: boolean; isRenter: boolean; isOwner: boolean; vehicleModel?: string }> => {
      try {
        const rentalData: any = await publicClient.readContract({
          address: contractAddress,
          abi,
          functionName: 'getRental',
          args: [rentalId],
        });
        
        // rentalData index mapping:
        // [0: id, 1: vehicleId, 2: renter, 3: startTime, 4: endTime, 5: escrowBalance, ...]
        const renterAddress = rentalData[2] as string;
        const vehicleId = rentalData[1] as bigint;
        
        const vehicleData: any = await publicClient.readContract({
          address: contractAddress,
          abi,
          functionName: 'getVehicle',
          args: [vehicleId],
        });
        // vehicleData index mapping:
        // [0: id, 1: owner, 2: baseRate, 3: ratePerKm, 4: speedLimit, 5: speedPenalty, 6: deposit, 7: metadataUri, ...]
        const ownerAddress = vehicleData[1] as string;
        const metadataUri = vehicleData[7] as string;
        const vehicleModel = metadataUri.split('|')[0]?.trim() || 'Vehicle';

        const isRenter = renterAddress.toLowerCase() === address.toLowerCase();
        const isOwner = ownerAddress.toLowerCase() === address.toLowerCase();

        return {
          isRelevant: isRenter || isOwner,
          isRenter,
          isOwner,
          vehicleModel,
        };
      } catch (err) {
        console.error('Error verifying rental relevance:', err);
        return { isRelevant: false, isRenter: false, isOwner: false };
      }
    };

    try {
      // 1. Subscribe to VehicleListed
      const unwatchListed = publicClient.watchContractEvent({
        address: contractAddress,
        abi,
        eventName: 'VehicleListed',
        onLogs: (logs) => {
          logs.forEach((log) => {
            const { vehicleId, owner, depositRequired, metadataUri } = (log as any).args;
            const vehicleModel = metadataUri?.split('|')[0]?.trim() || 'Vehicle';
            
            // Show to everyone as new vehicle in marketplace, or filter by owner
            const isOwner = owner?.toLowerCase() === address.toLowerCase();
            
            addNotification({
              type: 'VehicleListed',
              title: isOwner ? 'VEHICLE LISTED SUCCESSFULLY' : 'NEW VEHICLE AVAILABLE',
              message: isOwner
                ? `Your ${vehicleModel} has been successfully minted as an NFT and listed on the marketplace.`
                : `A new ${vehicleModel} is now available for rent.`,
              txHash: log.transactionHash || undefined,
            });
            emitEvent('vehicle-listed');
          });
        },
      });
      currentUnwatch.push(unwatchListed);

      // 2. Subscribe to RentalStarted
      const unwatchStarted = publicClient.watchContractEvent({
        address: contractAddress,
        abi,
        eventName: 'RentalStarted',
        onLogs: (logs) => {
          logs.forEach(async (log) => {
            const { rentalId, vehicleId, renter } = (log as any).args;
            const { isRelevant, isOwner, isRenter, vehicleModel } = await checkRentalRelevance(rentalId);
            
            if (isRelevant) {
              addNotification({
                type: 'RentalStarted',
                title: 'RENTAL ACTIVE',
                message: isRenter
                  ? `Your rental lease for ${vehicleModel} has started. Odometer monitoring active.`
                  : `Your vehicle ${vehicleModel} is now being rented. Escrow collateral locked.`,
                txHash: log.transactionHash || undefined,
              });
              emitEvent('rental-started');
            }
          });
        },
      });
      currentUnwatch.push(unwatchStarted);

      // 3. Subscribe to TelemetryUpdated (Speed penalty, Geofence, Crash)
      const unwatchTelemetry = publicClient.watchContractEvent({
        address: contractAddress,
        abi,
        eventName: 'TelemetryUpdated',
        onLogs: (logs) => {
          logs.forEach(async (log) => {
            const { rentalId, odometerMeters, currentSpeed, crashDetected, geofenceViolated } = (log as any).args;
            const { isRelevant, isRenter, isOwner, vehicleModel } = await checkRentalRelevance(rentalId);

            if (isRelevant) {
              emitEvent('telemetry-updated');
              
              if (crashDetected) {
                // Double protection: notification context plays sound on CrashEscrowFrozen event,
                // but we also toast it here for quick warning.
                addNotification({
                  type: 'CrashEscrowFrozen',
                  title: 'CRASH DETECTED - ESCROW FROZEN',
                  message: `A severe impact was recorded on ${vehicleModel}. Collateral has been frozen for safety standard.`,
                  txHash: log.transactionHash || undefined,
                });
                emitEvent('crash-detected');
              } else {
                // Check if speed warning is needed
                const speed = Number(currentSpeed);
                if (speed > 100) { // standard default speed limit
                  addNotification({
                    type: 'warning',
                    title: 'SPEED LIMIT VIOLATED',
                    message: `You are driving at ${speed} km/h, exceeding the speed limit on ${vehicleModel}. Penalty applied.`,
                    txHash: log.transactionHash || undefined,
                  });
                  emitEvent('speed-penalty');
                }
                
                if (geofenceViolated) {
                  addNotification({
                    type: 'warning',
                    title: 'GEOFENCE BREACHED',
                    message: `Vehicle ${vehicleModel} has left the designated driving zone. Geofence penalty applied.`,
                    txHash: log.transactionHash || undefined,
                  });
                  emitEvent('geofence-penalty');
                }
              }
            }
          });
        },
      });
      currentUnwatch.push(unwatchTelemetry);

      // 4. Subscribe to RentalCompleted
      const unwatchCompleted = publicClient.watchContractEvent({
        address: contractAddress,
        abi,
        eventName: 'RentalCompleted',
        onLogs: (logs) => {
          logs.forEach(async (log) => {
            const { rentalId, finalBilling, refundAmount } = (log as any).args;
            const { isRelevant, isRenter, vehicleModel } = await checkRentalRelevance(rentalId);

            if (isRelevant) {
              addNotification({
                type: 'RentalCompleted',
                title: 'RENTAL LEASE COMPLETED',
                message: isRenter
                  ? `Rental for ${vehicleModel} successfully closed. Odometer registered and remaining deposit refunded.`
                  : `Rental for ${vehicleModel} completed. Funds settled to your owner balance.`,
                txHash: log.transactionHash || undefined,
              });
              emitEvent('rental-completed');
            }
          });
        },
      });
      currentUnwatch.push(unwatchCompleted);

      // 5. Subscribe to DisputeResolved
      const unwatchDispute = publicClient.watchContractEvent({
        address: contractAddress,
        abi,
        eventName: 'DisputeResolved',
        onLogs: (logs) => {
          logs.forEach(async (log) => {
            const { rentalId, payoutToOwner, refundToRenter } = (log as any).args;
            const { isRelevant, vehicleModel } = await checkRentalRelevance(rentalId);

            if (isRelevant) {
              addNotification({
                type: 'DisputeResolved',
                title: 'COLLISION CLAIM SETTLED',
                message: `Dispute for ${vehicleModel} has been resolved. Balances updated.`,
                txHash: log.transactionHash || undefined,
              });
              emitEvent('dispute-resolved');
            }
          });
        },
      });
      currentUnwatch.push(unwatchDispute);

      // 6. Subscribe to EarningsWithdrawn
      const unwatchEarnings = publicClient.watchContractEvent({
        address: contractAddress,
        abi,
        eventName: 'EarningsWithdrawn',
        onLogs: (logs) => {
          logs.forEach((log) => {
            const { owner, amount } = (log as any).args;
            if (owner?.toLowerCase() === address.toLowerCase()) {
              addNotification({
                type: 'EarningsWithdrawn',
                title: 'EARNINGS WITHDRAWN',
                message: `Successfully transferred earnings from contract to your wallet.`,
                txHash: log.transactionHash || undefined,
              });
              emitEvent('earnings-withdrawn');
            }
          });
        },
      });
      currentUnwatch.push(unwatchEarnings);

    } catch (err) {
      console.error('Failed to setup event subscriptions:', err);
    }

    unwatchCallbacks.current = currentUnwatch;

    return () => {
      unwatchCallbacks.current.forEach((cb) => cb());
      unwatchCallbacks.current = [];
    };

  }, [publicClient, address, addNotification, emitEvent]);
}
