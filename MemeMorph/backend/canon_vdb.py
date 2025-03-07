import os
import uuid
import logging
from typing import List, Dict, Any, Optional, Tuple
import json
from datetime import datetime
import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions
from langchain.text_splitter import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CanonVDB:
    """
    CanonVDB - Vector Database for storing and retrieving world lore
    
    This class manages a vector database of world lore entries, allowing:
    - Storage of world lore entries with metadata
    - Semantic search for relevant lore based on queries
    - Integration with the World Explorer feature
    """
    
    def __init__(self, persist_directory: str = None):
        """Initialize the CanonVDB with a ChromaDB backend"""
        self.persist_directory = persist_directory or os.path.join(
            os.path.dirname(os.path.abspath(__file__)), 
            'data', 
            'canon_vdb'
        )
        
        # Create directory if it doesn't exist
        os.makedirs(self.persist_directory, exist_ok=True)
        
        # Initialize the embedding function (sentence-transformer model)
        self.embedding_function = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Initialize ChromaDB client with persistence
        self.client = chromadb.PersistentClient(
            path=self.persist_directory,
            settings=Settings(
                anonymized_telemetry=False
            )
        )
        
        # Text splitter for chunking long entries
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=100,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
        # Get or create the collection for lore
        self.collection = self._get_or_create_collection()
        
        logger.info(f"CanonVDB initialized with persist directory: {self.persist_directory}")
    
    def _get_or_create_collection(self):
        """Get the existing collection or create a new one if it doesn't exist"""
        try:
            # Try to get the existing collection
            collection = self.client.get_collection(
                name="canon_lore",
                embedding_function=embedding_functions.SentenceTransformerEmbeddingFunction(
                    model_name="all-MiniLM-L6-v2"
                )
            )
            logger.info(f"Found existing collection with {collection.count()} entries")
            return collection
        except ValueError:
            # Create new collection if it doesn't exist
            collection = self.client.create_collection(
                name="canon_lore",
                embedding_function=embedding_functions.SentenceTransformerEmbeddingFunction(
                    model_name="all-MiniLM-L6-v2"
                ),
                metadata={"description": "World lore entries for MemeMorph"}
            )
            logger.info("Created new collection for world lore")
            return collection
    
    def add_lore_entry(self, 
                      title: str, 
                      content: str, 
                      category: str = "general",
                      world_id: str = None,
                      metadata: Dict[str, Any] = None) -> str:
        """
        Add a new lore entry to the vector database
        
        Args:
            title: Title of the lore entry
            content: Main content text
            category: Category (e.g., "history", "characters", "locations")
            world_id: ID of the world this lore belongs to
            metadata: Additional metadata to store
            
        Returns:
            The ID of the created entry
        """
        # Generate a unique ID for the entry
        entry_id = str(uuid.uuid4())
        
        # Create base metadata
        entry_metadata = {
            "title": title,
            "category": category,
            "world_id": world_id or "default",
            "created_at": str(datetime.now().isoformat()),
        }
        
        # Add custom metadata if provided
        if metadata:
            entry_metadata.update(metadata)
        
        # Split content into chunks if it's long
        if len(content) > 500:
            chunks = self.text_splitter.split_text(content)
            logger.info(f"Split lore entry '{title}' into {len(chunks)} chunks")
            
            # Add each chunk with same ID but different chunk number
            for i, chunk in enumerate(chunks):
                chunk_id = f"{entry_id}_{i}"
                chunk_metadata = entry_metadata.copy()
                chunk_metadata["chunk_number"] = i
                chunk_metadata["total_chunks"] = len(chunks)
                
                self.collection.add(
                    ids=[chunk_id],
                    documents=[chunk],
                    metadatas=[chunk_metadata]
                )
        else:
            # Add as a single entry
            self.collection.add(
                ids=[entry_id],
                documents=[content],
                metadatas=[entry_metadata]
            )
        
        logger.info(f"Added lore entry '{title}' with ID {entry_id}")
        return entry_id
    
    def search_lore(self, 
                   query: str, 
                   world_id: str = None,
                   category: str = None,
                   n_results: int = 5) -> List[Dict[str, Any]]:
        """
        Search for relevant lore entries based on a query
        
        Args:
            query: The search query
            world_id: Filter by world ID
            category: Filter by category
            n_results: Number of results to return
            
        Returns:
            List of relevant lore entries with their metadata
        """
        # Prepare filter conditions if needed
        where_clause = {}
        if world_id:
            where_clause["world_id"] = world_id
        if category:
            where_clause["category"] = category
        
        # Perform the search
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results,
            where=where_clause if where_clause else None
        )
        
        # Format the response
        formatted_results = []
        if results and results["ids"] and results["documents"]:
            for i, doc_id in enumerate(results["ids"][0]):
                entry = {
                    "id": doc_id,
                    "content": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "distance": results["distances"][0][i] if "distances" in results else None
                }
                formatted_results.append(entry)
        
        logger.info(f"Search for '{query}' returned {len(formatted_results)} results")
        return formatted_results
    
    def get_lore_by_id(self, entry_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a specific lore entry by ID"""
        results = self.collection.get(ids=[entry_id])
        
        if not results["ids"]:
            return None
        
        # If the entry has chunks, try to find all chunks
        if "_" in entry_id and entry_id.split("_")[1].isdigit():
            # This is a chunk, so find all related chunks
            base_id = entry_id.split("_")[0]
            all_chunks = self.collection.get(
                where={"$contains": base_id}
            )
            
            # Sort chunks by number and combine content
            if all_chunks["ids"]:
                chunks = []
                for i, chunk_id in enumerate(all_chunks["ids"]):
                    chunks.append({
                        "id": chunk_id,
                        "content": all_chunks["documents"][i],
                        "metadata": all_chunks["metadatas"][i],
                        "chunk_number": all_chunks["metadatas"][i].get("chunk_number", 0)
                    })
                
                # Sort chunks by number and combine content
                chunks.sort(key=lambda x: x["chunk_number"])
                combined_content = "\n".join([c["content"] for c in chunks])
                
                # Return combined entry
                return {
                    "id": base_id,
                    "content": combined_content,
                    "metadata": chunks[0]["metadata"],  # Use first chunk's metadata
                    "chunks": chunks
                }
        
        # Return single entry
        return {
            "id": results["ids"][0],
            "content": results["documents"][0],
            "metadata": results["metadatas"][0]
        }
    
    def update_lore_entry(self, 
                         entry_id: str, 
                         content: str = None, 
                         metadata: Dict[str, Any] = None) -> bool:
        """
        Update an existing lore entry
        
        Args:
            entry_id: ID of the entry to update
            content: New content (if None, content won't be updated)
            metadata: New or updated metadata (if None, metadata won't be updated)
            
        Returns:
            Success flag
        """
        # First check if entry exists
        entry = self.get_lore_by_id(entry_id)
        if not entry:
            logger.error(f"Cannot update entry {entry_id}: not found")
            return False
        
        # Handle updates for chunked entries
        if "chunks" in entry:
            # Delete all existing chunks
            for chunk in entry["chunks"]:
                self.collection.delete(ids=[chunk["id"]])
            
            # Re-add with new content and/or metadata
            new_content = content if content is not None else entry["content"]
            new_metadata = entry["metadata"].copy()
            if metadata:
                new_metadata.update(metadata)
                
            # Add updated entry
            return self.add_lore_entry(
                title=new_metadata.get("title", "Untitled"),
                content=new_content,
                category=new_metadata.get("category", "general"),
                world_id=new_metadata.get("world_id", "default"),
                metadata=new_metadata
            ) is not None
        
        # Handle single entries (update in place)
        update_data = {}
        if content is not None:
            update_data["documents"] = [content]
        if metadata:
            updated_metadata = entry["metadata"].copy()
            updated_metadata.update(metadata)
            update_data["metadatas"] = [updated_metadata]
        
        if update_data:
            self.collection.update(
                ids=[entry_id],
                **update_data
            )
            logger.info(f"Updated lore entry {entry_id}")
            return True
        
        return False
    
    def delete_lore_entry(self, entry_id: str) -> bool:
        """Delete a lore entry by ID"""
        try:
            # Check if this is a chunked entry
            if "_" in entry_id and entry_id.split("_")[1].isdigit():
                # This is a chunk, delete all related chunks
                base_id = entry_id.split("_")[0]
                all_chunks = self.collection.get(
                    where={"$contains": base_id}
                )
                
                if all_chunks["ids"]:
                    self.collection.delete(ids=all_chunks["ids"])
            else:
                # Delete single entry
                self.collection.delete(ids=[entry_id])
                
            logger.info(f"Deleted lore entry {entry_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting lore entry {entry_id}: {str(e)}")
            return False
    
    def list_lore_entries(self, 
                         world_id: str = None, 
                         category: str = None,
                         limit: int = 100,
                         offset: int = 0) -> List[Dict[str, Any]]:
        """
        List lore entries with optional filtering
        
        Args:
            world_id: Filter by world ID
            category: Filter by category
            limit: Maximum number of entries to return
            offset: Number of entries to skip
            
        Returns:
            List of lore entry summaries
        """
        # Prepare filter conditions
        where_clause = {}
        if world_id:
            where_clause["world_id"] = world_id
        if category:
            where_clause["category"] = category
        
        # Execute query
        results = self.collection.get(
            where=where_clause if where_clause else None,
            limit=limit
        )
        
        # Format response
        entries = []
        if results["ids"]:
            for i, doc_id in enumerate(results["ids"]):
                # Skip chunks, only include main entries
                if "_" in doc_id and doc_id.split("_")[1].isdigit():
                    # This is a chunk, skip
                    continue
                
                entries.append({
                    "id": doc_id,
                    "title": results["metadatas"][i].get("title", "Untitled"),
                    "category": results["metadatas"][i].get("category", "general"),
                    "world_id": results["metadatas"][i].get("world_id", "default"),
                    "created_at": results["metadatas"][i].get("created_at")
                })
        
        # Apply offset (since ChromaDB doesn't support it natively)
        if offset > 0:
            entries = entries[offset:offset+limit]
        
        return entries
    
    def get_or_create_world_context(self, world_id: str) -> str:
        """
        Get or create the main context for a world
        
        This is a special entry that contains the main world description,
        which can be used as context for AI interactions
        
        Args:
            world_id: The ID of the world
            
        Returns:
            The world context content
        """
        # Try to find existing context
        results = self.collection.get(
            where={
                "world_id": world_id,
                "category": "world_context"
            }
        )
        
        if results["ids"]:
            return results["documents"][0]
        
        # Create default context if none exists
        default_context = f"This is a new fictional world with ID {world_id}. No details have been added yet."
        
        self.add_lore_entry(
            title=f"World Context for {world_id}",
            content=default_context,
            category="world_context",
            world_id=world_id,
            metadata={
                "is_primary_context": True
            }
        )
        
        return default_context
    
    def search_for_world_explorer(self, 
                                query: str, 
                                world_id: str,
                                n_results: int = 5) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Special search function for World Explorer that returns context and sources
        
        Args:
            query: The user's question
            world_id: The world ID to search in
            n_results: Number of relevant entries to include
            
        Returns:
            Tuple of (context_string, source_entries)
        """
        # Get the primary world context
        world_context = self.get_or_create_world_context(world_id)
        
        # Search for relevant entries
        results = self.search_lore(
            query=query,
            world_id=world_id,
            n_results=n_results
        )
        
        # Format context with all relevant information
        context_parts = [
            f"# World Context\n{world_context}\n"
        ]
        
        # Add relevant entries
        if results:
            context_parts.append("\n# Relevant World Information\n")
            for i, entry in enumerate(results):
                # Add entry content with title
                entry_title = entry["metadata"].get("title", f"Entry {i+1}")
                context_parts.append(f"## {entry_title}\n{entry['content']}\n")
        
        # Combine all context
        full_context = "\n".join(context_parts)
        
        return full_context, results
    
    def count_entries(self, world_id: str = None) -> int:
        """Count the number of entries, optionally filtered by world_id"""
        where_clause = {"world_id": world_id} if world_id else None
        return self.collection.count(where=where_clause)
    
    def import_from_json(self, json_file: str) -> int:
        """
        Import lore entries from a JSON file
        
        The JSON file should contain an array of objects with the following structure:
        {
            "title": "Entry title",
            "content": "Entry content",
            "category": "Category",
            "world_id": "world-id",
            "metadata": { optional additional metadata }
        }
        
        Returns:
            The number of imported entries
        """
        try:
            with open(json_file, 'r') as f:
                entries = json.load(f)
            
            count = 0
            for entry in entries:
                if "title" in entry and "content" in entry:
                    metadata = entry.get("metadata", {})
                    self.add_lore_entry(
                        title=entry["title"],
                        content=entry["content"],
                        category=entry.get("category", "general"),
                        world_id=entry.get("world_id", "default"),
                        metadata=metadata
                    )
                    count += 1
            
            logger.info(f"Imported {count} entries from {json_file}")
            return count
        except Exception as e:
            logger.error(f"Error importing from JSON: {str(e)}")
            return 0
    
    def export_to_json(self, json_file: str, world_id: str = None) -> int:
        """
        Export lore entries to a JSON file
        
        Args:
            json_file: Path to output JSON file
            world_id: Optional filter by world_id
            
        Returns:
            The number of exported entries
        """
        entries = self.list_lore_entries(world_id=world_id, limit=1000)
        
        # Get full content for each entry
        full_entries = []
        for entry in entries:
            full_entry = self.get_lore_by_id(entry["id"])
            if full_entry:
                export_entry = {
                    "title": entry["title"],
                    "content": full_entry["content"],
                    "category": entry["category"],
                    "world_id": entry["world_id"],
                    "created_at": entry["created_at"],
                    "metadata": {k: v for k, v in full_entry["metadata"].items() 
                               if k not in ["title", "category", "world_id", "created_at"]}
                }
                full_entries.append(export_entry)
        
        # Write to file
        try:
            with open(json_file, 'w') as f:
                json.dump(full_entries, f, indent=2)
            
            logger.info(f"Exported {len(full_entries)} entries to {json_file}")
            return len(full_entries)
        except Exception as e:
            logger.error(f"Error exporting to JSON: {str(e)}")
            return 0


# Example usage
if __name__ == "__main__":
    from datetime import datetime
    
    # Create CanonVDB instance
    vdb = CanonVDB()
    
    # Add sample entries
    vdb.add_lore_entry(
        title="The Great War",
        content="The Great War was a devastating conflict that lasted for 100 years, "
                "fundamentally changing the political landscape of the continent. "
                "It began when the Kingdom of Altaris invaded the Free Cities of the West, "
                "seeking to expand their territory and gain access to valuable resources. "
                "The war ended with the Treaty of Elmswood, which established the current borders.",
        category="history",
        world_id="fantasy-world-1",
        metadata={"importance": "major", "era": "Second Age"}
    )
    
    vdb.add_lore_entry(
        title="The City of Silverhold",
        content="Silverhold is the capital city of the Kingdom of Altaris, known for its "
                "magnificent silver spires and ancient fortifications. The city sits atop "
                "Mount Argent, giving it a strategic advantage and spectacular views of the "
                "surrounding countryside. It is home to the royal family and houses the "
                "Grand Library, the largest collection of books in the known world.",
        category="locations",
        world_id="fantasy-world-1"
    )
    
    # Search for entries
    results = vdb.search_lore("war history", world_id="fantasy-world-1")
    print(f"Found {len(results)} results for 'war history'")
    
    # Get world explorer context
    context, sources = vdb.search_for_world_explorer(
        "Tell me about the capital city", 
        world_id="fantasy-world-1"
    )
    print("\nWorld Explorer Context:")
    print(context[:300] + "...")  # Print first 300 chars
    
    # Count entries
    count = vdb.count_entries(world_id="fantasy-world-1")
    print(f"\nTotal entries for fantasy-world-1: {count}")