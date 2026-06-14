import { useEffect, useState } from 'react';
import axios from 'axios';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalances();
  }, []);

  const fetchBalances = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/balances');
      setData(res.data);
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

  return (
    <div className="animate-fade-in">
      <h1>Dashboard</h1>
      
      {Object.keys(balances).map(currency => (
        <div key={currency} className="mb-4">
          <h2 className="mb-4 text-primary">Balances ({currency})</h2>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(balances[currency]).map(([userId, bal]) => {
              const b = parseFloat(bal);
              if (b === 0) return null; // hide zero balances if desired, but good to see
              
              const isOwed = b > 0;
              const isOwes = b < 0;

              return (
                <div key={userId} className="card">
                  <h3 className="mb-2">{getUserName(userId)}</h3>
                  <div className={`text-2xl font-bold ${isOwed ? 'text-success' : isOwes ? 'text-danger' : 'text-muted'}`}>
                    {b > 0 ? '+' : ''}{b.toFixed(2)} {currency}
                  </div>
                  <div className="text-muted text-sm mt-1">
                    {isOwed ? 'Gets back' : isOwes ? 'Owes' : 'Settled up'}
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
