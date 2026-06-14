import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Groups({ groups, onGroupsChanged }) {
  const [newGroupName, setNewGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(groups[0]?.id || null);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (selectedGroup) fetchMembers();
  }, [selectedGroup]);

  const fetchMembers = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/groups/${selectedGroup}/members`);
      setMembers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName) return;
    try {
      const res = await axios.post('http://localhost:5000/api/groups', { name: newGroupName });
      setNewGroupName('');
      onGroupsChanged(); // Refresh groups in App.jsx
      setSelectedGroup(res.data.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;
    try {
      const res = await axios.get(`http://localhost:5000/api/users/search?q=${searchQuery}`);
      setSearchResults(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInvite = async (email) => {
    try {
      await axios.post(`http://localhost:5000/api/groups/${selectedGroup}/members`, { email });
      setSearchResults([]);
      setSearchQuery('');
      fetchMembers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add user');
    }
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">Manage Groups</h1>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Sidebar: Group List & Create */}
        <div className="card space-y-6">
          <div>
            <h2 className="font-semibold mb-4">Your Groups</h2>
            <div className="space-y-2">
              {groups.map(g => (
                <div 
                  key={g.id} 
                  onClick={() => setSelectedGroup(g.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all ${selectedGroup === g.id ? 'bg-primary/20 border border-primary/50' : 'bg-slate-800/50 hover:bg-slate-800'}`}
                >
                  <div className="font-medium">{g.name}</div>
                  <div className="text-xs text-muted">Joined: {new Date(g.joined_at).toLocaleDateString()}</div>
                </div>
              ))}
              {groups.length === 0 && <div className="text-sm text-muted">You are not in any groups.</div>}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700">
            <h3 className="font-semibold text-sm mb-3">Create New Group</h3>
            <form onSubmit={handleCreateGroup} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Group Name" 
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                className="flex-1 text-sm py-2"
              />
              <button type="submit" className="py-2 px-3 text-sm">Create</button>
            </form>
          </div>
        </div>

        {/* Main Panel: Group Details & Invites */}
        {selectedGroup ? (
          <div style={{ gridColumn: 'span 2' }} className="space-y-6">
            <div className="card">
              <h2 className="font-semibold mb-4">Group Members</h2>
              <div className="grid gap-3">
                {members.map(m => (
                  <div key={m.id} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-muted">{m.email}</div>
                    </div>
                    <div className="text-xs text-muted">Joined {new Date(m.joined_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="font-semibold mb-2">Invite Members</h2>
              <p className="text-sm text-muted mb-4">Search by name or email to add users to this group.</p>
              
              <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  placeholder="Search user..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 text-sm py-2"
                />
                <button type="submit" className="py-2 px-4 text-sm bg-slate-700 hover:bg-slate-600">Search</button>
              </form>

              {searchResults.length > 0 && (
                <div className="space-y-2 mt-4 p-4 border border-slate-700 rounded-lg bg-slate-900/50">
                  <h3 className="text-xs font-semibold uppercase text-muted mb-2">Search Results</h3>
                  {searchResults.map(u => (
                    <div key={u.id} className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0">
                      <div>
                        <div className="font-medium text-sm">{u.name}</div>
                        <div className="text-xs text-muted">{u.email}</div>
                      </div>
                      <button 
                        onClick={() => handleInvite(u.email)}
                        disabled={members.some(m => m.id === u.id)}
                        className="text-xs py-1 px-3"
                      >
                        {members.some(m => m.id === u.id) ? 'Already Added' : 'Add'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ gridColumn: 'span 2' }} className="card flex items-center justify-center text-muted">
            Select or create a group to manage members.
          </div>
        )}
      </div>
    </div>
  );
}
