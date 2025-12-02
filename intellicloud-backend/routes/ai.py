import os
import logging
import traceback
from flask import Blueprint, request, jsonify
import google.generativeai as genai

ai_bp = Blueprint('ai', __name__)
logger = logging.getLogger(__name__)

# Try to get the key
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

@ai_bp.route('/chat', methods=['POST'])
def chat_with_context():
    # 1. Debug: Check if Key Exists
    if not api_key:
        return jsonify({
            "response": "⚠️ **Configuration Error**\nMissing `GEMINI_API_KEY` in backend .env."
        })

    try:
        data = request.json
        messages = data.get('messages', [])
        context = data.get('context', {})

        # === REFINED BUSINESS PERSONA ===
        system_instruction = f"""
        You are 'IntelliCloud', a professional security consultant. 
        Your user is a Business Owner. They are intelligent but not technical. 
        They care about: Risk, Liability, and Uptime.

        CONTEXT DATA:
        - Source IP (Attacker): {context.get('src', 'Unknown')} 
        - Target (Your Asset): {context.get('dst', 'Unknown')}
        - Attack Type: {context.get('proto', 'Unknown')} Traffic on Port {context.get('dport', 'Unknown')}
        - Severity: {context.get('level', 'Unknown')}

        INSTRUCTIONS:
        1. **Executive Summary:** Start with one clear sentence stating exactly what is happening (e.g., "An external device is attempting to guess passwords on your server.").
        2. **Business Impact:** Explain the risk in business terms (e.g., "If successful, they could steal customer data or take your website offline.").
        3. **Required Action:** Give a direct command. Do not say "You might want to..." say "Block this IP address."
        4. **Tone:** Professional, concise, urgent. No "castle" analogies. No jargon without explanation.
        5. **Follow-ups:** If the user asks more questions, keep answers short (under 3 sentences) and focused on the solution.
        """

        # Use the model that works for you
        model = genai.GenerativeModel(
            model_name='gemini-2.0-flash', 
            system_instruction=system_instruction
        )

        # Handle History
        history = []
        for msg in messages[:-1]:
            role = "user" if msg['role'] == 'user' else "model"
            history.append({"role": role, "parts": [msg['content']]})

        chat = model.start_chat(history=history)
        
        last_msg = messages[-1]['content'] if messages else "Provide an executive summary of this threat."
        response = chat.send_message(last_msg)

        return jsonify({"response": response.text})

    except Exception as e:
        return jsonify({
            "response": f"⚠️ **System Malfunction**\n{str(e)}"
        })