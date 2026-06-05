import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Icon } from '../components/Icon';

export function Auth() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmail(email.trim());
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    }
    setLoading(false);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">
          <Icon name="film" size={28} />
        </div>
        <h1 className="auth-title">Scene Builder</h1>
        <p className="auth-sub">Bearded Lady Productions</p>

        {sent ? (
          <div className="auth-sent">
            <p>Check your email.</p>
            <p className="auth-sent-detail">
              We sent a sign-in link to <strong>{email}</strong>.<br />
              Click it to open the app.
            </p>
            <button className="auth-resend" onClick={() => setSent(false)}>
              Try a different email
            </button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-label" htmlFor="auth-email">Email address</label>
            <input
              id="auth-email"
              className="auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
            {error && <p className="auth-error">{error}</p>}
            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send sign-in link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
