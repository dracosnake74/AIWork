// --- 修改重點：優先讀取 GitHub Actions 注入的變數 ---
const API_KEY = window.ENV_CONFIG?.API_KEY || ""; 
// 使用 2.5 Flash 版本，速度快且對 JSON 格式支援度高
const MODEL_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

async function evaluateWriting() {
    const title = document.getElementById('article-title').value;
    const content = document.getElementById('article-content').value;
    const resultArea = document.getElementById('result-area');

    if (!content.trim()) {
        alert("Please paste your content first!");
        return;
    }

    // 1. 顯示評分中狀態
    resultArea.style.display = "block";
    document.getElementById('cefr-level').innerText = "Analyzing...";
    document.getElementById('total-score').innerText = "--";
    document.getElementById('grammar-check').innerText = "Checking...";
    document.getElementById('suggestions').innerText = "Generating...";

    // 2. 設定給 AI 的指令 (要求嚴格的 JSON 格式)
    const prompt = `
        You are an expert English writing examiner. 
        Evaluate this article:
        Title: "${title}"
        Content: "${content}"

        Return ONLY a JSON object with these keys:
        {
            "cefr": "Level (A1-C2)",
            "score": number (0-100),
            "grammar": "Point out major errors and provide corrections (in Traditional Chinese)",
            "advice": "General advice for improvement (in Traditional Chinese)"
        }
    `;

    try {
        const response = await fetch(MODEL_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        
        // 取得 AI 回傳的文字
        let rawText = data.candidates[0].content.parts[0].text;
        
        // --- 核心修正：清理 AI 可能帶有的 Markdown 標籤 ---
        let cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        
        // 解析成 JavaScript 物件
        const result = JSON.parse(cleanJson);

        // 3. 填入資料到 HTML 元件中
        document.getElementById('cefr-level').innerText = `CEFR: ${result.cefr}`;
        document.getElementById('total-score').innerText = result.score; // 顯示總分
        document.getElementById('grammar-check').innerText = result.grammar;
        document.getElementById('suggestions').innerText = result.advice;

        // 4. 加分效果：根據分數改變顏色
        const scoreElement = document.getElementById('total-score');
        if (result.score >= 80) {
            scoreElement.style.color = "#2e7d32"; // 綠色 (優)
        } else if (result.score >= 60) {
            scoreElement.style.color = "#f9a825"; // 黃色 (及格)
        } else {
            scoreElement.style.color = "#d32f2f"; // 紅色 (需努力)
        }

        // 捲動到結果區塊
        resultArea.scrollIntoView({ behavior: 'smooth' });

    } catch (e) {
        console.error("Evaluation failed:", e);
        alert("Evaluation failed. Please check your internet or try again later.");
    }

}
