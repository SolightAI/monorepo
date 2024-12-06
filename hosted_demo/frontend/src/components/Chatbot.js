import React, { useMemo } from 'react';
import {AiChat, useAsStreamAdapter, Markdown} from '@nlux/react';
import '@nlux/themes/nova.css';
import {highlighter} from '@nlux/highlighter';


export const personas = {
  assistant: {
      name: 'Laneo',
      avatar: 'https://i.ibb.co/rv8yHK6/laneo-black.png',
      tagline: 'Monetize your chatbot with seamless ad integration'
  },
};


const CustomResponseRenderer = (props) => {
  const { content, containerRef, dataTransferMode } = props;

  const chatBubbles = useMemo(() => {
    if (dataTransferMode === 'stream') {
        const pattern = '------\n';
        // Check for '------' and split into chat bubbles if present
        if (content.includes(pattern)) {
            console.log("YES");
            const beforeParts = content.slice(0, content.indexOf(pattern));
            const afterParts = content.slice(content.indexOf(pattern), content.length);
            console.log("beforeParts: ", beforeParts);
            console.log("afterParts: ", afterParts);
            const partsList = [beforeParts, afterParts];
            console.log("partsList length: ", partsList.length);
            return partsList.map((part, index) => (
                <div key={index} className="py-4">
                    <Markdown>{part}</Markdown>
                </div>
            ));
        } else {
            console.log("NO: ", content);
        }
        return <div ref={containerRef} />;
    } else {
        // For batched data, split content by "------" and memoize the result
        const parts = content.split('------');
        return parts.map((part, index) => (
            <div key={index} className="chat-bubble">
                <Markdown>{part.trim()}</Markdown>
            </div>
        ));
    }
  }, [content, containerRef, dataTransferMode]);

  return <div>{chatBubbles}</div>;
};


export const Chatbot = ({ title, api, socketUrl }) => {

  const streamText = (message, observer, extra) => {
    const socket = new WebSocket(socketUrl);

    socket.onopen = () => {
      const messages = [
        ...extra.conversationHistory.map(msg => ({
          ...msg,
          content: Array.isArray(msg.message) ? msg.message.join('') : msg.message
        })),
        { role: "user", content: message }
      ];
      socket.send(JSON.stringify(messages));
    };

    socket.onmessage = (event) => {
      observer.next(event.data);
    };

    socket.onerror = (error) => {
      observer.error(error);
    };

    socket.onclose = () => {
      observer.complete();
    };
  };

    return (
      <div className="w-full">
        <h3 className="text-2xl font-bold tracking-tighter sm:text-3xl text-gray-900 mb-2">{title}</h3>
        <AiChat
            conversationOptions={{
                conversationStarters: [
                    {
                        prompt: 'I want to go skiing.'
                    },
                    {
                        prompt: 'My laptop is overheating.'
                    },
                    {
                        prompt: "I have a hard time sleeping."
                    }
                ],
                historyPayloadSize: 10,
            }}
            displayOptions={{
                themeId: 'nova',
                colorScheme: 'light',
            }}
            messageOptions={{
                syntaxHighlighter: highlighter,
                responseRenderer: CustomResponseRenderer,
            }}
            adapter={useAsStreamAdapter(streamText)}
            api={api}
            composerOptions={{
                placeholder: 'How can I help you today?'
            }}
            personaOptions={personas}
        />
      </div>
    );
};

export default Chatbot;
