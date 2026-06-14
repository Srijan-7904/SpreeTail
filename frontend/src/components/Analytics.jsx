import { useState, useEffect } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function Analytics({ activeGroupId }) {
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    if (activeGroupId) {
      axios.get(`http://localhost:5000/api/expenses?groupId=${activeGroupId}`)
        .then(res => setExpenses(res.data))
        .catch(console.error);
    }
  }, [activeGroupId]);

  if (!expenses || expenses.length === 0) return null;

  // Pie Chart: Spending by Category
  const categoryData = expenses.reduce((acc, exp) => {
    if (exp.is_settlement) return acc; // ignore settlements
    const cat = exp.category || 'General';
    acc[cat] = (acc[cat] || 0) + exp.amount;
    return acc;
  }, {});

  const pieData = Object.keys(categoryData).map(key => ({
    name: key,
    value: categoryData[key]
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#a288fe', '#ff6b6b'];

  // Bar Chart: Who paid how much?
  const payerData = expenses.reduce((acc, exp) => {
    if (exp.is_settlement) return acc;
    acc[exp.paid_by] = (acc[exp.paid_by] || 0) + exp.amount;
    return acc;
  }, {});

  const barData = Object.keys(payerData).map(name => ({
    name,
    amount: payerData[name]
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="card">
        <h3 className="mb-4 font-semibold">Spending by Category</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-4 font-semibold">Total Paid by User</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip cursor={{fill: '#334155'}} formatter={(value) => `$${value.toFixed(2)}`} />
              <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
