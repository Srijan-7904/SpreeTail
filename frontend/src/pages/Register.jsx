import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', { name, email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('activeUserId', res.data.user.id);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div className="animate-fade-in max-w-lg mx-auto mt-16">
      <div className="card text-center mb-8">
        <h1 className="text-4xl mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">FairSplit</h1>
        <p className="text-muted">Create an account to get started.</p>
      </div>

      <form onSubmit={handleRegister} className="card grid gap-4">
        {error && <div className="badge danger w-full text-center py-2">{error}</div>}
        
        <div>
          <label className="text-muted text-sm block mb-1">Name</label>
          <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" />
        </div>

        <div>
          <label className="text-muted text-sm block mb-1">Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" />
        </div>

        <div>
          <label className="text-muted text-sm block mb-1">Password</label>
          <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
        </div>

        <button type="submit" className="mt-4 w-full">Create Account</button>
        
        <p className="text-center text-sm text-muted mt-4">
          Already have an account? <Link to="/login" className="text-primary hover:underline">Sign In</Link>
        </p>
      </form>
    </div>
  );
}
