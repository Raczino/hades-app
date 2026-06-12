import React, { useState } from 'react';
import './CreateComment.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const CommentForm = ({ articleId, updateComments }) => {
    const [commentContent, setCommentContent] = useState('');
    const [isTextareaActive, setIsTextareaActive] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCommentChange = (event) => {
        setCommentContent(event.target.value);
    };

    const handleTextareaFocus = () => {
        setIsTextareaActive(true);
    };

    const handleTextareaBlur = () => {
        if (commentContent.trim() === '') {
            setIsTextareaActive(false);
        }
    };

    const handleSaveComment = async () => {
        if (isSubmitting || !commentContent.trim()) return;
        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_URL}/api/v1/comments/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
                },
                body: JSON.stringify({
                    id: articleId,
                    content: commentContent,
                }),
            });

            if (response.ok) {
                const newCommentData = await response.json();
                updateComments(newCommentData, articleId);
                setCommentContent('');
                setIsTextareaActive(false);
            } else {
                console.error('Error while saving comment');
            }
        } catch (error) {
            console.error('Error saving comment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelComment = () => {
        setCommentContent('');
        setIsTextareaActive(false);
    };

    const handleKeyDown = (event) => {
        if (event.ctrlKey && event.key === 'Enter' && commentContent.trim()) {
            handleSaveComment();
        }
    };

    return (
        <div className="comment-form">
            <textarea
                className={`Comment-content ${isTextareaActive ? 'active' : ''}`}
                value={commentContent}
                onChange={handleCommentChange}
                onFocus={handleTextareaFocus}
                onBlur={handleTextareaBlur}
                onKeyDown={handleKeyDown}
                placeholder='Write comment'
            />
            {commentContent && (
                <div className="button-group">
                    <button className="Comment-cancel" onClick={handleCancelComment} disabled={isSubmitting}>Cancel</button>
                    <button
                        className="Comment-save"
                        onClick={handleSaveComment}
                        disabled={!commentContent.trim() || isSubmitting}
                    >
                        {isSubmitting ? 'Saving...' : 'Save'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default CommentForm;
