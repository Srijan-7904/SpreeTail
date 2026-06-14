import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Import from './pages/Import';
import AddExpense from './pages/AddExpense';
import Groups from './pages/Groups';
import Login from './pages/Login';
import Register from './pages/Register';

// Protect Route wrapper
const ProtectedRoute = ({ children, token }) => {
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

// Initialize Axios default auth header if token exists
const initialToken = localStorage.getItem('token');
if (initialToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`;
}

function App() {
  const [token, setToken] = useState(initialToken || null);
  const [activeUserId, setActiveUserId] = useState(localStorage.getItem('activeUserId') || null);
  const [activeGroupId, setActiveGroupId] = useState(localStorage.getItem('activeGroupId') || null);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchGroups();
    }
  }, [token]);

  useEffect(() => {
    if (activeGroupId && token) {
      localStorage.setItem('activeGroupId', activeGroupId);
      // Fetch users for the active group
      axios.get(`/api/groups/${activeGroupId}/members`)
        .then(res => setUsers(res.data))
        .catch(console.error);
    }
  }, [activeGroupId, token]);

  const fetchGroups = () => {
    axios.get('/api/groups').then(res => {
      setGroups(res.data);
      if (res.data.length > 0 && !activeGroupId) {
        setActiveGroupId(res.data[0].id.toString());
      }
    }).catch(err => {
      if (err.response?.status === 401) handleLogout();
    });
  };

  const handleLogout = () => {
    setToken(null);
    setActiveUserId(null);
    setActiveGroupId(null);
    localStorage.removeItem('token');
    localStorage.removeItem('activeUserId');
    localStorage.removeItem('activeGroupId');
    delete axios.defaults.headers.common['Authorization'];
    window.location.href = '/login';
  };

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
        <Navbar 
          groups={groups} 
          activeGroupId={activeGroupId} 
          onGroupChange={setActiveGroupId} 
          onLogout={handleLogout} 
        />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<ProtectedRoute token={token}><Dashboard activeGroupId={activeGroupId} activeUserId={activeUserId} /></ProtectedRoute>} />
            <Route path="/groups" element={<ProtectedRoute token={token}><Groups groups={groups} onGroupsChanged={fetchGroups} /></ProtectedRoute>} />
            <Route path="/expenses" element={<ProtectedRoute token={token}><Expenses activeGroupId={activeGroupId} /></ProtectedRoute>} />
            <Route path="/expenses/add" element={<ProtectedRoute token={token}><AddExpense users={users} activeGroupId={activeGroupId} activeUserId={activeUserId} /></ProtectedRoute>} />
            <Route path="/import" element={<ProtectedRoute token={token}><Import activeGroupId={activeGroupId} /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
