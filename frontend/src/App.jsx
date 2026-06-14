import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Import from './pages/Import';
import AddExpense from './pages/AddExpense';
import Login from './pages/Login';
import Register from './pages/Register';

// Protect Route wrapper
const ProtectedRoute = ({ children, token }) => {
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [activeUserId, setActiveUserId] = useState(localStorage.getItem('activeUserId') || null);
  const [users, setUsers] = useState([]); // This would be group members in full implementation

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      axios.get('http://localhost:5000/api/users').then(res => {
        setUsers(res.data);
      }).catch(err => {
        if (err.response?.status === 401) handleLogout();
      });
    }
  }, [token]);

  const handleLogout = () => {
    setToken(null);
    setActiveUserId(null);
    localStorage.removeItem('token');
    localStorage.removeItem('activeUserId');
    delete axios.defaults.headers.common['Authorization'];
    window.location.href = '/login';
  };

  // We temporarily keep activeUserId to simulate "Viewing As" within a group if needed,
  // but true auth means we are always our logged-in user.
  // For the sake of the existing dashboard code working smoothly until full group refactor,
  // we pass the authenticated user's ID down.

  if (!token) {
    return (
      <Router>
        <div className="layout">
          <main className="main-content flex items-center justify-center">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    );
  }

  return (
    <Router>
      <div className="layout">
        <Navbar users={users} activeUserId={activeUserId} onLogout={handleLogout} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<ProtectedRoute token={token}><Dashboard activeUserId={activeUserId} /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute token={token}><Expenses /></ProtectedRoute>} />
            <Route path="/expenses/add" element={<ProtectedRoute token={token}><AddExpense users={users} activeUserId={activeUserId} /></ProtectedRoute>} />
            <Route path="/import" element={<ProtectedRoute token={token}><Import /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
