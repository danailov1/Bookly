//BookForm.js

import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import '../../styles/BookForm.css';

const BookForm = ({ type, onClose, onBookAdded }) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(type === 'read' ? 5 : 0);
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
        setImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const bookData = {
        title,
        author,
        image: image || null,
        userId: auth.currentUser.uid,
        createdAt: new Date(),
        type // 'read' or 'wishlist'
      };

      if (type === 'read') {
        bookData.rating = rating;
        bookData.description = description;
      }

      await addDoc(collection(db, 'books'), bookData);
      setLoading(false);
      onClose();
      if (onBookAdded) onBookAdded();
    } catch (error) {
      setError('Failed to add book. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="book-form-overlay">
      <div className="book-form">
        <h2>{type === 'read' ? 'Add Book You\'ve Read' : 'Add to Wishlist'}</h2>
        {error && <p className="error-message">{error}</p>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Book Title *</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="author">Author *</label>
            <input
              type="text"
              id="author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="book-image">Book Cover Image</label>
            <input
              type="file"
              id="book-image"
              accept="image/*"
              onChange={handleImageChange}
            />
            {imagePreview && (
              <div className="image-preview">
                <img src={imagePreview} alt="Book cover preview" />
              </div>
            )}
          </div>
          
          {type === 'read' && (
            <>
              <div className="form-group">
                <label htmlFor="rating">Rating (1-10) *</label>
                <input
                  type="number"
                  id="rating"
                  min="1"
                  max="10"
                  value={rating}
                  onChange={(e) => setRating(parseInt(e.target.value))}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Your Thoughts (Optional)</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="4"
                ></textarea>
              </div>
            </>
          )}
          
          <div className="form-actions">
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="submit-btn" 
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookForm;