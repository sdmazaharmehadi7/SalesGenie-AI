import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="bg-indigo-500 text-white px-8 py-4 flex justify-between">

      <h1 className="text-2xl font-bold">
        SalesGenie AI
      </h1>

      <div className="space-x-6">

        <Link to="/">Dashboard</Link>

        <Link to="/leads">Leads</Link>

        <Link to="/add-lead">Add Lead</Link>

      </div>

    </nav>
  );
}

export default Navbar;