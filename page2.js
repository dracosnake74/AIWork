async function evaluateWriting() {
    const title = document.getElementById('article-title').value;
    const content = document.getElementById('article-content').value;
    const resultArea = document.getElementById('result-area');

    if (!content.trim()) { alert('Please paste your content first!'); return; }

    resultArea.style.display = 'block';
    document.getElementById('cefr-level').innerText = 'Analyzing...';
    document.getElementById('total-score').innerText = '--';
    document.getElementById('grammar-check').innerText = 'Checking...';
    document.getElementById('suggestions').innerText = 'Generating...';

    const prompt = `你是一位專業的英語寫作評審。請評估以下文章：
標題：「${title}」
內容：「${content}」

請用繁體中文回覆，且 grammar 和 advice 各自嚴格限制在 100 個字以內。
只回傳 JSON，不要加任何說明：
{
  "cefr": "等級 (A1-C2)",
  "score": "100分制總分（只填數字）",
  "grammar": "指出文法錯誤與修正建議（繁體中文，100字以內）",
  "advice": "整體改進建議（繁體中文，100字以內）"
}`;

    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 1000, temperature: 0.4 } })
        });
        if (!response.ok) throw new Error('伺服器連線錯誤：' + response.status);

        const data = await response.json();
        let rawText = data.candidates[0].content.parts[0].text;
        let cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleanJson);

        var cefrEl = document.getElementById('cefr-level');
        cefrEl.innerText = 'CEFR: ' + result.cefr;
        cefrEl.title = '連點三下查看 Token 用量';
        cefrEl.style.cursor = 'pointer';

        document.getElementById('total-score').innerText = result.score;
        document.getElementById('grammar-check').innerText = result.grammar;
        document.getElementById('suggestions').innerText = result.advice;

        const scoreEl = document.getElementById('total-score');
        scoreEl.style.color = result.score >= 80 ? 'var(--green)' : result.score >= 60 ? 'var(--orange)' : 'var(--red)';

        // Hidden token counter (triple-click CEFR badge)
        var usage = data.usageMetadata || null;
        (function(el, u) {
            var clicks = 0, timer = null;
            el.addEventListener('click', function() {
                clicks++; clearTimeout(timer);
                timer = setTimeout(function() { clicks = 0; }, 600);
                if (clicks >= 3) {
                    clicks = 0;
                    var on = el.dataset.showing === '1';
                    el.innerText = on ? 'CEFR: ' + result.cefr
                        : (u ? '🔢 ' + (u.totalTokenCount || 0) + ' tokens' : '🔢 無資料');
                    el.dataset.showing = on ? '0' : '1';
                }
            });
        })(cefrEl, usage);

    } catch (error) {
        console.error('評分過程發生錯誤:', error);
        document.getElementById('cefr-level').innerText = 'Error';
        document.getElementById('suggestions').innerText = '評分失敗，請檢查網路連線或稍後再試。';
    }
}
