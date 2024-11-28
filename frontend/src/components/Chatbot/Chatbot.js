import React from 'react';
import {AiChat} from '@nlux/react';
import {useUnsafeChatAdapter} from '@nlux/openai-react';
import '@nlux/themes/nova.css';
import {highlighter} from '@nlux/highlighter';
import {systemMessage} from './systemMessage';


const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;


const adapterOptions = {
    apiKey: OPENAI_API_KEY,
    model: 'gpt-4o-mini',
    systemMessage: systemMessage,
};


export const WavesBackground = () => {
    return (
        <div className="feather-background">
            <div className="wave"></div>
            <div className="wave"></div>
            <div className="wave"></div>
        </div>
    );
};

export const Chatbot = () => {

    const openAiAdapter = useUnsafeChatAdapter(adapterOptions);

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
                ]
            }}
            displayOptions={{
                themeId: 'nova',
                colorScheme: 'light',
                width: '100%',
            }}
            messageOptions={{
                syntaxHighlighter: highlighter,
            }}
            adapter={openAiAdapter}
            composerOptions={{
                placeholder: 'How can I help you today?'
            }}
        />
    );
};

export default Chatbot;
