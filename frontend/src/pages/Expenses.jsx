import { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/expenses');
      setExpenses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="animate-fade-in">
      <h1>All Expenses</h1>
      
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Paid By</th>
              <th>Amount</th>
              <th>Split Type</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map(exp => (
              <tr key={exp.id}>
                <td>{format(new Date(exp.date), 'dd MMM yyyy')}</td>
                <td>
                  {exp.description}
                  {exp.is_settlement ? <span className="badge success ml-2">Settlement</span> : null}
                </td>
                <td>{exp.paid_by}</td>
                <td className="font-bold">
                  {exp.amount.toFixed(2)} {exp.currency}
                </td>
                <td><span className="badge primary">{exp.split_type}</span></td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center text-muted">No expenses found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
