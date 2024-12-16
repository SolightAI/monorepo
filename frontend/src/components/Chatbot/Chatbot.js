import React, { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'


const socketUrl = process.env.REACT_APP_DEMO_INFERENCE_WEBSOCKET_URL || 'wss://default.url/ws';


const Chatbot = ({
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
    <div className="flex h-[700px] flex-col items-center bg-gradient-to-b from-white to-blue-50">
      {/* Messages Container */}
      <div className="flex flex-col w-full max-w-4xl px-4 h-full py-4">
        {/* Messages Area - scrollable */}
        <div className="flex-1 overflow-y-auto mb-4">
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full bg-white/80 backdrop-blur-md p-4 rounded-xl"
        >
          <div className="flex items-center gap-3">
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
    </div>
  )
}


const ChatInterface = () => {
  const [adType, setAdType] = useState('native');

  const [nativeHistory, setNativeHistory] = useState([]);
  const [boxedHistory, setBoxedHistory] = useState([]);
  const [queriesHistory, setQueriesHistory] = useState([]);
  
  const [nativeNewMessage, setNativeNewMessage] = useState({ content: '' });
  const [boxedNewMessage, setBoxedNewMessage] = useState({ content: '' });
  const [queriesNewMessage, setQueriesNewMessage] = useState({ content: '' });

  const nativeHistoryRef = useRef(nativeHistory);
  const boxedHistoryRef = useRef(boxedHistory);
  const queriesHistoryRef = useRef(queriesHistory);
  
  const nativeNewMessageRef = useRef(nativeNewMessage);
  const boxedNewMessageRef = useRef(boxedNewMessage);
  const queriesNewMessageRef = useRef(queriesNewMessage);

  useEffect(() => {
    nativeHistoryRef.current = nativeHistory;
    boxedHistoryRef.current = boxedHistory;
    queriesHistoryRef.current = queriesHistory;
    
    nativeNewMessageRef.current = nativeNewMessage;
    boxedNewMessageRef.current = boxedNewMessage;
    queriesNewMessageRef.current = queriesNewMessage;
  }, [nativeHistory, boxedHistory, queriesHistory, nativeNewMessage, boxedNewMessage, queriesNewMessage]);

  const AdTypeButton = ({ type, label, icon }) => (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => setAdType(type)}
      className={`
        flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
        ${adType === type 
          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30' 
          : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-400'}
      `}
    >
      {icon}
      {label}
    </motion.button>
  );

  return (
    <section>
      <div className="container mx-auto px-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
        </motion.div>

        <div className="">
        {/* <div className="max-w-6xl mx-auto"> */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <AdTypeButton
                type="native"
                label="Native Ads"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
              />
              <AdTypeButton
                type="boxed"
                label="Boxed Ads"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
              />
              <AdTypeButton
                type="queries"
                label="Smart Queries"
                icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
            </div>

            <div className="relative">
              <div className="relative bg-white rounded-xl shadow-sm p-4">
                {adType === 'native' && (
                  <Chatbot
                    title="Native Advertising"
                    socketUrl={`${socketUrl}/native`}
                    history={nativeHistory}
                    setHistory={setNativeHistory}
                    newMessage={nativeNewMessage}
                    setNewMessage={setNativeNewMessage}
                    historyRef={nativeHistoryRef}
                    newMessageRef={nativeNewMessageRef}
                    showQueries={false}
                  />
                )}
                {adType === 'boxed' && (
                  <Chatbot
                    title="Boxed Advertising"
                    socketUrl={`${socketUrl}/boxed`}
                    history={boxedHistory}
                    setHistory={setBoxedHistory}
                    newMessage={boxedNewMessage}
                    setNewMessage={setBoxedNewMessage}
                    historyRef={boxedHistoryRef}
                    newMessageRef={boxedNewMessageRef}
                    showQueries={false}
                  />
                )}
                {adType === 'queries' && (
                  <Chatbot
                    title="Smart Queries"
                    socketUrl={`${socketUrl}/queries`}
                    history={queriesHistory}
                    setHistory={setQueriesHistory}
                    newMessage={queriesNewMessage}
                    setNewMessage={setQueriesNewMessage}
                    historyRef={queriesHistoryRef}
                    newMessageRef={queriesNewMessageRef}
                    showQueries={true}
                  />
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};


export { ChatInterface }
export default Chatbot
