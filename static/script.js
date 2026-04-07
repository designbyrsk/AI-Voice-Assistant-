const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "en-US";
recognition.continuous = true;

let isListening = false;
let currentTypingInterval = null;
const chatBox = document.getElementById("chat");
const textInput = document.getElementById("textInput");
function scrollToBottom() {
    const chatContainer = document.getElementById("chat");
    if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}
// 🎤 MIC TOGGLE
document.getElementById("micBtn").onclick = () => {
    try {
        if (!isListening) {
            isListening = true;
            recognition.start();
        } else {
            isListening = false;
            recognition.stop();
            window.speechSynthesis.cancel();
            
        }
    } catch (err) {
        console.error("Mic Error:", err);
        isListening = true; 
    }
};

recognition.onstart = () => {
    isListening = true;
    document.getElementById("micBtn").classList.add("active");
    console.log("Listening...");
};

recognition.onend = () => {
    if (isListening) {
        try { recognition.start(); } catch (e) {}
    } else {
        document.getElementById("micBtn").classList.remove("active");
    }
};

recognition.onresult = (event) => {
    const text = event.results[event.results.length - 1][0].transcript;
    sendMessage(text);
};

// ⌨️ INPUT HANDLERS
textInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage(textInput.value);
});

document.getElementById("sendBtn").onclick = () => sendMessage(textInput.value);

document.getElementById("stopBtn").onclick = () => {
    window.speechSynthesis.cancel();
    const stopBtn = document.getElementById("stopBtn");
    if (stopBtn) {
        stopBtn.classList.remove("visible");
    }
    console.log("Speech stopped manually.");
};

// 🚀 MAIN SEND FUNCTION
async function sendMessage(text) {
    if (!text.trim()) return;

    window.speechSynthesis.cancel();
    if (currentTypingInterval) {
        clearInterval(currentTypingInterval);
        currentTypingInterval = null;
    }

    addMessage(text, "user");
    textInput.value = "";
    setBusyState(true);

    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({message: text})
        });

        const data = await response.json();
        
        let reply = cleanText(data.reply);
        speak(reply);
        await typeMessage(reply);
        setBusyState(false);

    } catch (error) {
        addMessage("⚠️ Connection error", "bot");
        setBusyState(false);
    }
}

function setBusyState(isBusy) {
    const textInput = document.getElementById("textInput");
    const sendBtn = document.getElementById("sendBtn");
    const stopBtn = document.getElementById("stopBtn");

    if (isBusy) {
        textInput.disabled = true;
        sendBtn.disabled = true; 
        // We keep the stopBtn display flexible so the speak() function can control it
        stopBtn.style.display = "flex"; 
    } else {
        textInput.disabled = false;
        sendBtn.disabled = false;
        // Only hide if the AI isn't currently speaking
        if (!window.speechSynthesis.speaking) {
            stopBtn.style.display = "none";
        }
    }
}

function addMessage(text, type) {
    const div = document.createElement("div");
    div.className = "message " + type;
    div.innerText = text;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ✨ TYPING EFFECT
function typeMessage(text) {
    return new Promise(resolve => {
        const div = document.createElement("div");
        div.className = "message bot";
        div.style.whiteSpace = "pre-wrap"; 
        chatBox.appendChild(div);

        let i = 0;
        const chars = Array.from(text);
        currentTypingInterval = setInterval(() => {
            div.textContent += chars[i];  
            chatBox.scrollTop = chatBox.scrollHeight;
            i++;
            if (i >= chars.length) {
                clearInterval(currentTypingInterval);
                currentTypingInterval = null;                
                resolve();
            }
        }, 20);
    });
}

function cleanText(text) {
    if (!text) return "";
    return text
        .replace(/([.,!?])(?=[^\s])/g, "$1 ") 
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\s{2,}/g, " ")
        .trim();
}
// 1. Improved Helper for Hindi Voice Selection
function getBestHindiVoice() {
    const voices = window.speechSynthesis.getVoices();
    // Priority: Google Native -> Microsoft Native -> Any hi-IN
    return voices.find(v => v.name.includes("Google हिन्दी")) || 
           voices.find(v => v.name.includes("Microsoft Hemant")) ||
           voices.find(v => v.lang === "hi-IN") ||
           voices.find(v => v.lang.includes("hi"));
}

// 2. Updated Speak Function
function speak(text) {
    if (!text.trim()) return;

    const stopBtn = document.getElementById("stopBtn");
    
    // Clean text: keeps Hindi characters and basic punctuation
    const cleanText = text
        .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
        .replace(/[^\w\s.,!?\u0900-\u097F]/gu, '') 
        .replace(/\s+/g, ' ')
        .trim();

    const speech = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();

    // Handle asynchronous voice loading
    if (voices.length === 0) {
        window.speechSynthesis.onvoiceschanged = () => speak(text);
        return;
    }

    const isHindi = /[\u0900-\u097F]/.test(cleanText);
    
    if (isHindi) {
        // Use the dedicated helper for better Hindi clarity
        speech.voice = getBestHindiVoice();
        speech.lang = "hi-IN";
        speech.rate = 0.9; 
    } else {
        speech.voice = voices.find(v => v.lang.includes("en-US")) || voices.find(v => v.lang.includes("en"));
        speech.lang = "en-US";
        speech.rate = 1.0;
    }

    // --- UI CONTROL VIA EVENTS ---

    // 🟢 SHOW ONLY when speech actually starts
    speech.onstart = () => {
        if (stopBtn) {
            stopBtn.classList.add("visible");
            stopBtn.classList.add("speaking");
            stopBtn.innerText = "🔴";
        }
    };

    // 🔴 HIDE ONLY when speech finishes or errors
    const hideButton = () => {
        if (stopBtn) {
            stopBtn.classList.remove("visible");
            stopBtn.classList.remove("speaking");
        }
    };

    speech.onend = hideButton;
    speech.onerror = hideButton;

    // Always cancel current speech before starting new one
    window.speechSynthesis.cancel();
    
    setTimeout(() => {
        window.speechSynthesis.speak(speech);
    }, 50);
}
