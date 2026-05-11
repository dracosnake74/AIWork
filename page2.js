async function evaluateWriting() {
    var title = document.getElementById('article-title').value;
    var content = document.getElementById('article-content').value;
    var resultArea = document.getElementById('result-area');

    if (!content.trim()) { alert('Please paste your content first!'); return; }

    resultArea.style.display = 'block';
    document.getElementById('cefr-level').innerText = 'Analyzing...';
    document.getElementById('total-score').innerText = '--';
    document.getElementById('grammar-check').innerText = 'Checking...';
    document.getElementById('suggestions').innerText = 'Generating...';

    var prompt = '你是一位專業的英語寫作評審。請評估以下文章：\n'
        + '標題：「' + title + '」\n'
        + '內容：「' + content + '」\n\n'
        + '請用繁體中文回覆，grammar 和 advice 各自限制在 80 字以內。\n'
        + '只回傳 JSON，不要任何說明或 markdown：\n'
        + '{"cefr":"等級A1-C2","score":"數字","grammar":"文法建議","advice":"改進建議"}';

    try {
        var response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 600, temperature: 0.3 }
            })
        });

        if (!response.ok) throw new Error('伺服器連線錯誤：' + response.status);

        var data = await response.json();
        var rawText = data.candidates[0].content.parts[0].text;

        // 找到 { 和最後一個 } 直接截取，避免 markdown 干擾
        var start = rawText.indexOf('{');
        var end = rawText.lastIndexOf('}');
        if (start === -1 || end === -1) throw new Error('回應格式錯誤');
        var result = JSON.parse(rawText.substring(start, end + 1));

        var cefrEl = document.getElementById('cefr-level');
        cefrEl.innerText = 'CEFR: ' + result.cefr;
        cefrEl.title = '連點三下查看 Token 用量';
        cefrEl.style.cursor = 'pointer';

        document.getElementById('total-score').innerText = result.score;
        document.getElementById('grammar-check').innerText = result.grammar;
        document.getElementById('suggestions').innerText = result.advice;

        var scoreEl = document.getElementById('total-score');
        scoreEl.style.color = result.score >= 80 ? 'var(--green)' : result.score >= 60 ? 'var(--orange)' : 'var(--red)';

        // 隱藏 token 計數（連點三下 CEFR 標籤）
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
        document.getElementById('suggestions').innerText = '評分失敗：' + error.message;
    }
}
