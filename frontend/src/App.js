import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import MachinePage from './pages/MachinePage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Dashboard />} />
        <Route path='/machine/:id' element={<MachinePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
