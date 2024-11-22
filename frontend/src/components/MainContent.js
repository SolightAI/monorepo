import React from 'react';
import '../styles/MainContent.css';


const MainContent = () => (
    <main>
        {/* Hero Section */}
        <section className="hero">
            <div className="hero-content">
                <h1>Laneo</h1>
                <p>Enabling ads on LLM applications</p>
            </div>
        </section>

        {/* About Section */}
        <section id="publishera">
            <h2>Publishers</h2>
            <p>Your about section content from slides.</p>
        </section>

        {/* Services Section */}
        <section id="advertisers">
            <h2>Our Services</h2>
            <p>Your services section content from slides.</p>
        </section>

    </main>
);

export default MainContent;
