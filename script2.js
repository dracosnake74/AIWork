// --- 修改重點：優先讀取 GitHub Actions 注入的變數 ---
const API_KEY = window.ENV_CONFIG?.API_KEY || "";
const MODEL_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
let currentTopic = "";

// --- 1. 核心 AI 呼叫 ---
async function askAI(promptText) {
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

// --- 2. 啟動對話 (初學者模式) ---
async function startConversation(topic) {
    currentTopic = topic;
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = ''; 
    const loadingMsg = appendMessage("ai", "Teacher is preparing a simple lesson...");
    const startPrompt = `You are "English Teacher", a kind tutor for a "Baby level" beginner. Topic: "${topic}". Rules: 1. NO GREETINGS. 2. Speak simply (A1 level). 3. ONE short sentence and a tiny question.`;
    try {
        const reply = await askAI(startPrompt);
        loadingMsg.remove();
        appendMessage("ai", reply);
    } catch (e) { loadingMsg.innerText = "Error! Please refresh."; }
}

// --- 3. 發送訊息 ---
async function sendUserMessage() {
    const input = document.getElementById('user-input');
    const userText = input.value.trim();
    if (!userText || !currentTopic) return;
    appendMessage("user", userText);
    input.value = ""; 
    const loadingMsg = appendMessage("ai", "Teacher is listening...");
    const instruction = `ROLE: Kind English Teacher. LEARNER: Baby level. Rules: 1. English only. 2. IF broken: "Good try! You can say: [Simple sentence]". 3. BE ENCOURAGING. 4. SHORT.`;
    try {
        const reply = await askAI(instruction);
        loadingMsg.remove(); 
        appendMessage("ai", reply);
    } catch (e) { loadingMsg.innerText = "Error..."; }
}

// --- 4. 翻譯與語音 (慢速) ---
async function translateMessage(text, containerElement, btnElement) {
    if (containerElement.querySelector('.translation-text')) return;
    btnElement.innerText = "Translating...";
    const transPrompt = `Translate to Traditional Chinese: "${text}"`;
    try {
        const chinese = await askAI(transPrompt);
        const transDiv = document.createElement('div');
        transDiv.className = 'translation-text';
        transDiv.innerText = "老師的話 (中文): " + chinese.trim();
        containerElement.appendChild(transDiv);
        btnElement.style.display = 'none'; 
    } catch (e) { btnElement.innerText = "Error"; }
}

function speakText(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.7; // 初學者慢速
    window.speechSynthesis.speak(utterance);
}

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
    if (sender === "ai" && !text.includes("...")) {
        const transBtn = document.createElement('button');
        transBtn.className = 'translate-btn';
        transBtn.innerText = "Translate 🌐";
        transBtn.onclick = () => translateMessage(text, msgDiv, transBtn);
        wrapper.appendChild(transBtn);
        speakText(text);
    }
    chatBox.appendChild(wrapper);
    chatBox.scrollTop = chatBox.scrollHeight;
    return wrapper;
}

// --- 5. 語音辨識核心 ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => { document.getElementById('mic-btn').innerText = "🔴"; };
    recognition.onresult = (e) => { document.getElementById('user-input').value = e.results[0][0].transcript; };
    recognition.onend = () => { document.getElementById('mic-btn').innerText = "🎤"; };
}
function startVoiceRecognition() { if (recognition) recognition.start(); }

window.onload = () => {
    const userInput = document.getElementById('user-input');
    if (userInput) userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendUserMessage(); });

};
