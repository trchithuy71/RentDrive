import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { isValidAddress, sanitizeHtml, isRateLimited } from '@/lib/geofence';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get('vehicleId');
    const userAddress = searchParams.get('userAddress');

    if (vehicleId) {
      const list = await db.getVehicleReviews(Number(vehicleId));
      return NextResponse.json({ success: true, reviews: list });
    }

    if (userAddress) {
      if (!isValidAddress(userAddress)) {
        return NextResponse.json({ success: false, error: 'Invalid userAddress parameter' }, { status: 400 });
      }
      const list = await db.getUserReviews(userAddress);
      return NextResponse.json({ success: true, reviews: list });
    }

    const list = await db.getReviews();
    return NextResponse.json({ success: true, reviews: list });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'anonymous-reviews';
    if (isRateLimited(ip, 5, 60000)) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded. Please wait a moment.' }, { status: 429 });
    }

    const body = await req.json();
    const { rental_id, reviewer, reviewee, rating, comment, role } = body;

    if (!rental_id || !reviewer || !reviewee || !rating || !role || !isValidAddress(reviewer) || !isValidAddress(reviewee)) {
      return NextResponse.json({ success: false, error: 'Missing or invalid parameters' }, { status: 400 });
    }

    const ratingNum = Number(rating);
    if (ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ success: false, error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // Retrieve the rental status
    const rentals = await db.getRentals();
    const rental = rentals.find((r: any) => r.id === Number(rental_id));
    if (!rental) {
      return NextResponse.json({ success: false, error: 'Rental agreement not found' }, { status: 404 });
    }

    if (rental.status !== 'Completed' && rental.status !== 'Resolved') {
      return NextResponse.json({ success: false, error: 'Rental must be Completed or Resolved before submitting feedback' }, { status: 400 });
    }

    // Check duplicate
    const reviews = await db.getReviews();
    const duplicate = reviews.some(
      (r: any) => r.rental_id === Number(rental_id) && r.reviewer.toLowerCase() === reviewer.toLowerCase()
    );
    if (duplicate) {
      return NextResponse.json({ success: false, error: 'Feedback already submitted for this rental asset' }, { status: 400 });
    }

    const newReview = await db.createReview({
      rental_id: Number(rental_id),
      reviewer,
      reviewee,
      rating: ratingNum,
      comment: sanitizeHtml(comment || ''),
      role,
    });

    return NextResponse.json({ success: true, review: newReview });
  } catch (error: any) {
    console.error('Review API route error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
