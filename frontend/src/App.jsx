import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Import from './pages/Import';
import AddExpense from './pages/AddExpense';

function App() {
  const [activeUserId, setActiveUserId] = useState(localStorage.getItem('activeUserId') || null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/users').then(res => {
      setUsers(res.data);
      if (!activeUserId && res.data.length > 0) {
        handleUserChange(res.data[0].id.toString());
      }
    });
  }, []);

  const handleUserChange = (id) => {
    setActiveUserId(id);
    localStorage.setItem('activeUserId', id);
  };

  return (
    <Router>
      <div className="layout">
        <Navbar users={users} activeUserId={activeUserId} onUserChange={handleUserChange} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard activeUserId={activeUserId} />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/expenses/add" element={<AddExpense users={users} activeUserId={activeUserId} />} />
            <Route path="/import" element={<Import />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
