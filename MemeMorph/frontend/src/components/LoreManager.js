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

const LoreList = styled.div`
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow-y: auto;
  height: 100%;
`;

const LoreItem = styled.div`
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

const LoreTitle = styled.div`
  font-weight: ${props => props.active ? 'bold' : 'normal'};
`;

const LoreCategory = styled.div`
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

const NoLoreSelected = styled.div`
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

const CategoryFilters = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
`;

const CategoryFilter = styled.button`
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid #ddd;
  background-color: ${props => props.active ? 'var(--primary-color)' : 'white'};
  color: ${props => props.active ? 'white' : '#333'};
  font-size: 0.8rem;
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.active ? 'var(--primary-color)' : '#f0f0f0'};
  }
`;

const ImportExportButtons = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 10px;
`;

const LoreManager = ({ worldId }) => {
  const { baseUrl } = useEnv();
  const [loreEntries, setLoreEntries] = useState([]);
  const [selectedLore, setSelectedLore] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    world_id: worldId || 'default'
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState(['all', 'general', 'history', 'locations', 'characters']);
  
  // Load lore entries from API
  useEffect(() => {
    fetchLoreEntries();
  }, [worldId, selectedCategory]);
  
  const fetchLoreEntries = async () => {
    setLoading(true);
    try {
      // Build API URL with filters
      let apiUrl = `${baseUrl}/api/world/lore?limit=100`;
      if (worldId) {
        apiUrl += `&world_id=${encodeURIComponent(worldId)}`;
      }
      if (selectedCategory && selectedCategory !== 'all') {
        apiUrl += `&category=${encodeURIComponent(selectedCategory)}`;
      }
      
      // Fetch lore entries
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        const data = await response.json();
        setLoreEntries(data.entries || []);
        
        // Extract unique categories for filters
        if (data.entries && data.entries.length > 0) {
          const uniqueCategories = ['all', ...new Set(data.entries.map(entry => entry.category))];
          setCategories(uniqueCategories);
        }
      } else {
        console.error('Failed to fetch lore entries');
        setStatus({
          type: 'error',
          message: 'Failed to load lore entries'
        });
      }
    } catch (error) {
      console.error('Error fetching lore entries:', error);
      setStatus({
        type: 'error',
        message: 'Failed to load lore entries'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const selectLoreEntry = async (loreEntry) => {
    setLoading(true);
    try {
      // Fetch full lore entry details
      const response = await fetch(`${baseUrl}/api/world/lore/${loreEntry.id}`);
      
      if (response.ok) {
        const fullEntry = await response.json();
        setSelectedLore(fullEntry);
        setFormData({
          title: fullEntry.metadata.title || '',
          content: fullEntry.content || '',
          category: fullEntry.metadata.category || 'general',
          world_id: fullEntry.metadata.world_id || (worldId || 'default')
        });
        setEditMode(false);
        setStatus({ type: '', message: '' });
      } else {
        console.error('Failed to fetch lore entry details');
        setStatus({
          type: 'error',
          message: 'Failed to load lore entry details'
        });
      }
    } catch (error) {
      console.error('Error fetching lore entry details:', error);
      setStatus({
        type: 'error',
        message: 'Failed to load lore entry details'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const createNewLoreEntry = () => {
    setSelectedLore(null);
    setFormData({
      title: '',
      content: '',
      category: 'general',
      world_id: worldId || 'default'
    });
    setEditMode(true);
    setStatus({ type: '', message: '' });
  };
  
  const editLoreEntry = () => {
    setEditMode(true);
    setStatus({ type: '', message: '' });
  };
  
  const cancelEdit = () => {
    if (selectedLore) {
      // Reset form to selected lore
      setFormData({
        title: selectedLore.metadata.title || '',
        content: selectedLore.content || '',
        category: selectedLore.metadata.category || 'general',
        world_id: selectedLore.metadata.world_id || (worldId || 'default')
      });
      setEditMode(false);
    } else {
      // Clear form
      setFormData({
        title: '',
        content: '',
        category: 'general',
        world_id: worldId || 'default'
      });
    }
    setStatus({ type: '', message: '' });
  };
  
  const validateForm = () => {
    if (!formData.title.trim()) {
      setStatus({
        type: 'error',
        message: 'Title is required'
      });
      return false;
    }
    
    if (!formData.content.trim()) {
      setStatus({
        type: 'error',
        message: 'Content is required'
      });
      return false;
    }
    
    return true;
  };
  
  const saveLoreEntry = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setStatus({ type: '', message: '' });
    
    try {
      const isNew = !selectedLore;
      
      // Prepare lore data for API
      const loreData = {
        title: formData.title,
        content: formData.content,
        category: formData.category,
        world_id: formData.world_id
      };
      
      // Determine API method and URL
      const method = isNew ? 'POST' : 'PUT';
      const url = isNew 
        ? `${baseUrl}/api/world/lore` 
        : `${baseUrl}/api/world/lore/${selectedLore.id}`;
      
      // Send request to API
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loreData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save lore entry');
      }
      
      // Reload lore entries
      await fetchLoreEntries();
      
      // If new entry, select the newly created one
      if (isNew) {
        const result = await response.json();
        if (result && result.id) {
          // Fetch the new entry to select it
          const newEntryResponse = await fetch(`${baseUrl}/api/world/lore/${result.id}`);
          if (newEntryResponse.ok) {
            const newEntry = await newEntryResponse.json();
            setSelectedLore(newEntry);
          }
        }
      }
      
      setStatus({
        type: 'success',
        message: isNew ? 'Lore entry created successfully' : 'Lore entry updated successfully'
      });
      
      setEditMode(false);
    } catch (error) {
      console.error('Error saving lore entry:', error);
      setStatus({
        type: 'error',
        message: error.message || 'Failed to save lore entry'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const deleteLoreEntry = async () => {
    if (!selectedLore) return;
    
    if (!window.confirm(`Are you sure you want to delete "${selectedLore.metadata.title}"?`)) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Delete from API
      const response = await fetch(`${baseUrl}/api/world/lore/${selectedLore.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete lore entry');
      }
      
      // Update UI state
      setLoreEntries(prev => prev.filter(entry => entry.id !== selectedLore.id));
      setSelectedLore(null);
      setFormData({
        title: '',
        content: '',
        category: 'general',
        world_id: worldId || 'default'
      });
      
      setStatus({
        type: 'success',
        message: 'Lore entry deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting lore entry:', error);
      setStatus({
        type: 'error',
        message: error.message || 'Failed to delete lore entry'
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleCategoryFilter = (category) => {
    setSelectedCategory(category);
    // Deselect current lore entry when changing filters
    setSelectedLore(null);
    setFormData({
      title: '',
      content: '',
      category: 'general',
      world_id: worldId || 'default'
    });
  };
  
  const exportLoreEntries = () => {
    // Create a download link for the export endpoint
    let exportUrl = `${baseUrl}/api/world/lore/export`;
    if (worldId) {
      exportUrl += `?world_id=${encodeURIComponent(worldId)}`;
    }
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = exportUrl;
    link.download = `lore_export_${worldId || 'all'}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const importLoreEntries = () => {
    // Create hidden file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    // Handle file selection
    input.onchange = async (e) => {
      if (!e.target.files || !e.target.files[0]) return;
      
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);
      
      setLoading(true);
      setStatus({ type: 'info', message: 'Importing lore entries...' });
      
      try {
        const response = await fetch(`${baseUrl}/api/world/lore/import`, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to import lore entries');
        }
        
        const result = await response.json();
        setStatus({
          type: 'success',
          message: result.message || 'Lore entries imported successfully'
        });
        
        // Reload lore entries
        await fetchLoreEntries();
      } catch (error) {
        console.error('Error importing lore entries:', error);
        setStatus({
          type: 'error',
          message: error.message || 'Failed to import lore entries'
        });
      } finally {
        setLoading(false);
      }
    };
    
    // Trigger file dialog
    input.click();
  };
  
  return (
    <Container>
      <PageHeader>
        <div>
          <Title>Lore Manager{worldId ? ` - ${worldId}` : ''}</Title>
          <small style={{ color: '#666' }}>Edit Mode: {editMode ? 'On' : 'Off'}</small>
        </div>
        <ActionButton onClick={createNewLoreEntry} disabled={loading}>
          Create New Lore Entry
        </ActionButton>
      </PageHeader>
      
      <CategoryFilters>
        {categories.map(category => (
          <CategoryFilter
            key={category}
            active={selectedCategory === category}
            onClick={() => handleCategoryFilter(category)}
          >
            {category === 'all' ? 'All Categories' : category}
          </CategoryFilter>
        ))}
      </CategoryFilters>
      
      <Grid>
        <div>
          <LoreList>
            {loreEntries.map(entry => (
              <LoreItem
                key={entry.id}
                active={selectedLore && selectedLore.id === entry.id}
                onClick={() => selectLoreEntry(entry)}
              >
                <LoreTitle active={selectedLore && selectedLore.id === entry.id}>
                  {entry.title}
                </LoreTitle>
                <LoreCategory>{entry.category}</LoreCategory>
              </LoreItem>
            ))}
            {loreEntries.length === 0 && (
              <div style={{ padding: 15, textAlign: 'center', color: '#666' }}>
                No lore entries available
              </div>
            )}
          </LoreList>
          
          <ImportExportButtons>
            <ActionButton secondary onClick={importLoreEntries} disabled={loading}>
              Import
            </ActionButton>
            <ActionButton secondary onClick={exportLoreEntries} disabled={loading || loreEntries.length === 0}>
              Export
            </ActionButton>
          </ImportExportButtons>
        </div>
        
        <EditorPanel>
          {selectedLore || editMode ? (
            <Form onSubmit={(e) => {
              // Only handle form submission when explicitly clicking the Save button
              if (editMode) {
                saveLoreEntry(e);
              } else {
                e.preventDefault();
                console.log("Form submit prevented - not in edit mode");
              }
            }}>
              <FormGroup>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  readOnly={!editMode}
                  disabled={loading}
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
                  <option value="history">History</option>
                  <option value="locations">Locations</option>
                  <option value="characters">Characters</option>
                  <option value="events">Events</option>
                  <option value="items">Items</option>
                  <option value="world_context">World Context</option>
                </Select>
              </FormGroup>
              
              <FormGroup>
                <Label htmlFor="world_id">World ID</Label>
                <Input
                  id="world_id"
                  name="world_id"
                  value={formData.world_id}
                  onChange={handleInputChange}
                  readOnly={!editMode || !!worldId}
                  disabled={loading || !!worldId}
                />
                {!!worldId && <small style={{color: 'grey'}}>(Fixed for current world)</small>}
              </FormGroup>
              
              <FormGroup style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Label htmlFor="content">Content</Label>
                <TextArea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
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
                      {loading ? 'Saving...' : 'Save Lore Entry'}
                    </ActionButton>
                  </>
                ) : (
                  <>
                    <DeleteButton 
                      type="button" 
                      onClick={deleteLoreEntry} 
                      disabled={loading || !selectedLore}
                    >
                      Delete
                    </DeleteButton>
                    <ActionButton 
                      type="button" 
                      onClick={editLoreEntry} 
                      disabled={loading || !selectedLore}
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
            <NoLoreSelected>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
                <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
              </svg>
              <p>Select a lore entry from the list or create a new one</p>
            </NoLoreSelected>
          )}
        </EditorPanel>
      </Grid>
    </Container>
  );
};

export default LoreManager;