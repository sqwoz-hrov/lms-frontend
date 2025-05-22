import React from 'react';

const Navbar = () => {
  return (
    <nav className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold">LMS Platform</h1>
        <div className="space-x-4">
          <a href="/" className="hover:text-blue-200">Dashboard</a>
          <a href="/courses" className="hover:text-blue-200">Courses</a>
          <a href="/profile" className="hover:text-blue-200">Profile</a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;