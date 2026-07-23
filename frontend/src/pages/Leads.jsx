import { useEffect, useState } from "react";
import api from "../services/api";

function Leads() {
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await api.get("/leads/");
      setLeads(response.data);
    } catch (error) {
      console.error("Error fetching leads:", error);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">
        Lead Management
      </h1>

      <table className="w-full bg-white shadow rounded">
        <thead className="bg-indigo-400 text-white">
          <tr>
            <th className="p-3">Company</th>
            <th className="p-3">Contact</th>
            <th className="p-3">Status</th>
          </tr>
        </thead>

        <tbody>
          {leads.map((lead) => (
            <tr key={lead.lead_id} className="border-b">
              <td className="p-3">{lead.company_name}</td>
              <td className="p-3">{lead.contact_person}</td>
              <td className="p-3">{lead.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Leads;