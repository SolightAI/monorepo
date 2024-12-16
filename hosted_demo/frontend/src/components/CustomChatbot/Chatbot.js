import React, { useState, useRef, useEffect } from 'react'
import { ArrowUp, Send } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'

export const ChatInterface = ({
  title,
  socketUrl,
  history,
  setHistory,
  newMessage,
  setNewMessage,
  historyRef,
  newMessageRef,
  showQueries = false
}) => {
  const [input, setInput] = useState('')
  const wsRef = useRef(null)
  const [isTyping, setIsTyping] = useState(false)

  // Add handler for query clicks
  const handleQueryClick = (queryContent) => {
    // Set the input to the query content
    setInput(queryContent)

    // Remove the query message from history
    setHistory(prevHistory => {
      const updatedHistory = prevHistory.filter(msg =>
        !(msg.is_query && msg.content === queryContent)
      )
      historyRef.current = updatedHistory
      return updatedHistory
    })

    // Clear new message if it was the clicked query
    if (newMessage.content === queryContent) {
      setNewMessage({ content: '' })
    }

    // Send the message
    handleSendMessage(queryContent)
  }

  // Separate message sending logic from handleSend
  const handleSendMessage = (messageContent) => {
    // Add user message to history first
    setHistory(prevHistory => {
      const updatedHistory = [...prevHistory, { role: 'user', content: messageContent }]
      historyRef.current = updatedHistory
      return updatedHistory
    })

    const connectWebSocket = () => {
      wsRef.current = new WebSocket(socketUrl)

      wsRef.current.onopen = () => {
        console.log('WebSocket connected')
        setIsTyping(true)
        wsRef.current.send(JSON.stringify([...historyRef.current]))
      }

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setHistory(prevHistory => [...prevHistory, {
          role: 'assistant',
          content: 'Error: Failed to connect to the server. Please try again.'
        }])
      }

      wsRef.current.onmessage = (event) => {
        if (!event.data) return

        setNewMessage((prevMessage) => {
          const updatedContent = prevMessage.content + event.data

          // Check for either <BOXED> or <QUERY> tokens
          const boxedIndex = updatedContent.indexOf('<BOXED>')
          const queryIndex = updatedContent.indexOf('<QUERY>')

          // If either token is found, handle the special message
          if (boxedIndex !== -1 || queryIndex !== -1) {
            // Find the first occurring token
            const splitIndex = (boxedIndex !== -1 && queryIndex !== -1)
              ? Math.min(boxedIndex, queryIndex)
              : (boxedIndex !== -1 ? boxedIndex : queryIndex)

            const token = updatedContent.slice(splitIndex).startsWith('<BOXED>')
              ? '<BOXED>'
              : '<QUERY>'

            const beforeToken = updatedContent.slice(0, splitIndex)
            const afterToken = updatedContent.slice(splitIndex + token.length)

            setHistory(prevHistory => {
              const updatedHistory = [...prevHistory]
              if (updatedHistory.length === 0 || updatedHistory[updatedHistory.length - 1].content !== beforeToken) {
                updatedHistory.push({ role: 'assistant', content: beforeToken })
              }
              historyRef.current = updatedHistory
              return updatedHistory
            })

            // Return new message with is_query flag based on the token
            return {
              content: afterToken,
              is_query: token === '<QUERY>'
            }
          }

          // For regular messages, just append the new data
          return {
            content: updatedContent,
            is_query: prevMessage.is_query ? true : false
          }
        })
      }

      wsRef.current.onclose = (event) => {
        console.log(`WebSocket closed with code: ${event.code}, reason: ${event.reason}`)
        setIsTyping(false)

        setTimeout(() => {
          if (event.code !== 1000) {
            console.warn(`WebSocket closed unexpectedly: Code ${event.code}, Reason: ${event.reason}`)
          }

          if (newMessageRef.current.content) {
            const lastMessage = historyRef.current[historyRef.current.length - 1]
            if (!lastMessage || lastMessage.content !== newMessageRef.current.content) {
              setHistory(prevHistory => {
                const updatedHistory = [...prevHistory, {
                  role: 'assistant',
                  content: newMessageRef.current.content,
                  is_query: newMessageRef.current.is_query
                }]
                historyRef.current = updatedHistory
                return updatedHistory
              })
            }
          }

          setNewMessage({ content: '' })
          wsRef.current = null
        }, 100)
      }
    }

    // Create new WebSocket connection or use existing one
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      connectWebSocket()
    } else {
      wsRef.current.send(JSON.stringify([...historyRef.current]))
    }

    setInput('')
    setNewMessage({ content: '' })
  }

  // Update handleSend to use handleSendMessage
  const handleSend = () => {
    if (!input) return // Prevent sending empty messages
    handleSendMessage(input)
  }

  // Add cleanup effect to close WebSocket connection
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  const TypingIndicator = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-6 my-3 shadow-sm backdrop-blur-sm bg-white/90 max-w-[80%]"
    >
      <div className="flex items-center space-x-2">
        <div className="flex space-x-1">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.25 }}
            className="w-2 h-2 rounded-full bg-blue-600"
          />
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.25, delay: 0.15 }}
            className="w-2 h-2 rounded-full bg-blue-600"
          />
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 0.25, delay: 0.3 }}
            className="w-2 h-2 rounded-full bg-blue-600"
          />
        </div>
        <span className="text-sm text-gray-500">Laneo is typing...</span>
      </div>
    </motion.div>
  )

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-white to-blue-50">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex w-full flex-col items-center justify-center space-y-6 p-12"
      >
        <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
          {title}
        </h1>
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex flex-col items-center space-y-4"
        >
          <div className="h-24 w-24 rounded-full flex items-center justify-center">
            <img src="https://i.ibb.co/rv8yHK6/laneo-black.png" alt="Laneo" />
          </div>
          <h2 className="text-3xl font-semibold text-gray-800">Laneo</h2>
        </motion.div>
        <p className="text-xl text-center text-gray-600 max-w-2xl">
          Monetize your chatbot with seamless ad integration
        </p>
      </motion.div>

      {/* Messages Container */}
      <div className="flex flex-col w-full max-w-4xl px-4 mb-32">
        <AnimatePresence>
          {history
            .filter(message => showQueries || !message.is_query)
            .map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className={`rounded-2xl p-6 my-3 shadow-sm backdrop-blur-sm ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white ml-auto max-w-[80%]'
                  : message.is_query
                    ? 'bg-gradient-to-r from-slate-50/90 to-blue-50/90 border border-blue-100 cursor-pointer hover:from-slate-100/90 hover:to-blue-100/90 transform hover:scale-[1.02] transition-all'
                    : 'bg-white/90 max-w-[80%]'
              }`}
              onClick={() => message.is_query ? handleQueryClick(message.content) : null}
            >
              <div className={`prose max-w-none ${message.role === 'user' ? 'text-white' : 'text-gray-800'}`}>
                <ReactMarkdown>
                  {message.is_query ? `**Sponsored:** ${message.content}` : message.content}
                </ReactMarkdown>
              </div>
            </motion.div>
          ))}
          {newMessage.content && (!newMessage.is_query || showQueries) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl p-6 my-3 shadow-sm backdrop-blur-sm ${
                newMessage.is_query
                  ? 'bg-gradient-to-r from-slate-50/90 to-blue-50/90 border border-blue-100 cursor-pointer hover:from-slate-100/90 hover:to-blue-100/90 transform hover:scale-[1.02] transition-all'
                  : 'bg-white/90'
              }`}
              onClick={() => newMessage.is_query ? handleQueryClick(newMessage.content) : null}
            >
              <div className={`prose max-w-none ${newMessage.is_query ? '' : 'text-gray-800'}`}>
                <ReactMarkdown>
                  {newMessage.is_query ? `**Sponsored:** ${newMessage.content}` : newMessage.content}
                </ReactMarkdown>
              </div>
            </motion.div>
          )}
          {isTyping && !newMessage.content && <TypingIndicator />}
        </AnimatePresence>
      </div>

      {/* Chat Input */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 w-full border-t bg-white/80 backdrop-blur-md p-6 z-50"
      >
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <input
            type="text"
            placeholder="How can I help you today?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend() }}
            className="flex-1 text-lg p-4 border border-gray-200 rounded-xl bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-xl hover:shadow-lg transition-all"
          >
            <Send className="h-6 w-6" />
            <span className="sr-only">Send message</span>
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

export default ChatInterface
