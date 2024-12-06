import React, { useState, useRef, useEffect } from 'react'
import { ArrowUp, Send } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

export const ChatInterface = ({ title, socketUrl }) => {
  // Add state for user input and chat messages
  const [input, setInput] = useState('')
  const wsRef = useRef(null)

  const [newMessage, setNewMessage] = useState({ content: '' })
  const newMessageRef = useRef(newMessage)

  const [history, setHistory] = useState([])
  const historyRef = useRef(history)

  useEffect(() => {
    newMessageRef.current = newMessage
    historyRef.current = history
  }, [newMessage, history])

  // Function to handle sending messages via WebSocket
  const handleSend = () => {
    if (!input.trim()) return // Prevent sending empty messages

    // Create WebSocket connection if it doesn't exist
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      wsRef.current = new WebSocket(socketUrl)

      wsRef.current.onmessage = (event) => {
        if (!event.data) return

        setNewMessage((prevMessage) => {
          const updatedContent = prevMessage.content + event.data

          if (updatedContent.includes('<BOXED>')) {
            const boxedIndex = updatedContent.indexOf('<BOXED>')
            const beforeToken = updatedContent.slice(0, boxedIndex)
            const afterToken = updatedContent.slice(boxedIndex + '<BOXED>'.length).trim()

            // Update history with complete message
            setHistory(prevHistory => {
              const updatedHistory = [...prevHistory]
              // Only add the message if it's not already the last message
              if (updatedHistory.length === 0 || updatedHistory[updatedHistory.length - 1].content !== beforeToken) {
                updatedHistory.push({ role: 'assistant', content: beforeToken })
              }
              historyRef.current = updatedHistory
              return updatedHistory
            })

            // Start new message with content after <BOXED>
            return { content: afterToken }
          }

          return { content: updatedContent }
        })
      }

      wsRef.current.onclose = (event) => {
        // Add a small delay to ensure all message processing is complete
        setTimeout(() => {
          if (event.code !== 1000) {
            console.warn(`WebSocket closed unexpectedly: Code ${event.code}, Reason: ${event.reason}`)
          }
          
          // Only update history if there's content to add and it's not already in history
          if (newMessageRef.current.content.trim()) {
            const lastMessage = historyRef.current[historyRef.current.length - 1]
            if (!lastMessage || lastMessage.content !== newMessageRef.current.content.trim()) {
              setHistory(prevHistory => {
                const updatedHistory = [...prevHistory, {
                  role: 'assistant',
                  content: newMessageRef.current.content.trim()
                }]
                historyRef.current = updatedHistory
                return updatedHistory
              })
            }
          }
          
          setNewMessage({ content: '' })
          wsRef.current = null
        }, 100) // Small delay to ensure message processing is complete
      }
    }

    // Add user message to history
    setHistory(prevHistory => {
      const updatedHistory = [...prevHistory, { role: 'user', content: input }]
      historyRef.current = updatedHistory
      return updatedHistory
    })

    // Send message once WebSocket is open
    const sendMessage = () => {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify([...historyRef.current]))
      } else {
        setTimeout(sendMessage, 100) // Retry if not ready
      }
    }
    sendMessage()

    setInput('')
    setNewMessage({ content: '' })
  }

  // Add cleanup effect to close WebSocket connection
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center bg-white">

      {/* Header */}
      <div className="flex w-full flex-col items-center justify-center space-y-4 p-8">
        <h1 className="text-4xl font-bold">{title}</h1>
        <div className="flex flex-col items-center space-y-2">
          <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-2xl">Logo</span>
          </div>
          <h2 className="text-2xl font-semibold">Laneo</h2>
        </div>
        <p className="text-xl text-center">
          Monetize your chatbot with seamless ad integration
        </p>
      </div>

      {/* Add messages rendering to the chat interface */}
      <div className="flex flex-col w-full max-w-4xl px-4">
        {history.map((message, index) => (
          <div
            key={index}
            className={`rounded-lg p-4 my-2 ${message.role === 'user' ? 'bg-blue-100' : 'bg-green-100'}`}
          >
            {message.content}
          </div>
        ))}
        {newMessage.content && (
          <div className="rounded-lg p-4 my-2 bg-green-100">
            {newMessage.content}
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="fixed bottom-0 w-full border-t bg-white p-4 z-50">
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <input
            type="text"
            placeholder="How can I help you today?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
            className="flex-1 text-lg p-2 border rounded-md"
          />
          <button onClick={handleSend} className="bg-blue-500 text-white p-3 rounded-full hover:bg-blue-600 transition-colors">
            <Send className="h-5 w-5" />
            <span className="sr-only">Send message</span>
          </button>
        </div>
      </div>

      {/* Scroll to Top Button */}
      <button className="fixed bottom-20 right-4 h-10 w-10 bg-gray-200 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-300 transition-colors">
        <ArrowUp className="h-5 w-5" />
        <span className="sr-only">Scroll to top</span>
      </button>
    </div>
  )
}

export default ChatInterface
