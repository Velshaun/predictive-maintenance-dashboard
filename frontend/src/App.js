import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import MachinePage from './pages/MachinePage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path='/' element={<Dashboard />} />
          <Route path='/machine/:id' element={<MachinePage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
