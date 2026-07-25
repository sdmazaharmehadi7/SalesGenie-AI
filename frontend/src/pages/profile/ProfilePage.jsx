import {
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  ShieldCheck,
  Briefcase,
  Camera,
  Award,
  Activity,
} from "lucide-react";

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">

      {/* Header */}

      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">
          My Profile
        </h1>

        <p className="mt-2 text-gray-500">
          Manage your account information and preferences.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">

        {/* LEFT CARD */}

        <div className="rounded-2xl bg-white p-8 shadow-sm border">

          <div className="flex flex-col items-center">

            <div className="relative">

              <img
                src="https://ui-avatars.com/api/?name=Sayyad&background=4F46E5&color=fff&size=256"
                alt="Profile"
                className="h-32 w-32 rounded-full object-cover"
              />

              <button className="absolute bottom-0 right-0 rounded-full bg-indigo-600 p-2 text-white shadow-lg hover:bg-indigo-700">
                <Camera size={18} />
              </button>

            </div>

            <h2 className="mt-5 text-2xl font-bold">
              Sayyad Mazahar Mehadi
            </h2>

            <p className="text-gray-500">
              AI Engineer
            </p>

            <div className="mt-6 flex gap-3">

              <span className="rounded-full bg-indigo-100 px-4 py-1 text-sm font-medium text-indigo-700">
                Admin
              </span>

              <span className="rounded-full bg-green-100 px-4 py-1 text-sm font-medium text-green-700">
                Active
              </span>

            </div>

          </div>

          <hr className="my-8" />

          <div className="space-y-5">

            <div className="flex items-center gap-3">
              <Mail className="text-indigo-600" />
              <span>sayyad@example.com</span>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="text-green-600" />
              <span>+91 9876543210</span>
            </div>

            <div className="flex items-center gap-3">
              <Building2 className="text-orange-500" />
              <span>SalesGenie AI</span>
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="text-red-500" />
              <span>Andhra Pradesh, India</span>
            </div>

          </div>

        </div>

        {/* RIGHT SECTION */}

        <div className="space-y-8 lg:col-span-2">

          {/* Personal Information */}

          <div className="rounded-2xl border bg-white p-8 shadow-sm">

            <h2 className="mb-6 text-2xl font-semibold">
              Personal Information
            </h2>

            <div className="grid gap-6 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-600">
                  Full Name
                </label>

                <input
                  defaultValue="Sayyad Mazahar Mehadi"
                  className="w-full rounded-xl border p-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-600">
                  Email
                </label>

                <input
                  defaultValue="sayyad@example.com"
                  className="w-full rounded-xl border p-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-600">
                  Phone
                </label>

                <input
                  defaultValue="+91 9876543210"
                  className="w-full rounded-xl border p-3 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-600">
                  Position
                </label>

                <input
                  defaultValue="AI Engineer"
                  className="w-full rounded-xl border p-3 outline-none focus:border-indigo-500"
                />
              </div>

            </div>

            <button className="mt-8 rounded-xl bg-indigo-600 px-6 py-3 text-white hover:bg-indigo-700">
              Save Changes
            </button>

          </div>

          {/* Statistics */}

          <div className="grid gap-6 md:grid-cols-3">

            <div className="rounded-2xl border bg-white p-6 shadow-sm">

              <Award className="mb-4 text-yellow-500" size={35} />

              <p className="text-gray-500">
                Deals Closed
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                127
              </h2>

            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">

              <Activity className="mb-4 text-green-500" size={35} />

              <p className="text-gray-500">
                Success Rate
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                91%
              </h2>

            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm">

              <Briefcase className="mb-4 text-indigo-600" size={35} />

              <p className="text-gray-500">
                Leads Managed
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                358
              </h2>

            </div>

          </div>

          {/* Security */}

          <div className="rounded-2xl border bg-white p-8 shadow-sm">

            <div className="flex items-center gap-3">

              <ShieldCheck
                className="text-green-600"
                size={28}
              />

              <h2 className="text-2xl font-semibold">
                Security
              </h2>

            </div>

            <div className="mt-6 space-y-5">

              <div className="flex items-center justify-between">

                <div>
                  <h3 className="font-semibold">
                    Password
                  </h3>

                  <p className="text-sm text-gray-500">
                    Last updated 30 days ago
                  </p>
                </div>

                <button className="rounded-lg border px-5 py-2 hover:bg-gray-100">
                  Change
                </button>

              </div>

              <div className="flex items-center justify-between">

                <div>
                  <h3 className="font-semibold">
                    Two-Factor Authentication
                  </h3>

                  <p className="text-sm text-gray-500">
                    Protect your account.
                  </p>
                </div>

                <button className="rounded-lg bg-green-600 px-5 py-2 text-white hover:bg-green-700">
                  Enable
                </button>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}