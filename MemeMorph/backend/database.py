import os
from pymongo import MongoClient
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# MongoDB connection details
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/mememorph')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Database:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._instance.client = None
            cls._instance.db = None
            cls._instance.connect()
        return cls._instance
    
    def connect(self):
        """Establish MongoDB connection"""
        try:
            self.client = MongoClient(MONGO_URI)
            db_name = MONGO_URI.split('/')[-1]
            self.db = self.client[db_name]
            
            # Verify connection
            self.client.admin.command('ping')
            logger.info(f"Connected to MongoDB ({db_name})")
            return True
        except Exception as e:
            logger.error(f"Error connecting to MongoDB: {e}")
            return False
    
    def get_db(self):
        """Get database instance"""
        if not self.db:
            self.connect()
        return self.db
    
    def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")
    
    # User operations
    def get_user_by_wallet(self, wallet_address):
        """Get user by wallet address"""
        return self.db.users.find_one({"wallet_address": wallet_address})
    
    def get_user_by_id(self, user_id):
        """Get user by ID"""
        return self.db.users.find_one({"_id": user_id})
    
    def create_user(self, user_data):
        """Create a new user"""
        return self.db.users.insert_one(user_data)
    
    # Meme operations
    def get_meme_by_id(self, meme_id):
        """Get meme by ID"""
        return self.db.memes.find_one({"_id": meme_id})
    
    def get_memes_by_owner(self, owner_id, limit=20, skip=0):
        """Get memes by owner ID"""
        return list(self.db.memes.find({"owner_id": owner_id}).sort([("created_at", -1)]).skip(skip).limit(limit))
    
    def create_meme(self, meme_data):
        """Create a new meme"""
        return self.db.memes.insert_one(meme_data)
    
    def update_meme(self, meme_id, update_data):
        """Update a meme"""
        return self.db.memes.update_one({"_id": meme_id}, {"$set": update_data})
    
    # Template operations
    def get_all_templates(self):
        """Get all templates"""
        return list(self.db.templates.find())
    
    def get_template_by_id(self, template_id):
        """Get template by ID"""
        return self.db.templates.find_one({"_id": template_id})
    
    def get_template_by_name(self, name):
        """Get template by name"""
        return self.db.templates.find_one({"name": name})
    
    # NFT operations
    def get_nft_by_token_id(self, token_id):
        """Get NFT by token ID"""
        return self.db.nfts.find_one({"token_id": token_id})
    
    def get_nft_by_meme_id(self, meme_id):
        """Get NFT by meme ID"""
        return self.db.nfts.find_one({"meme_id": meme_id})
    
    def create_nft(self, nft_data):
        """Create a new NFT record"""
        return self.db.nfts.insert_one(nft_data)
    
    def update_nft_owner(self, token_id, new_owner, transaction_hash, price):
        """Update NFT owner after a transfer"""
        return self.db.nfts.update_one(
            {"token_id": token_id},
            {"$set": {
                "owner_address": new_owner,
                "last_transaction_hash": transaction_hash,
                "last_price": price
            }}
        )
    
    # Transaction operations
    def record_transaction(self, transaction_data):
        """Record an NFT transaction"""
        return self.db.transactions.insert_one(transaction_data)
    
    def get_transactions_by_token(self, token_id, limit=10):
        """Get transaction history for a token"""
        return list(self.db.transactions.find({"token_id": token_id}).sort([("timestamp", -1)]).limit(limit))
    
    # Platform settings
    def get_platform_settings(self):
        """Get platform settings"""
        return self.db.settings.find_one({"_id": "platform_settings"})
    
    def update_platform_settings(self, settings_data, updated_by):
        """Update platform settings"""
        settings_data["updated_by"] = updated_by
        return self.db.settings.update_one(
            {"_id": "platform_settings"},
            {"$set": settings_data}
        )

# Singleton instance
def get_db():
    """Helper function to get the database instance"""
    return Database().get_db()