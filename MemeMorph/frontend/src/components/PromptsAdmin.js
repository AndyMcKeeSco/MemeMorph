import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useEnv } from '../contexts/EnvContext';

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

const ActionButton = styled.button`
  background-color: ${props => props.secondary ? 'var(--secondary-color)' : 'var(--primary-color)'};
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 15px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:hover {
    opacity: 0.9;
  }
  
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const DeleteButton = styled(ActionButton)`
  background-color: #dc3545;
  
  &:hover {
    background-color: #c82333;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 20px;
  height: calc(100vh - 250px);
  min-height: 500px;
`;

const PromptList = styled.div`
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow-y: auto;
  height: 100%;
`;

const PromptItem = styled.div`
  padding: 12px 15px;
  border-bottom: 1px solid #e0e0e0;
  cursor: pointer;
  background-color: ${props => props.active ? '#f0f0f0' : 'transparent'};
  
  &:hover {
    background-color: ${props => props.active ? '#f0f0f0' : '#f8f8f8'};
  }
  
  &:last-child {
    border-bottom: none;
  }
`;

const PromptName = styled.div`
  font-weight: ${props => props.active ? 'bold' : 'normal'};
`;

const PromptCategory = styled.div`
  font-size: 0.8rem;
  color: #666;
  margin-top: 3px;
`;

const EditorPanel = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  flex: 1;
`;

const FormGroup = styled.div`
  margin-bottom: 15px;
`;

const Label = styled.label`
  display: block;
  font-weight: 500;
  margin-bottom: 5px;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  
  &:focus {
    border-color: var(--primary-color);
    outline: none;
  }
  
  &[readOnly] {
    background-color: #f5f5f5;
    cursor: default;
  }
  
  &:not([readOnly]) {
    background-color: white;
    cursor: text;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  
  &:focus {
    border-color: var(--primary-color);
    outline: none;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: monospace;
  resize: none;
  
  &:focus {
    border-color: var(--primary-color);
    outline: none;
  }
  
  &[readOnly] {
    background-color: #f5f5f5;
    cursor: default;
  }
  
  &:not([readOnly]) {
    background-color: white;
    cursor: text;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
`;

const StatusBar = styled.div`
  padding: 10px;
  margin-top: 15px;
  border-radius: 4px;
  text-align: center;
  background-color: ${props => {
    switch(props.type) {
      case 'success': return 'rgba(40, 167, 69, 0.1)';
      case 'error': return 'rgba(220, 53, 69, 0.1)';
      case 'info': return 'rgba(13, 110, 253, 0.1)';
      default: return 'transparent';
    }
  }};
  color: ${props => {
    switch(props.type) {
      case 'success': return '#28a745';
      case 'error': return '#dc3545';
      case 'info': return '#0d6efd';
      default: return 'inherit';
    }
  }};
  border: 1px solid ${props => {
    switch(props.type) {
      case 'success': return '#28a745';
      case 'error': return '#dc3545';
      case 'info': return '#0d6efd';
      default: return 'transparent';
    }
  }};
  display: ${props => props.message ? 'block' : 'none'};
`;

const NoPromptSelected = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #666;
  
  svg {
    margin-bottom: 15px;
    font-size: 3rem;
    opacity: 0.5;
  }
`;

const PromptsAdmin = () => {
  const { isAdmin } = useEnv();
  const [prompts, setPrompts] = useState([]);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    description: '',
    category: 'general'
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  
  // Load prompts from API
  useEffect(() => {
    if (isAdmin) {
      fetchPrompts();
    }
  }, [isAdmin]);
  
  // Debug editMode state changes
  useEffect(() => {
    console.log("editMode changed:", editMode);
  }, [editMode]);
  
  const getAdminToken = () => {
    // In a real app, this would be a JWT or other auth token
    // For this demo, we're using the admin password directly
    return 'mememorphadmin';
  };
  
  const fetchPrompts = async () => {
    setLoading(true);
    try {
      // First try to fetch from real API
      try {
        const response = await fetch('http://localhost:5002/api/admin/prompts', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${getAdminToken()}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched prompts from API:', data);
          setPrompts(data.prompts || []);
          setLoading(false);
          return;
        } else {
          console.warn('API returned error, falling back to seed data');
        }
      } catch (apiError) {
        console.warn('API fetch failed, falling back to seed data:', apiError);
      }
      
      // If API fails, use seed data
      const seedPrompts = [
        {
          id: '1',
          name: 'Character Generation',
          content: 'You are a creative character designer for a fictional world. Given a description of a fictional world, create unique and interesting characters that would exist in this world. Focus on making the characters fit the world\'s theme, technology level, magic system, and social structures.',
          description: 'Creates character profiles based on world description',
          category: 'worldbuilding',
          created_at: '2023-04-01T12:00:00Z',
          updated_at: '2023-04-01T12:00:00Z'
        },
        {
          id: '2',
          name: 'World Lore Expert',
          content: 'You are a helpful lore expert for fictional worlds. Given a description of a fictional world and a question about that world, provide a detailed and creative answer that\'s consistent with the world\'s established facts. If the question asks about something not explicitly mentioned in the world description, invent a plausible answer that would fit with the world\'s theme, technology level, magic system, or social structures.',
          description: 'Answers questions about fictional worlds',
          category: 'worldbuilding',
          created_at: '2023-04-02T12:00:00Z',
          updated_at: '2023-04-02T12:00:00Z'
        },
        {
          id: '3',
          name: 'NFT Description Generator',
          content: 'Generate a creative and compelling description for an NFT based on the following details: [IMAGE_DESCRIPTION]. The description should highlight unique aspects, potential value, and artistic elements. Keep it under 200 words.',
          description: 'Creates descriptions for NFTs',
          category: 'marketing',
          created_at: '2023-04-03T12:00:00Z',
          updated_at: '2023-04-03T12:00:00Z'
        }
      ];
      
      // Seed the database with initial prompts if needed
      for (const prompt of seedPrompts) {
        try {
          await createOrUpdatePrompt(prompt);
        } catch (seedError) {
          console.warn(`Failed to seed prompt ${prompt.name}:`, seedError);
        }
      }
      
      // Try to fetch again after seeding
      try {
        const response = await fetch('http://localhost:5002/api/admin/prompts', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${getAdminToken()}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Fetched prompts from API after seeding:', data);
          setPrompts(data.prompts || []);
        } else {
          // If still failing, fall back to seed data
          setPrompts(seedPrompts);
        }
      } catch (refetchError) {
        // Still failing, use seed data
        console.warn('API refetch failed, using local seed data:', refetchError);
        setPrompts(seedPrompts);
      }
    } catch (error) {
      console.error('Error in prompt loading process:', error);
      setStatus({
        type: 'error',
        message: 'Failed to load prompts. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to create or update a prompt
  const createOrUpdatePrompt = async (promptData) => {
    const isNew = !promptData.id || promptData.id.startsWith('temp_');
    const url = isNew 
      ? 'http://localhost:5002/api/admin/prompts'
      : `http://localhost:5002/api/admin/prompts/${promptData.id}`;
    
    const method = isNew ? 'POST' : 'PUT';
    
    const response = await fetch(url, {
      method: method,
      headers: {
        'Authorization': `Bearer ${getAdminToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(promptData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save prompt');
    }
    
    return await response.json();
  };
  
  const selectPrompt = (prompt) => {
    setSelectedPrompt(prompt);
    setFormData({
      name: prompt.name,
      content: prompt.content,
      description: prompt.description || '',
      category: prompt.category || 'general'
    });
    setEditMode(false);
    setStatus({ type: '', message: '' });
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log(`Input changed: ${name} = ${value}, editMode = ${editMode}`);
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const createNewPrompt = () => {
    setSelectedPrompt(null);
    setFormData({
      name: '',
      content: '',
      description: '',
      category: 'general'
    });
    setEditMode(true);
    setStatus({ type: '', message: '' });
  };
  
  const editPrompt = () => {
    console.log("Edit button clicked, setting editMode to true");
    setEditMode(true);
    setStatus({ type: '', message: '' });
  };
  
  const cancelEdit = () => {
    if (selectedPrompt) {
      // Reset form to selected prompt
      setFormData({
        name: selectedPrompt.name,
        content: selectedPrompt.content,
        description: selectedPrompt.description || '',
        category: selectedPrompt.category || 'general'
      });
      setEditMode(false);
    } else {
      // Clear form
      setFormData({
        name: '',
        content: '',
        description: '',
        category: 'general'
      });
    }
    setStatus({ type: '', message: '' });
  };
  
  const validateForm = () => {
    if (!formData.name.trim()) {
      setStatus({
        type: 'error',
        message: 'Prompt name is required'
      });
      return false;
    }
    
    if (!formData.content.trim()) {
      setStatus({
        type: 'error',
        message: 'Prompt content is required'
      });
      return false;
    }
    
    return true;
  };
  
  const savePrompt = async (e) => {
    e.preventDefault();
    
    console.log("-----------------------------------------------------");
    console.log("Save prompt called, form data:", formData);
    console.log("Current editMode:", editMode);
    console.log("Event target:", e.target);
    console.log("Event type:", e.type);
    console.log("Active element:", document.activeElement?.id || "none");
    console.log("-----------------------------------------------------");
    
    if (!validateForm()) {
      return;
    }
    
    // Check if anything actually changed
    if (selectedPrompt) {
      const hasChanges = 
        formData.name !== selectedPrompt.name ||
        formData.content !== selectedPrompt.content ||
        formData.description !== (selectedPrompt.description || '') ||
        formData.category !== (selectedPrompt.category || 'general');
      
      console.log("Form has changes:", hasChanges);
      
      if (!hasChanges) {
        console.log("No changes detected, still proceeding with save");
      }
    }
    
    setLoading(true);
    setStatus({ type: '', message: '' });
    
    try {
      const isNew = !selectedPrompt;
      
      // Prepare prompt data for saving
      let promptData = {
        ...formData
      };
      
      if (!isNew) {
        // Include ID for updates
        promptData.id = selectedPrompt.id;
      } else {
        // For new prompts, use a temporary ID that will be replaced by the server
        promptData.id = `temp_${Date.now()}`;
        promptData.created_at = new Date().toISOString();
      }
      
      promptData.updated_at = new Date().toISOString();
      
      // Save to backend
      try {
        const result = await createOrUpdatePrompt(promptData);
        console.log('Prompt saved successfully:', result);
        
        // Refresh prompts from API to get the latest data
        await fetchPrompts();
        
        // If we have an ID from the result, find and select that prompt
        if (result && result.id) {
          const savedPrompt = prompts.find(p => p.id === result.id);
          setSelectedPrompt(savedPrompt);
        }
        
        setStatus({
          type: 'success',
          message: isNew ? 'Prompt created successfully' : 'Prompt updated successfully'
        });
        
        setEditMode(false);
      } catch (apiError) {
        console.error('API error saving prompt:', apiError);
        throw new Error(apiError.message || 'Failed to save prompt.');
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
      setStatus({
        type: 'error',
        message: error.message || 'Failed to save prompt. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const deletePrompt = async () => {
    if (!selectedPrompt) return;
    
    if (!window.confirm(`Are you sure you want to delete "${selectedPrompt.name}"?`)) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Delete from backend API
      const response = await fetch(`http://localhost:5002/api/admin/prompts/${selectedPrompt.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAdminToken()}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete prompt');
      }
      
      // Update UI state
      setPrompts(prev => prev.filter(p => p.id !== selectedPrompt.id));
      setSelectedPrompt(null);
      setFormData({
        name: '',
        content: '',
        description: '',
        category: 'general'
      });
      
      setStatus({
        type: 'success',
        message: 'Prompt deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting prompt:', error);
      setStatus({
        type: 'error',
        message: error.message || 'Failed to delete prompt. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };
  
  if (!isAdmin) {
    return (
      <Container>
        <Title>Admin Access Required</Title>
        <p>You need admin privileges to access this page.</p>
      </Container>
    );
  }
  
  return (
    <Container>
      <PageHeader>
        <div>
          <Title>Prompt Management</Title>
          <small style={{ color: '#666' }}>Edit Mode: {editMode ? 'On' : 'Off'}</small>
        </div>
        <ActionButton onClick={createNewPrompt}>Create New Prompt</ActionButton>
      </PageHeader>
      
      <Grid>
        <PromptList>
          {prompts.map(prompt => (
            <PromptItem 
              key={prompt.id} 
              active={selectedPrompt && selectedPrompt.id === prompt.id}
              onClick={() => selectPrompt(prompt)}
            >
              <PromptName active={selectedPrompt && selectedPrompt.id === prompt.id}>
                {prompt.name}
              </PromptName>
              <PromptCategory>{prompt.category}</PromptCategory>
            </PromptItem>
          ))}
          {prompts.length === 0 && (
            <div style={{ padding: 15, textAlign: 'center', color: '#666' }}>
              No prompts available
            </div>
          )}
        </PromptList>
        
        <EditorPanel>
          {selectedPrompt || editMode ? (
            <Form onSubmit={(e) => {
              // Only handle form submission when explicitly clicking the Save button
              if (editMode) {
                savePrompt(e);
              } else {
                e.preventDefault(); // Prevent form submission when not in edit mode
                console.log("Form submit prevented - not in edit mode");
              }
            }}>
              <FormGroup>
                <Label htmlFor="name">Prompt Name</Label>
                <Input 
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={(e) => {
                    console.log(`Name input change: ${e.target.value}, editMode=${editMode}, readOnly=${!editMode}`);
                    handleInputChange(e);
                  }}
                  readOnly={!editMode}
                  disabled={loading}
                  onClick={() => console.log(`Name input clicked, editable=${editMode}`)}
                />
                {!editMode && <small style={{color: 'grey'}}>(Click Edit to modify)</small>}
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="category">Category</Label>
                <Select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  disabled={!editMode || loading}
                >
                  <option value="general">General</option>
                  <option value="worldbuilding">Worldbuilding</option>
                  <option value="character">Character</option>
                  <option value="marketing">Marketing</option>
                  <option value="technical">Technical</option>
                </Select>
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="description">Description (Optional)</Label>
                <Input 
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  readOnly={!editMode}
                  disabled={loading}
                />
              </FormGroup>
              
              <FormGroup style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Label htmlFor="content">Prompt Content</Label>
                <TextArea 
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={(e) => {
                    console.log(`Content change: ${e.target.value.substring(0, 20)}..., editMode=${editMode}, readOnly=${!editMode}`);
                    handleInputChange(e);
                  }}
                  onFocus={() => console.log("TextArea focused, editMode:", editMode)}
                  readOnly={!editMode}
                  disabled={loading}
                  style={{ backgroundColor: editMode ? 'white' : '#f5f5f5' }}
                />
                {!editMode && <small style={{color: 'grey'}}>(Click Edit to modify)</small>}
              </FormGroup>
              
              <ButtonGroup>
                {editMode ? (
                  <>
                    <ActionButton type="button" secondary onClick={cancelEdit} disabled={loading}>
                      Cancel
                    </ActionButton>
                    <ActionButton type="submit" disabled={loading}>
                      {loading ? 'Saving...' : 'Save Prompt'}
                    </ActionButton>
                  </>
                ) : (
                  <>
                    <DeleteButton type="button" onClick={deletePrompt} disabled={loading}>
                      Delete
                    </DeleteButton>
                    <ActionButton 
                      type="button" 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("Edit button clicked directly");
                        setEditMode(true);
                        setStatus({ type: '', message: '' });
                        return false;
                      }} 
                      disabled={loading}
                    >
                      Edit
                    </ActionButton>
                  </>
                )}
              </ButtonGroup>
              
              <StatusBar type={status.type} message={status.message}>
                {status.message}
              </StatusBar>
            </Form>
          ) : (
            <NoPromptSelected>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
                <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
              </svg>
              <p>Select a prompt from the list or create a new one</p>
            </NoPromptSelected>
          )}
        </EditorPanel>
      </Grid>
    </Container>
  );
};

export default PromptsAdmin;