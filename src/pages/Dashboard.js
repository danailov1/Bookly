import React, { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import BookCard from '../components/books/BookCard';
import BookForm from '../components/books/BookForm';
import { getBookRecommendations } from '../services/tasteDive';
import '../styles/Dashboard.css';
import BooklyLogo from '../pages/image-removebg-preview (21).png';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('read');
  const [books, setBooks] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [showBookForm, setShowBookForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationError, setRecommendationError] = useState('');
  const [recommendationLimit, setRecommendationLimit] = useState(5);
  const [showRecommendations, setShowRecommendations] = useState(true);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const navigate = useNavigate();
  const recommendationTimeout = useRef(null);

  useEffect(() => {
    if (!auth.currentUser) {
      navigate('/login');
      return;
    }
    
    setLoading(true);

    const readBooksQuery = query(
      collection(db, 'books'),
      where('userId', '==', auth.currentUser.uid),
      where('type', '==', 'read'),
      orderBy('createdAt', 'desc')
    );

    const wishlistQuery = query(
      collection(db, 'books'),
      where('userId', '==', auth.currentUser.uid),
      where('type', '==', 'wishlist'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeRead = onSnapshot(readBooksQuery, (snapshot) => {
      const readBooksData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setBooks(readBooksData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching read books:', error);
      setLoading(false);
    });

    const unsubscribeWishlist = onSnapshot(wishlistQuery, (snapshot) => {
      const wishlistData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setWishlist(wishlistData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching wishlist books:', error);
      setLoading(false);
    });

    return () => {
      unsubscribeRead();
      unsubscribeWishlist();
    };
  }, [navigate]);

  useEffect(() => {
    if (recommendationTimeout.current) {
      clearTimeout(recommendationTimeout.current);
    }

    if (books.length > 0 && showRecommendations) {
      const bookTitles = books.map((book) => book.title);
      
      setIsLoadingRecommendations(true);
      setRecommendationError('');
      
      console.log('Fetching recommendations for books:', bookTitles, 'Limit:', recommendationLimit);

      recommendationTimeout.current = setTimeout(() => {
        getBookRecommendations(bookTitles, recommendationLimit)
          .then((recs) => {
            console.log('Setting recommendations:', recs);
            setRecommendations(recs);
            setRecommendationError('');
            setIsLoadingRecommendations(false);
          })
          .catch((error) => {
            console.error('Recommendation error:', error);
            setRecommendationError('Failed to load recommendations. Please try again.');
            setIsLoadingRecommendations(false);
          });
      }, 500);
    } else {
      setRecommendations([]);
      setRecommendationError('');
      setIsLoadingRecommendations(false);
    }

    return () => {
      if (recommendationTimeout.current) {
        clearTimeout(recommendationTimeout.current);
      }
    };
  }, [books, recommendationLimit, showRecommendations]);

  const handleLoadMore = () => {
    setRecommendationLimit((prevLimit) => prevLimit + 5);
  };

  const handleShowLess = () => {
    setRecommendationLimit(5);
  };

  const handleToggleRecommendations = () => {
    setShowRecommendations((prev) => !prev);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDeleteBook = (bookId) => {
    if (activeTab === 'read') {
      setBooks(books.filter((book) => book.id !== bookId));
    } else {
      setWishlist(wishlist.filter((book) => book.id !== bookId));
    }
  };

  const handleBookAdded = () => {
    setShowBookForm(false);
  };

  const handleRetryRecommendations = () => {
    // Reset error state and retry
    setRecommendationError('');
    if (books.length > 0) {
      const bookTitles = books.map((book) => book.title);
      setIsLoadingRecommendations(true);
      
      getBookRecommendations(bookTitles, recommendationLimit)
        .then((recs) => {
          setRecommendations(recs);
          setIsLoadingRecommendations(false);
        })
        .catch((error) => {
          console.error('Retry recommendation error:', error);
          setRecommendationError('Failed to load recommendations. Please try again.');
          setIsLoadingRecommendations(false);
        });
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="logo-container">
          <img src={BooklyLogo} alt="Bookly Logo" className="logo" />
        </div>
        <button onClick={handleSignOut} className="sign-out-btn">Sign Out</button>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'read' ? 'active' : ''}`}
          onClick={() => setActiveTab('read')}
        >
          Books I've Read
        </button>
        <button
          className={`tab ${activeTab === 'wishlist' ? 'active' : ''}`}
          onClick={() => setActiveTab('wishlist')}
        >
          Wishlist
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'read' ? (
          <div className="read-books">
            <h2>Books I've Read</h2>
            <button
              className="add-book-btn"
              onClick={() => setShowBookForm(true)}
            >
              Add New Book
            </button>

            {loading ? (
              <div className="loading">Loading books...</div>
            ) : (
              <div className="books-container">
                {books.length > 0 ? (
                  books.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      onDelete={handleDeleteBook}
                    />
                  ))
                ) : (
                  <p>You haven't added any books yet.</p>
                )}
              </div>
            )}

            <div className="recommendations">
              <div className="recommendations-header">
                <h2>Recommended Books</h2>
                <button
                  className="toggle-recommendations-btn"
                  onClick={handleToggleRecommendations}
                >
                  {showRecommendations ? 'Hide Recommendations' : 'Show Recommendations'}
                </button>
              </div>
              {showRecommendations && (
                <>
                  {isLoadingRecommendations ? (
                    <div className="loading">Loading recommendations...</div>
                  ) : recommendationError ? (
                    <div className="recommendation-error">
                      <p className="error-message">{recommendationError}</p>
                      <button 
                        className="retry-btn"
                        onClick={handleRetryRecommendations}
                      >
                        Retry
                      </button>
                    </div>
                  ) : recommendations.length > 0 ? (
                    <div>
                      <div className="books-container">
                        {recommendations.map((rec, index) => (
                          <div key={index} className="recommendation-card">
                            {rec.cover_id ? (
                              <img
                                src={`https://covers.openlibrary.org/b/id/${rec.cover_id}-M.jpg`}
                                alt={`${rec.title} cover`}
                                className="recommendation-cover"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = "https://via.placeholder.com/150x220?text=No+Cover";
                                }}
                              />
                            ) : (
                              <div className="no-cover">No cover available</div>
                            )}
                            <h3>{rec.title}</h3>
                            <p>Author: {rec.author}</p>
                            <p>Type: {rec.type}</p>
                          </div>
                        ))}
                      </div>
                      <div className="recommendation-controls">
                        {recommendations.length >= recommendationLimit && (
                          <button
                            className="load-more-btn"
                            onClick={handleLoadMore}
                            disabled={recommendationLimit >= 20}
                          >
                            Load More
                          </button>
                        )}
                        {recommendationLimit > 5 && (
                          <button
                            className="show-less-btn"
                            onClick={handleShowLess}
                          >
                            Show Less
                          </button>
                        )}
                      </div>
                    </div>
                  ) : books.length === 0 ? (
                    <p>Add some books to get recommendations.</p>
                  ) : (
                    <p>No recommendations available.</p>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="wishlist">
            <h2>My Reading Wishlist</h2>
            <button
              className="add-book-btn"
              onClick={() => setShowBookForm(true)}
            >
              Add to Wishlist
            </button>

            {loading ? (
              <div className="loading">Loading wishlist...</div>
            ) : (
              <div className="books-container">
                {wishlist.length > 0 ? (
                  wishlist.map((book) => (
                    <BookCard
                      key={book.id}
                      book={book}
                      onDelete={handleDeleteBook}
                    />
                  ))
                ) : (
                  <p>Your wishlist is empty.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showBookForm && (
        <BookForm
          type={activeTab}
          onClose={() => setShowBookForm(false)}
          onBookAdded={handleBookAdded}
        />
      )}
    </div>
  );
};

export default Dashboard;