import React from 'react';
import styled from 'styled-components';

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
  transition: background-color 0.2s;
  
  &:hover {
    background-color: var(--light-color);
  }
  
  &.active {
    background-color: var(--secondary-color);
    color: white;
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
  { icon: '🏠', label: 'Home', id: 'home' },
  { icon: '🖼️', label: 'My Collection', id: 'collection' },
  { icon: '🔍', label: 'Explore', id: 'explore' },
  { icon: '✨', label: 'Create', id: 'create' },
  { icon: '💰', label: 'Marketplace', id: 'marketplace' },
];

const settingsItems = [
  { icon: '⚙️', label: 'Settings', id: 'settings' },
  { icon: '❓', label: 'Help', id: 'help' },
];

const Sidebar = ({ isOpen }) => {
  return (
    <SidebarContainer $isOpen={isOpen}>
      <MenuList>
        {menuItems.map((item) => (
          <MenuItem key={item.id}>
            <MenuIcon $isOpen={isOpen}>{item.icon}</MenuIcon>
            <MenuText $isOpen={isOpen}>{item.label}</MenuText>
          </MenuItem>
        ))}
        
        <Separator />
        
        {settingsItems.map((item) => (
          <MenuItem key={item.id}>
            <MenuIcon $isOpen={isOpen}>{item.icon}</MenuIcon>
            <MenuText $isOpen={isOpen}>{item.label}</MenuText>
          </MenuItem>
        ))}
      </MenuList>
    </SidebarContainer>
  );
};

export default Sidebar;