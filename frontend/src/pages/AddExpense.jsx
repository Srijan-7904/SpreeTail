import { useState, useEffect } from 'react';
import axios from 'axios';
import { Check } from 'lucide-react';

export default function AddExpense({ users, activeUserId, activeGroupId }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [splitType, setSplitType] = useState('equal');
  const [date, setDate] = useState('');
  
  // For equal split: select which users are involved
  const [selectedUsers, setSelectedUsers] = useState(users.map(u => u.id));
  
  // For settlement: select who we are paying
  const [payee, setPayee] = useState('');
  const [paidBy, setPaidBy] = useState(activeUserId);
  const [category, setCategory] = useState('General');
  const [splits, setSplits] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const settleId = params.get('settle');
    const settleAmt = params.get('amount');
    const settleCur = params.get('currency');

    if (settleId) {
      setSplitType('settlement');
      setPayee(settleId);
      if (settleAmt) setAmount(settleAmt);
      if (settleCur) setCurrency(settleCur);
      setDescription('Settlement');
    }
  }, []);

  useEffect(() => {
    if (activeUserId && users.length > 0) {
      setPaidBy(activeUserId);
      const eq = 100 / users.length;
      const initialSplits = {};
      users.forEach(u => initialSplits[u.id] = eq.toFixed(2));
      setSplits(initialSplits);
    }
  }, [users, activeUserId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      groupId: activeGroupId,
      paid_by_user_id: paidBy,
      amount: parseFloat(amount),
      currency,
      description,
      category,
      split_type: splitType,
      date: date || new Date().toISOString().split('T')[0],
      splitUsers: splitType === 'settlement' ? [parseInt(payee)] : selectedUsers
    };

    try {
      await axios.post('/api/expenses', payload);
      window.location.href = '/expenses';
    } catch (err) {
      console.error(err);
      alert('Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  const handleUserToggle = (id) => {
    if (selectedUsers.includes(id)) {
      setSelectedUsers(selectedUsers.filter(uId => uId !== id));
    } else {
      setSelectedUsers([...selectedUsers, id]);
    }
  };

  if (!activeUserId) {
    return <div className="card text-center text-muted">Please select a user from the Navbar first.</div>;
  }

  const activeUser = users.find(u => u.id === parseInt(activeUserId));

  return (
    <div className="animate-fade-in max-w-lg mx-auto">
      <h1>Add Expense</h1>
      
      {success && (
        <div className="card mb-4 bg-green-900/20 border-green-500/30">
          <h3 className="text-success flex items-center gap-2"><Check /> Saved Successfully!</h3>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card grid gap-4">
        <div>
          <label className="text-muted text-sm block mb-1">Paid By</label>
          <input type="text" value={activeUser?.name || ''} disabled className="opacity-50" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-muted text-sm block mb-1">Amount</label>
            <input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group">
              <label className="text-muted text-sm block mb-1">Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="text-muted text-sm block mb-1">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option value="General">General</option>
                <option value="Food">Food 🍔</option>
                <option value="Travel">Travel ✈️</option>
                <option value="Rent">Rent 🏠</option>
                <option value="Groceries">Groceries 🛒</option>
                <option value="Utilities">Utilities 💡</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="text-muted text-sm block mb-1">Description</label>
          <input type="text" required value={description} onChange={e => setDescription(e.target.value)} placeholder="What was this for?" />
        </div>

        <div>
          <label className="text-muted text-sm block mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <div>
          <label className="text-muted text-sm block mb-1">Type</label>
          <select value={splitType} onChange={e => setSplitType(e.target.value)}>
            <option value="equal">Group Expense (Split Equally)</option>
            <option value="settlement">Settle Up (Pay Someone Back)</option>
          </select>
        </div>

        {splitType === 'equal' && (
          <div className="mt-2">
            <label className="text-muted text-sm block mb-2">Split With</label>
            <div className="grid grid-cols-2 gap-2">
              {users.map(u => (
                <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={selectedUsers.includes(u.id)} 
                    onChange={() => handleUserToggle(u.id)} 
                  />
                  {u.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {splitType === 'settlement' && (
          <div className="mt-2">
            <label className="text-muted text-sm block mb-2">Who are you paying?</label>
            <select required value={payee} onChange={e => setPayee(e.target.value)}>
              <option value="">Select a user...</option>
              {users.filter(u => u.id !== parseInt(activeUserId)).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        )}

        <button type="submit" disabled={loading} className="mt-4">
          {loading ? 'Saving...' : 'Save Expense'}
        </button>
      </form>
    </div>
  );
}
