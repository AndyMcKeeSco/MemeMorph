import React, { useState } from 'react';
import styled from 'styled-components';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MainContent from './components/MainContent';
import { PAGES } from './constants';

const AppContainer = styled.div`
  display: grid;
  grid-template-rows: 60px 1fr;
  grid-template-columns: auto 1fr;
  grid-template-areas:
    "header header"
    "sidebar main";
  height: 100vh;
`;

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState(PAGES.HOME);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handlePageChange = (pageId) => {
    setActivePage(pageId);
  };

  return (
    <AppContainer>
      <Header toggleSidebar={toggleSidebar} />
      <Sidebar 
        isOpen={sidebarOpen} 
        activePage={activePage} 
        onPageChange={handlePageChange} 
      />
      <MainContent activePage={activePage} />
    </AppContainer>
  );
}

export default App;