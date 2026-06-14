import { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';

export default function Dashboard({ activeGroupId, activeUserId }) {
  const [data, setData] = useState(null);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalances();
  }, [activeGroupId, activeUserId]);

  const fetchBalances = async () => {
    if (!activeGroupId) return;
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/balances?groupId=${activeGroupId}`);
      setData(res.data);
      if (activeUserId) {
        const detailsRes = await axios.get(`http://localhost:5000/api/balances/details/${activeUserId}?groupId=${activeGroupId}`);
        setDetails(detailsRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!data) return <div>Error loading data.</div>;

  const { balances, users } = data;

  const getUserName = (id) => {
    const u = users.find(u => u.id === parseInt(id));
    return u ? u.name : 'Unknown';
  };

  // If no user selected (e.g. system overview)
  if (!activeUserId) {
    return (
      <div className="animate-fade-in">
        <h1>Global Dashboard</h1>
        <p className="mb-4 text-muted">Select a user from the navigation bar to see their personalized dashboard.</p>
        
        {Object.keys(balances).map(currency => (
          <div key={currency} className="mb-4">
            <h2 className="mb-4 text-primary">Balances ({currency})</h2>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(balances[currency]).map(([userId, bal]) => {
                const b = parseFloat(bal);
                if (b === 0) return null;
                const isOwed = b > 0;
                const isOwes = b < 0;

                return (
                  <div key={userId} className="card">
                    <h3 className="mb-2">{getUserName(userId)}</h3>
                    <div className={`text-2xl font-bold ${isOwed ? 'text-success' : isOwes ? 'text-danger' : 'text-muted'}`}>
                      {b > 0 ? '+' : ''}{b.toFixed(2)} {currency}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Active User View
  return (
    <div className="animate-fade-in">
      <h1>Welcome, {getUserName(activeUserId)}</h1>
      
      {/* Global Number */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {Object.keys(balances).map(currency => {
          const bal = balances[currency][activeUserId] || 0;
          const b = parseFloat(bal);
          const isOwed = b > 0;
          const isOwes = b < 0;

          return (
            <div key={currency} className="card">
              <h3 className="text-muted mb-2">Net Balance ({currency})</h3>
              <div className={`text-4xl font-bold ${isOwed ? 'text-success' : isOwes ? 'text-danger' : 'text-muted'}`}>
                {b > 0 ? '+' : ''}{b.toFixed(2)} {currency}
              </div>
              <p className="mt-2 text-sm text-muted">
                {isOwed ? 'The group owes you in total.' : isOwes ? 'You owe the group in total.' : 'You are completely settled up.'}
              </p>
            </div>
          );
        })}
      </div>

      <h2>Your Detailed Ledger</h2>
      <p className="text-muted mb-4">No magic numbers. Exactly who you owe, and who owes you.</p>

      {details && details.iOwe.length > 0 && (
        <div className="card mb-4">
          <h3 className="text-danger mb-4">You Owe Others</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Owe To</th>
                <th>For</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {details.iOwe.map(item => (
                <tr key={`${item.id}-${item.paid_by_user_id}`}>
                  <td>{item.date}</td>
                  <td className="font-bold">{item.paid_by_name}</td>
                  <td>{item.description} {item.is_settlement ? '(Settlement)' : ''}</td>
                  <td className="text-danger font-bold">-{item.amount_owed.toFixed(2)} {item.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {details && details.paidByMe.length > 0 && (
        <div className="card mb-4">
          <h3 className="text-success mb-4">Others Owe You</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Owed By</th>
                <th>For</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {details.paidByMe.map(item => (
                <tr key={`${item.id}-${item.owes_id}`}>
                  <td>{item.date}</td>
                  <td className="font-bold">{item.owes_name}</td>
                  <td>{item.description} {item.is_settlement ? '(Settlement)' : ''}</td>
                  <td className="text-success font-bold">+{item.amount_owed.toFixed(2)} {item.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {details && details.iOwe.length === 0 && details.paidByMe.length === 0 && (
        <div className="card text-center text-muted py-8">
          You have no pending ledger entries.
        </div>
      )}
    </div>
  );
}
