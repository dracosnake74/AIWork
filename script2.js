const API_KEY = "AIzaSyAtA_LWZJZJyLo8bdkMnaneZbfL4XRsDRg"; 
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

// --- 2. 啟動對話 (初學者老師模式) ---
async function startConversation(topic) {
    currentTopic = topic;
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = ''; 
    const loadingMsg = appendMessage("ai", "Teacher is preparing a simple lesson...");

    const startPrompt = `
        You are "English Teacher", a kind tutor for a "Baby level" beginner.
        Topic: "${topic}".
        RULES:
        1. NO GREETINGS. Speak simply (A1 level).
        2. Share ONE short sentence about ${topic} and ask a tiny question.
        3. Always end with a simple question to encourage me to speak more.
        STRICT: 100% English only. Complete sentences.
    `;
    
    try {
        const reply = await askAI(startPrompt);
        loadingMsg.remove();
        appendMessage("ai", reply);
    } catch (e) { 
        loadingMsg.innerText = "Error! Please refresh.";
    }
}

// --- 3. 發送訊息 ---
async function sendUserMessage() {
    const input = document.getElementById('user-input');
    const userText = input.value.trim();
    if (!userText || !currentTopic) return;

    appendMessage("user", userText);
    input.value = ""; 

    const loadingMsg = appendMessage("ai", "Teacher is listening...");

    const instruction = `
        ROLE: Kind English Teacher. LEARNER: Baby level.
        RULES:
        1. 100% English ONLY.
        2. IF broken English: Say "Good try! You can say: [Simple 3-5 word sentence]".
        3. BE ENCOURAGING. KEEP IT SHORT (Max 2 sentences).
        USER SAID: "${userText}"
    `;

    try {
        const reply = await askAI(instruction);
        loadingMsg.remove(); 
        appendMessage("ai", reply);
    } catch (e) { 
        loadingMsg.innerText = "Error...";
    }
}

// --- 4. 翻譯、語音與介面 ---
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
    utterance.rate = 0.7; // 慢速語音
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

// --- 5. 語音辨識核心 (確保這段程式碼存在) ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        const micBtn = document.getElementById('mic-btn');
        if (micBtn) micBtn.innerText = "🔴"; // 錄音中顯示紅點
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('user-input').value = transcript;
    };

    recognition.onend = () => {
        const micBtn = document.getElementById('mic-btn');
        if (micBtn) micBtn.innerText = "🎤";
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        const micBtn = document.getElementById('mic-btn');
        if (micBtn) micBtn.innerText = "🎤";
    };
}

function startVoiceRecognition() {
    if (recognition) {
        recognition.start();
    } else {
        alert("您的瀏覽器不支援語音辨識功能。");
    }
}

// 初始化事件綁定
window.onload = () => {
    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendUserMessage();
        });
    }
};