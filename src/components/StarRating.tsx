'use client';

import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  onRatingChange?: (rating: number) => void;
  size?: number;
  interactive?: boolean;
}

export default function StarRating({
  rating,
  maxStars = 5,
  onRatingChange,
  size = 18,
  interactive = false,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = React.useState<number | null>(null);

  const displayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div className="flex gap-1 items-center">
      {Array.from({ length: maxStars }).map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= displayRating;

        return (
          <button
            key={index}
            type="button"
            disabled={!interactive}
            onClick={() => onRatingChange && onRatingChange(starValue)}
            onMouseEnter={() => interactive && setHoverRating(starValue)}
            onMouseLeave={() => interactive && setHoverRating(null)}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform focus:outline-none' : ''}`}
          >
            <Star
              size={size}
              className={`${
                isFilled
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-[#C7C4B8] fill-transparent'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
