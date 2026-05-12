import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import DashboardNavbar from "../components/DashboardNavbar";
import api from "../api";

const ProfilePage = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError("");
      
      const [profileRes, reportsRes] = await Promise.all([
        api.get("/user/profile"),
        api.get("/user/reports")
      ]);
      
      setProfile(profileRes.data);
      setEditForm({
        name: profileRes.data.name || "",
        age: profileRes.data.age || "",
        weight: profileRes.data.weight || "",
        pregnancyStatus: profileRes.data.pregnancyStatus || false,
        chronicDiseases: profileRes.data.chronicDiseases || "",
        emergencyContact: profileRes.data.emergencyContact || "",
      });
      setReports(reportsRes.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm({
      ...editForm,
      [name]: type === "checkbox" ? checked : value
    });
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      
      const res = await api.put("/user/profile", editForm);
      setProfile(res.data);
      setIsEditing(false);
      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const initials = (profile?.name || user?.name || "U").trim().charAt(0).toUpperCase();

  const latestRiskScore = reports.length > 0 ? reports[0].reportData?.riskScore || 0 : 0;
  const isHighRisk = latestRiskScore > 65;

  const cardClass = "bg-white/5 border border-white/10 rounded-xl p-5 md:p-6 shadow-md backdrop-blur-md";
  const labelClass = "block text-sm font-medium text-gray-400 mb-1";
  const inputClass = "w-full bg-slate-800/50 border border-white/10 rounded-lg p-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#1e1b4b] text-white">
      <DashboardNavbar
        userName={user?.name}
        onLogout={logout}
        onOpenSmartDoctor={() => {}}
      />

      <div className="mx-auto max-w-5xl p-4 md:p-6 mt-4">
        {isHighRisk && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-4 shadow-lg shadow-red-500/5">
            <span className="text-3xl">🚨</span>
            <div>
              <h3 className="text-red-400 font-bold text-lg">High dengue risk detected in your recent report</h3>
              <p className="text-red-300/80 text-sm">Please monitor your symptoms closely and contact your emergency contact if needed.</p>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-white tracking-tight">Your Profile</h1>
          {!loading && (
            <button
              onClick={() => isEditing ? saveProfile() : setIsEditing(true)}
              disabled={saving}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                isEditing 
                  ? "bg-green-600 hover:bg-green-500 text-white shadow-[0_0_15px_rgba(22,163,74,0.4)]" 
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
              }`}
            >
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Edit Profile"}
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
            {success}
          </div>
        )}

        {loading ? (
          <div className="space-y-6">
            <div className={`${cardClass} flex items-center gap-6 animate-pulse`}>
              <div className="w-24 h-24 bg-white/10 rounded-full"></div>
              <div className="space-y-3 flex-1">
                <div className="h-6 w-1/3 bg-white/10 rounded"></div>
                <div className="h-4 w-1/4 bg-white/10 rounded"></div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className={`${cardClass} h-64 animate-pulse bg-white/5`}></div>
              <div className={`${cardClass} h-64 animate-pulse bg-white/5`}></div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* A. USER INFO */}
            <section className={`${cardClass} flex flex-col md:flex-row items-center md:items-start gap-6`}>
              <div className="shrink-0 relative">
                <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-4xl font-bold shadow-xl border-4 border-[#0f172a]">
                  {initials}
                </div>
                {isEditing && (
                  <div className="absolute bottom-0 right-0 w-8 h-8 bg-slate-700 border-2 border-[#0f172a] rounded-full flex items-center justify-center text-xs cursor-pointer hover:bg-slate-600 transition">
                    ✏️
                  </div>
                )}
              </div>
              
              <div className="flex-1 w-full space-y-4 text-center md:text-left mt-2 md:mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Full Name</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        name="name" 
                        value={editForm.name} 
                        onChange={handleInputChange} 
                        className={inputClass}
                      />
                    ) : (
                      <p className="text-xl font-bold text-white">{profile?.name}</p>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Email Address</label>
                    <p className="text-gray-300 py-1">{profile?.email}</p>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* B. HEALTH PROFILE */}
              <section className={cardClass}>
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-xl">🩺</span>
                  <h2 className="text-lg font-semibold text-white">Health Profile</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Age</label>
                      {isEditing ? (
                        <input 
                          type="number" 
                          name="age" 
                          value={editForm.age} 
                          onChange={handleInputChange} 
                          className={inputClass}
                          placeholder="e.g. 28"
                        />
                      ) : (
                        <p className="text-white bg-black/20 p-2.5 rounded-lg border border-white/5">{profile?.age || "Not specified"}</p>
                      )}
                    </div>
                    <div>
                      <label className={labelClass}>Weight (kg)</label>
                      {isEditing ? (
                        <input 
                          type="number" 
                          name="weight" 
                          value={editForm.weight} 
                          onChange={handleInputChange} 
                          className={inputClass}
                          placeholder="e.g. 65"
                        />
                      ) : (
                        <p className="text-white bg-black/20 p-2.5 rounded-lg border border-white/5">{profile?.weight ? `${profile.weight} kg` : "Not specified"}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Pregnancy Status</label>
                    {isEditing ? (
                      <div className="flex items-center gap-3 mt-2 bg-slate-800/50 p-3 rounded-lg border border-white/10">
                        <input 
                          type="checkbox" 
                          name="pregnancyStatus" 
                          id="pregnancyStatus"
                          checked={editForm.pregnancyStatus} 
                          onChange={handleInputChange} 
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 bg-gray-700 border-gray-600"
                        />
                        <label htmlFor="pregnancyStatus" className="text-gray-300 cursor-pointer">Yes, I am pregnant</label>
                      </div>
                    ) : (
                      <p className="text-white bg-black/20 p-2.5 rounded-lg border border-white/5">
                        {profile?.pregnancyStatus ? "Pregnant" : "Not pregnant"}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className={labelClass}>Chronic Diseases (Optional)</label>
                    {isEditing ? (
                      <textarea 
                        name="chronicDiseases" 
                        value={editForm.chronicDiseases} 
                        onChange={handleInputChange} 
                        className={`${inputClass} resize-none`}
                        rows="2"
                        placeholder="E.g. Diabetes, Hypertension..."
                      ></textarea>
                    ) : (
                      <p className="text-white bg-black/20 p-2.5 rounded-lg border border-white/5 min-h-[44px]">
                        {profile?.chronicDiseases || "None specified"}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <div className="space-y-6">
                {/* E. EMERGENCY CONTACT */}
                <section className={cardClass}>
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-xl">📞</span>
                    <h2 className="text-lg font-semibold text-white">Emergency Contact</h2>
                  </div>
                  
                  <div>
                    <label className={labelClass}>Emergency Phone Number</label>
                    {isEditing ? (
                      <input 
                        type="tel" 
                        name="emergencyContact" 
                        value={editForm.emergencyContact} 
                        onChange={handleInputChange} 
                        className={inputClass}
                        placeholder="e.g. +880 17..."
                      />
                    ) : (
                      <div className="flex items-center justify-between text-white bg-black/20 p-3 rounded-lg border border-white/5">
                        <span className="font-medium tracking-wide text-lg">{profile?.emergencyContact || "Not added yet"}</span>
                        {profile?.emergencyContact && (
                          <a href={`tel:${profile.emergencyContact}`} className="bg-red-500/20 text-red-400 p-2 rounded-md hover:bg-red-500/30 transition">
                            Call
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </section>

                {/* F. SETTINGS */}
                <section className={cardClass}>
                  <div className="flex items-center gap-2 mb-6">
                    <span className="text-xl">⚙️</span>
                    <h2 className="text-lg font-semibold text-white">Preferences</h2>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
                    <div>
                      <p className="font-medium text-white">Dark Mode</p>
                      <p className="text-xs text-gray-400">App is currently in dark mode</p>
                    </div>
                    <div className="w-12 h-6 bg-blue-600 rounded-full relative opacity-80 cursor-not-allowed">
                      <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            {/* C. RISK HISTORY */}
            <section className={cardClass}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📊</span>
                  <h2 className="text-lg font-semibold text-white">Assessment History</h2>
                </div>
                <span className="text-sm bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30">
                  {reports.length} Reports
                </span>
              </div>

              {reports.length === 0 ? (
                <div className="text-center py-10 bg-black/20 rounded-xl border border-white/5 border-dashed">
                  <p className="text-gray-400">No assessment history found.</p>
                  <p className="text-sm text-gray-500 mt-1">Your generated reports will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report, idx) => (
                    <div key={report._id || idx} className="bg-slate-800/40 border border-white/5 hover:border-white/10 hover:bg-slate-800/60 transition-all rounded-lg p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">
                          {new Date(report.createdAt).toLocaleDateString("en-US", { 
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                        <p className="text-sm text-gray-300 line-clamp-1">{report.reportText?.substring(0, 80) || "AI Doctor Report"}...</p>
                      </div>
                      <button className="shrink-0 text-sm bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-md border border-white/10 transition">
                        View Report
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
