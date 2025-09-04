import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LogIn.css';

const LogIn = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/v1/auth/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (response.status !== 200) {
        const data = await response.json();
        setError(data.description || 'Błędny email lub hasło');
      } else {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.user.id);
        navigate('/home');
      }
    } catch (err) {
      setError('Błąd sieci');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/v1/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });
      if (response.status !== 200) {
        const data = await response.json();
        setError(data.description || 'Błąd rejestracji');
      } else {
        setSuccess('Rejestracja zakończona sukcesem! Możesz się zalogować.');
        setIsRegister(false);
        setFirstName('');
        setLastName('');
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      setError('Błąd sieci');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <form className="login-card" onSubmit={isRegister ? handleRegister : handleLogin}>
        <h2 className="login-title">{isRegister ? 'Rejestracja' : 'Logowanie'}</h2>
        {isRegister && (
          <>
            <input
              type="text"
              placeholder="Imię"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              required
              className="login-input"
            />
            <input
              type="text"
              placeholder="Nazwisko"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              required
              className="login-input"
            />
          </>
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="login-input"
        />
        <input
          type="password"
          placeholder="Hasło"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="login-input"
        />
        {isRegister && (
          <div className="login-switch-inline">
            <span>Masz już konto? </span>
            <button
              type="button"
              className="login-link-inline"
              onClick={() => { setIsRegister(false); setError(''); setSuccess(''); }}
            >
              Zaloguj się
            </button>
          </div>
        )}
        {!isRegister && (
          <div className="login-switch-inline">
            <span>Nie masz konta? </span>
            <button
              type="button"
              className="login-link-inline"
              onClick={() => { setIsRegister(true); setError(''); setSuccess(''); }}
            >
              Zarejestruj się
            </button>
          </div>
        )}
        {error && <div className="login-error">{error}</div>}
        {success && <div className="login-success">{success}</div>}
        <button
          className="login-btn"
          type="submit"
          disabled={loading || !email || !password || (isRegister && (!firstName || !lastName))}
        >
          {loading ? (isRegister ? 'Rejestracja...' : 'Logowanie...') : (isRegister ? 'Zarejestruj się' : 'Zaloguj się')}
        </button>
      </form>
    </div>
  );
};

export default LogIn;