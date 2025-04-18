const TASTE_DIVE_API_KEY = process.env.REACT_APP_TASTE_DIVE_API_KEY || '1049527-DanailDa-36868088';
const TASTE_DIVE_BASE_URL = '/api/similar';
const OPEN_LIBRARY_BASE_URL = 'https://openlibrary.org';
const LIBRE_TRANSLATE_BASE_URL = '/api/translate'; // Updated to use our proxy

const titleMap = {
    // International Classics
    'Чужденецът': 'The Stranger',
    'Метаморфозата': 'The Metamorphosis',
};

const recommendationCache = new Map();
const translationCache = new Map();

const translateTitle = async (title) => {
  if (translationCache.has(title)) {
    console.log('Returning cached translation for:', title);
    return translationCache.get(title);
  }

  if (titleMap[title]) {
    console.log('Using titleMap for:', title);
    translationCache.set(title, titleMap[title]);
    return titleMap[title];
  }

  if (/^[A-Za-z0-9\s.,!?'-]+$/.test(title)) {
    console.log('Title assumed to be English:', title);
    translationCache.set(title, title);
    return title;
  }

  try {
    const response = await fetch(LIBRE_TRANSLATE_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: title,
        source: 'bg',
        target: 'en',
      }),
    });

    if (!response.ok) {
      throw new Error(`LibreTranslate HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.translatedText) {
      throw new Error('No translated text in response');
    }

    const translatedTitle = data.translatedText;
    console.log(`Translated "${title}" to "${translatedTitle}"`);
    translationCache.set(title, translatedTitle);
    return translatedTitle;
  } catch (error) {
    console.error(`Error translating title "${title}":`, error);
    translationCache.set(title, title);
    return title;
  }
};

export const getBookRecommendations = async (bookTitles, limit = 5) => {
  const cacheKey = `${bookTitles.sort().join(',')}:${limit}`;
  if (recommendationCache.has(cacheKey)) {
    console.log('Returning cached recommendations:', recommendationCache.get(cacheKey));
    return recommendationCache.get(cacheKey);
  }

  try {
    const translatedTitles = await Promise.all(
      bookTitles.map(async (title) => await translateTitle(title))
    );
    console.log('Translated titles:', translatedTitles);

    const query = translatedTitles.join(',');
    console.log('Query sent to TasteDive:', query, 'Limit:', limit);
    
    const tasteDiveResponse = await fetch(
      `${TASTE_DIVE_BASE_URL}?q=${encodeURIComponent(query)}&type=book&k=${TASTE_DIVE_API_KEY}&limit=${limit}`
    );
    if (!tasteDiveResponse.ok) {
      throw new Error(`TasteDive HTTP error! Status: ${tasteDiveResponse.status}`);
    }
    const tasteDiveData = await tasteDiveResponse.json();
    console.log('TasteDive API response:', JSON.stringify(tasteDiveData, null, 2));

    const similar = tasteDiveData.similar || tasteDiveData.Similar;
    if (!similar) {
      console.log('No "similar" field in TasteDive response');
      return [];
    }

    const results = similar.results || similar.Results || [];
    if (results.length === 0) {
      console.log('No results found in TasteDive response');
      return [];
    }

    const recommendations = results.map((item) => ({
      title: item.Name || item.name,
      type: item.Type || item.type || 'book',
    }));

    const recommendationsWithDetails = await Promise.all(
      recommendations.map(async (rec) => {
        try {
          const openLibraryResponse = await fetch(
            `${OPEN_LIBRARY_BASE_URL}/search.json?q=${encodeURIComponent(rec.title)}&limit=1`
          );
          if (!openLibraryResponse.ok) {
            throw new Error(`Open Library HTTP error! Status: ${openLibraryResponse.status}`);
          }
          const openLibraryData = await openLibraryResponse.json();
          const author = openLibraryData.docs?.[0]?.author_name?.[0] || 'Unknown Author';
          const cover_id = openLibraryData.docs?.[0]?.cover_i || null;
          return { ...rec, author, cover_id };
        } catch (error) {
          console.error(`Error fetching details for ${rec.title}:`, error);
          return { ...rec, author: 'Unknown Author', cover_id: null };
        }
      })
    );

    console.log('Parsed recommendations with details:', recommendationsWithDetails);
    recommendationCache.set(cacheKey, recommendationsWithDetails);
    return recommendationsWithDetails;
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }
};