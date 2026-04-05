const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = "en-US";
recognition.continuous = true;

let isListening = false;
const chatBox = document.getElementById("chat");
const textInput = document.getElementById("textInput");

// 🎤 MIC TOGGLE
document.getElementById("micBtn").onclick = () => {
    try {
        if (!isListening) {
            recognition.start();
        } else {
            recognition.stop();
            isListening = false;
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

    addMessage(text, "user");
    textInput.value = "";

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

    } catch (error) {
        addMessage("⚠️ Connection error", "bot");
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
        const interval = setInterval(() => {
            div.textContent += chars[i];  
            chatBox.scrollTop = chatBox.scrollHeight;
            i++;
            if (i >= chars.length) {
                clearInterval(interval);
                
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

// 🔊 VOICE
function speak(text) {
    if (!text.trim()) return;

    const stopBtn = document.getElementById("stopBtn");
    if (stopBtn) {
        stopBtn.classList.add("visible");
        stopBtn.innerText = "🔴";
        stopBtn.classList.add("speaking");

    }
    const cleanText = text
        .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
        .replace(/[^\w\s.,!?]/g, '') 
        .replace(/\s+/g, ' ')
        .trim();

    const speech = new SpeechSynthesisUtterance(cleanText);
    const voices = window.speechSynthesis.getVoices();;
    const isHindi = /[\u0900-\u097F]/.test(cleanText);
    if (isHindi) {
        // Look for an Indian Hindi voice
        speech.voice = voices.find(v => v.lang.includes("hi-IN")) || voices.find(v => v.lang.includes("hi"));
        speech.lang = "hi-IN";
        speech.rate = 1.0; 
    }
    else {
        // Look for a US English voice
        speech.voice = voices.find(v => v.lang.includes("en-US")) || voices.find(v => v.lang.includes("en"));
        speech.lang = "en-US";
        speech.rate = 1.0;
    }
    speech.onend = () => {
        if (stopBtn) {
            stopBtn.classList.remove("visible");
            
        }
    };
    speech.onerror = () => {
        if (stopBtn) {
            stopBtn.classList.remove("visible");
        }
    };

    window.speechSynthesis.cancel();
    
    setTimeout(() => {
        window.speechSynthesis.speak(speech);
    }, 50);
}
window.speechSynthesis.onvoiceschanged = () => {
    console.log("Voices loaded:", window.speechSynthesis.getVoices().length);
};