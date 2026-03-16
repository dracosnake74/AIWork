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
            "score": "Total score out of 100 (number only)",
            "grammar": "Point out grammar mistakes and corrections",
            "advice": "General suggestions for improvement"
        }
    `;

    try {
        // --- 核心修正：呼叫您建立的 Vercel 後端 API，不再直接呼叫 Google ---
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) {
            throw new Error(`伺服器連線錯誤：${response.status}`);
        }

        const data = await response.json();
        
        // 取得 AI 回傳的文字
        let rawText = data.candidates[0].content.parts[0].text;
        
        // --- 清理 AI 可能帶有的 Markdown 標籤 ---
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
            scoreElement.style.color = "#d32f2f"; // 紅色 (待加強)
        }

    } catch (error) {
        console.error("評分過程發生錯誤:", error);
        document.getElementById('cefr-level').innerText = "Error";
        document.getElementById('suggestions').innerText = "評分失敗，請檢查網路連線或稍後再試。";
    }
}
