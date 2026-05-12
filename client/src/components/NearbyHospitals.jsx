import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import api from "../api";

// Fix Leaflet's default icon path issues and create custom premium markers
const createUserIcon = () =>
  new L.DivIcon({
    html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-pulse"></div>`,
    className: "bg-transparent",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

const createHospitalIcon = (isNearest) =>
  new L.DivIcon({
    html: `
      <div class="relative group transform transition-transform hover:scale-110">
        <div class="absolute -top-6 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 ${
          isNearest ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]" : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
        }"></div>
        <div class="relative w-7 h-7 ${
          isNearest ? "bg-red-600 border-red-300" : "bg-emerald-600 border-emerald-300"
        } rounded-full border-2 shadow-lg flex items-center justify-center z-10 text-white font-bold" style="font-size: 11px;">
          H
        </div>
      </div>
    `,
    className: "bg-transparent",
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });

// Component to recenter the map dynamically
const RecenterMap = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], 13, { animate: true });
    }
  }, [lat, lng, map]);
  return null;
};

const NearbyHospitals = ({ riskScore }) => {
  const [hospitals, setHospitals] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [locationStatus, setLocationStatus] = useState("");

  const isHighRisk = riskScore > 65;

  const fetchNearbyHospitals = () => {
    setLoading(true);
    setError(null);
    setLocationStatus("Getting your location...");

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLoading(false);
      setLocationStatus("");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          setLocationStatus("Scanning for hospitals...");
          const { latitude, longitude } = position.coords;
          
          setUserLocation({ lat: latitude, lng: longitude });

          // API Call to Node.js backend
          const response = await api.get(`/hospitals/nearby?lat=${latitude}&lng=${longitude}`);
          setHospitals(response.data.hospitals);
          setLocationStatus("");
        } catch (err) {
          console.error("Error fetching hospitals:", err);
          setError("Failed to fetch nearby hospitals. Please check your connection.");
          setLocationStatus("");
        } finally {
          setLoading(false);
        }
      },
      (geoError) => {
        console.error("Geolocation error:", geoError);
        setError("Location access denied. Please allow location access to find hospitals.");
        setLoading(false);
        setLocationStatus("");
      },
      { timeout: 15000, enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if (isHighRisk) {
      fetchNearbyHospitals();
    }
  }, [isHighRisk]);

  const nearestHospital = hospitals.length > 0 ? hospitals[0] : null;
  const noHospitalsWithin20km = nearestHospital && nearestHospital.distanceKm > 20;

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 bg-[#0f172a] text-slate-200 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] mt-8 border border-slate-800 relative overflow-hidden">
      {/* Decorative gradient background */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span className="bg-blue-500/20 p-2 rounded-xl text-blue-400">🏥</span> 
              Nearby Hospitals
            </h2>
            <p className="text-sm text-slate-400 mt-2 font-medium">Real-time health facility tracking</p>
          </div>
          {hospitals.length > 0 && !loading && (
            <button
              onClick={fetchNearbyHospitals}
              className="text-sm px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-all flex items-center gap-2 border border-white/10 hover:shadow-lg backdrop-blur-md"
            >
              <span className="text-blue-400 text-lg leading-none">↻</span> Refresh
            </button>
          )}
        </div>

        {isHighRisk && (
          <div className="mb-8 p-5 bg-red-500/10 border border-red-500/50 rounded-xl flex items-start sm:items-center gap-4 shadow-[0_0_20px_rgba(239,68,68,0.15)] animate-pulse backdrop-blur-md">
            <span className="text-3xl">🚨</span>
            <div>
              <h3 className="text-red-400 font-bold text-lg sm:text-xl">High dengue risk detected!</h3>
              <p className="text-red-300/80 font-medium text-sm sm:text-base mt-0.5">Go to the nearest hospital immediately.</p>
            </div>
          </div>
        )}

        {!isHighRisk && hospitals.length === 0 && !loading && !error && (
          <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner">
            <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-[0_0_30px_rgba(59,130,246,0.4)]">
              📍
            </div>
            <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Find Healthcare Centers</h3>
            <p className="text-slate-400 mb-8 max-w-md mx-auto text-sm sm:text-base leading-relaxed">
              Enable your location to instantly discover the best hospitals and dengue care facilities near you.
            </p>
            <button
              onClick={fetchNearbyHospitals}
              className="py-3.5 px-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-full shadow-[0_10px_25px_rgba(37,99,235,0.4)] transition-all duration-300 transform hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(37,99,235,0.5)]"
            >
              Scan for Hospitals
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
            <div className="relative w-20 h-20 mb-8">
              <div className="absolute inset-0 rounded-full border-t-4 border-blue-500 animate-spin opacity-80"></div>
              <div className="absolute inset-3 rounded-full border-r-4 border-indigo-400 animate-spin opacity-80" style={{ animationDirection: 'reverse', animationDuration: '1.2s' }}></div>
              <div className="absolute inset-6 rounded-full border-b-4 border-teal-400 animate-spin opacity-80" style={{ animationDuration: '1s' }}></div>
            </div>
            <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 animate-pulse">
              {locationStatus}
            </p>
          </div>
        )}

        {error && (
          <div className="text-center py-16 bg-red-500/5 text-red-400 rounded-2xl border border-red-500/20 backdrop-blur-md">
            <span className="text-5xl block mb-6 drop-shadow-lg">🚫</span>
            <p className="font-semibold text-lg mb-8 max-w-md mx-auto leading-relaxed">{error}</p>
            <button
              onClick={fetchNearbyHospitals}
              className="px-8 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-full text-sm font-bold transition-all border border-red-500/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
            >
              Try Again
            </button>
          </div>
        )}

        {hospitals.length > 0 && !loading && (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Map Container - Premium look */}
            <div className="w-full lg:w-1/2 h-[450px] lg:h-[600px] rounded-2xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/10 relative z-0 bg-slate-900 group">
              {userLocation && (
                <MapContainer
                  center={[userLocation.lat, userLocation.lng]}
                  zoom={13}
                  style={{ height: "100%", width: "100%", zIndex: 1 }}
                  zoomControl={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright" class="text-slate-400">OpenStreetMap</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  />
                  
                  <RecenterMap lat={userLocation.lat} lng={userLocation.lng} />

                  <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserIcon()}>
                    <Popup className="font-semibold text-slate-800">Your Location</Popup>
                  </Marker>

                  {hospitals.map((h, idx) => (
                    <Marker
                      key={idx}
                      position={[h.lat, h.lng]}
                      icon={createHospitalIcon(idx === 0)}
                    >
                      <Popup>
                        <div className="p-2 min-w-[150px]">
                          <h4 className="font-extrabold text-slate-800 text-base">{h.name}</h4>
                          <p className="text-sm font-medium text-slate-500 mt-1">{h.distanceKm} km away</p>
                          {idx === 0 && (
                            <span className="inline-block mt-3 text-[10px] font-bold bg-red-100 text-red-700 px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                              Nearest Facility
                            </span>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              )}
              
              {/* Inner shadow overlay for depth */}
              <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.6)] z-10"></div>
            </div>

            {/* Premium Glassmorphism List */}
            <div className="w-full lg:w-1/2 flex flex-col">
              {noHospitalsWithin20km && (
                <div className="mb-6 text-sm bg-orange-500/10 text-orange-400 p-4 rounded-xl border border-orange-500/20 flex items-start gap-3 backdrop-blur-sm shadow-lg">
                  <span className="text-xl">⚠️</span>
                  <p className="pt-0.5 font-medium leading-relaxed">
                    No nearby hospitals found within 20km. Showing closest available options.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-4 overflow-y-auto max-h-[600px] pr-2 pb-4 scroll-smooth">
                {hospitals.map((hospital, index) => (
                  <div
                    key={index}
                    className={`bg-white/5 border ${
                      index === 0 
                        ? "border-red-500/40 shadow-[0_8px_30px_rgba(239,68,68,0.15)] bg-gradient-to-r from-red-500/10 to-transparent" 
                        : "border-white/10"
                    } hover:shadow-2xl hover:scale-[1.02] hover:bg-white/10 transition-all duration-300 rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row justify-between sm:items-center gap-5 group backdrop-blur-xl relative overflow-hidden`}
                  >
                    {/* Subtle shine effect on hover */}
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent group-hover:animate-[shimmer_1s_infinite] pointer-events-none"></div>

                    <div className="flex-1 relative z-10">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`font-extrabold text-lg sm:text-xl ${index === 0 ? "text-white" : "text-slate-200"} group-hover:text-white transition-colors`}>
                          🏥 {hospital.name}
                        </h3>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <p className="text-sm font-medium text-slate-400 bg-black/20 px-3 py-1 rounded-full w-fit flex items-center gap-1.5 border border-white/5">
                          <span className="text-slate-300">📏</span> {hospital.distanceKm} km away
                        </p>
                        
                        {index === 0 && (
                          <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse"></div>
                            Nearest
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <a
                      href={hospital.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`shrink-0 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 relative z-10 ${
                        index === 0
                          ? "bg-red-500 hover:bg-red-600 text-white shadow-[0_4px_20px_0_rgba(239,68,68,0.4)] hover:shadow-[0_8px_25px_rgba(239,68,68,0.5)] border border-red-400/50"
                          : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_4px_20px_0_rgba(16,185,129,0.3)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.4)] border border-emerald-400/50"
                      }`}
                    >
                      <span className="text-base">📍</span> Open Map
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx="true">{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};

export default NearbyHospitals;
