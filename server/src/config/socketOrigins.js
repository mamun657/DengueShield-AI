const defaultOrigins = [
  "http://localhost:5173",
  "https://dengueshield-ai.onrender.com",
  "https://dengueshield-ui.onrender.com",
];

const getSocketOrigins = () => {
  const origins = [...defaultOrigins];
  if (process.env.CLIENT_URL) {
    const url = process.env.CLIENT_URL.trim();
    if (url && !origins.includes(url)) origins.push(url);
  }
  return origins;
};

module.exports = { getSocketOrigins };
