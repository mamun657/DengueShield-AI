const hospitals = [
  // Dhaka
  { name: "Dhaka Medical College Hospital (DMCH)", lat: 23.7261, lng: 90.3976, address: "Dhaka Medical College Hospital, Secretariat, Dhaka, Bangladesh" },
  { name: "Square Hospitals Ltd.", lat: 23.7533, lng: 90.3815, address: "Square Hospitals Ltd., Panthapath, Dhaka, Bangladesh" },
  { name: "United Hospital Limited", lat: 23.8052, lng: 90.4158, address: "United Hospital Limited, Gulshan, Dhaka, Bangladesh" },
  { name: "Evercare Hospital Dhaka", lat: 23.8105, lng: 90.4312, address: "Evercare Hospital Dhaka, Gulshan, Dhaka, Bangladesh" },
  { name: "Labaid Specialized Hospital", lat: 23.7417, lng: 90.3833, address: "Labaid Specialized Hospital, Panthapath, Dhaka, Bangladesh" },
  { name: "Ibn Sina Hospital", lat: 23.7508, lng: 90.3705, address: "Ibn Sina Hospital, Motijheel, Dhaka, Bangladesh" },
  { name: "BIRDEM General Hospital", lat: 23.7389, lng: 90.3956, address: "BIRDEM General Hospital, Secretariat, Dhaka, Bangladesh" },
  { name: "Kurmitola General Hospital", lat: 23.8189, lng: 90.4042, address: "Kurmitola General Hospital, Kurmitola, Dhaka, Bangladesh" },
  { name: "Sir Salimullah Medical College Hospital", lat: 23.7126, lng: 90.3986, address: "Sir Salimullah Medical College Hospital, Mitford, Dhaka, Bangladesh" },
  { name: "Holy Family Red Crescent Medical College", lat: 23.7455, lng: 90.4025, address: "Holy Family Red Crescent Medical College, Manik Nagar, Dhaka, Bangladesh" },
  { name: "Bangladesh Specialized Hospital", lat: 23.7716, lng: 90.3663, address: "Bangladesh Specialized Hospital, Malibagh, Dhaka, Bangladesh" },
  { name: "Asgar Ali Hospital", lat: 23.6961, lng: 90.4194, address: "Asgar Ali Hospital, Farmgate, Dhaka, Bangladesh" },
  { name: "Shaheed Suhrawardy Medical College", lat: 23.7634, lng: 90.3734, address: "Shaheed Suhrawardy Medical College, Sher-e-Bangla Nagar, Dhaka, Bangladesh" },
  { name: "Mugda Medical College and Hospital", lat: 23.7335, lng: 90.4284, address: "Mugda Medical College and Hospital, Munshiganj, Dhaka, Bangladesh" },
  { name: "National Institute of Diseases of the Chest", lat: 23.7744, lng: 90.4005, address: "National Institute of Diseases of the Chest, Shantinagar, Dhaka, Bangladesh" },
  { name: "Dhaka Shishu (Children) Hospital", lat: 23.7725, lng: 90.3686, address: "Dhaka Shishu Hospital, Sher-e-Bangla Nagar, Dhaka, Bangladesh" },
  
  // Chittagong
  { name: "Chittagong Medical College Hospital", lat: 22.3569, lng: 91.8291, address: "Chittagong Medical College Hospital, Nasirabad, Chattogram, Bangladesh" },
  { name: "Evercare Hospital Chattogram", lat: 22.3853, lng: 91.8102, address: "Evercare Hospital Chattogram, Halishahar, Chattogram, Bangladesh" },
  { name: "Max Hospital & Diagnostics", lat: 22.3591, lng: 91.8213, address: "Max Hospital & Diagnostics, Nasirabad, Chattogram, Bangladesh" },
  { name: "Imperial Hospital Limited", lat: 22.3524, lng: 91.7946, address: "Imperial Hospital Limited, Chawkbazar, Chattogram, Bangladesh" },
  { name: "Parkview Hospital", lat: 22.3575, lng: 91.8285, address: "Parkview Hospital, Nasirabad, Chattogram, Bangladesh" },
  { name: "Epic Health Care", lat: 22.3598, lng: 91.8252, address: "Epic Health Care, Nasirabad, Chattogram, Bangladesh" },
  { name: "CSCR Hospital", lat: 22.3546, lng: 91.8282, address: "CSCR Hospital, Nasirabad, Chattogram, Bangladesh" },

  // Sylhet
  { name: "Sylhet MAG Osmani Medical College", lat: 24.9015, lng: 91.8541, address: "Sylhet MAG Osmani Medical College, Sylhet, Bangladesh" },
  { name: "Mount Adora Hospital", lat: 24.8973, lng: 91.8672, address: "Mount Adora Hospital, Sylhet, Bangladesh" },
  { name: "Al Haramain Hospital", lat: 24.8814, lng: 91.8765, address: "Al Haramain Hospital, Sylhet, Bangladesh" },
  { name: "Ibn Sina Hospital Sylhet", lat: 24.9019, lng: 91.8687, address: "Ibn Sina Hospital Sylhet, Sylhet, Bangladesh" },
  { name: "Oasis Hospital", lat: 24.8988, lng: 91.8741, address: "Oasis Hospital, Sylhet, Bangladesh" },

  // Rajshahi
  { name: "Rajshahi Medical College Hospital", lat: 24.3721, lng: 88.5866, address: "Rajshahi Medical College Hospital, Rajshahi, Bangladesh" },
  { name: "Islami Bank Medical College Hospital", lat: 24.3801, lng: 88.6015, address: "Islami Bank Medical College Hospital, Rajshahi, Bangladesh" },
  { name: "Popular Diagnostic Centre Rajshahi", lat: 24.3745, lng: 88.5982, address: "Popular Diagnostic Centre Rajshahi, Rajshahi, Bangladesh" },

  // Khulna
  { name: "Khulna Medical College Hospital", lat: 22.8256, lng: 89.5312, address: "Khulna Medical College Hospital, Khulna, Bangladesh" },
  { name: "Gazi Medical College Hospital", lat: 22.8123, lng: 89.5498, address: "Gazi Medical College Hospital, Khulna, Bangladesh" },
  { name: "City Medical College Hospital Khulna", lat: 22.8315, lng: 89.5413, address: "City Medical College Hospital Khulna, Khulna, Bangladesh" },

  // Barisal
  { name: "Sher-e-Bangla Medical College Hospital", lat: 22.6874, lng: 90.3523, address: "Sher-e-Bangla Medical College Hospital, Barisal, Bangladesh" },
  { name: "Rahat Anwar Hospital", lat: 22.6951, lng: 90.3601, address: "Rahat Anwar Hospital, Barisal, Bangladesh" },

  // Rangpur
  { name: "Rangpur Medical College Hospital", lat: 25.7601, lng: 89.2425, address: "Rangpur Medical College Hospital, Rangpur, Bangladesh" },
  { name: "Prime Medical College Hospital", lat: 25.7335, lng: 89.2405, address: "Prime Medical College Hospital, Rangpur, Bangladesh" },

  // Mymensingh
  { name: "Mymensingh Medical College Hospital", lat: 24.7423, lng: 90.4075, address: "Mymensingh Medical College Hospital, Mymensingh, Bangladesh" },
  { name: "Community Based Medical College Hospital", lat: 24.7221, lng: 90.3951, address: "Community Based Medical College Hospital, Mymensingh, Bangladesh" }
];

module.exports = hospitals;
