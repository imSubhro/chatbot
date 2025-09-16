import React, { useState, useEffect, useRef } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [context, setContext] = useState([])
  const chatRef = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem('finance-chat-context')
    if (saved) {
      const parsed = JSON.parse(saved)
      setContext(parsed.context || [])
      setMessages(parsed.messages || [])
    } else {
      setMessages([{ type: 'bot', text: 'Hi! I\'m your finance assistant. Ask me anything about personal finance, investing, budgeting, or financial planning.' }])
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('finance-chat-context', JSON.stringify({ context, messages }))
  }, [context, messages])

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight)
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) {
      setMessages(prev => [...prev, { type: 'bot', text: 'API key not configured. Please add VITE_GEMINI_API_KEY to your .env file.' }])
      return
    }

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { type: 'user', text: userMessage }])
    setLoading(true)

    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

      const contextPrompt = context.length > 0
        ? `Previous conversation context: ${context.slice(-5).map(c => `User: ${c.user} | Assistant: ${c.bot}`).join(' | ')}\n\n`
        : ''

      const prompt = `${contextPrompt}You are a helpful finance assistant. Focus on personal finance, investing, budgeting, savings, and financial planning. Provide practical, actionable advice. Keep responses concise and helpful.

User question: ${userMessage}`

      const result = await model.generateContent(prompt)
      const botResponse = result.response.text()

      setMessages(prev => [...prev, { type: 'bot', text: botResponse }])
      setContext(prev => [...prev, { user: userMessage, bot: botResponse }])
    } catch (error) {
      console.error('Gemini API Error:', error)
      let errorMessage = 'Sorry, I encountered an error. '
      if (error.message?.includes('API_KEY_INVALID')) {
        errorMessage += 'Invalid API key. Please check your Gemini API key.'
      } else if (error.message?.includes('QUOTA_EXCEEDED')) {
        errorMessage += 'API quota exceeded. Please try again later.'
      } else {
        errorMessage += `Error: ${error.message || 'Unknown error'}`
      }
      setMessages(prev => [...prev, { type: 'bot', text: errorMessage }])
    }
    setLoading(false)
  }

  return (
    <div className="app">
      <div className="header">Finance Assistant</div>

      <div className="chat-container" ref={chatRef}>
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.type}`}>
            {msg.text}
          </div>
        ))}
        {loading && <div className="message bot">Thinking...</div>}
      </div>

      <div className="input-area">
        <input
          className="message-input"
          placeholder="Ask about finance, investing, budgeting..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button
          className="send-button"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  )
}
