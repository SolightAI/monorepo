import React from 'react';
import {AiChat} from '@nlux/react';
import '@nlux/themes/nova.css';
import {highlighter} from '@nlux/highlighter';
import {useAsStreamAdapter} from '@nlux/react';


const streamText = (message, observer, extra) => {
  const socket = new WebSocket('ws://demo.laneo.ai/ws');

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


export const personas = {
    assistant: {
        name: 'Laneo',
        avatar: 'https://i.ibb.co/rv8yHK6/laneo-black.png',
        tagline: 'Monetize your chatbot with seamless ad integration'
    },
};


export const Chatbot = () => {

    const myCustomAdapter = useAsStreamAdapter(streamText, []);

    return (
        <AiChat
            conversationOptions={{
                conversationStarters: [
                    {
                        prompt: 'I want to go skying.'
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
                width: '100%',
            }}
            messageOptions={{
                syntaxHighlighter: highlighter,
            }}
            adapter={myCustomAdapter}
            composerOptions={{
                placeholder: 'How can I help you today?'
            }}
            personaOptions={personas}
        />
    );
};

export default Chatbot;
