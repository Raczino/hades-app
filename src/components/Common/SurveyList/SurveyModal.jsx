import React, { useState } from 'react';
import './SurveyModal.css';

const SurveyModal = ({ survey, onClose = () => { } }) => {
    const [page, setPage] = useState(-1); // -1 = start screen, 0..n-1 = questions, n = final screen
    const [answers, setAnswers] = useState({}); // { [questionId]: [answerId,...] } for choice questions
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    if (!survey) return null;

    const questions = Array.isArray(survey.questions) ? survey.questions : [];

    const close = () => {
        // reset state when closing
        setPage(-1);
        setAnswers({});
        setError(null);
        setLoading(false);
        setSuccess(false);
        onClose();
    };

    const ensureArray = (v) => {
        const arr = Array.isArray(v) ? v : v ? [v] : [];
        // normalizuj wszystkie elementy do stringów dla spójnych porównań
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

    // NEW: sprawdź, czy pojedyncze pytanie spełnia reguły (min/max/required)
    const isQuestionValid = (q) => {
        if (!q) return true;
        const selected = ensureArray(answers[q.id]);
        const len = selected.length;
        // required flag
        if (q.required) {
            if (len === 0) return false;
        }
        // minSelected
        if (typeof q.minSelected === 'number' && q.minSelected > 0) {
            if (len < q.minSelected) return false;
        }
        // maxSelected
        if (typeof q.maxSelected === 'number' && q.maxSelected > 0) {
            if (len > q.maxSelected) return false;
        }
        // if none of the rules block, it's valid
        return true;
    };

    // NEW: czy bieżące pytanie jest ok (używane do disabled Next)
    const isCurrentValid = () => {
        if (page < 0) return true; // start screen
        const q = questions[page];
        if (!q) return true;
        return isQuestionValid(q);
    };

    // NEW: czy wszystkie wymagane pytania są uzupełnione (używane do disabled Wyślij)
    const allRequiredValid = () => {
        for (const q of questions) {
            // jeśli pytanie jest required lub ma minSelected>0 traktujemy jak wymagane
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
        if (q.required) {
            if (selected.length === 0) return { ok: false, msg: 'To pytanie jest wymagane.' };
        }
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
            // go to final screen
            return questions.length;
        });
    };

    const onBack = () => {
        setError(null);
        if (page === -1) {
            close();
            return;
        }
        if (page === 0) {
            setPage(() => -1);
            return;
        }
        setPage((p) => p - 1);
    };

    // build payload in shape required by backend:
    // { surveyId, userId, answerResponses: [ { questionId, answerValues: [...] } ] }
    const buildPayload = () => {
        // try numeric userId first, fallback to raw string
        const rawUserId = localStorage.getItem('userId');
        const userIdNum = rawUserId ? Number(rawUserId) : null;
        const userId = userIdNum && !Number.isNaN(userIdNum) ? userIdNum : rawUserId;

        const answerResponses = questions.map((q) => {
            const selected = ensureArray(answers[q.id]); // array of string ids or values
            let answerValues = [];

            // if question has predefined answers, map selected ids -> answer.value
            if (Array.isArray(q.answers) && q.answers.length > 0) {
                answerValues = selected.map((sel) => {
                    const opt = q.answers.find((a) => String(a.id) === String(sel));
                    // if found, use its value (text), otherwise send the raw selected value
                    return opt ? (opt.value ?? String(sel)) : String(sel);
                });
            } else {
                // free-text or other types: assume selected already contains the entered value(s)
                answerValues = selected.map((v) => String(v));
            }

            return {
                questionId: q.id,
                answerValues,
            };
        });

        return {
            surveyId: survey.id,
            userId,
            answerResponses,
        };
    };

    const onSend = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token') || '';
            const payload = buildPayload();
            // ADJUST endpoint if necessary (kept existing endpoint)
            const res = await fetch(`http://localhost:8080/api/v1/survey-response/post`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`HTTP ${res.status} ${text}`);
            }
            setSuccess(true);
            // optionally wait a moment and close
            setTimeout(() => {
                close();
            }, 900);
        } catch (err) {
            setError(err.message || 'Send error');
        } finally {
            setLoading(false);
        }
    };

    // UI blocks
    const renderStart = () => (
        <div className="survey-start">
            <h3 className='survey-title'>{survey.title || ''}</h3>
            <p className='survey-title'>Autor: {survey.author?.firstName ? `${survey.author.firstName} ${survey.author.lastName || ''}` : '—'}</p>
            <p className='survey-title'>{survey.description || ''}</p>
            <div className="survey-start-actions">
                {/* only one Next button on the start screen; modal can still be closed via header X */}
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

                {/* pokazuj informacje o min/max i liczbie wybranych */}
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
                    // make header a positioning context for the close button
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