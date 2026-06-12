import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useNavigate } from 'react-router-dom';
import { addArticle, getUser } from '../Request/Requests';
import ProfileHeader from '../../routes/User/ProfileHeader';
import NotificationComponent from '../websockets/NotificationComponent';
import './createArticle.css';

const CreateArticlePage = () => {
	// header / user / notifications (minimalne stany)
	const navigate = useNavigate();
	const [userData, setUserData] = useState(null);
	const [notificationModalOpen, setNotificationModalOpen] = useState(false);
	const [notificationCount, setNotificationCount] = useState(0);

	// article form state
	const [title, setTitle] = useState('');
	const [editorContent, setEditorContent] = useState(''); // HTML from editor
	const [scheduled, setScheduled] = useState(''); // datetime-local value
	const [tagsInput, setTagsInput] = useState(''); // comma separated input
	const [tags, setTags] = useState([]);
	const [submitting, setSubmitting] = useState(false);
	const [showModal, setShowModal] = useState(false);
	const quillRef = useRef(null);

	useEffect(() => {
		if (userData) return;
		const fetchUserData = async () => {
			const uid = localStorage.getItem('userId');
			if (!uid) return;
			try {
				const data = await getUser(uid);
				setUserData(data);
			} catch {
				// ignore
			}
		};
		fetchUserData();
	}, [userData]);

	const goToArticles = () => navigate('/articles');
	const goToHome = () => navigate('/home');
	const goToProfile = () => navigate('/profile', { state: { authorData: userData } });
	const logOut = () => {
		localStorage.removeItem('token');
		localStorage.removeItem('userId');
		navigate('/login');
	};

	const handleTagsChange = (value) => {
		setTagsInput(value);
		const arr = value.split(',')
			.map(s => s.trim())
			.filter(Boolean);
		// unique
		setTags(Array.from(new Set(arr)));
	};

	const handleCancel = () => {
		setTitle('');
		setEditorContent('');
		setScheduled('');
		setTagsInput('');
		setTags([]);
		navigate('/home');
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!title.trim()) return;
		const content = (editorContent && editorContent !== '<p><br></p>') ? editorContent : '';
		if (!content.trim()) return;

		const payload = {
			title: title.trim(),
			content,
			scheduledFor: scheduled ? new Date(scheduled).toISOString() : null,
			tags
		};

		try {
			setSubmitting(true);
			await addArticle(payload.title, payload.content);
			setTitle('');
			setEditorContent('');
			setScheduled('');
			setTagsInput('');
			setTags([]);
			setShowModal(true);
		} catch (err) {
			console.error('Error creating article:', err);
		} finally {
			setSubmitting(false);
		}
	};

	// Quill config (simple)
	const MODULES = {
		toolbar: [
			[{ header: [1, 2, false] }],
			['bold', 'italic', 'underline', 'strike'],
			[{ list: 'ordered' }, { list: 'bullet' }],
			['blockquote', 'code-block'],
			['link', 'image'],
			['clean']
		]
	};
	const FORMATS = [
		'header', 'bold', 'italic', 'underline', 'strike',
		'list', 'bullet', 'blockquote', 'code-block',
		'link', 'image'
	];

	return (
		<div className="explore">
			<ProfileHeader
				user={userData}
				onHome={goToHome}
				onExplore={goToArticles}
				onCreateArticle={() => { }}
				onProfile={goToProfile}
				onLogout={logOut}
				notificationCount={notificationCount}
				onNotificationClick={() => setNotificationModalOpen(true)}
			/>
			<NotificationComponent
				userId={userData?.id}
				open={notificationModalOpen}
				onClose={() => setNotificationModalOpen(false)}
				setNotificationCount={setNotificationCount}
			/>

			<div className="explore-content">
				<div className="create-article-wrapper">
					<form onSubmit={handleSubmit}>
						<div className="form-row">
							<label className="label">Title</label>
							<input
								type="text"
								className="titleInput"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="Enter article title"
								required
							/>
						</div>

						<div className="form-row">
							<label className="label">Content</label>
							<ReactQuill
								ref={quillRef}
								value={editorContent}
								onChange={setEditorContent}
								modules={MODULES}
								formats={FORMATS}
								theme="snow"
								placeholder="Write your article..."
							/>
						</div>

						<div className="form-row two-col">
							<div className="col">
								<label className="label">Scheduled for</label>
								<input
									type="datetime-local"
									className="datetimeInput"
									value={scheduled}
									onChange={(e) => setScheduled(e.target.value)}
								/>
							</div>

							<div className="col">
								<label className="label">Tags (comma separated)</label>
								<input
									type="text"
									className="tagsInput"
									value={tagsInput}
									onChange={(e) => handleTagsChange(e.target.value)}
									placeholder="tag1, tag2, tag3"
								/>
								{/* optional: show parsed tag chips */}
								{tags.length > 0 && (
									<div className="tag-chips" aria-hidden="true">
										{tags.map((t) => <span key={t} className="tag-chip">{t}</span>)}
									</div>
								)}
							</div>
						</div>

						<div className="formButtons" style={{ marginTop: 18 }}>
							<button type="button" className="closeForm" onClick={handleCancel} disabled={submitting}>Cancel</button>
							<button type="submit" className="create" disabled={submitting || !title.trim() || !editorContent.trim()}>
								{submitting ? 'Publishing...' : 'Publish'}
							</button>
						</div>
					</form>

					{showModal && (
						<div className="modal">
							<div className="modal-content">
								<span className="close" onClick={() => setShowModal(false)}>&times;</span>
								<p>Artykuł został dodany!</p>
								<p>Twój artykuł oczekuje na przegląd i potwierdzenie przez moderatora.</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default CreateArticlePage;