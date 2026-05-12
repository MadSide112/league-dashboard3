import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-10 bg-white shadow-md border-b border-gray-100">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 uppercase">
            Лига чемпионов
          </h1>
          <div className="text-lg md:text-xl text-blue-600 font-bold mt-2">
            01.03.2026 - 01.09.2026
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
