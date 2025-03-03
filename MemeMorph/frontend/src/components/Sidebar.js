import React from 'react';
import styled from 'styled-components';
import { PAGES } from '../constants';

const SidebarContainer = styled.aside`
  grid-area: sidebar;
  background-color: white;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.1);
  width: ${({ $isOpen }) => ($isOpen ? '250px' : '60px')};
  transition: width 0.3s ease;
  overflow: hidden;
  z-index: 5;
`;

const MenuList = styled.ul`
  list-style: none;
  padding: 20px 0;
`;

const MenuItem = styled.li`
  padding: 12px 20px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
  background-color: ${props => props.$isActive ? 'var(--secondary-color)' : 'transparent'};
  color: ${props => props.$isActive ? 'white' : 'inherit'};
  
  &:hover {
    background-color: ${props => props.$isActive ? 'var(--secondary-color)' : 'var(--light-color)'};
  }
`;

const MenuIcon = styled.span`
  margin-right: ${({ $isOpen }) => ($isOpen ? '15px' : '0')};
  font-size: 1.2rem;
`;

const MenuText = styled.span`
  opacity: ${({ $isOpen }) => ($isOpen ? '1' : '0')};
  white-space: nowrap;
  transition: opacity 0.2s;
`;

const Separator = styled.div`
  height: 1px;
  background-color: #e0e0e0;
  margin: 10px 20px;
`;

const menuItems = [
  { icon: '🏠', label: 'Home', id: PAGES.HOME },
  { icon: '🖼️', label: 'My Collection', id: PAGES.COLLECTION },
  { icon: '🔍', label: 'Explore', id: PAGES.EXPLORE },
  { icon: '✨', label: 'Create', id: PAGES.CREATE },
  { icon: '🎫', label: 'Claim NFT', id: PAGES.CLAIM },
  { icon: '💰', label: 'Marketplace', id: PAGES.MARKETPLACE },
];

const settingsItems = [
  { icon: '⚙️', label: 'Settings', id: PAGES.SETTINGS },
  { icon: '❓', label: 'Help', id: PAGES.HELP },
];

const Sidebar = ({ isOpen, activePage, onPageChange }) => {
  const handleItemClick = (pageId) => {
    if (onPageChange) {
      onPageChange(pageId);
    }
  };

  return (
    <SidebarContainer $isOpen={isOpen}>
      <MenuList>
        {menuItems.map((item) => (
          <MenuItem 
            key={item.id} 
            $isActive={activePage === item.id}
            onClick={() => handleItemClick(item.id)}
          >
            <MenuIcon $isOpen={isOpen}>{item.icon}</MenuIcon>
            <MenuText $isOpen={isOpen}>{item.label}</MenuText>
          </MenuItem>
        ))}
        
        <Separator />
        
        {settingsItems.map((item) => (
          <MenuItem 
            key={item.id} 
            $isActive={activePage === item.id}
            onClick={() => handleItemClick(item.id)}
          >
            <MenuIcon $isOpen={isOpen}>{item.icon}</MenuIcon>
            <MenuText $isOpen={isOpen}>{item.label}</MenuText>
          </MenuItem>
        ))}
      </MenuList>
    </SidebarContainer>
  );
};

export default Sidebar;