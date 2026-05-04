let currentTopic = "";
let conversationHistory = []; // 記錄所有對話內容

// --- 1. 核心 AI 呼叫 (改為呼叫自己的 Vercel 後端) ---
async function askAI(promptText) {
    // 網址直接改成我們剛剛建立的後端檔案路徑
    const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { maxOutputTokens: 800, temperature: 0.7 }
        })
    });
    
    if (!response.ok) {
        throw new Error(`連線錯誤：${response.status}`);
    }
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// --- 2. 介面處理與功能掛載 (Append Message) ---
function appendMessage(sender, text) {
    const chatBox = document.getElementById('chat-box');
    const wrapper = document.createElement('div');
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.alignItems = sender === "user" ? "flex-end" : "flex-start";
    wrapper.style.marginBottom = "15px";
    
    const msgDiv = document.createElement('div');
    msgDiv.className = sender === "user" ? "user-msg" : "ai-msg";
    msgDiv.innerText = text;
    wrapper.appendChild(msgDiv);
    
    // 👑 恢復您的核心功能：如果是 AI 回覆，且不是 Loading(...)，就加入按鈕與語音
    if (sender === "ai" && !text.includes("...")) {
        const transBtn = document.createElement('button');
        transBtn.className = 'translate-btn';
        transBtn.innerText = "Translate 🌐";
        transBtn.onclick = () => translateMessage(text, msgDiv, transBtn);
        wrapper.appendChild(transBtn);
        
        // 觸發語音朗讀
        speakText(text);
    }
    
    chatBox.appendChild(wrapper);
    chatBox.scrollTop = chatBox.scrollHeight;
    return wrapper;
}

// --- 3. 翻譯功能 ---
async function translateMessage(text, msgDiv, btn) {
    btn.innerText = "Translating...";
    const prompt = `請將以下英文翻譯成繁體中文 (台灣用語)：\n"${text}"`;
    try {
        const translation = await askAI(prompt);
        const transDiv = document.createElement('div');
        transDiv.className = 'translation-text';
        transDiv.style.color = '#666';
        transDiv.style.fontSize = '0.9em';
        transDiv.style.marginTop = '5px';
        transDiv.innerText = translation;
        msgDiv.parentNode.insertBefore(transDiv, btn);
        btn.style.display = 'none'; // 翻譯完成後隱藏按鈕
    } catch (error) {
        btn.innerText = "Translate Failed";
    }
}

// --- 4. 語音朗讀功能 ---
function speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9; // 稍微放慢語速，適合英文學習
        window.speechSynthesis.speak(utterance);
    }
}

// --- 5. 語音辨識功能 (麥克風) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => { document.getElementById('mic-btn').innerText = "🔴"; };
    recognition.onresult = (e) => { document.getElementById('user-input').value = e.results[0][0].transcript; };
    recognition.onend = () => { document.getElementById('mic-btn').innerText = "🎤"; };
}
function startVoiceRecognition() { 
    if (recognition) recognition.start(); 
    else alert("您的瀏覽器不支援語音辨識功能。");
}

// --- 6. 啟動對話 ---
async function startConversation(topic) {
    currentTopic = topic;
    conversationHistory = []; // 重置對話紀錄
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = '';
    // 顯示結束按鈕
    document.getElementById('end-btn-wrap').style.display = 'flex';
    appendMessage("user", `Let's talk about ${topic}.`);
    const loadingMsg = appendMessage("ai", "Teacher is preparing a topic...");
    
    const startPrompt = `You are a professional English tutor. Topic: "${topic}". Rules: 1. Keep it short. 2. Ask a question to start the conversation.`; 
    
    try {
        const reply = await askAI(startPrompt);
        loadingMsg.remove();
        appendMessage("ai", reply);
        conversationHistory.push({ role: 'ai', text: reply });
    } catch (error) {
        loadingMsg.innerHTML = `<div class="ai-msg">連線發生錯誤，請檢查網路。</div>`;
    }
}

// --- 7. 發送使用者訊息 ---
async function sendUserMessage() {
    const inputField = document.getElementById('user-input');
    const text = inputField.value.trim();
    if (!text) return;
    appendMessage("user", text);
    conversationHistory.push({ role: 'user', text });
    inputField.value = '';
    
    const loadingMsg = appendMessage("ai", "...");
    const prompt = `Topic: ${currentTopic}. Student says: "${text}". Reply as an English tutor naturally, keep it short and ask a follow-up question.`;
    
    try {
        const reply = await askAI(prompt);
        loadingMsg.remove();
        appendMessage("ai", reply);
        conversationHistory.push({ role: 'ai', text: reply });
    } catch (error) {
        loadingMsg.innerHTML = `<div class="ai-msg">連線發生錯誤，請檢查網路。</div>`;
    }
}

// --- 8. 結束對話並取得口說建議 ---
async function endConversation() {
    if (conversationHistory.length === 0) {
        alert('還沒有對話內容，請先開始對話！');
        return;
    }

    // 隱藏結束按鈕，避免重複點擊
    document.getElementById('end-btn-wrap').style.display = 'none';

    // 整理對話紀錄成文字
    const transcript = conversationHistory
        .map(m => (m.role === 'user' ? '學生：' : 'AI老師：') + m.text)
        .join('\n');

    // 在聊天框加入分隔與 loading
    const chatBox = document.getElementById('chat-box');
    const divider = document.createElement('div');
    divider.style.cssText = 'text-align:center;color:var(--text3);font-size:0.75rem;padding:8px 0;border-top:1px solid var(--border);margin-top:4px';
    divider.innerText = '── 對話結束 · AI 口說建議 ──';
    chatBox.appendChild(divider);

    const loadingMsg = appendMessage("ai", "AI 正在分析你的口說表現...");

        const prompt = `以下是一段英語口說練習的對話紀錄：

\${transcript}

請用繁體中文，針對「學生」的發言，分三個部分提供完整的口說建議：

**1. 優點**
指出學生說得好的地方（1-2點）

**2. 文法與用字建議**
指出錯誤並給出正確說法（列出具體例子）

**3. 進階表達**
提供 1～2 個更自然道地的替換句型

語氣鼓勵、清楚易懂。`;

    try {
        const reply = await askAI(prompt, 1500);
        loadingMsg.remove();

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;margin-bottom:10px;animation:msgIn 0.2s ease';
        const card = document.createElement('div');
        card.style.cssText = [
            'background:linear-gradient(135deg,rgba(91,141,245,0.1),rgba(167,139,250,0.07))',
            'border:1px solid rgba(91,141,245,0.22)',
            'border-radius:14px',
            'border-bottom-left-radius:4px',
            'padding:16px 18px',
            'font-size:0.88rem',
            'line-height:1.75',
            'color:var(--text2)',
            'max-width:92%',
        ].join(';');

        const label = document.createElement('div');
        label.style.cssText = 'font-size:0.68rem;text-transform:uppercase;letter-spacing:1px;color:var(--blue);font-weight:600;margin-bottom:10px';
        label.innerText = '📊 口說建議報告';
        card.appendChild(label);

        const body = document.createElement('div');
        body.innerHTML = renderMarkdown(reply);
        card.appendChild(body);

        wrapper.appendChild(card);
        chatBox.appendChild(wrapper);
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (error) {
        loadingMsg.innerHTML = '<div class="ai-msg">建議生成失敗，請稍後再試。</div>';
    }
}



