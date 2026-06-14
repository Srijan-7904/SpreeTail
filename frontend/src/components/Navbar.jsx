import { NavLink } from 'react-router-dom';
import { Wallet, List, Upload, PlusCircle, UserCircle } from 'lucide-react';

export default function Navbar({ users, activeUserId, onUserChange }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Wallet className="text-primary" />
        <span>FairSplit</span>
      </div>
      <div className="navbar-links">
        <NavLink to="/" className={({isActive}) => isActive ? "active flex items-center gap-2" : "flex items-center gap-2"}>
          <Wallet size={18} /> Dashboard
        </NavLink>
        <NavLink to="/expenses" end className={({isActive}) => isActive ? "active flex items-center gap-2" : "flex items-center gap-2"}>
          <List size={18} /> All Expenses
        </NavLink>
        <NavLink to="/expenses/add" className={({isActive}) => isActive ? "active flex items-center gap-2" : "flex items-center gap-2"}>
          <PlusCircle size={18} /> Add Expense
        </NavLink>
        <NavLink to="/import" className={({isActive}) => isActive ? "active flex items-center gap-2" : "flex items-center gap-2"}>
          <Upload size={18} /> Import CSV
        </NavLink>
        
        <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-600">
          <button onClick={onLogout} className="bg-transparent border-none text-muted text-sm p-1 cursor-pointer hover:text-white flex items-center gap-1">
            <UserCircle size={18} /> Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
