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
  const [imageError, setImageError] = useState('');

  const resizeImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Calculate new dimensions while maintaining aspect ratio
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to base64 with reduced quality
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(dataUrl);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = reject;
        img.src = event.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setImageError('');
    
    try {
      // Check file size before processing (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setImageError('Image too large (max 5MB). Please select a smaller image.');
        return;
      }
      
      // Process and resize the image
      const resizedImage = await resizeImage(file);
      setImagePreview(resizedImage);
      setImage(resizedImage);
    } catch (err) {
      console.error('Error processing image:', err);
      setImageError('Failed to process image. Please try a different image.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Prepare book data
      const bookData = {
        title: title.trim(),
        author: author.trim(),
        userId: auth.currentUser.uid,
        createdAt: new Date(),
        type // 'read' or 'wishlist'
      };

      // Check image size if image exists
      if (image) {
        // Base64 string length gives a good approximation of size
        // 4 chars in base64 is roughly 3 bytes
        const approximateSize = Math.ceil((image.length - image.indexOf(',') - 1) * 0.75);
        
        // If larger than 1MB
        if (approximateSize > 1 * 1024 * 1024) {
          throw new Error('Image is too large. Please use a smaller image or no image.');
        }
        
        bookData.image = image;
      } else {
        bookData.image = null;
      }

      if (type === 'read') {
        bookData.rating = rating;
        bookData.description = description.trim();
      }

      await addDoc(collection(db, 'books'), bookData);
      setLoading(false);
      onClose();
      if (onBookAdded) onBookAdded();
    } catch (error) {
      console.error('Error adding book:', error);
      setError(`Failed to add book: ${error.message || 'Please try again.'}`);
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
            {imageError && <p className="error-message">{imageError}</p>}
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
                  onChange={(e) => setRating(parseInt(e.target.value) || 5)}
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