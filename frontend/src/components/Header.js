import React from 'react';
import '../styles/Header.css';

const Header = () => (
    <header>
        <img src="/logo.png" alt="Company Logo" />
        <nav>
            <ul>
                <li className="nav-item"><a href="#publishers">Publishers</a></li>
                <li className="nav-item"><a href="#advertisers">Advertisers</a></li>
            </ul>
        </nav>
    </header>
);

export default Header;