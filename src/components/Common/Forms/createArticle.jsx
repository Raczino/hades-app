import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addArticle } from '../Request/Requests';
import './createArticle.css'

const CreateArticleForm = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [showModal, setShowModal] = useState(false);

    const handleTitleChange = (event) => {
        setTitle(event.target.value);
    };

    const handleContentChange = (event) => {
        setContent(event.target.value);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            await addArticle(title, content);
            setTitle('');
            setContent('');
            setShowModal(true);
        } catch (error) {
            console.error('Error creating article:', error);
        }
    };

    const handleCancel = () => {
        setTitle('');
        setContent('');
        navigate('/home');
    };

    const handleCloseModal = () => {
        setShowModal(false);
        //navigate('/articles');
    };

    const handleKeyDown = (event) => {
        if (event.ctrlKey && event.key === 'Enter' && title.trim() && content.trim()) {
            handleSubmit(event);
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit}>
                <div className='formContainer'>
                    <div>
                        <label className='label'>Title:</label>
                        <input
                            className='titleInput'
                            type='text'
                            value={title}
                            onChange={handleTitleChange}
                            required
                        />
                    </div>
                    <div>
                        <label className='label'>Content:</label>
                        <textarea
                            className='contentInput'
                            rows="4"
                            cols="50"
                            value={content}
                            onChange={handleContentChange}
                            onKeyDown={handleKeyDown}
                            required
                        />
                    </div>
                    <div className='formButtons'>
                        <button className='closeForm' type='button' onClick={handleCancel}>Cancel</button>
                        <button
                            className='create'
                            type='submit'
                            disabled={!title.trim() || !content.trim()}
                        >
                            CREATE
                        </button>
                    </div>
                </div>
            </form>
            {showModal && (
                <div className="modal">
                    <div className="modal-content">
                        <span className="close" onClick={handleCloseModal}>&times;</span>
                        <p>Artykuł został dodany!</p>
                        <p>ale nie zobaczysz go jeszcze w systemie, twój artykuł oczekuje na przegląd i potwierdzenie przez moderatora.</p>
                        <p>Zostaniesz poinformowany gdy twój artykuł będzie widoczny dla innych!</p>
                        <p>W tym czasie możesz dodać kolejny artykuł lub wybrać się na odkrywanie ludzi i ciekawych publikacji.</p>
                    </div>
                </div>
            )}
        </>
    );
};

export default CreateArticleForm;
