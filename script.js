let currentTopic = "";

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
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = ''; 
    appendMessage("user", `Let's talk about ${topic}.`);
    const loadingMsg = appendMessage("ai", "Teacher is preparing a topic...");
    
    const startPrompt = `You are a professional English tutor. Topic: "${topic}". Rules: 1. Keep it short. 2. Ask a question to start the conversation.`; 
    
    try {
        const reply = await askAI(startPrompt);
        loadingMsg.remove(); // 移除 loading 訊息
        appendMessage("ai", reply); // 呼叫 AI 回覆，這會自動觸發語音和翻譯按鈕
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
    inputField.value = '';
    
    const loadingMsg = appendMessage("ai", "...");
    const prompt = `Topic: ${currentTopic}. Student says: "${text}". Reply as an English tutor naturally, keep it short and ask a follow-up question.`;
    
    try {
        const reply = await askAI(prompt);
        loadingMsg.remove();
        appendMessage("ai", reply);
    } catch (error) {
        loadingMsg.innerHTML = `<div class="ai-msg">連線發生錯誤，請檢查網路。</div>`;
    }
}



