import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('activeUserId', res.data.user.id);
      
      // Setup default axios header
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      
      // Redirect to groups dashboard or reload to let App.jsx handle state
      window.location.href = '/'; 
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="animate-fade-in max-w-lg mx-auto mt-16">
      <div className="card text-center mb-8">
        <h1 className="text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">FairSplit</h1>
        <p className="text-muted">Sign in to manage your shared expenses.</p>
      </div>

      <form onSubmit={handleLogin} className="card grid gap-4">
        {error && <div className="badge danger w-full text-center py-2">{error}</div>}
        
        <div>
          <label className="text-muted text-sm block mb-1">Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="aisha@example.com" />
        </div>

        <div>
          <label className="text-muted text-sm block mb-1">Password</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          <div className="text-xs text-muted mt-2">Hint: Use 'password123' for seeded users.</div>
        </div>

        <button type="submit" className="mt-4 w-full">Sign In</button>
        
        <p className="text-center text-sm text-muted mt-4">
          Don't have an account? <Link to="/register" className="text-primary hover:underline">Register here</Link>
        </p>
      </form>
    </div>
  );
}
