from flask import Flask, request, jsonify, render_template
import os
from openai import OpenAI

app = Flask(__name__)

# 🔑 Groq Setup
client = OpenAI(
    api_key=os.environ.get("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1",
)

# 🧠 GLOBAL MEMORY (Stores the conversation context)
chat_history = [
    {
        "role": "system", 
        "content": """
            You are a Universal AI Expert. 
            - Answer ALL questions (Coding, Travel, History, Food, Science, etc.).
            - If a user asks about a place (e.g., Delhi, Mumbai, Paris), provide top tourist spots and food.
            - If a user asks for code, provide clean, explained snippets.
            - STRICT RULE: Always respond in the SAME language the user uses (Hindi, English, or Hinglish).
            - Keep responses natural, helpful, and concise for voice.
        """
    }
]

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    global chat_history
    data = request.json
    user_message = data.get("message", "")

    if not user_message:
        return jsonify({"reply": "I'm listening! What's on your mind? 😊"})

    try:
        # 1. Add current user message to History
        chat_history.append({"role": "user", "content": user_message})

        # 2. Keep Memory manageable (Last 10 messages + System Prompt)
        if len(chat_history) > 11:
            chat_history = [chat_history[0]] + chat_history[-10:]

        # 3. Call the AI with the FULL CONTEXT
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=chat_history, 
            temperature=0.7,
            max_tokens=800
        )
        
        reply = completion.choices[0].message.content

        # 4. Save AI response to History so it remembers for the next question
        chat_history.append({"role": "assistant", "content": reply})

        return jsonify({"reply": reply})

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"reply": "⚠️ Connection error with AI. Please check your API key."})

if __name__ == "__main__":
    # 1. Check if we are on Render (it provides a PORT) or local (default to 5000)
    port = int(os.environ.get("PORT", 5000))
    
    # 2. If we are running locally, we can keep debug=True. 
    # On Render, debug should technically be False, but this works for both:
    app.run(host='0.0.0.0', port=port, debug=True)
    