import { useState } from "react";

function AddLead() {

  const [lead, setLead] = useState({
    company_name: "",
    contact_person: "",
    email: "",
    phone: ""
  });

  return (
    <div>
      <h1>Add Lead</h1>
      <input placeholder="Company Name"/>
      <br />
      <input placeholder="Contact Person"/>
      <br />
      <input placeholder="Email"/>
      <br />
      <input placeholder="Phone"/>
      <br />
      <button>Add Lead</button>
    </div>
  );
}

export default AddLead;