import os
import sys
import uuid
import datetime
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Get MongoDB URI from environment or use default
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/mememorph')

def create_indexes(db):
    """Create necessary indexes for collections"""
    logger.info("Creating indexes...")
    
    # User collection indexes
    db.users.create_index("wallet_address", unique=True)
    db.users.create_index("username", unique=True)
    
    # Memes collection indexes
    db.memes.create_index("owner_id")
    db.memes.create_index("creator_id")
    db.memes.create_index("created_at")
    db.memes.create_index("token_id", sparse=True)
    
    # NFTs collection indexes
    db.nfts.create_index("token_id", unique=True)
    db.nfts.create_index("meme_id", unique=True)
    db.nfts.create_index("owner_address")
    
    # Transactions collection indexes
    db.transactions.create_index("token_id")
    db.transactions.create_index("from_address")
    db.transactions.create_index("to_address")
    db.transactions.create_index("timestamp")
    
    logger.info("Indexes created successfully")

def insert_initial_data(db):
    """Insert initial data into collections"""
    logger.info("Inserting initial data...")
    
    # Only insert if collections are empty
    if db.users.count_documents({}) == 0:
        # Create initial admin user
        admin_id = str(uuid.uuid4())
        admin_user = {
            "_id": admin_id,
            "username": "admin",
            "wallet_address": "0x0000000000000000000000000000000000000000",
            "email": "admin@mememorph.example.com",
            "role": "admin",
            "profile_pic_url": None,
            "bio": "MemeMorph Administrator",
            "created_at": datetime.datetime.utcnow(),
            "updated_at": datetime.datetime.utcnow(),
            "last_login": None
        }
        db.users.insert_one(admin_user)
        logger.info(f"Created admin user with ID: {admin_id}")
    
    # Insert initial meme templates if templates collection is empty
    if db.templates.count_documents({}) == 0:
        templates = [
            {
                "_id": str(uuid.uuid4()),
                "name": "Drake",
                "filename": "drake.jpg",
                "description": "Drake approving/disapproving format",
                "text_areas": [
                    {"position": "top", "x": 350, "y": 100, "width": 300, "height": 100},
                    {"position": "bottom", "x": 350, "y": 300, "width": 300, "height": 100}
                ],
                "created_at": datetime.datetime.utcnow()
            },
            {
                "_id": str(uuid.uuid4()),
                "name": "Distracted Boyfriend",
                "filename": "distracted_boyfriend.jpg",
                "description": "Man looking at another woman while with his girlfriend",
                "text_areas": [
                    {"position": "left", "x": 160, "y": 220, "width": 140, "height": 80},
                    {"position": "center", "x": 350, "y": 180, "width": 140, "height": 80},
                    {"position": "right", "x": 480, "y": 260, "width": 140, "height": 80}
                ],
                "created_at": datetime.datetime.utcnow()
            },
            {
                "_id": str(uuid.uuid4()),
                "name": "Change My Mind",
                "filename": "change_my_mind.jpg",
                "description": "Steven Crowder sitting at a table with 'change my mind' sign",
                "text_areas": [
                    {"position": "top", "x": 250, "y": 250, "width": 400, "height": 100}
                ],
                "created_at": datetime.datetime.utcnow()
            }
        ]
        
        db.templates.insert_many(templates)
        logger.info(f"Inserted {len(templates)} meme templates")
    
    # Add platform settings if settings collection is empty
    if db.settings.count_documents({}) == 0:
        settings = {
            "_id": "platform_settings",
            "mint_fee": 10, # in MemeMorphCoin
            "transaction_fee_percent": 2.5,
            "creator_royalty_percent": 10,
            "max_upload_size_mb": 5,
            "allowed_file_types": ["jpg", "jpeg", "png", "gif"],
            "maintenance_mode": False,
            "updated_at": datetime.datetime.utcnow(),
            "updated_by": admin_id if 'admin_id' in locals() else None
        }
        
        db.settings.insert_one(settings)
        logger.info("Inserted platform settings")
    
    logger.info("Initial data insertion complete")

def create_collections(db):
    """Create collections with validation schemas"""
    logger.info("Creating collections with validation schemas...")
    
    # Users collection
    db.create_collection("users", validator={
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["username", "wallet_address", "created_at"],
            "properties": {
                "username": {
                    "bsonType": "string",
                    "description": "Username must be a string and is required"
                },
                "wallet_address": {
                    "bsonType": "string",
                    "description": "Wallet address must be a string and is required"
                },
                "email": {
                    "bsonType": ["string", "null"],
                    "description": "Email must be a string if provided"
                },
                "role": {
                    "enum": ["user", "creator", "admin"],
                    "description": "Role must be one of the specified values"
                },
                "created_at": {
                    "bsonType": "date",
                    "description": "Created date is required"
                }
            }
        }
    })
    
    # Memes collection
    db.create_collection("memes", validator={
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["filename", "owner_id", "creator_id", "created_at"],
            "properties": {
                "filename": {
                    "bsonType": "string",
                    "description": "Filename must be a string and is required"
                },
                "template_id": {
                    "bsonType": ["string", "null"],
                    "description": "Template ID must be a string if provided"
                },
                "owner_id": {
                    "bsonType": "string",
                    "description": "Owner ID must be a string and is required"
                },
                "creator_id": {
                    "bsonType": "string",
                    "description": "Creator ID must be a string and is required"
                },
                "title": {
                    "bsonType": "string",
                    "description": "Title must be a string"
                },
                "description": {
                    "bsonType": ["string", "null"],
                    "description": "Description must be a string if provided"
                },
                "is_minted": {
                    "bsonType": "bool",
                    "description": "Flag indicating if meme is minted as NFT"
                },
                "token_id": {
                    "bsonType": ["string", "null"],
                    "description": "Token ID must be a string if provided"
                },
                "created_at": {
                    "bsonType": "date",
                    "description": "Created date is required"
                }
            }
        }
    })
    
    # NFTs collection
    db.create_collection("nfts", validator={
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["token_id", "meme_id", "owner_address", "created_at"],
            "properties": {
                "token_id": {
                    "bsonType": "string",
                    "description": "Token ID must be a string and is required"
                },
                "meme_id": {
                    "bsonType": "string",
                    "description": "Meme ID must be a string and is required"
                },
                "owner_address": {
                    "bsonType": "string",
                    "description": "Owner address must be a string and is required"
                },
                "creator_address": {
                    "bsonType": "string",
                    "description": "Creator address must be a string and is required"
                },
                "transaction_hash": {
                    "bsonType": "string",
                    "description": "Transaction hash must be a string and is required"
                },
                "metadata_uri": {
                    "bsonType": "string",
                    "description": "Metadata URI must be a string and is required"
                },
                "created_at": {
                    "bsonType": "date",
                    "description": "Created date is required"
                },
                "last_price": {
                    "bsonType": ["double", "int", "null"],
                    "description": "Last price in MemeMorphCoin"
                }
            }
        }
    })
    
    # Templates collection
    db.create_collection("templates", validator={
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["name", "filename", "created_at"],
            "properties": {
                "name": {
                    "bsonType": "string",
                    "description": "Template name must be a string and is required"
                },
                "filename": {
                    "bsonType": "string",
                    "description": "Filename must be a string and is required"
                },
                "description": {
                    "bsonType": ["string", "null"],
                    "description": "Description must be a string if provided"
                },
                "text_areas": {
                    "bsonType": "array",
                    "description": "Array of text areas on the template"
                },
                "created_at": {
                    "bsonType": "date",
                    "description": "Created date is required"
                }
            }
        }
    })
    
    # Transactions collection
    db.create_collection("transactions", validator={
        "$jsonSchema": {
            "bsonType": "object",
            "required": ["token_id", "from_address", "to_address", "amount", "timestamp", "transaction_hash"],
            "properties": {
                "token_id": {
                    "bsonType": "string",
                    "description": "Token ID must be a string and is required"
                },
                "from_address": {
                    "bsonType": "string",
                    "description": "From address must be a string and is required"
                },
                "to_address": {
                    "bsonType": "string",
                    "description": "To address must be a string and is required"
                },
                "amount": {
                    "bsonType": ["double", "int"],
                    "description": "Amount in MemeMorphCoin must be a number and is required"
                },
                "royalty_amount": {
                    "bsonType": ["double", "int"],
                    "description": "Royalty amount in MemeMorphCoin"
                },
                "timestamp": {
                    "bsonType": "date",
                    "description": "Timestamp is required"
                },
                "transaction_hash": {
                    "bsonType": "string",
                    "description": "Transaction hash must be a string and is required"
                }
            }
        }
    })
    
    # Settings collection for platform configuration
    db.create_collection("settings")
    
    logger.info("Collections created successfully")

def init_database():
    """Initialize the MongoDB database for MemeMorph"""
    logger.info(f"Connecting to MongoDB: {MONGO_URI}")
    
    try:
        # Connect to MongoDB
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        
        # Test connection
        client.admin.command('ping')
        logger.info("Successfully connected to MongoDB")
        
        # Get or create database
        db_name = MONGO_URI.split('/')[-1]
        db = client[db_name]
        
        # Drop existing collections if --reset flag is passed
        if '--reset' in sys.argv:
            logger.warning("Resetting database (dropping all collections)...")
            for collection in db.list_collection_names():
                db.drop_collection(collection)
                logger.info(f"Dropped collection: {collection}")
        
        # Create collections with schemas
        create_collections(db)
        
        # Create indexes for better performance
        create_indexes(db)
        
        # Insert initial data
        insert_initial_data(db)
        
        logger.info("Database initialization completed successfully")
        
    except (ConnectionFailure, ServerSelectionTimeoutError) as e:
        logger.error(f"Could not connect to MongoDB: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"An error occurred during database initialization: {e}")
        sys.exit(1)

if __name__ == "__main__":
    init_database()