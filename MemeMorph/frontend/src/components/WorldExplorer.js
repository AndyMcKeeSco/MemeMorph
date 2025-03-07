import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useEnv } from '../contexts/EnvContext';
import LoreManager from './LoreManager';

const Container = styled.div`
  background-color: white;
  border-radius: 8px;
  padding: 25px;
  margin-bottom: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const Title = styled.h2`
  font-size: 1.5rem;
  color: var(--dark-color);
`;

const Tabs = styled.div`
  display: flex;
  border-bottom: 1px solid #dee2e6;
  margin-bottom: 20px;
`;

const Tab = styled.button`
  padding: 10px 20px;
  background-color: ${props => props.active ? 'white' : 'transparent'};
  border: none;
  border-bottom: 2px solid ${props => props.active ? 'var(--primary-color)' : 'transparent'};
  color: ${props => props.active ? 'var(--primary-color)' : '#6c757d'};
  font-weight: ${props => props.active ? 'bold' : 'normal'};
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    color: var(--primary-color);
  }
`;

const WorldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const WorldCard = styled.div`
  background-color: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
  }
`;

const WorldInfo = styled.div`
  padding: 15px;
`;

const WorldName = styled.h3`
  font-size: 1.1rem;
  margin-bottom: 5px;
  color: var(--dark-color);
`;

const WorldSummary = styled.p`
  font-size: 0.9rem;
  color: #6c757d;
  margin-bottom: 10px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const WorldEntryCount = styled.div`
  font-size: 0.8rem;
  color: #6c757d;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 5px;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  color: #6c757d;
  
  svg {
    width: 64px;
    height: 64px;
    margin-bottom: 20px;
    color: #dee2e6;
  }
  
  h3 {
    margin-bottom: 10px;
    font-size: 1.2rem;
  }
  
  p {
    max-width: 500px;
    margin-bottom: 20px;
  }
`;

const ChatInterface = styled.div`
  display: flex;
  flex-direction: column;
  height: 550px;
  margin-top: 20px;
`;

const ChatMessages = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  border: 1px solid #dee2e6;
  border-radius: 8px 8px 0 0;
  background-color: #f8f9fa;
`;

const MessageGroup = styled.div`
  margin-bottom: 20px;
`;

const MessageSender = styled.div`
  font-weight: bold;
  font-size: 0.9rem;
  margin-bottom: 5px;
  color: ${props => props.isUser ? 'var(--primary-color)' : 'var(--dark-color)'};
`;

const MessageContent = styled.div`
  background-color: ${props => props.isUser ? '#e6f2ff' : 'white'};
  border-radius: 8px;
  padding: 10px 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  max-width: 80%;
  margin-left: ${props => props.isUser ? 'auto' : '0'};
  font-size: 0.9rem;
  
  p {
    margin: 0 0 10px 0;
    &:last-child {
      margin-bottom: 0;
    }
  }
`;

const SourcesSection = styled.div`
  margin-top: 10px;
  font-size: 0.8rem;
  color: #6c757d;
`;

const SourcesList = styled.ul`
  margin: 5px 0 0 0;
  padding-left: 20px;
`;

const ChatInputArea = styled.div`
  display: flex;
  border: 1px solid #dee2e6;
  border-top: none;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
`;

const ChatInput = styled.input`
  flex: 1;
  padding: 12px 15px;
  border: none;
  font-size: 0.9rem;
  
  &:focus {
    outline: none;
  }
`;

const SendButton = styled.button`
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 0 20px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    background-color: var(--secondary-color);
  }
  
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const LoadingIndicator = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  
  .dot {
    width: 8px;
    height: 8px;
    background-color: #ccc;
    border-radius: 50%;
    margin: 0 3px;
    animation: pulse 1.5s infinite;
    
    &:nth-child(2) {
      animation-delay: 0.3s;
    }
    
    &:nth-child(3) {
      animation-delay: 0.6s;
    }
  }
  
  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.3);
      opacity: 0.7;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
`;

const formatMarkdown = (text) => {
  // Very simple markdown formatting
  // Bold
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Newlines
  formatted = formatted.replace(/\n/g, '<br>');
  return formatted;
};

const WorldExplorer = () => {
  const { baseUrl } = useEnv();
  const [activeTab, setActiveTab] = useState('chat');
  const [worlds, setWorlds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentWorldId, setCurrentWorldId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [askingQuestion, setAskingQuestion] = useState(false);
  
  // Load worlds on component mount
  useEffect(() => {
    loadWorlds();
  }, []);
  
  const loadWorlds = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${baseUrl}/api/world/lore?category=world_context`);
      if (response.ok) {
        const data = await response.json();
        const uniqueWorlds = [];
        const worldIds = new Set();
        
        // Filter unique worlds
        data.entries.forEach(entry => {
          if (!worldIds.has(entry.world_id)) {
            worldIds.add(entry.world_id);
            uniqueWorlds.push(entry);
          }
        });
        
        setWorlds(uniqueWorlds);
      }
    } catch (error) {
      console.error('Error loading worlds:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const selectWorld = (worldId) => {
    setCurrentWorldId(worldId);
    setMessages([
      {
        sender: 'system',
        content: `Welcome to the ${worldId} explorer! Ask any question about this world.`,
        isUser: false
      }
    ]);
    setActiveTab('chat');
  };
  
  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    
    if (!question.trim() || !currentWorldId) return;
    
    const userQuestion = question.trim();
    setMessages(prev => [...prev, {
      sender: 'user',
      content: userQuestion,
      isUser: true
    }]);
    
    setQuestion('');
    setAskingQuestion(true);
    
    try {
      const response = await fetch(`${baseUrl}/api/world/question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          question: userQuestion,
          world_id: currentWorldId
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get answer');
      }
      
      setMessages(prev => [...prev, {
        sender: 'assistant',
        content: data.answer,
        isUser: false,
        sources: data.sources || []
      }]);
    } catch (error) {
      console.error('Error getting answer:', error);
      setMessages(prev => [...prev, {
        sender: 'system',
        content: `Error: ${error.message || 'Failed to get answer'}`,
        isUser: false
      }]);
    } finally {
      setAskingQuestion(false);
    }
  };
  
  return (
    <Container>
      <PageHeader>
        <Title>World Explorer</Title>
      </PageHeader>
      
      {currentWorldId ? (
        <>
          <Tabs>
            <Tab 
              active={activeTab === 'chat'} 
              onClick={() => setActiveTab('chat')}
            >
              Chat
            </Tab>
            <Tab 
              active={activeTab === 'lore'} 
              onClick={() => setActiveTab('lore')}
            >
              Lore Database
            </Tab>
          </Tabs>
          
          {activeTab === 'chat' ? (
            <ChatInterface>
              <ChatMessages>
                {messages.map((message, index) => (
                  <MessageGroup key={index}>
                    <MessageSender isUser={message.isUser}>
                      {message.isUser ? 'You' : 'World Explorer'}
                    </MessageSender>
                    <MessageContent 
                      isUser={message.isUser}
                      dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }}
                    />
                    
                    {message.sources && message.sources.length > 0 && (
                      <SourcesSection>
                        <div>Sources:</div>
                        <SourcesList>
                          {message.sources.map((source, i) => (
                            <li key={i}>{source.title} ({source.category})</li>
                          ))}
                        </SourcesList>
                      </SourcesSection>
                    )}
                  </MessageGroup>
                ))}
                
                {askingQuestion && (
                  <LoadingIndicator>
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                  </LoadingIndicator>
                )}
              </ChatMessages>
              
              <form onSubmit={handleQuestionSubmit}>
                <ChatInputArea>
                  <ChatInput
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask about this world..."
                    disabled={askingQuestion}
                  />
                  <SendButton type="submit" disabled={askingQuestion || !question.trim()}>
                    Send
                  </SendButton>
                </ChatInputArea>
              </form>
            </ChatInterface>
          ) : (
            <LoreManager worldId={currentWorldId} />
          )}
        </>
      ) : (
        <>
          <h3>Select a World to Explore</h3>
          
          {loading ? (
            <LoadingIndicator>
              <div className="dot"></div>
              <div className="dot"></div>
              <div className="dot"></div>
            </LoadingIndicator>
          ) : worlds.length > 0 ? (
            <WorldGrid>
              {worlds.map((world, index) => (
                <WorldCard key={index} onClick={() => selectWorld(world.world_id)}>
                  <WorldInfo>
                    <WorldName>{world.title}</WorldName>
                    <WorldSummary>{world.content.substring(0, 150)}...</WorldSummary>
                    <WorldEntryCount>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm4 0v1h8V2H4zm8 3H4v1h8V5zM4 8h8v1H4V8zm8 3H4v1h8v-1z"/>
                      </svg>
                      World ID: {world.world_id}
                    </WorldEntryCount>
                  </WorldInfo>
                </WorldCard>
              ))}
            </WorldGrid>
          ) : (
            <EmptyState>
              <svg width="64" height="64" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                <path d="M7 11.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5z"/>
              </svg>
              <h3>No Worlds Found</h3>
              <p>
                Create a world in the World Character Creator to start exploring.
                Once you create a world, it will appear here for exploration.
              </p>
            </EmptyState>
          )}
        </>
      )}
    </Container>
  );
};

export default WorldExplorer;