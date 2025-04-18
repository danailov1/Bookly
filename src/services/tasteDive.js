const TASTE_DIVE_API_KEY = process.env.REACT_APP_TASTE_DIVE_API_KEY || '1049527-DanailDa-36868088';
const TASTE_DIVE_BASE_URL = '/api/similar'; // This will work with our proxy server
const OPEN_LIBRARY_BASE_URL = 'https://openlibrary.org';
const LIBRE_TRANSLATE_BASE_URL = 'https://translate.argosopentech.com';

const titleMap = {
    // International Classics
    'Чужденецът': 'The Stranger',
    'Югозапад': 'Southwest',
    'Елегия по загубения град': 'Elegy for a Lost City'
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
    const response = await fetch(`${LIBRE_TRANSLATE_BASE_URL}/translate`, {
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
    
    const url = `${TASTE_DIVE_BASE_URL}?q=${encodeURIComponent(query)}&type=book&limit=${limit}`;
    console.log('Requesting URL:', url);
    
    const tasteDiveResponse = await fetch(url);
    
    // For debugging - log the raw response if there's an issue
    if (!tasteDiveResponse.ok) {
      const responseText = await tasteDiveResponse.text();
      console.error('TasteDive error response:', responseText);
      throw new Error(`TasteDive HTTP error! Status: ${tasteDiveResponse.status}`);
    }
    
    const tasteDiveData = await tasteDiveResponse.json();
    console.log('TasteDive API response:', JSON.stringify(tasteDiveData, null, 2));

    const similar = tasteDiveData.Similar;
    if (!similar) {
      console.log('No "Similar" field in TasteDive response');
      return [];
    }

    const results = similar.Results || [];
    if (results.length === 0) {
      console.log('No results found in TasteDive response');
      return [];
    }

    const recommendations = results.map((item) => ({
      title: item.Name,
      type: item.Type || 'book',
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