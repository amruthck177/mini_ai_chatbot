import { useState, useRef, useEffect, useCallback } from 'react';

/* ===== COMIC AI CHATBOT — ZAPTRON (GEMINI EDITION) ===== */

const SYSTEM_PROMPT = `You are ZAPTRON, Guardian of the Digital Universe! You're a wise-cracking, heroic AI assistant with a comic book personality.

PERSONALITY RULES:
- Speak with enthusiasm and occasional comic-style exclamations like "Great Scott!", "By the power of computation!", "Holy algorithms!", "Excelsior!"
- You're genuinely helpful, knowledgeable, and deliver information with flair and personality.
- Keep responses concise (2-4 paragraphs max) and engaging.
- Use occasional **bold text** for emphasis on key points.
- You're always encouraging and positive, like a true superhero mentor.
- Sprinkle in light humor but always be substantively helpful.
- End responses with an encouraging or witty sign-off when appropriate.
- Remember: with great processing power comes great responsibility!`;

const ZaptronAvatar = ({ size = 56, mood = 'happy' }) => {
  const mouthPaths = {
    happy: 'M35 58 Q50 68 65 58',
    excited: 'M33 55 Q50 72 67 55',
    thinking: 'M38 60 L62 60',
    focused: 'M36 58 Q50 63 64 58',
  };
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block' }}>
      <path d="M22 65 L8 98 L50 82 L92 98 L78 65" fill="#E8001C" stroke="#0A0A0A" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="50" cy="42" r="32" fill="#0057FF" stroke="#0A0A0A" strokeWidth="3.5" />
      <rect x="22" y="30" width="56" height="16" rx="8" fill="#FFE000" stroke="#0A0A0A" strokeWidth="2.5" />
      <circle cx="37" cy="38" r="4.5" fill="#0A0A0A" />
      <circle cx="63" cy="38" r="4.5" fill="#0A0A0A" />
      <circle cx="39" cy="36" r="1.5" fill="#FFFFFF" />
      <circle cx="65" cy="36" r="1.5" fill="#FFFFFF" />
      <path d={mouthPaths[mood] || mouthPaths.happy} fill="none" stroke="#0A0A0A" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="10" x2="50" y2="2" stroke="#0A0A0A" strokeWidth="3" />
      <circle cx="50" cy="2" r="4" fill="#FFE000" stroke="#0A0A0A" strokeWidth="2">
        <animate attributeName="r" values="4;5;4" dur="2s" repeatCount="indefinite" />
      </circle>
      <polygon points="47,70 53,70 51,77 56,77 48,88 50,80 45,80" fill="#FFE000" stroke="#0A0A0A" strokeWidth="1.5" />
    </svg>
  );
};

const MOODS = {
  happy: { emoji: '😄', label: 'HAPPY' },
  thinking: { emoji: '🤔', label: 'THINKING' },
  excited: { emoji: '⚡', label: 'EXCITED' },
  focused: { emoji: '🧠', label: 'FOCUSED' },
};

const QUICK_ACTIONS = [
  'Tell me a joke 🤣',
  'Explain like I\'m 5 🧒',
  'Give me a fun fact ⚡',
  'Motivate me! 💪',
];

const SFX_SEND = ['SENT!', 'ZAP!', 'WHOOSH!', 'POW!', 'BOOM!'];
const SFX_DECOR = [
  { text: 'POW!', top: '15%', left: '5%', rotate: '-15deg' },
  { text: 'ZAP!', top: '35%', right: '5%', rotate: '12deg' },
  { text: 'BOOM!', bottom: '25%', left: '3%', rotate: '-8deg' },
  { text: 'WOW!', top: '65%', right: '8%', rotate: '18deg' },
  { text: 'KA-BOOM!', bottom: '15%', left: '10%', rotate: '-20deg' },
];

const detectMood = (text) => {
  const t = text.toLowerCase();
  if (/(!.*){3,}|amazing|awesome|incredible|wow|excelsior|great scott/i.test(t)) return 'excited';
  if (/hmm|consider|perhaps|think about|let me ponder|wonder/i.test(t)) return 'thinking';
  if (/step|specifically|here's how|first,|1\.|precisely|breakdown/i.test(t)) return 'focused';
  return 'happy';
};

const formatTime = (date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const THEMES = {
  classic: {
    name: 'Classic Hero',
    yellow: '#FFE000', red: '#E8001C', blue: '#0057FF', black: '#0A0A0A', white: '#FFF9F0',
    halftone: 'rgba(0,0,0,0.05)'
  },
  neon: {
    name: 'Neon Hero',
    yellow: '#00F3FF', red: '#FF00E5', blue: '#7000FF', black: '#0A0A0A', white: '#1A1A2E',
    halftone: 'rgba(0,243,255,0.08)'
  },
  noir: {
    name: 'Noir Detective',
    yellow: '#D1D1D1', red: '#333333', blue: '#666666', black: '#050505', white: '#F5F5F5',
    halftone: 'rgba(0,0,0,0.1)'
  },
  forest: {
    name: 'Forest Guardian',
    yellow: '#C0FF00', red: '#795548', blue: '#2E7D32', black: '#1B1B1B', white: '#F1F8E9',
    halftone: 'rgba(46,125,50,0.08)'
  }
};

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState('happy');
  const [darkMode, setDarkMode] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('classic');
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || '');
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash');
  const [showApiKey, setShowApiKey] = useState(true);
  const [sfxBurst, setSfxBurst] = useState(null);
  const [reactions, setReactions] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [clearFlash, setClearFlash] = useState(false);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const theme = THEMES[currentTheme];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const triggerSfx = useCallback(() => {
    const word = SFX_SEND[Math.floor(Math.random() * SFX_SEND.length)];
    setSfxBurst(word);
    setTimeout(() => setSfxBurst(null), 850);
  }, []);

  const sendMessage = useCallback(async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;
    if (!apiKey) {
      alert("Hero! I need your Gemini API Key to connect to HQ!");
      return;
    }

    const userMsg = { role: 'user', content, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setMood('thinking');
    triggerSfx();

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: newMessages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          })),
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Signal Lost (Status ${response.status})`);
      }

      const data = await response.json();
      const aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "My sensors detected a blank void in the transmission...";
      
      const aiMsg = { role: 'assistant', content: aiContent, timestamp: new Date() };
      setMessages(prev => [...prev, aiMsg]);
      setMood(detectMood(aiContent));
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ **OOPS! Signal Lost!** Check your API Key and Model, Hero!\nError: ${err.message}`,
        timestamp: new Date(),
        isError: true
      }]);
      setMood('thinking');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, messages, apiKey, selectedModel, triggerSfx]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setClearFlash(true);
    setTimeout(() => {
      setMessages([]);
      setReactions({});
      setMood('happy');
      setClearFlash(false);
    }, 300);
  };

  const copyMessage = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedId(idx);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const toggleReaction = (idx, emoji) => {
    const key = `msg-${idx}`;
    setReactions(prev => ({
      ...prev,
      [key]: (prev[key] || []).includes(emoji) 
        ? prev[key].filter(e => e !== emoji) 
        : [...(prev[key] || []), emoji]
    }));
  };

  return (
    <div className={`comic-app ${darkMode ? 'dark' : ''} theme-${currentTheme}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@400;700&display=swap');

        :root {
          --yellow: ${theme.yellow}; 
          --red: ${theme.red}; 
          --blue: ${theme.blue}; 
          --black: ${theme.black}; 
          --white: ${theme.white};
          --bg: var(--white); --panel: #FFF; --text: var(--black); --border: var(--black);
          --halftone: ${theme.halftone};
        }

        .dark {
          --bg: #0A0A1A; --panel: #1A1A2E; --text: #EEE; --border: #555;
          --halftone: rgba(255,224,0,0.03);
        }

        .comic-app {
          min-height: 100vh; font-family: 'Comic Neue', cursive;
          background-color: var(--bg); color: var(--text);
          background-image: radial-gradient(circle, var(--halftone) 1.5px, transparent 1.5px);
          background-size: 15px 15px;
          display: flex; justify-content: center; padding: 20px;
          transition: 0.4s; position: relative; overflow: hidden;
        }

        .main-panel {
          width: 100%; max-width: 800px; display: flex; flex-direction: column;
          z-index: 10; height: calc(100vh - 40px);
        }

        .panel-box {
          background: var(--panel); border: 4px solid var(--border);
          box-shadow: 8px 8px 0 var(--border); border-radius: 4px;
        }

        .api-key-panel {
          margin-bottom: 15px; padding: 12px; display: flex; align-items: center; gap: 10px;
          transition: 0.3s;
        }
        .api-input {
          flex: 1; padding: 8px 12px; border: 3px solid var(--border); border-radius: 4px;
          font-family: 'Comic Neue'; font-weight: bold; background: var(--panel); color: var(--text);
        }
        .api-link { font-size: 0.8rem; color: var(--blue); text-decoration: underline; font-weight: bold; }

        .header { margin-bottom: 15px; padding: 15px; display: flex; align-items: center; justify-content: space-between; }
        .hero-title { font-family: 'Bangers'; font-size: 2rem; color: var(--blue); letter-spacing: 2px; }
        .dark .hero-title { color: var(--yellow); }
        .tagline { font-size: 0.8rem; opacity: 0.7; font-style: italic; }

        .chat-container {
          flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 20px;
          margin-bottom: 15px; scroll-behavior: smooth; background: rgba(255,255,255,0.1);
        }

        .msg-row { display: flex; gap: 12px; animation: fadeIn 0.4s ease-out; }
        .msg-row.user { flex-direction: row-reverse; }

        .bubble {
          max-width: 80%; padding: 12px 18px; position: relative; border: 3px solid var(--border);
          box-shadow: 4px 4px 0 var(--border); font-size: 1.05rem; line-height: 1.5;
        }
        .user .bubble { 
          background: var(--yellow); color: #000; border-radius: 15px 4px 15px 15px; font-weight: bold;
        }
        .ai .bubble { 
          background: var(--panel); border-radius: 4px 15px 15px 15px; 
        }
        .bubble.error { background: #fee2e2; border-color: var(--red); color: #991b1b; animation: shake 0.5s; }

        .meta { font-size: 0.7rem; margin-top: 5px; opacity: 0.6; font-family: 'Bangers'; letter-spacing: 1px; }
        .user .meta { text-align: right; }

        .actions { display: flex; gap: 5px; margin-top: 8px; }
        .act-btn { 
          background: none; border: none; cursor: pointer; font-size: 0.8rem; opacity: 0.3; transition: 0.2s;
        }
        .msg-row:hover .act-btn { opacity: 1; }
        .act-btn.active { opacity: 1; transform: scale(1.2); }

        .input-panel { padding: 15px; display: flex; gap: 12px; align-items: flex-end; }
        .chat-input {
          flex: 1; border: 3px solid var(--border); border-radius: 4px; padding: 12px;
          font-family: 'Comic Neue'; font-size: 1rem; font-weight: bold; resize: none;
          background: var(--panel); color: var(--text); min-height: 50px;
        }
        .send-btn {
          width: 55px; height: 55px; background: var(--blue); color: #fff; border: 3px solid var(--border);
          border-radius: 4px; font-family: 'Bangers'; font-size: 1.5rem; cursor: pointer;
          box-shadow: 4px 4px 0 var(--border); transition: 0.1s;
        }
        .send-btn:active { transform: translate(2px, 2px); box-shadow: 0 0 0; }

        .quick-powers { display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; }
        .pwr-btn {
          flex: 1; min-width: 120px; padding: 10px; border: 3px solid var(--border); border-radius: 4px;
          font-family: 'Bangers'; font-size: 0.9rem; letter-spacing: 1px; cursor: pointer;
          box-shadow: 4px 4px 0 var(--border); transition: 0.1s;
        }
        .pwr-btn:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 var(--border); }
        .pwr-btn:nth-child(1) { background: #FFEB3B; }
        .pwr-btn:nth-child(2) { background: #03A9F4; }
        .pwr-btn:nth-child(3) { background: #8BC34A; }
        .pwr-btn:nth-child(4) { background: #FF5722; color: #fff; }

        .sfx-decor {
          position: absolute; font-family: 'Bangers'; color: transparent;
          -webkit-text-stroke: 1.5px var(--red); opacity: 0.1; font-size: 4rem; z-index: 1; pointer-events: none;
        }

        .sfx-burst {
          position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
          font-family: 'Bangers'; font-size: 6rem; color: var(--yellow);
          -webkit-text-stroke: 3px #000; z-index: 1000; animation: burst 0.8s forwards;
        }

        .thinking-dots span {
          display: inline-block; width: 8px; height: 8px; background: var(--blue);
          border-radius: 50%; margin: 0 3px; animation: bounce 1.4s infinite;
        }
        .thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
        .thinking-dots span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes burst {
          0% { transform: translate(-50%, -50%) scale(0.5) rotate(-20deg); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.5) rotate(10deg); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2) rotate(-5deg); opacity: 0; }
        }
        @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-10px); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }

        .clear-flash { position: fixed; inset: 0; background: var(--red); z-index: 2000; animation: flash 0.3s forwards; }
        @keyframes flash { from { opacity: 0.5; } to { opacity: 0; } }

        @media (max-width: 600px) {
          .main-panel { height: 100%; }
          .hero-title { font-size: 1.5rem; }
          .sfx-decor { display: none; }
        }
      `}</style>

      {SFX_DECOR.map((sfx, i) => (
        <div key={i} className="sfx-decor" style={{ top: sfx.top, left: sfx.left, right: sfx.right, bottom: sfx.bottom, transform: `rotate(${sfx.rotate})` }}>
          {sfx.text}
        </div>
      ))}

      {sfxBurst && <div className="sfx-burst">{sfxBurst}</div>}
      {clearFlash && <div className="clear-flash" />}

      <div className="main-panel">
        <div className="panel-box api-key-panel">
          <span style={{fontFamily:'Bangers'}}>API KEY:</span>
          <input 
            type={showApiKey ? "text" : "password"}
            className="api-input"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste Gemini API Key here..."
          />
          <select 
            className="api-input" 
            style={{flex:'0 0 130px', fontSize:'0.8rem'}}
            value={currentTheme}
            onChange={(e) => setCurrentTheme(e.target.value)}
          >
            {Object.entries(THEMES).map(([id, t]) => (
              <option key={id} value={id}>{t.name}</option>
            ))}
          </select>
          <select 
            className="api-input" 
            style={{flex:'0 0 110px', fontSize:'0.8rem'}}
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            <option value="gemini-1.5-flash">1.5 Flash</option>
            <option value="gemini-1.5-pro">1.5 Pro</option>
            <option value="gemini-2.0-flash">2.0 Flash</option>
          </select>
          <button className="act-btn" onClick={() => setShowApiKey(!showApiKey)} style={{opacity:1, fontSize:'1.2rem'}}>
            {showApiKey ? "👁️" : "🙈"}
          </button>
          <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="api-link">Get Free Key ⚡</a>
        </div>

        <div className="panel-box header">
          <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
            <ZaptronAvatar mood={mood} />
            <div>
              <div className="hero-title">ZAPTRON</div>
              <div className="tagline">Guardian of the Digital Universe!</div>
              <div className="meta" style={{color: 'var(--blue)', fontWeight:'bold'}}>
                {MOODS[mood].emoji} {MOODS[mood].label} MODE
              </div>
            </div>
          </div>
          <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
            <div className="meta" style={{background:'var(--blue)', color:'#fff', padding:'5px 10px', borderRadius:'15px'}}>
              LOGS: {messages.length}
            </div>
            <button className="act-btn" onClick={() => setDarkMode(!darkMode)} style={{opacity:1, fontSize:'1.5rem'}}>
              {darkMode ? "☀️" : "🌙"}
            </button>
            <button className="act-btn" onClick={clearChat} style={{opacity:1, color:'var(--red)', fontWeight:'bold', fontFamily:'Bangers'}}>
              RESET
            </button>
          </div>
        </div>

        <div className="panel-box chat-container">
          {messages.length === 0 && (
            <div style={{textAlign:'center', padding:'40px 20px'}}>
              <ZaptronAvatar size={120} mood="happy" />
              <h1 style={{fontFamily:'Bangers', fontSize:'3rem', marginTop:'20px'}}>READY FOR ACTION!</h1>
              <p style={{fontSize:'1.2rem'}}>Input your API key above and let's save the digital world together!</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`msg-row ${msg.role === 'user' ? 'user' : 'ai'}`}>
              <div style={{width:'40px', flexShrink:0}}>
                {msg.role === 'user' ? (
                  <div style={{width:'40px', height:'40px', borderRadius:'50%', background:'var(--yellow)', border:'3px solid #000', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Bangers'}}>U</div>
                ) : (
                  <ZaptronAvatar size={40} mood={mood} />
                )}
              </div>
              <div className="bubble-wrapper" style={{flex:1, display:'flex', flexDirection:'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'}}>
                <div className={`bubble ${msg.isError ? 'error' : ''}`}>
                  {msg.content}
                </div>
                <div className="meta">{formatTime(msg.timestamp)}</div>
                {msg.role === 'assistant' && (
                  <div className="actions">
                    <button className={`act-btn ${copiedId === idx ? 'active' : ''}`} onClick={() => copyMessage(msg.content, idx)} style={{opacity:1}}>
                      {copiedId === idx ? "✅" : "📋"}
                    </button>
                    {['👍', '⚡', '😂'].map(emoji => (
                      <button 
                        key={emoji} 
                        className={`act-btn ${(reactions[`msg-${idx}`] || []).includes(emoji) ? 'active' : ''}`}
                        onClick={() => toggleReaction(idx, emoji)}
                        style={{opacity:1}}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="msg-row ai">
              <ZaptronAvatar size={40} mood="thinking" />
              <div className="bubble" style={{background:'var(--panel)', borderRadius:'20px 20px 20px 5px'}}>
                <div className="thinking-dots">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="quick-powers">
          {QUICK_ACTIONS.map(action => (
            <button key={action} className="pwr-btn" onClick={() => sendMessage(action)} disabled={loading}>
              {action}
            </button>
          ))}
        </div>

        <div className="panel-box input-panel">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 500))}
            onKeyDown={handleKeyDown}
            placeholder="Type your hero message..."
            disabled={loading}
          />
          <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'5px'}}>
            <div className="meta">{input.length}/500</div>
            <button 
              className="send-btn" 
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
            >
              ⚡
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
