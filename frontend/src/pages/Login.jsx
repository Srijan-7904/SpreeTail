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
        </div>

        <button type="submit" className="mt-2 w-full">Sign In</button>
        
        <p className="text-center text-sm text-muted mt-2">
          Don't have an account? <Link to="/register" className="text-primary hover:underline">Register here</Link>
        </p>
        
        <div className="mt-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <h3 className="text-sm font-semibold mb-2">🧪 Test Credentials</h3>
          <p className="text-xs text-muted mb-3">Use any of these pre-seeded accounts to explore the app. The password for all test accounts is: <code className="bg-slate-900 px-1 py-0.5 rounded text-primary">password123</code></p>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
            <button type="button" onClick={() => { setEmail('aisha@example.com'); setPassword('password123'); }} className="bg-slate-900 border border-slate-700 hover:border-primary p-2 rounded text-left transition-colors">aisha@example.com</button>
            <button type="button" onClick={() => { setEmail('rohan@example.com'); setPassword('password123'); }} className="bg-slate-900 border border-slate-700 hover:border-primary p-2 rounded text-left transition-colors">rohan@example.com</button>
            <button type="button" onClick={() => { setEmail('priya@example.com'); setPassword('password123'); }} className="bg-slate-900 border border-slate-700 hover:border-primary p-2 rounded text-left transition-colors">priya@example.com</button>
            <button type="button" onClick={() => { setEmail('meera@example.com'); setPassword('password123'); }} className="bg-slate-900 border border-slate-700 hover:border-primary p-2 rounded text-left transition-colors">meera@example.com</button>
          </div>
        </div>
      </form>
    </div>
  );
}
