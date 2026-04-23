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
    // We make two requests: one for most_relevant (default) and one for newest
    // This allows us to potentially capture up to 10 unique reviews instead of just 5.
    const urlRelevant = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&language=es&reviews_sort=most_relevant&key=${apiKey}`;
    const urlNewest = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews&language=es&reviews_sort=newest&key=${apiKey}`;

    const [resRelevant, resNewest] = await Promise.all([
      fetch(urlRelevant, { next: { revalidate: 3600 } }),
      fetch(urlNewest, { next: { revalidate: 3600 } })
    ]);

    const dataRelevant = await resRelevant.json();
    const dataNewest = await resNewest.json();

    if (dataRelevant.status !== 'OK' && dataNewest.status !== 'OK') {
      return NextResponse.json({ error: 'Failed to fetch reviews.' }, { status: 500 });
    }

    const reviewsRelevant = dataRelevant.result?.reviews || [];
    const reviewsNewest = dataNewest.result?.reviews || [];

    // Combine and deduplicate
    const combinedReviews = [...reviewsRelevant, ...reviewsNewest];
    
    // Deduplicate by author_name and time
    const uniqueReviews: any[] = [];
    const seen = new Set();
    
    for (const review of combinedReviews) {
      const key = `${review.author_name}-${review.time}`;
      if (!seen.has(key) && review.text && review.text.length > 5) {
        seen.add(key);
        uniqueReviews.push({
          id: `google-${review.time}-${review.author_name.replace(/\s+/g, '')}`,
          author: review.author_name,
          quote: review.text,
          roles: ['En Google Maps'],
          cycle: '',
          status: 'approved',
          rating: review.rating,
          photoUrl: review.profile_photo_url ? review.profile_photo_url.replace(/s128-/, 's256-') : null,
          createdAt: new Date(review.time * 1000).toISOString(),
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
