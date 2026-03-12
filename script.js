diff --git a/script.js b/script.js
index 1627adaa04e4ea659bc0cea1af8d430dac8ce5a7..c6de48504e7d2164345c515549ed0c56b6786aee 100644
--- a/script.js
+++ b/script.js
@@ -1,43 +1,58 @@
-// --- 修改重點：優先讀取 GitHub Actions 注入的變數 ---
-const API_KEY = window.ENV_CONFIG?.API_KEY || "AIzaSyAtA_LWZJZJyLo8bdkMnaneZbfL4XRsDRg"; 
-const MODEL_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
-let currentTopic = "";
-
-// --- 1. 核心 AI 呼叫 ---
-async function askAI(promptText) {
-    const response = await fetch(MODEL_URL, {
-        method: 'POST',
-        headers: { 'Content-Type': 'application/json' },
+// --- 修改重點：優先讀取 GitHub Actions 注入的變數 ---
+const API_KEY = window.ENV_CONFIG?.API_KEY || "";
+const MODEL_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
+let currentTopic = "";
+
+// --- 1. 核心 AI 呼叫 ---
+async function askAI(promptText) {
+    if (!API_KEY) {
+        throw new Error("Missing API key. Please set GEMINI_API_KEY in GitHub Actions Secrets and redeploy.");
+    }
+
+    const response = await fetch(MODEL_URL, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ 
             contents: [{ parts: [{ text: promptText }] }],
             generationConfig: { maxOutputTokens: 800, temperature: 0.7 }
         })
     });
-    const data = await response.json();
-    return data.candidates[0].content.parts[0].text;
-}
+    const data = await response.json();
+
+    if (!response.ok) {
+        const apiMessage = data?.error?.message || `HTTP ${response.status}`;
+        throw new Error(apiMessage);
+    }
+
+    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
+    if (!text) {
+        throw new Error("AI returned an empty response.");
+    }
+
+    return text;
+}
 
 // --- 2. 啟動對話 (移除問候模式) ---
 async function startConversation(topic) {
     currentTopic = topic;
     const chatBox = document.getElementById('chat-box');
     chatBox.innerHTML = ''; 
     appendMessage("user", `Let's talk about ${topic}.`);
     const loadingMsg = appendMessage("ai", "Teacher is preparing a topic...");
     const startPrompt = `You are a professional English tutor. Topic: "${topic}". Rules: 1. NO GREETINGS. 2. NO INTRODUCTIONS. 3. START IMMEDIATELY with one fact. 4. END WITH A QUESTION.`;
     try {
         const reply = await askAI(startPrompt);
         loadingMsg.remove(); 
         appendMessage("ai", reply);
     } catch (e) { loadingMsg.innerText = "Connection failed. Please refresh."; }
 }
 
 // --- 3. 發送訊息 (含文法糾錯規則) ---
 async function sendUserMessage() {
     const input = document.getElementById('user-input');
     const userText = input.value.trim();
     if (!userText || !currentTopic) return;
     appendMessage("user", userText);
     input.value = ""; 
     const loadingMsg = appendMessage("ai", "Teacher is thinking...");
     const instruction = `
@@ -47,75 +62,79 @@ async function sendUserMessage() {
         2. GRAMMAR CHECK: Start with "Correction: [Corrected sentence]" if user makes mistakes.
         3. IF SHORT: Say "Try to say more!" and provide an example sentence.
         4. IF ON-TOPIC: Reply naturally (2 sentences) and ask follow-up.
         USER SAID: "${userText}"
     `;
     try {
         const reply = await askAI(instruction);
         loadingMsg.remove(); 
         appendMessage("ai", reply);
     } catch (e) { loadingMsg.innerText = "Error: Please try again."; }
 }
 
 // --- 4. 翻譯、語音與介面 ---
 async function translateMessage(text, containerElement, btnElement) {
     if (containerElement.querySelector('.translation-text')) return;
     btnElement.innerText = "Translating...";
     btnElement.disabled = true;
     const transPrompt = `TASK: Translate the entire text to Traditional Chinese. RETURN ONLY TRANSLATION: "${text}"`;
     try {
         const chineseText = await askAI(transPrompt);
         const transDiv = document.createElement('div');
         transDiv.className = 'translation-text';
         transDiv.innerText = "中文翻譯: " + chineseText.trim();
         containerElement.appendChild(transDiv);
         btnElement.style.display = 'none'; 
-    } catch (e) { btnElement.innerText = "Error"; btnElement.disabled = false; }
-}
+    } catch (e) {
+        btnElement.innerText = "Translate failed";
+        btnElement.disabled = false;
+        console.error("Translate failed:", e);
+    }
+}
 
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
 
 // --- 5. 語音辨識 ---
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
     const input = document.getElementById('user-input');
     if (input) input.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendUserMessage(); });
-};
\ No newline at end of file
+};
