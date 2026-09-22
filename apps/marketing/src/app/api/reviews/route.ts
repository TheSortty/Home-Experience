import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.NEXT_PUBLIC_GOOGLE_PLACE_ID;

  if (!apiKey || !placeId) {
    return NextResponse.json(
      { error: 'Google Places API credentials are not configured.' },
      { status: 500 }
    );
  }

  try {
    const url = `https://places.googleapis.com/v1/places/${placeId}?languageCode=es`;

    const res = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'reviews'
      },
      next: { revalidate: 3600 }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as any;

    if (!res.ok || data.error) {
      console.error('Google Places API Error:', data.error || data);
      return NextResponse.json({ error: 'Failed to fetch reviews.' }, { status: 500 });
    }

    const reviews = data.reviews || [];
    const uniqueReviews: any[] = [];
    const seen = new Set();
    
    for (const review of reviews) {
      const displayName = review.authorAttribution?.displayName || 'Usuario de Google';
      const key = `${displayName}-${review.publishTime}`;
      const quote = review.text?.text || '';

      if (!seen.has(key) && quote.length > 5) {
        seen.add(key);
        uniqueReviews.push({
          id: `google-${review.publishTime}-${displayName.replace(/\s+/g, '')}`,
          author: displayName,
          quote: quote,
          roles: ['En Google Maps'],
          cycle: '',
          status: 'approved',
          rating: review.rating,
          photoUrl: review.authorAttribution?.photoUri ? review.authorAttribution.photoUri.replace(/s128-/, 's256-') : null,
          createdAt: review.publishTime,
        });
      }
    }

    // Shuffle the unique reviews array for randomness
    for (let i = uniqueReviews.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [uniqueReviews[i], uniqueReviews[j]] = [uniqueReviews[j], uniqueReviews[i]];
    }

    return NextResponse.json({ data: uniqueReviews });
  } catch (error) {
    console.error('Error fetching Google Reviews:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching reviews.' },
      { status: 500 }
    );
  }
}
