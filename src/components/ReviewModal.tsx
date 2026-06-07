'use client';

import React, { useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { Address } from 'viem';
import { X, MessageSquare, Zap } from 'lucide-react';
import StarRating from './StarRating';
import { useGaslessWriteContract } from '@/hooks/useGaslessWriteContract';
import { useCircleApp } from '@/contexts/CircleAppContext';
import { useModal } from '@/contexts/ModalContext';

interface ReviewModalProps {
  rental: any;
  vehicle: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReviewModal({
  rental,
  vehicle,
  onClose,
  onSuccess,
}: ReviewModalProps) {
  const { address } = useAccount();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { gaslessEnabled } = useCircleApp();
  const { writeContractAsync } = useGaslessWriteContract();
  const publicClient = usePublicClient();
  const { showModal } = useModal();

  const contractAddress = process.env.NEXT_PUBLIC_RENTDRIVE_CONTRACT_ADDRESS as Address;
  const rentDriveArtifact = require('../contracts/RentDrive.json');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    setSubmitting(true);

    try {
      // 1. Emit on-chain event ReviewSubmitted via contract call
      const isContractActive = !!contractAddress && contractAddress.startsWith('0x');
      if (isContractActive) {
        console.log(`Submitting on-chain review for rental #${rental.contract_id}...`);
        const txHash = await writeContractAsync({
          address: contractAddress,
          abi: rentDriveArtifact.abi,
          functionName: 'submitReview',
          args: [BigInt(rental.contract_id), rating],
        }, { txName: 'Submit Review Event' });

        console.log('On-chain review tx hash:', txHash);
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash: txHash });
        }
      }

      // 2. Persist to DB
      const isRenter = address.toLowerCase() === rental.renter.toLowerCase();
      const reviewee = isRenter ? vehicle.owner : rental.renter;
      const role = isRenter ? 'renter' : 'owner';

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rental_id: rental.id,
          reviewer: address,
          reviewee,
          rating,
          comment,
          role,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit review');
      }

      showModal({
        type: 'success',
        title: 'REVIEW SUBMITTED',
        message: 'Your feedback has been saved successfully on-chain and in the database.',
        primaryAction: {
          label: 'OK',
          onClick: () => {
            onSuccess();
            onClose();
          },
        },
      });
    } catch (err: any) {
      console.error(err);
      showModal({
        type: 'error',
        title: 'SUBMISSION FAILED',
        message: err.message || 'Error occurred while saving review.',
        primaryAction: {
          label: 'OK',
          onClick: () => {},
        },
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1C2B3C]/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-sm border border-[#DDDCD4] bg-[#F2F1EC] p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#5A6573] hover:text-[#1C2B3C] transition-all"
        >
          <X className="h-5 w-5" />
        </button>

        <h3 className="text-sm font-black text-[#1C2B3C] uppercase tracking-wider mb-5 flex items-center gap-2 pb-2 border-b border-[#E0DDD5]">
          <MessageSquare className="h-4.5 w-4.5" />
          Submit Lease Review
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="rounded-sm bg-white p-4 border border-[#E0DDD5]">
            <span className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1">Vehicle Asset</span>
            <span className="font-bold text-[#1C2B3C] uppercase text-xs">{vehicle?.model || 'Leased Asset'}</span>
            <span className="block text-[8px] text-[#718096] font-mono mt-1">Plate: {vehicle?.plate_number}</span>
          </div>

          <div>
            <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-2">Overall Rating</label>
            <div className="bg-white p-3 rounded-sm border border-[#DDDCD4] w-fit">
              <StarRating
                rating={rating}
                interactive={true}
                onRatingChange={setRating}
                size={28}
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] text-[#718096] font-bold uppercase tracking-widest mb-1.5">Feedback & Comments</label>
            <textarea
              required
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Provide a constructive review of the vehicle's condition, range, and general ownership experience..."
              className="w-full rounded-sm border border-[#DDDCD4] bg-white px-4 py-2.5 text-xs text-[#1C2B3C] font-semibold focus:border-[#1C2B3C] focus:outline-none placeholder-[#A0AEC0]"
            />
          </div>

          {gaslessEnabled && (
            <div className="flex justify-between items-center text-[10px] bg-[#ebf8ff] p-2 rounded-sm border border-[#bee3f8]">
              <span className="text-[#2b6cb0] font-bold uppercase tracking-wider flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 fill-current text-[#3182ce]" /> GAS SPONSORSHIP ACTIVE:
              </span>
              <span className="text-[#2b6cb0] font-extrabold uppercase font-mono bg-[#bee3f8] px-1.5 py-0.5 rounded-sm">
                100% sponsored
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3 rounded-sm bg-[#EAE8E1] hover:bg-[#DDDCD4] text-[#1C2B3C] font-bold text-xs tracking-widest uppercase transition-all border border-[#DDDCD4]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 rounded-sm bg-[#1C2B3C] text-[#F2F1EC] font-bold text-xs tracking-widest uppercase transition-all hover:bg-[#111A24] border border-[#1C2B3C] flex items-center justify-center gap-1.5"
            >
              {submitting ? 'Submitting...' : 'Post Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
