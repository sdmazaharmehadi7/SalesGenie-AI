import { FaUsers, FaChartLine, FaEnvelope, FaHandshake } from "react-icons/fa";

function Dashboard() {
  const cards = [
    {
      title: "Total Leads",
      value: "245",
      icon: <FaUsers size={28} />,
      color: "bg-blue-400",
    },
    {
      title: "Qualified Leads",
      value: "128",
      icon: <FaHandshake size={28} />,
      color: "bg-green-400",
    },
    {
      title: "Emails Sent",
      value: "342",
      icon: <FaEnvelope size={28} />,
      color: "bg-purple-400",
    },
    {
      title: "Conversion Rate",
      value: "52%",
      icon: <FaChartLine size={28} />,
      color: "bg-orange-400",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-8">

      <h1 className="text-4xl font-bold mb-8">
        SalesGenie AI Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {cards.map((card, index) => (

          <div
            key={index}
            className={`${card.color} text-white rounded-xl shadow-lg p-6`}>

            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg">{card.title}</h2>
                <p className="text-3xl font-bold mt-2">
                  {card.value}
                </p>
              </div>
              {card.icon}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;