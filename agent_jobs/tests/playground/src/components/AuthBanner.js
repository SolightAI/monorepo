import React from 'react';

const AuthBanner = () => {
  return (
    <div className="login-popup fixed z-10 left-0 bottom-0 right-0 p-12 bg-black " style={{translate: 'none', rotate: 'none', scale: 'none', transform: 'translate(0%, 101%)'}}>
        <svg className="absolute top-4 right-4 cursor-pointer w-6 h-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        <div className="flex flex-row justify-between items-center">
            <div>
                <h3 className="text-white">You need to be login to acces this feature.</h3>
                <p className="text-white">Login will only take 1 minute ! </p>
                <p className="text-white">You must stop everything and login now !</p>
            </div>
            <div>
                <a className=" bg-white text-black border-black hover:no-underline hover:shadow cursor-pointer btn inline-flex justify-center items-center border font-medium rounded focus:outline-none whitespace-nowrap px-5 py-2 text-sm undefined" href="/#/auth/login">Login</a>
            </div>
        </div>
    </div>
  );
};

export default AuthBanner;
