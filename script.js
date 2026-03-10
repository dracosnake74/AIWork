const API_KEY = "AIzaSyAtA_LWZJZJyLo8bdkMnaneZbfL4XRsDRg"; 
const MODEL_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
let currentTopic = "";

// --- 1. 核心 AI 呼叫 (維持 800 tokens 確保翻譯與內容完整) ---
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

// --- 2. 啟動對話 (移除問候，直接進入主題) ---
async function startConversation(topic) {
    currentTopic = topic;
    const chatBox = document.getElementById('chat-box');
    chatBox.innerHTML = ''; 
    appendMessage("user", `Let's talk about ${topic}.`);
    
    const loadingMsg = appendMessage("ai", "Teacher is preparing a topic...");
    
    const startPrompt = `
        You are a professional English tutor. The topic is "${topic}". 
        
        STRICT RULES:
        1. NO GREETINGS: Do not say "Hello", "Hi", "Welcome", or "I'm excited".
        2. NO INTRODUCTIONS: Do not say "Let's start our session" or "Today we will talk about".
        3. START IMMEDIATELY: Share ONE very brief interesting fact or scenario about "${topic}".
        4. END WITH A QUESTION: Ask ONE specific question to get the user talking.
        
        STRICTLY English only. Complete sentences.
    `;
    
    try {
        const reply = await askAI(startPrompt);
        loadingMsg.remove(); 
        appendMessage("ai", reply);
    } catch (e) { 
        loadingMsg.innerText = "Connection failed. Please refresh.";
    }
}

// --- 3. 發送訊息 (新增：文法糾錯與建議規則) ---
async function sendUserMessage() {
    const input = document.getElementById('user-input');
    const userText = input.value.trim();
    if (!userText || !currentTopic) return;

    appendMessage("user", userText);
    input.value = ""; 

    const loadingMsg = appendMessage("ai", "Teacher is thinking...");

    // 核心邏輯更新：在 EVALUATION RULES 中加入第 2 點「文法檢查」
    const instruction = `
        ROLE: Supportive English Tutor. 
        TOPIC: "${currentTopic}".

        EVALUATION RULES:
        1. IF CHINESE: Remind them "Please use English" and repeat the question.
        
        2. GRAMMAR & VOCABULARY CHECK: 
           - If the user's message has any grammar, spelling, or sentence structure errors, 
             start your response with "Correction: [Corrected sentence]" and a very brief encouraging explanation.
           - If the user's English is natural, do not show "Correction".

        3. IF RESPONSE TOO SHORT (e.g. "OK"): Acknowledge, then say "Try to say more! You could say: [Example Sentence]", then ask a new question.
        
        4. IF OFF-TOPIC: Redirect to ${currentTopic}.
        
        5. IF ON-TOPIC: Reply naturally (2 sentences) and ask a follow-up.

        STRICT: Reply ONLY in English. Complete sentences.
        USER SAID: "${userText}"
    `;

    try {
        const reply = await askAI(instruction);
        loadingMsg.remove(); 
        appendMessage("ai", reply);
    } catch (e) { 
        loadingMsg.innerText = "Error: Please try again.";
        console.error(e);
    }
}

// --- 4. 翻譯功能 ---
async function translateMessage(text, containerElement, btnElement) {
    if (containerElement.querySelector('.translation-text')) return;

    btnElement.innerText = "Translating...";
    btnElement.disabled = true;

    const transPrompt = `
        TASK: Translate the entire English text below into Traditional Chinese.
        IMPORTANT: Do not summarize. Do not skip any part. Translate every sentence.
        TEXT TO TRANSLATE: "${text}"
        RETURN ONLY THE CHINESE TRANSLATION.
    `;

    try {
        const chineseText = await askAI(transPrompt);
        const transDiv = document.createElement('div');
        transDiv.className = 'translation-text';
        transDiv.innerText = "中文翻譯: " + chineseText.trim();
        containerElement.appendChild(transDiv);
        btnElement.style.display = 'none'; 
    } catch (e) {
        btnElement.innerText = "Error";
        btnElement.disabled = false;
        console.error("Translation failed:", e);
    }
}

// --- 5. 語音功能與訊息顯示 ---
function speakText(text) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
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

// --- 6. 語音辨識核心 ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;

    recognition.onstart = () => {
        const micBtn = document.getElementById('mic-btn');
        if (micBtn) micBtn.innerText = "🔴"; 
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const userInput = document.getElementById('user-input');
        if (userInput) userInput.value = transcript;
    };

    recognition.onend = () => {
        const micBtn = document.getElementById('mic-btn');
        if (micBtn) micBtn.innerText = "🎤";
    };
}

function startVoiceRecognition() {
    if (recognition) {
        recognition.start();
    } else {
        alert("您的瀏覽器不支援語音辨識。");
    }
}

// 初始化事件綁定
window.onload = () => {
    const input = document.getElementById('user-input');
    if (input) {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendUserMessage();
        });
    }
};