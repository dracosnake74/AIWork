export default async function handler(req, res) {
    // 限制只能用 POST 方法呼叫
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 從 Vercel 的安全保險箱讀取金鑰
    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
        return res.status(500).json({ error: '金鑰未設定' });
    }

    // Google API 網址 (維持使用 2.5 flash)
    const MODEL_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

    try {
        // 將前端傳來的問題，轉交給 Google
        const response = await fetch(MODEL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body) // 這裡裝著您的問題
        });

        const data = await response.json();
        
        // 把 Google 的回答傳回給前端網頁
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
