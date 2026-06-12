import React, { useEffect, useState } from 'react';
import './SurveyList.css';
import SurveyModal from './SurveyModal';

const SurveyList = ({
    surveys: initialSurveys = null,
    title = 'Surveys',
    onOpen = () => { },
    userId: propUserId = null,
    page = 1,               // kept for backward compatibility (initial page)
    pageSize = 6,           // default size changed to 6
}) => {
    // surveys state
    const [surveys, setSurveys] = useState(Array.isArray(initialSurveys) ? initialSurveys : []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedSurvey, setSelectedSurvey] = useState(null);

    // pagination state (1-based page)
    const [currentPage, setCurrentPage] = useState(Number(page) || 1);
    const [size] = useState(Number(pageSize) || 6); // fixed default size
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    useEffect(() => {
        // jeśli przekazano surveys i nie jest pusta, użyj ich (nie robimy fetch)
        if (Array.isArray(initialSurveys) && initialSurveys.length > 0) {
            setSurveys(initialSurveys);
            setTotalPages(1);
            setTotalItems(initialSurveys.length);
            return;
        }

        // determine userId: prop first, then localStorage
        const uid = propUserId ?? localStorage.getItem('userId');
        if (!uid) {
            setError('No userId available for fetching surveys');
            return;
        }

        // fetch from backend using follows endpoint for given user with pagination + fixed sort
        const fetchSurveys = async () => {
            setLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem('token') || '';
                const url = `http://localhost:8080/api/v1/surveys/get/from/follows?userId=${encodeURIComponent(uid)}&page=${encodeURIComponent(currentPage)}&size=${encodeURIComponent(size)}&sortBy=createdAt&sortDirection=DESC`;
                const res = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': token ? `Bearer ${token}` : '',
                    },
                });
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }
                const data = await res.json();
                // backend zwraca { items: [...], meta: { totalPages, totalItems, pageSize, currentPage } }
                const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
                setSurveys(items);
                // read meta if exists
                if (data?.meta) {
                    setTotalPages(Number(data.meta.totalPages) || 1);
                    setTotalItems(Number(data.meta.totalItems) || items.length || 0);
                } else {
                    // fallback: if we received less than size, compute pages as 1
                    setTotalPages(items.length < size ? 1 : Math.ceil(items.length / size));
                    setTotalItems(items.length);
                }
            } catch (err) {
                setError(err.message || 'Fetch error');
            } finally {
                setLoading(false);
            }
        };
        fetchSurveys();
    }, [initialSurveys, propUserId, /*page,*/ /*pageSize,*/ currentPage, size]);
    // reset page when userId changes
    useEffect(() => {
        setCurrentPage(Number(page) || 1);
    }, [propUserId, page]);

    const openSurveyModal = (s) => {
        setSelectedSurvey(s);
        setModalOpen(true);
        // keep backward compatibility: still notify parent if it passed onOpen
        try { onOpen(s); } catch (e) { /* ignore */ }
    };

    const closeSurveyModal = () => {
        setModalOpen(false);
        setSelectedSurvey(null);
    };

    const formatDate = (iso) => {
        if (!iso) return '-';
        try {
            return new Date(iso).toLocaleString();
        } catch {
            return iso;
        }
    };
    // slider controls -> zmieniają stronę (wyzwolą fetch w useEffect)
    const handlePrev = () => {
        setCurrentPage((p) => Math.max(1, p - 1));
    };
    const handleNext = () => {
        setCurrentPage((p) => Math.min(totalPages, p + 1));
    };

    return (
        <div className="survey-list">
            <h3 className="survey-list-title">{title}</h3>
            {error && <div className="survey-error">Błąd: {error}</div>}

            {!loading && !error && surveys.length === 0 && (
                <div className="survey-empty">Brak ankiet do wyświetlenia.</div>
            )}

            {!loading && !error && surveys.length > 0 && (
                <div
                    className="survey-tiles-slider"
                    style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                >
                    {/* left arrow */}
                    <button
                        type="button"
                        className="slider-arrow left"
                        onClick={handlePrev}
                        disabled={currentPage <= 1}
                        style={{
                            position: 'absolute',
                            left: -10,
                            zIndex: 2,
                            height: 40,
                            width: 40,
                            borderRadius: 20,
                            border: 'none',
                            background: currentPage <= 1 ? '#eee' : '#1976d2',
                            color: currentPage <= 1 ? '#888' : '#fff',
                            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                        }}
                        aria-label="Previous surveys"
                    >
                        ◀
                    </button>

                    <div className="survey-tiles" style={{ width: '96%', display: 'flex', gap: 12, paddingLeft: '50px' }}>
                        {surveys.map((s) => (
                            <div
                                className="survey-tile"
                                key={s.id ?? s._id ?? JSON.stringify(s).slice(0, 20)}
                            >
                                <div className="survey-tile-header">
                                    <h4 className="survey-title">{s.title || 'Untitled'}</h4>
                                    <span className={`survey-status ${s.active ? 'active' : 'inactive'}`}>
                                        {s.active ? 'Active' : 'Closed'}
                                    </span>
                                </div>

                                {s.description && <p className="survey-desc">{s.description}</p>}

                                <div className="survey-meta">
                                    <span>
                                        Author:{' '}
                                        {s.author?.firstName
                                            ? `${s.author.firstName} ${s.author.lastName || ''}`
                                            : '—'}
                                    </span>
                                    <span>Ends: {formatDate(s.endTime)}</span>
                                </div>

                                <div className="survey-actions">
                                    <button
                                        type="button"
                                        className="survey-open-btn"
                                        onClick={() => s.active && openSurveyModal(s)}
                                        disabled={!s.active}
                                        aria-disabled={!s.active}
                                        title={s.active ? 'Otwórz ankietę' : 'Ankieta nieaktywna'}
                                    >
                                        {s.active ? 'Otwórz' : 'Nieaktywna'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* right arrow */}
                    <button
                        type="button"
                        className="slider-arrow right"
                        onClick={handleNext}
                        disabled={currentPage >= totalPages}
                        style={{
                            position: 'absolute',
                            right: -10,
                            zIndex: 2,
                            height: 40,
                            width: 40,
                            borderRadius: 20,
                            border: 'none',
                            background: currentPage >= totalPages ? '#eee' : '#1976d2',
                            color: currentPage >= totalPages ? '#888' : '#fff',
                            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer'
                        }}
                        aria-label="Next surveys"
                    >
                        ▶
                    </button>
                </div>
            )}

            {!loading && !error && totalPages > 1 && (
                <div className="survey-slider-indicator" style={{ textAlign: 'center', marginTop: 10 }}>
                    {currentPage} / {totalPages}
                </div>
            )}

            {modalOpen && selectedSurvey && (
                <SurveyModal survey={selectedSurvey} onClose={closeSurveyModal} />
            )}
        </div>
    );
}

export default SurveyList;