// --- 優先讀取 GitHub Actions 注入的變數 ---
// 注意：將後方的預留金鑰留空，避免意外讀取到已外洩的舊金鑰
const API_KEY = window.ENV_CONFIG?.API_KEY || ""; 

let currentTopic = "";

// --- 1. 核心 AI 呼叫 ---
async function askAI(promptText) {
    if (!API_KEY) {
        console.error("API Key 遺失！請確認 GitHub Secrets 是否有正確注入。");
        return "System Error: API Key is missing.";
    }

    // 完美支援最新的 gemini-2.5-flash 模型
    const MODEL_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

    const response = await fetch(MODEL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { maxOutputTokens: 800, temperature: 0.7 }
        })
    });
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// ... 下方保留您原本的 UI 與語音程式碼 ...
