import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, AlertTriangle, FileText, Check, X, AlertCircle } from 'lucide-react';
import api from '../services/api';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

const MockTest = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [gameState, setGameState] = useState('intro'); // intro, test, result, review
    
    // Intros
    const [agreed, setAgreed] = useState(false);
    
    // Test states
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
    const [answers, setAnswers] = useState({}); // { question_id: selected_option_index }
    const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 mins
    const timerRef = useRef(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
    
    // Results
    const [results, setResults] = useState(null);

    // Fetch questions
    const startTest = async () => {
        if (!agreed) return;
        try {
            const res = await api.get('/mock-test/questions?limit=15');
            // Randomize options for each question
            const randomizedQuestions = res.data.map(q => {
                const optionsWithOldIndex = q.options.map((opt, i) => ({ text: opt, originalIndex: i }));
                // Shuffle array (Fisher-Yates)
                for (let i = optionsWithOldIndex.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [optionsWithOldIndex[i], optionsWithOldIndex[j]] = [optionsWithOldIndex[j], optionsWithOldIndex[i]];
                }
                return { ...q, shuffledOptions: optionsWithOldIndex };
            });
            setQuestions(randomizedQuestions);
            setGameState('test');
            setTimeLeft(15 * 60);
            setAnswers({});
            setCurrentQuestionIdx(0);
        } catch (err) {
            alert('Failed to load questions. Please check connection.');
        }
    };

    // Timer
    useEffect(() => {
        if (gameState === 'test') {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        submitTest(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gameState]);

    // Handle beforeunload warning
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (gameState === 'test') {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [gameState]);

    const handleOptionSelect = (qId, originalIndex) => {
        setAnswers(prev => ({ ...prev, [qId]: originalIndex }));
    };

    const submitTest = async (autoSubmit = false) => {
        if (!autoSubmit && !showConfirmSubmit) {
            setShowConfirmSubmit(true);
            return;
        }
        setIsSubmitting(true);
        if (timerRef.current) clearInterval(timerRef.current);
        
        try {
            const payload = {
                time_taken_seconds: (15 * 60) - timeLeft,
                answers: questions.map(q => ({
                    question_id: q.id,
                    selected_option: answers[q.id] !== undefined ? answers[q.id] : null
                }))
            };
            
            // Wait, does api call need to be logged in? 
            // The endpoint works with or without token.
            const res = await api.post('/mock-test/submit', payload);
            setResults(res.data);
            setGameState('result');
        } catch (err) {
            alert('Failed to submit test. Please try again.');
        } finally {
            setIsSubmitting(false);
            setShowConfirmSubmit(false);
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // View Components

    const IntroView = () => (
        <div className="card animate-fade-in" style={{ padding: '40px', maxWidth: '800px', margin: '40px auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(251, 146, 60, 0.1)', marginBottom: '18px' }}>
                    <FileText size={36} color="var(--accent-color)" />
                </div>
                <h1 style={{ fontSize: '2rem', color: 'var(--primary-color)', fontWeight: 800 }}>Learning Licence Mock Test</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Practice exam to test your knowledge of traffic rules</p>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '30px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-primary)' }}>Instructions</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <li style={{ display: 'flex', gap: '10px' }}><CheckCircle size={18} color="var(--success-color)" /> Total questions: 15</li>
                    <li style={{ display: 'flex', gap: '10px' }}><CheckCircle size={18} color="var(--success-color)" /> Time limit: 15 minutes</li>
                    <li style={{ display: 'flex', gap: '10px' }}><CheckCircle size={18} color="var(--success-color)" /> Each question carries 1 mark</li>
                    <li style={{ display: 'flex', gap: '10px' }}><CheckCircle size={18} color="var(--success-color)" /> No negative marking</li>
                    <li style={{ display: 'flex', gap: '10px' }}><CheckCircle size={18} color="var(--success-color)" /> Test auto-submits when time arrives at 0.</li>
                </ul>
            </div>

            <div style={{ padding: '16px', background: 'rgba(251, 146, 60, 0.1)', color: '#9a3412', borderRadius: '8px', marginBottom: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                <p style={{ fontSize: '0.95rem', margin: 0 }}>This is a practice mock test, not an official government examination. The results here are strictly for educational purposes.</p>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '30px', userSelect: 'none' }}>
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                <span style={{ fontWeight: 500 }}>I have read and understood the instructions.</span>
            </label>

            <button className="btn-accent" style={{ width: '100%', fontSize: '1.1rem', padding: '14px' }} disabled={!agreed} onClick={startTest}>
                Begin Mock Test
            </button>
        </div>
    );

    const TestView = () => {
        const q = questions[currentQuestionIdx];
        const isLast = currentQuestionIdx === questions.length - 1;

        return (
            <div className="container animate-fade-in" style={{ padding: '40px 24px', maxWidth: '1000px' }}>
                
                {/* Header info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                    <h2 style={{ fontSize: '1.4rem', color: 'var(--primary-color)', margin: 0 }}>Question {currentQuestionIdx + 1} of {questions.length}</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: timeLeft < 60 ? 'var(--danger-color)' : 'var(--primary-color)', color: 'white', padding: '8px 16px', borderRadius: '24px', fontWeight: 700, transition: 'background 0.3s' }}>
                        <Clock size={18} /> {formatTime(timeLeft)}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    
                    {/* Main Question Area */}
                    <div className="card" style={{ flex: '1 1 500px', padding: '30px' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--accent-color)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px' }}>
                            {q.category}
                        </div>
                        <h3 style={{ fontSize: '1.3rem', fontWeight: 600, marginBottom: '24px', lineHeight: 1.5 }}>
                            {q.question_text}
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {q.shuffledOptions.map((opt, i) => {
                                const isSelected = answers[q.id] === opt.originalIndex;
                                return (
                                    <div 
                                        key={i}
                                        onClick={() => handleOptionSelect(q.id, opt.originalIndex)}
                                        style={{ 
                                            padding: '16px 20px', 
                                            border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--border-color)'}`,
                                            background: isSelected ? 'rgba(12, 59, 122, 0.05)' : 'white',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${isSelected ? 'var(--primary-color)' : '#94a3b8'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {isSelected && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary-color)' }} />}
                                        </div>
                                        <span style={{ fontSize: '1.05rem', fontWeight: isSelected ? 600 : 400 }}>{opt.text}</span>
                                    </div>
                                )
                            })}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                            <button className="btn-outline" onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))} disabled={currentQuestionIdx === 0}>
                                Previous
                            </button>
                            
                            {!isLast ? (
                                <button className="btn-primary" onClick={() => setCurrentQuestionIdx(prev => Math.min(questions.length - 1, prev + 1))}>
                                    Next Question
                                </button>
                            ) : (
                                <button className="btn-accent" onClick={() => submitTest(false)}>
                                    Submit Test
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Navigation Panel */}
                    <div className="card" style={{ flex: '0 1 300px', padding: '24px' }}>
                        <h4 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Test Navigator</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                            {questions.map((q, idx) => {
                                const isAnswered = answers[q.id] !== undefined;
                                const isCurrent = idx === currentQuestionIdx;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentQuestionIdx(idx)}
                                        style={{
                                            width: '100%',
                                            aspectRatio: '1/1',
                                            borderRadius: '6px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            border: `2px solid ${isCurrent ? 'var(--primary-color)' : (isAnswered ? 'var(--success-color)' : 'var(--border-color)')}`,
                                            background: isCurrent ? 'var(--primary-color)' : (isAnswered ? 'var(--success-color)' : 'white'),
                                            color: (isCurrent || isAnswered) ? 'white' : 'var(--text-primary)',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {idx + 1}
                                    </button>
                                )
                            })}
                        </div>
                        
                        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'var(--success-color)' }}/> Answered ({Object.keys(answers).length})</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1px solid var(--border-color)', background: 'white' }}/> Unanswered ({questions.length - Object.keys(answers).length})</div>
                        </div>

                        <button className="btn-outline" style={{ marginTop: '24px', width: '100%', borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }} onClick={() => submitTest(false)}>
                            Finish & Submit
                        </button>
                    </div>
                </div>

                {/* Confirm Modal */}
                {showConfirmSubmit && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div className="card" style={{ padding: '30px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                            <AlertCircle size={48} color="var(--warning-color)" style={{ margin: '0 auto 16px auto' }} />
                            <h3 style={{ marginBottom: '12px' }}>Submit Test?</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                                You have answered {Object.keys(answers).length} out of {questions.length} questions.
                                Are you sure you want to completely finish?
                            </p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button className="btn-outline" style={{ flex: 1 }} onClick={() => setShowConfirmSubmit(false)} disabled={isSubmitting}>Cancel</button>
                                <button className="btn-primary" style={{ flex: 1 }} onClick={() => submitTest(true)} disabled={isSubmitting}>
                                    {isSubmitting ? 'Submitting...' : 'Yes, Submit'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const ResultView = () => {
        if (!results) return null;

        return (
            <div className="container animate-fade-in" style={{ padding: '40px 24px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                
                <div className="card" style={{ padding: '40px', borderTop: `6px solid ${results.passed ? 'var(--success-color)' : 'var(--danger-color)'}` }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: results.passed ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
                        {results.passed ? <Check size={48} color="var(--success-color)" /> : <X size={48} color="var(--danger-color)" />}
                    </div>
                    
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '10px' }}>
                        {results.passed ? 'Test Passed!' : 'Practice Needs Work'}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '30px' }}>
                        You scored <strong style={{ color: 'var(--text-primary)' }}>{results.score}</strong> out of {results.total_questions} ({results.percentage.toFixed(0)}%)
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                        <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--success-color)' }}>{results.correct_count}</div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Correct Answers</div>
                        </div>
                        <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--danger-color)' }}>{results.incorrect_count}</div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Incorrect Answers</div>
                        </div>
                        <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--warning-color)' }}>{results.unanswered_count}</div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Unanswered</div>
                        </div>
                        <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px' }}>
                            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{formatTime(results.time_taken_seconds)}</div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Time Taken</div>
                        </div>
                    </div>

                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '30px', padding: '16px', background: '#f8fafc', borderRadius: '8px' }}>
                        Threshold applied: {results.passing_threshold} correct answers. Keep in mind that official government passing thresholds may differ from this practice exam.
                    </div>

                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button className="btn-outline" onClick={() => setGameState('review')}>Review Answers</button>
                        <button className="btn-primary" onClick={() => { setAgreed(false); setGameState('intro'); }}>Retake Mock Test</button>
                        <button className="btn-outline" onClick={() => navigate('/')}>Back to Home</button>
                    </div>
                </div>
            </div>
        )
    };

    const ReviewView = () => {
        if (!results) return null;
        return (
            <div className="container animate-fade-in" style={{ padding: '40px 24px', maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <h2 style={{ fontSize: '2rem', color: 'var(--primary-color)' }}>Review Answers</h2>
                    <button className="btn-primary" onClick={() => setGameState('result')}>Back to Score</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    {results.details.map((q, idx) => (
                        <div key={q.question_id} className="card" style={{ padding: '24px', borderLeft: `6px solid ${q.is_correct ? 'var(--success-color)' : 'var(--danger-color)'}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{idx + 1}. {q.question_text}</h3>
                                {q.is_correct ? <CheckCircle color="var(--success-color)" /> : (q.user_selected === null ? <AlertTriangle color="var(--warning-color)" /> : <X color="var(--danger-color)" />)}
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                {q.options.map((opt, o_idx) => {
                                    const isUserChoice = q.user_selected === o_idx;
                                    const isCorrectChoice = q.correct_option === o_idx;
                                    let bg = 'var(--bg-secondary)';
                                    let border = 'var(--border-color)';
                                    
                                    if (isCorrectChoice) {
                                        bg = 'rgba(22, 163, 74, 0.1)';
                                        border = 'var(--success-color)';
                                    } else if (isUserChoice && !isCorrectChoice) {
                                        bg = 'rgba(220, 38, 38, 0.1)';
                                        border = 'var(--danger-color)';
                                    }

                                    return (
                                        <div key={o_idx} style={{ padding: '12px 16px', background: bg, border: `1px solid ${border}`, borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{opt}</span>
                                            {isUserChoice && <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: isCorrectChoice ? 'var(--success-color)' : 'var(--danger-color)' }}>Your Answer</span>}
                                        </div>
                                    )
                                })}
                            </div>

                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <div style={{ fontWeight: 700, marginBottom: '6px', fontSize: '0.9rem', color: 'var(--primary-color)' }}>Explanation:</div>
                                <div style={{ fontSize: '0.95rem' }}>{q.explanation}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)' }}>
            
            <div style={{ background: 'var(--primary-color)', color: 'white', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <button
                    onClick={() => {
                        if (gameState === 'test' && !window.confirm("Are you sure you want to leave? Your progress will be lost.")) {
                            return;
                        }
                        navigate('/');
                    }}
                    style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.95rem', fontWeight: 500, padding: '6px 0' }}
                >
                    <ArrowLeft size={22} />
                    Back to Home
                </button>
            </div>

            <div style={{ flex: 1, paddingBottom: '60px' }}>
                {gameState === 'intro' && <IntroView />}
                {gameState === 'test' && <TestView />}
                {gameState === 'result' && <ResultView />}
                {gameState === 'review' && <ReviewView />}
            </div>

            <Footer />
        </div>
    );
};

export default MockTest;
