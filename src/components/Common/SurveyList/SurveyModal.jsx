import React, { useState, useEffect, useRef } from 'react';
import './SurveyModal.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const SurveyModal = ({ survey, onClose = () => { } }) => {
    const [page, setPage] = useState(-1);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const isMountedRef = useRef(true);
    const closeTimerRef = useRef(null);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, []);

    if (!survey) return null;

    const questions = Array.isArray(survey.questions) ? survey.questions : [];

    const close = () => {
        setPage(-1);
        setAnswers({});
        setError(null);
        setLoading(false);
        setSuccess(false);
        onClose();
    };

    const ensureArray = (v) => {
        const arr = Array.isArray(v) ? v : v ? [v] : [];
        return arr.map((x) => (x === null || x === undefined) ? String(x) : String(x));
    };

    const toggleMultiple = (qId, answerId) => {
        const aid = String(answerId);
        setAnswers((prev) => {
            const cur = new Set(ensureArray(prev[qId]));
            if (cur.has(aid)) cur.delete(aid);
            else cur.add(aid);
            return { ...prev, [qId]: Array.from(cur) };
        });
    };

    const setSingle = (qId, answerId) => {
        setAnswers((prev) => ({ ...prev, [qId]: [String(answerId)] }));
    };

    const isQuestionValid = (q) => {
        if (!q) return true;
        const selected = ensureArray(answers[q.id]);
        const len = selected.length;
        if (q.required && len === 0) return false;
        if (typeof q.minSelected === 'number' && q.minSelected > 0 && len < q.minSelected) return false;
        if (typeof q.maxSelected === 'number' && q.maxSelected > 0 && len > q.maxSelected) return false;
        return true;
    };

    const isCurrentValid = () => {
        if (page < 0) return true;
        const q = questions[page];
        if (!q) return true;
        return isQuestionValid(q);
    };

    const allRequiredValid = () => {
        for (const q of questions) {
            const requiredTreat = q.required || (typeof q.minSelected === 'number' && q.minSelected > 0);
            if (requiredTreat && !isQuestionValid(q)) return false;
        }
        return true;
    };

    const validateCurrent = () => {
        if (page === -1) return true;
        const q = questions[page];
        if (!q) return true;
        const selected = ensureArray(answers[q.id]);
        if (q.required && selected.length === 0) return { ok: false, msg: 'To pytanie jest wymagane.' };
        if (q.type === 'MULTIPLE_CHOICE') {
            if (q.minSelected && selected.length < q.minSelected) return { ok: false, msg: `Wybierz co najmniej ${q.minSelected} odpowiedzi.` };
            if (q.maxSelected && selected.length > q.maxSelected) return { ok: false, msg: `Możesz wybrać maksymalnie ${q.maxSelected} odpowiedzi.` };
        }
        return { ok: true };
    };

    const onNext = () => {
        setError(null);
        const v = validateCurrent();
        if (v.ok === false) {
            setError(v.msg || 'Validation error');
            return;
        }
        setPage((p) => {
            if (p < questions.length - 1) return p + 1;
            return questions.length;
        });
    };

    const onBack = () => {
        setError(null);
        if (page === -1) { close(); return; }
        if (page === 0) { setPage(-1); return; }
        setPage((p) => p - 1);
    };

    const buildPayload = () => {
        const rawUserId = localStorage.getItem('userId');
        const userIdNum = rawUserId ? Number(rawUserId) : null;
        const userId = userIdNum && !Number.isNaN(userIdNum) ? userIdNum : rawUserId;

        const answerResponses = questions.map((q) => {
            const selected = ensureArray(answers[q.id]);
            let answerValues = [];
            if (Array.isArray(q.answers) && q.answers.length > 0) {
                answerValues = selected.map((sel) => {
                    const opt = q.answers.find((a) => String(a.id) === String(sel));
                    return opt ? (opt.value ?? String(sel)) : String(sel);
                });
            } else {
                answerValues = selected.map((v) => String(v));
            }
            return { questionId: q.id, answerValues };
        });

        return { surveyId: survey.id, userId, answerResponses };
    };

    const onSend = async () => {
        if (!isMountedRef.current) return;
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token') || '';
            const payload = buildPayload();
            const res = await fetch(`${API_URL}/api/v1/survey-response/post`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify(payload),
            });
            if (!isMountedRef.current) return;
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`HTTP ${res.status} ${text}`);
            }
            setSuccess(true);
            closeTimerRef.current = setTimeout(() => {
                if (isMountedRef.current) close();
            }, 900);
        } catch (err) {
            if (isMountedRef.current) setError(err.message || 'Send error');
        } finally {
            if (isMountedRef.current) setLoading(false);
        }
    };

    const renderStart = () => (
        <div className="survey-start">
            <h3 className='survey-title'>{survey.title || ''}</h3>
            <p className='survey-title'>Autor: {survey.author?.firstName ? `${survey.author.firstName} ${survey.author.lastName || ''}` : '—'}</p>
            <p className='survey-title'>{survey.description || ''}</p>
            <div className="survey-start-actions">
                <button type="button" className="btn btn-primary" onClick={() => setPage(0)}>Next</button>
            </div>
        </div>
    );

    const renderQuestion = (q) => {
        const selectedCount = ensureArray(answers[q.id]).length;
        const min = typeof q.minSelected === 'number' ? q.minSelected : (q.required ? 1 : 0);
        const max = typeof q.maxSelected === 'number' ? q.maxSelected : null;
        const requirementText = (min > 0 || max) ? (
            <div className="q-requirements" style={{ marginTop: "10px" }}>
                {min > 0 && <span>Min: {min}</span>}
                {max != null && <span style={{ marginLeft: 8 }}>Max: {max}</span>}
                <span style={{ marginLeft: 12, color: '#555' }}>Wybrano: {selectedCount}</span>
            </div>
        ) : null;

        return (
            <div className="survey-question">
                <h4 className="q-title">{q.value}</h4>
                <div className="q-answers">
                    {q.type === 'SINGLE_CHOICE' && q.answers && q.answers.map((a) => {
                        const checked = ensureArray(answers[q.id]).includes(String(a.id));
                        return (
                            <label key={a.id} className="q-answer">
                                <input
                                    type="radio"
                                    name={`q-${q.id}`}
                                    value={String(a.id)}
                                    checked={checked}
                                    onChange={() => setSingle(q.id, a.id)}
                                />
                                {a.value}
                            </label>
                        );
                    })}
                    {q.type === 'MULTIPLE_CHOICE' && q.answers && q.answers.map((a) => {
                        const checked = ensureArray(answers[q.id]).includes(String(a.id));
                        return (
                            <label key={a.id} className="q-answer">
                                <input
                                    type="checkbox"
                                    value={String(a.id)}
                                    checked={checked}
                                    onChange={() => toggleMultiple(q.id, a.id)}
                                />
                                {a.value}
                            </label>
                        );
                    })}
                </div>
                {requirementText}
                <div className="survey-question-actions">
                    <button type="button" className="btn btn-secondary" onClick={onBack}>Back</button>
                    <button type="button" className="btn btn-primary" onClick={onNext} disabled={!isCurrentValid()}>Next</button>
                </div>
            </div>
        );
    };

    const renderFinal = () => (
        <div className="survey-final">
            <h3>Podsumowanie</h3>
            <div className="summary-list">
                {questions.map((q) => (
                    <div key={q.id} className="summary-item">
                        <div className="summary-q">{q.value}</div>
                        <div className="summary-a">
                            {(ensureArray(answers[q.id]).length === 0) ? <em>Brak odpowiedzi</em> : (
                                ensureArray(answers[q.id]).map((aid) => {
                                    const opt = q.answers?.find((x) => String(x.id) === String(aid));
                                    return <div key={aid}>{opt ? opt.value : String(aid)}</div>;
                                })
                            )}
                        </div>
                    </div>
                ))}
            </div>
            {error && <div className="survey-error">{error}</div>}
            <div className="survey-final-actions">
                <button type="button" className="btn btn-secondary" onClick={onBack}>Back</button>
                <button type="button" className="btn btn-primary" onClick={onSend} disabled={loading || !allRequiredValid()}>{loading ? 'Wysyłanie...' : 'Wyślij'}</button>
            </div>
            {success && <div className="survey-success">Dziękujemy — odpowiedzi wysłane.</div>}
        </div>
    );

    return (
        <div className="survey-modal-overlay">
            <div className="survey-modal">
                <header
                    className="survey-modal-header"
                    style={{ position: 'relative' }}
                >
                    <h2>Survey</h2>
                    <button
                        type="button"
                        className="modal-close"
                        onClick={close}
                        style={{ position: 'absolute', right: 30, top: 12 }}
                    >
                        X
                    </button>
                </header>

                <div className="survey-modal-body">
                    {page === -1 && renderStart()}
                    {page >= 0 && page < questions.length && renderQuestion(questions[page])}
                    {page === questions.length && renderFinal()}
                </div>
            </div>
        </div>
    );
};

export default SurveyModal;
