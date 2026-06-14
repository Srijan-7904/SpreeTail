import { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

export default function Expenses({ activeGroupId }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  useEffect(() => {
    if (activeGroupId) {
      axios.get(`http://localhost:5000/api/expenses?groupId=${activeGroupId}`)
        .then(res => {
          setExpenses(res.data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [activeGroupId]);

  if (loading) return <div className="text-muted flex justify-center mt-10">Loading ledger...</div>;

  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'Food': return '🍔';
      case 'Travel': return '✈️';
      case 'Rent': return '🏠';
      case 'Groceries': return '🛒';
      case 'Utilities': return '💡';
      default: return '🏷️';
    }
  };

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'All' || e.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="animate-fade-in max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
        <div>
          <h1>Group Ledger</h1>
          <p className="text-muted">A complete history of all group spending.</p>
        </div>
        
        <div className="flex gap-4 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search expenses..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full md:w-64"
          />
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full md:w-40">
            <option value="All">All Categories</option>
            <option value="General">General</option>
            <option value="Food">Food</option>
            <option value="Travel">Travel</option>
            <option value="Rent">Rent</option>
            <option value="Groceries">Groceries</option>
            <option value="Utilities">Utilities</option>
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className="pb-4 border-b border-slate-700 text-muted font-medium text-sm">Date</th>
              <th className="pb-4 border-b border-slate-700 text-muted font-medium text-sm">Description</th>
              <th className="pb-4 border-b border-slate-700 text-muted font-medium text-sm">Paid By</th>
              <th className="pb-4 border-b border-slate-700 text-muted font-medium text-sm text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-8 text-muted">No expenses found matching your filters.</td>
              </tr>
            ) : filteredExpenses.map(expense => (
              <tr key={expense.id} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-800/30 transition-colors">
                <td className="py-4 text-sm whitespace-nowrap">{format(new Date(expense.date), 'MMM d, yyyy')}</td>
                <td className="py-4 font-medium text-slate-200">
                  <span className="mr-2" title={expense.category || 'General'}>
                    {getCategoryIcon(expense.category)}
                  </span>
                  {expense.description} {expense.is_settlement ? <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full ml-2">Settlement</span> : ''}
                </td>
                <td className="py-4 text-sm">{expense.paid_by}</td>
                <td className="py-4 font-bold text-right tabular-nums text-danger">
                  {expense.amount.toFixed(2)} {expense.currency}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
