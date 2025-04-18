import React, { useState, useRef, useEffect } from 'react';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import '../../styles/BookCard.css';

const BookCard = ({ book, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBook, setEditedBook] = useState({
    title: book.title,
    author: book.author,
    rating: book.rating || 0,
    description: book.description || ''
  });
  
  // For iOS swipe detection
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const touchStartY = useRef(null);
  const touchEndY = useRef(null);
  const expandedViewRef = useRef(null);
  const editFormRef = useRef(null);
  const isIOS = useRef(false);
  
  // Detect if device is iOS
  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    isIOS.current = iOS;
    
    if (iOS) {
      document.documentElement.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)');
      document.documentElement.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
    }
  }, []);

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this book?')) {
      try {
        await deleteDoc(doc(db, 'books', book.id));
        if (onDelete) onDelete(book.id);
      } catch (error) {
        console.error("Error deleting book:", error);
        alert('Failed to delete book. Please try again.');
      }
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    
    // iOS specific - enable body scrolling when modal closes
    if (isIOS.current && isExpanded) {
      document.body.style.overflow = '';
      document.body.style.position = '';
    } else if (isIOS.current && !isExpanded) {
      // Disable body scrolling when modal opens
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    }
  };

  const toggleEdit = () => {
    setIsEditing(!isEditing);
    
    // iOS specific - enable body scrolling when modal closes
    if (isIOS.current && isEditing) {
      document.body.style.overflow = '';
      document.body.style.position = '';
    } else if (isIOS.current && !isEditing) {
      // Disable body scrolling when modal opens
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    }
    
    // Reset form when canceling edit
    if (isEditing) {
      setEditedBook({
        title: book.title,
        author: book.author,
        rating: book.rating || 0,
        description: book.description || ''
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedBook({
      ...editedBook,
      [name]: name === 'rating' ? parseInt(value) : value
    });
  };

  const handleSaveEdit = async () => {
    try {
      const bookRef = doc(db, 'books', book.id);
      await updateDoc(bookRef, {
        title: editedBook.title,
        author: editedBook.author,
        ...(book.type === 'read' && {
          rating: editedBook.rating,
          description: editedBook.description
        })
      });
      
      setIsEditing(false);
      
      // iOS specific - enable body scrolling when modal closes
      if (isIOS.current) {
        document.body.style.overflow = '';
        document.body.style.position = '';
      }
    } catch (error) {
      console.error("Error updating book:", error);
      alert('Failed to update book. Please try again.');
    }
  };
  
  // Touch event handlers for iOS swipe gestures
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  
  const handleTouchMove = (e) => {
    if (!touchStartY.current) return;
    
    touchEndY.current = e.touches[0].clientY;
    const yDiff = touchStartY.current - touchEndY.current;
    
    // If scrolling down in expanded view (pull to dismiss)
    if (expandedViewRef.current && yDiff < -50) {
      toggleExpand();
      touchStartY.current = null;
      touchEndY.current = null;
    }
    
    // If scrolling down in edit form (pull to dismiss)
    if (editFormRef.current && yDiff < -50) {
      toggleEdit();
      touchStartY.current = null;
      touchEndY.current = null;
    }
  };
  
  const handleTouchEnd = () => {
    touchStartY.current = null;
    touchEndY.current = null;
  };
  
  // iOS keyboard handling
  useEffect(() => {
    if (!isIOS.current) return;
    
    const handleVisualViewport = () => {
      if (isEditing) {
        // Adjust position when keyboard shows
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        
        if (viewportHeight < windowHeight) {
          // Keyboard is visible
          if (editFormRef.current) {
            editFormRef.current.style.transform = `translateY(-${windowHeight - viewportHeight}px)`;
          }
        } else {
          // Keyboard is hidden
          if (editFormRef.current) {
            editFormRef.current.style.transform = 'translateY(0)';
          }
        }
      }
    };
    
    window.visualViewport?.addEventListener('resize', handleVisualViewport);
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handleVisualViewport);
    };
  }, [isEditing]);

  return (
    <>
      <div className={`book-card ${isExpanded ? 'hidden' : ''}`}>
        <div className="book-cover" onClick={toggleExpand}>
          {book.image ? (
            <img src={book.image} alt={`Cover of ${book.title}`} />
          ) : (
            <div className="placeholder-cover">
              <span>{book.title.charAt(0)}</span>
            </div>
          )}
        </div>
        
        <div className="book-info">
          <h3 className="book-title">{book.title}</h3>
          <p className="book-author">by {book.author}</p>
          
          {book.type === 'read' && (
            <>
              <div className="book-rating">
                Rating: <span>{book.rating}/10</span>
              </div>
              
              {book.description && (
                <div className="book-description">
                  <p>{book.description}</p>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="card-actions">
          <button className="edit-btn" onClick={toggleEdit}>
            Edit
          </button>
          <button className="delete-btn" onClick={handleDelete}>
            &times;
          </button>
          <button className="expand-btn" onClick={toggleExpand}>
            <span>👁️</span>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div 
          className="expanded-view-overlay" 
          onClick={toggleExpand}
          onTouchStart={isIOS.current ? handleTouchStart : null}
          onTouchMove={isIOS.current ? handleTouchMove : null}
          onTouchEnd={isIOS.current ? handleTouchEnd : null}
        >
          <div 
            className="expanded-view" 
            ref={expandedViewRef}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close-expanded-btn" onClick={toggleExpand}>
              &times;
            </button>
            <div className="expanded-content">
              <div className="expanded-cover">
                {book.image ? (
                  <img src={book.image} alt={`Cover of ${book.title}`} />
                ) : (
                  <div className="placeholder-cover large">
                    <span>{book.title.charAt(0)}</span>
                  </div>
                )}
              </div>
              <div className="expanded-info">
                <h2>{book.title}</h2>
                <h3>by {book.author}</h3>
                
                {book.type === 'read' && (
                  <>
                    <div className="expanded-rating">
                      Rating: <span>{book.rating}/10</span>
                    </div>
                    
                    {book.description && (
                      <div className="expanded-description">
                        <h4>Your Thoughts:</h4>
                        <p>{book.description}</p>
                      </div>
                    )}
                  </>
                )}
                
                <div className="expanded-actions">
                  <button onClick={toggleEdit}>Edit</button>
                  <button onClick={handleDelete}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditing && (
        <div 
          className="edit-form-overlay"
          onTouchStart={isIOS.current ? handleTouchStart : null}
          onTouchMove={isIOS.current ? handleTouchMove : null}
          onTouchEnd={isIOS.current ? handleTouchEnd : null}
        >
          <div 
            className="edit-form" 
            ref={editFormRef}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Edit Book</h2>
            
            <div className="form-group">
              <label htmlFor="title">Book Title</label>
              <input
                type="text"
                id="title"
                name="title"
                value={editedBook.title}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="author">Author</label>
              <input
                type="text"
                id="author"
                name="author"
                value={editedBook.author}
                onChange={handleInputChange}
                required
              />
            </div>
            
            {book.type === 'read' && (
              <>
                <div className="form-group">
                  <label htmlFor="rating">Rating (1-10)</label>
                  <input
                    type="number"
                    id="rating"
                    name="rating"
                    min="1"
                    max="10"
                    value={editedBook.rating}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="description">Your Thoughts</label>
                  <textarea
                    id="description"
                    name="description"
                    value={editedBook.description}
                    onChange={handleInputChange}
                    rows="4"
                  ></textarea>
                </div>
              </>
            )}
            
            <div className="form-actions">
              <button className="cancel-btn" onClick={toggleEdit}>
                Cancel
              </button>
              <button className="save-btn" onClick={handleSaveEdit}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BookCard;