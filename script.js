// --- 優先讀取 GitHub Actions 注入的變數 ---
// 注意：不要在這裡填寫任何實體金鑰，留空即可，以防讀取到外洩的舊金鑰
const API_KEY = window.ENV_CONFIG?.API_KEY || ""; 

let currentTopic = "";

// --- 1. 核心 AI 呼叫 ---
async function askAI(promptText) {
    if (!API_KEY) {
        console.error("API Key 遺失！請確認 GitHub Secrets 是否有正確注入。");
        return "系統提示：API 金鑰尚未載入或遺失。";
    }

    // 使用您確認過的 2.5 flash 模型
    const MODEL_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

    const response = await fetch(MODEL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: { maxOutputTokens: 800, temperature: 0.7 }
        })
    });
    
    if (!response.ok) {
        throw new Error(`API 請求失敗，狀態碼：${response.status}`);
    }
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

// ==========================================
// 下方保留您原本的 UI 與語音程式碼，完全不用動
// ==========================================
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
    chatBox.appendChild(wrapper);
    chatBox.scrollTop = chatBox.scrollHeight;
    return wrapper;
}

// --- 2. 啟動對話 ---
async function startConversation(topic) {
    currentTopic = topic;
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = ''; 
    appendMessage("user", `Let's talk about ${topic}.`);
    const loadingMsg = appendMessage("ai", "Teacher is preparing a topic...");
    const startPrompt = `You are a professional English tutor. Topic: ${topic}. Start a short conversation.`;
    
    try {
        const reply = await askAI(startPrompt);
        loadingMsg.innerHTML = `<div class="ai-msg">${reply}</div>`;
    } catch (error) {
        loadingMsg.innerHTML = `<div class="ai-msg">連線發生錯誤，請按 F12 檢查金鑰狀態。</div>`;
    }
}

// --- 3. 發送訊息 ---
async function sendUserMessage() {
    const inputField = document.getElementById('user-input');
    const text = inputField.value.trim();
    if (!text) return;
    appendMessage("user", text);
    inputField.value = '';
    const loadingMsg = appendMessage("ai", "...");
    const prompt = `Topic: ${currentTopic}. Student says: "${text}". Reply as an English tutor naturally.`;
    
    try {
        const reply = await askAI(prompt);
        loadingMsg.innerHTML = `<div class="ai-msg">${reply}</div>`;
    } catch (error) {
        loadingMsg.innerHTML = `<div class="ai-msg">連線發生錯誤，請檢查網路或 API 設定。</div>`;
    }
}
