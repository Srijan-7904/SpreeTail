import { NavLink } from 'react-router-dom';
import { Wallet, List, Upload } from 'lucide-react';

export default function Navbar() {
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
        <NavLink to="/expenses" className={({isActive}) => isActive ? "active flex items-center gap-2" : "flex items-center gap-2"}>
          <List size={18} /> Expenses
        </NavLink>
        <NavLink to="/import" className={({isActive}) => isActive ? "active flex items-center gap-2" : "flex items-center gap-2"}>
          <Upload size={18} /> Import CSV
        </NavLink>
      </div>
    </nav>
  );
}
