import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import DashboardNavbar from "../components/DashboardNavbar";
import api from "../api";
import useOfflineStatus from "../hooks/useOfflineStatus";

const ProfilePage = () => {
  const { t } = useTranslation();
  const { user, logout, updateUser } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);
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
      updateUser(profileRes.data);
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
      // Avoid sending large base64 images inline (server express.json limit 1MB).
      // Send only the profile fields in this request; handle photo upload separately.
      const res = await api.put("/user/profile", { ...editForm });
      // if a photo was selected, upload it as multipart to dedicated endpoint
      if (photoFile) {
        try {
          const fd = new FormData();
          fd.append('photo', photoFile);
          const uploadRes = await api.post('/user/profile/photo', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (evt) => {
              if (evt.total) setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
            }
          });
          setProfile(uploadRes.data);
          updateUser(uploadRes.data);
          setPhotoFile(null);
          setPhotoPreview(null);
          setUploadProgress(0);
          setUploadError("");
          setSuccess('Profile and photo uploaded successfully');
        } catch (err) {
          setSuccess('Profile saved but photo upload failed');
          setUploadError(err?.response?.data?.message || 'Photo upload failed');
        }
      } else {
        setProfile(res.data);
        updateUser(res.data);
        setSuccess("Profile updated successfully!");
      }
      setIsEditing(false);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const initials = (profile?.name || user?.name || "U").trim().charAt(0).toUpperCase();
  const { isOnline, syncStatus, lastSyncMessage } = useOfflineStatus();

  const latestRiskScore = reports.length > 0 ? reports[0].reportData?.riskScore || 0 : 0;
  const isHighRisk = latestRiskScore > 65;

  const cardClass = "bg-gradient-to-tr from-white/3 to-white/2 border border-white/6 rounded-2xl p-6 shadow-[0_10px_30px_rgba(2,6,23,0.6)] backdrop-blur-sm";
  const labelClass = "block text-sm font-medium text-slate-300 mb-1";
  const inputClass = "w-full bg-[#0b1220]/60 border border-white/6 rounded-lg p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition-all";

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
            {/* A. USER INFO - modern header with upload */}
            <section className={`${cardClass} flex flex-col md:flex-row items-center md:items-start gap-6`}>
              <div className="shrink-0 relative flex items-center gap-4">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-cyan-400/70 to-indigo-600/60 shadow-[0_10px_30px_rgba(6,12,30,0.6)]">
                    <div className="w-full h-full rounded-full bg-[#061025] flex items-center justify-center overflow-hidden border-[3px] border-[#071226]">
                      {photoPreview ? (
                        <img src={photoPreview} alt="avatar" className="w-full h-full object-cover" />
                      ) : profile?.photoUrl ? (
                        <img src={profile.photoUrl} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl font-bold text-white">{initials}</span>
                      )}
                    </div>
                  </div>

                  <div className="absolute -bottom-1 right-0 flex items-center gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm px-3 py-1 rounded-full bg-cyan-600/90 hover:bg-cyan-500 transition text-white shadow-sm"
                    >
                      Change Photo
                    </button>
                  </div>
                </div>

                <div className="w-0.5 h-20 bg-white/6 rounded" />
              </div>

              <div className="flex-1 w-full space-y-2 text-center md:text-left mt-2 md:mt-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-semibold text-white leading-tight">{profile?.name || editForm.name}</h2>
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/4 px-3 py-1 text-sm text-slate-200">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="opacity-90"><path d="M12 11c1.657 0 3-1.343 3-3S13.657 5 12 5s-3 1.343-3 3 1.343 3 3 3z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Telehealth User
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600/10 px-3 py-1 text-sm text-emerald-200">
                        Verified
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 mt-1">{profile?.email}</p>
                    <p className="text-xs text-slate-400 mt-1">{isOnline ? `Online · ${syncStatus}` : `Offline · ${syncStatus}`}{lastSyncMessage ? ` — ${lastSyncMessage}` : ""}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm text-slate-300">Last sync</p>
                      <p className="text-sm font-medium text-white">{profile?.lastSynced ? new Date(profile.lastSynced).toLocaleString() : "Not synced"}</p>
                    </div>
                  </div>
                </div>

                {uploadError && <div className="text-sm text-rose-400 mt-2">{uploadError}</div>}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const f = e.dataTransfer?.files?.[0];
                    if (!f) return;
                    const okTypes = ["image/jpeg","image/png","image/webp"];
                    setUploadError("");
                    if (!okTypes.includes(f.type)) { setUploadError("Only JPG, PNG or WEBP allowed"); return; }
                    if (f.size <= 5 * 1024 * 1024) {
                      setPhotoFile(f);
                      setPhotoPreview(URL.createObjectURL(f));
                      return;
                    }
                    try {
                      const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(f); });
                      const canvas = document.createElement('canvas');
                      const maxW = 1200;
                      const scale = Math.min(1, maxW / img.width);
                      canvas.width = img.width * scale;
                      canvas.height = img.height * scale;
                      const ctx = canvas.getContext('2d');
                      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                      setUploadProgress(20);
                      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                      const res = await fetch(dataUrl);
                      const blob = await res.blob();
                      if (blob.size > 5 * 1024 * 1024) { setUploadError('Image too large even after compression (5MB max)'); return; }
                      const compressedFile = new File([blob], f.name.replace(/\.[^/.]+$/, '') + '.jpg', { type: blob.type });
                      setPhotoFile(compressedFile);
                      setPhotoPreview(URL.createObjectURL(compressedFile));
                      setUploadProgress(100);
                    } catch (err) {
                      setUploadError('Failed to process image');
                    }
                  }}
                  className="mt-3 p-3 border-2 border-dashed border-white/6 rounded-lg text-sm text-slate-300 bg-black/10">
                  Drag & drop an image here, or click "Change Photo"
                </div>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0];
                  setUploadError("");
                  if (!f) return;
                  const okTypes = ["image/jpeg","image/png","image/webp"];
                  if (!okTypes.includes(f.type)) { setUploadError("Only JPG, PNG or WEBP allowed"); return; }
                  if (f.size <= 5 * 1024 * 1024) {
                    setPhotoFile(f);
                    setPhotoPreview(URL.createObjectURL(f));
                    return;
                  }
                  // try compressing using canvas
                  try {
                    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = URL.createObjectURL(f); });
                    const canvas = document.createElement('canvas');
                    const maxW = 1200;
                    const scale = Math.min(1, maxW / img.width);
                    canvas.width = img.width * scale;
                    canvas.height = img.height * scale;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    setUploadError("");
                    setUploadProgress(20);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    // convert to blob
                    const res = await fetch(dataUrl);
                    const blob = await res.blob();
                    if (blob.size > 5 * 1024 * 1024) { setUploadError('Image too large even after compression (5MB max)'); return; }
                    const compressedFile = new File([blob], f.name.replace(/\.[^/.]+$/, '') + '.jpg', { type: blob.type });
                    setPhotoFile(compressedFile);
                    setPhotoPreview(URL.createObjectURL(compressedFile));
                    setUploadProgress(100);
                  } catch (err) {
                    setUploadError('Failed to process image');
                  }
                }} />
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
