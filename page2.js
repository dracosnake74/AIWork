async function evaluateWriting() {
    const title = document.getElementById('article-title').value;
    const content = document.getElementById('article-content').value;
    const resultArea = document.getElementById('result-area');

    if (!content.trim()) {
        alert("Please paste your content first!");
        return;
    }

    resultArea.style.display = "block";
    document.getElementById('cefr-level').innerText = "Analyzing...";
    document.getElementById('total-score').innerText = "--";
    document.getElementById('grammar-check').innerText = "Checking...";
    document.getElementById('suggestions').innerText = "Generating...";

    const prompt = `
        You are an expert English writing examiner. 
        Evaluate this article:
        Title: "${title}"
        Content: "${content}"

        Return ONLY a JSON object with these keys:
        {
            "請用繁體中文回覆",
            "cefr": "Level (A1-C2)",
            "score": "Total score out of 100 (number only)",
            "grammar": "Point out grammar mistakes and corrections",
            "advice": "General suggestions for improvement"
        }
    `;

    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) {
            throw new Error(`伺服器連線錯誤：${response.status}`);
        }

        const data = await response.json();
        let rawText = data.candidates[0].content.parts[0].text;
        let cleanJson = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        const result = JSON.parse(cleanJson);

        document.getElementById('cefr-level').innerText = `CEFR: ${result.cefr}`;
        document.getElementById('total-score').innerText = result.score;
        document.getElementById('grammar-check').innerText = result.grammar;
        document.getElementById('suggestions').innerText = result.advice;

        const scoreElement = document.getElementById('total-score');
        if (result.score >= 80) {
            scoreElement.style.color = "#2e7d32";
        } else if (result.score >= 60) {
            scoreElement.style.color = "#f9a825";
        } else {
            scoreElement.style.color = "#d32f2f";
        }

        // 隱藏 token 計數：連點三下頁面標題 h1 顯示/隱藏
        const usage = data.usageMetadata || null;
        const h1 = document.querySelector('h1');
        if (h1 && !h1._tokenListenerAdded) {
            h1._tokenListenerAdded = true;
            let clicks = 0, timer = null;
            h1.style.cursor = 'default';
            h1.addEventListener('click', function () {
                clicks++;
                clearTimeout(timer);
                timer = setTimeout(function () { clicks = 0; }, 600);
                if (clicks >= 3) {
                    clicks = 0;
                    const on = h1.dataset.showing === '1';
                    h1.innerText = on ? 'AI 英語寫作評分'
                        : (usage ? '🔢 本次使用 ' + (usage.totalTokenCount || 0) + ' tokens' : '🔢 Token 資料不可用');
                    h1.dataset.showing = on ? '0' : '1';
                }
            });
        }

    } catch (error) {
        console.error("評分過程發生錯誤:", error);
        document.getElementById('cefr-level').innerText = "Error";
        document.getElementById('suggestions').innerText = "評分失敗，請檢查網路連線或稍後再試。";
    }
}
