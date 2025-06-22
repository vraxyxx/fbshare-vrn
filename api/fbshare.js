const axios = require("axios");

const serverUrls = {
  server1: "https://server1-u9fw.onrender.com",
  server2: "https://server-2-aggj.onrender.com",
  server3: "https://server-3-p6lg.onrender.com",
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { cookie, url, amount, interval, server } = req.body;

  if (!cookie || !url || !amount || !interval || !server || !serverUrls[server]) {
    return res.status(400).json({ message: "Missing or invalid input." });
  }

  try {
    const response = await axios.post(`${serverUrls[server]}/api/submit`, {
      cookie,
      url,
      amount,
      interval
    }, {
      headers: { "Content-Type": "application/json" }
    });

    const data = response.data;
    return res.status(200).json({
      message: data.message || "Boost request submitted successfully."
    });
  } catch (error) {
    console.error("Boost Error:", error.response?.data || error.message);
    return res.status(500).json({
      message: "Error submitting boost request to server."
    });
  }
}
