import os
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import numpy as np
import cv2
import io
import json
import uuid
import logging
import requests
from datetime import datetime
from functools import wraps
from database import get_db, Database
from web3_config import get_network_info, get_web3, get_nft_contract, get_token_contract
from worldcharacter import WorldCharacterGenerator

# Configure API keys
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')

# Set up logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
# Set up CORS handling with explicit headers
cors = CORS(
    app,
    resources={r"/*": {
        "origins": ["http://localhost:3000"],
        "allow_headers": ["Content-Type", "Authorization", "Accept", "Origin"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "expose_headers": ["Content-Type", "Authorization"]
    }},
    supports_credentials=True
)

# Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
PROCESSED_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'processed')
TEMPLATES_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB

# Create necessary directories
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)
os.makedirs(TEMPLATES_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['PROCESSED_FOLDER'] = PROCESSED_FOLDER
app.config['TEMPLATES_FOLDER'] = TEMPLATES_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# Helper functions
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_filename():
    return f"{uuid.uuid4().hex}.png"

# Basic image processing functions
def add_text_to_image(image, text, position, font_size=40, color=(255, 255, 255), stroke_width=2):
    """Add text to an image with stroke for better visibility"""
    draw = ImageDraw.Draw(image)
    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except IOError:
        font = ImageFont.load_default()
    
    # Add stroke/outline by drawing text in multiple positions
    stroke_color = (0, 0, 0)
    for offset_x, offset_y in [(0, 1), (1, 0), (0, -1), (-1, 0)]:
        draw.text((position[0] + offset_x, position[1] + offset_y), text, font=font, fill=stroke_color)
    
    # Draw the main text
    draw.text(position, text, font=font, fill=color)
    return image

def apply_meme_filter(image, filter_type):
    """Apply various filters to the image"""
    if filter_type == 'deep_fry':
        # Increase contrast and saturation, reduce quality
        enhancer = ImageEnhance.Color(image)
        image = enhancer.enhance(2.0)
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.5)
        enhancer = ImageEnhance.Brightness(image)
        image = enhancer.enhance(1.2)
        
    elif filter_type == 'vaporwave':
        # Apply purple/teal color shift
        img_array = np.array(image)
        img_array[:, :, 0] = np.clip(img_array[:, :, 0] * 0.8 + 30, 0, 255)  # R
        img_array[:, :, 1] = np.clip(img_array[:, :, 1] * 0.7 + 40, 0, 255)  # G
        img_array[:, :, 2] = np.clip(img_array[:, :, 2] * 1.3 + 30, 0, 255)  # B
        image = Image.fromarray(img_array)
        
    elif filter_type == 'glitch':
        # Simulate digital glitch effect
        img_array = np.array(image)
        height, width = img_array.shape[:2]
        
        # Create random slice displacement
        num_slices = np.random.randint(5, 15)
        for _ in range(num_slices):
            y = np.random.randint(0, height)
            h = np.random.randint(1, height // 20)
            offset = np.random.randint(-width // 20, width // 20)
            
            if y + h < height and offset != 0:
                slice_data = img_array[y:y+h, :].copy()
                if offset > 0:
                    img_array[y:y+h, offset:] = slice_data[:, :-offset]
                    img_array[y:y+h, :offset] = slice_data[:, -offset:]
                else:
                    offset = abs(offset)
                    img_array[y:y+h, :-offset] = slice_data[:, offset:]
                    img_array[y:y+h, -offset:] = slice_data[:, :offset]
        
        image = Image.fromarray(img_array)
        
    elif filter_type == 'vintage':
        # Apply sepia tone
        img_array = np.array(image)
        sepia_filter = np.array([
            [0.393, 0.769, 0.189],
            [0.349, 0.686, 0.168],
            [0.272, 0.534, 0.131]
        ])
        
        # Apply the sepia matrix
        r, g, b = img_array[:,:,0], img_array[:,:,1], img_array[:,:,2]
        new_r = np.clip((r * sepia_filter[0][0] + g * sepia_filter[0][1] + b * sepia_filter[0][2]), 0, 255)
        new_g = np.clip((r * sepia_filter[1][0] + g * sepia_filter[1][1] + b * sepia_filter[1][2]), 0, 255)
        new_b = np.clip((r * sepia_filter[2][0] + g * sepia_filter[2][1] + b * sepia_filter[2][2]), 0, 255)
        
        img_array[:,:,0] = new_r
        img_array[:,:,1] = new_g
        img_array[:,:,2] = new_b
        
        # Add noise and slight blur for vintage effect
        noise = np.random.randint(0, 20, img_array.shape).astype(np.uint8)
        img_array = np.clip(img_array + noise, 0, 255).astype(np.uint8)
        
        image = Image.fromarray(img_array)
        image = image.filter(ImageFilter.GaussianBlur(radius=0.5))
    
    return image

# Add explicit CORS preflight handler
@app.after_request
def after_request(response):
    # Always allow requests from the frontend origin
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,Origin')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Simple password-based authorization for admin routes
# In a production system, you would use a more robust auth system
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Unauthorized"}), 401
        
        # Extract the token
        token = auth_header.split(' ')[1]
        
        # In a real app, validate this against JWT or other token
        # For this demo, we'll do a simple check against the admin password
        if token != 'mememorphadmin':  # Same as the frontend admin password
            return jsonify({"error": "Invalid credentials"}), 401
            
        return f(*args, **kwargs)
    return decorated_function

# API Routes
@app.route('/')
def index():
    return jsonify({
        "status": "online",
        "service": "MemeMorph API",
        "version": "1.0.0"
    })

@app.route('/api/web3/network', methods=['GET'])
def network_info():
    """Get current Web3 network configuration"""
    return jsonify(get_network_info())

@app.route('/api/meme/templates', methods=['GET'])
def get_templates():
    """List all available meme templates"""
    template_files = [f for f in os.listdir(app.config['TEMPLATES_FOLDER']) 
                     if allowed_file(f)]
    
    templates = []
    for filename in template_files:
        filepath = os.path.join(app.config['TEMPLATES_FOLDER'], filename)
        try:
            with Image.open(filepath) as img:
                width, height = img.size
                name = os.path.splitext(filename)[0].replace('_', ' ').title()
                templates.append({
                    "id": os.path.splitext(filename)[0],
                    "name": name,
                    "filename": filename,
                    "width": width,
                    "height": height,
                    "url": f"/api/meme/templates/{filename}"
                })
        except Exception as e:
            logger.error(f"Error processing template {filename}: {str(e)}")
    
    return jsonify({"templates": templates})

@app.route('/api/meme/templates/<filename>', methods=['GET'])
def get_template(filename):
    """Retrieve a specific template"""
    if not allowed_file(filename):
        return jsonify({"error": "Invalid file format"}), 400
    
    filepath = os.path.join(app.config['TEMPLATES_FOLDER'], filename)
    if not os.path.exists(filepath):
        return jsonify({"error": "Template not found"}), 404
    
    return send_file(filepath, mimetype=f'image/{filename.split(".")[-1]}')

@app.route('/api/meme/generate', methods=['POST'])
def generate_meme():
    """Generate a meme from template with user text"""
    if 'template' not in request.form:
        return jsonify({"error": "No template specified"}), 400
    
    template_id = request.form['template']
    top_text = request.form.get('top_text', '')
    bottom_text = request.form.get('bottom_text', '')
    filter_type = request.form.get('filter', None)
    
    # Find the template file
    template_files = [f for f in os.listdir(app.config['TEMPLATES_FOLDER']) 
                     if f.startswith(template_id) and allowed_file(f)]
    
    if not template_files:
        return jsonify({"error": "Template not found"}), 404
    
    template_file = template_files[0]
    template_path = os.path.join(app.config['TEMPLATES_FOLDER'], template_file)
    
    try:
        # Open the template image
        with Image.open(template_path) as img:
            # Create a copy to work with
            meme = img.copy()
            width, height = meme.size
            
            # Add top text if provided
            if top_text:
                font_size = int(height * 0.08)  # Scale font based on image height
                add_text_to_image(meme, top_text.upper(), (width // 2, height * 0.1), 
                                 font_size=font_size, color=(255, 255, 255))
            
            # Add bottom text if provided
            if bottom_text:
                font_size = int(height * 0.08)  # Scale font based on image height
                add_text_to_image(meme, bottom_text.upper(), (width // 2, height * 0.85), 
                                 font_size=font_size, color=(255, 255, 255))
            
            # Apply filter if specified
            if filter_type:
                meme = apply_meme_filter(meme, filter_type)
            
            # Save the generated meme
            output_filename = generate_filename()
            output_path = os.path.join(app.config['PROCESSED_FOLDER'], output_filename)
            meme.save(output_path, format='PNG')
            
            # Return the URL to the generated meme
            return jsonify({
                "status": "success",
                "meme_id": output_filename.split('.')[0],
                "url": f"/api/meme/view/{output_filename}",
                "filename": output_filename
            })
    
    except Exception as e:
        logger.error(f"Error generating meme: {str(e)}")
        return jsonify({"error": "Failed to generate meme", "details": str(e)}), 500

@app.route('/api/meme/upload', methods=['POST'])
def upload_image():
    """Upload a custom image to use as a template"""
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed"}), 400
    
    try:
        filename = secure_filename(file.filename)
        base_name, ext = os.path.splitext(filename)
        unique_filename = f"{base_name}_{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)
        
        # Process the uploaded image (resize if needed)
        with Image.open(file_path) as img:
            # Limit maximum dimensions while preserving aspect ratio
            max_size = (1200, 1200)
            img.thumbnail(max_size, Image.LANCZOS)
            img.save(file_path)
        
        return jsonify({
            "status": "success",
            "filename": unique_filename,
            "url": f"/api/meme/uploads/{unique_filename}"
        })
    
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        return jsonify({"error": "Failed to upload file", "details": str(e)}), 500

@app.route('/api/meme/uploads/<filename>', methods=['GET'])
def get_upload(filename):
    """Retrieve an uploaded image"""
    if not allowed_file(filename):
        return jsonify({"error": "Invalid file format"}), 400
    
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found"}), 404
    
    return send_file(filepath, mimetype=f'image/{filename.split(".")[-1]}')

@app.route('/api/meme/view/<filename>', methods=['GET'])
def view_generated_meme(filename):
    """View a generated meme"""
    if not allowed_file(filename):
        return jsonify({"error": "Invalid file format"}), 400
    
    filepath = os.path.join(app.config['PROCESSED_FOLDER'], filename)
    if not os.path.exists(filepath):
        return jsonify({"error": "Meme not found"}), 404
    
    return send_file(filepath, mimetype=f'image/{filename.split(".")[-1]}')

@app.route('/api/meme/filters', methods=['GET'])
def list_filters():
    """List available filters that can be applied to memes"""
    filters = [
        {
            "id": "deep_fry",
            "name": "Deep Fried",
            "description": "Intensifies colors and contrast for that 'deep fried' meme look"
        },
        {
            "id": "vaporwave",
            "name": "Vaporwave",
            "description": "Applies a purple/teal aesthetic reminiscent of 80s and 90s design"
        },
        {
            "id": "glitch",
            "name": "Glitch",
            "description": "Creates a digital glitch effect with random slice displacements"
        },
        {
            "id": "vintage",
            "name": "Vintage",
            "description": "Applies a sepia tone and subtle noise for an old-timey look"
        }
    ]
    
    return jsonify({"filters": filters})

@app.route('/api/meme/metadata/<meme_id>', methods=['GET'])
def get_meme_metadata(meme_id):
    """Get metadata for a specific meme, suitable for NFT metadata"""
    # Find the meme file
    meme_filename = f"{meme_id}.png"
    filepath = os.path.join(app.config['PROCESSED_FOLDER'], meme_filename)
    
    if not os.path.exists(filepath):
        return jsonify({"error": "Meme not found"}), 404
    
    try:
        # Get basic image properties
        with Image.open(filepath) as img:
            width, height = img.size
            
        # Get file information
        file_stats = os.stat(filepath)
        created_time = datetime.fromtimestamp(file_stats.st_ctime).isoformat()
        
        # Construct metadata in a format suitable for NFTs
        metadata = {
            "name": f"MemeMorph #{meme_id[:8]}",
            "description": "A unique meme generated on MemeMorph platform",
            "image": f"/api/meme/view/{meme_filename}",
            "external_url": f"https://mememorph.example.com/meme/{meme_id}",
            "attributes": [
                {
                    "trait_type": "Width",
                    "value": width
                },
                {
                    "trait_type": "Height",
                    "value": height
                },
                {
                    "trait_type": "Created",
                    "value": created_time
                }
            ]
        }
        
        return jsonify(metadata)
    
    except Exception as e:
        logger.error(f"Error retrieving metadata: {str(e)}")
        return jsonify({"error": "Failed to retrieve metadata", "details": str(e)}), 500

# AI World Exploration Routes
# Handle OPTIONS preflight requests
@app.route('/api/world/question', methods=['OPTIONS'])
def handle_question_options():
    return '', 204

@app.route('/api/world/question', methods=['POST'])
def answer_world_question():
    """Answer questions about the fictional world using AI"""
    # Log the incoming request
    logger.info(f"Received question request: {request.data}")
    
    # Try to decode the raw JSON first to debug the issue
    try:
        if request.data:
            import json
            raw_json_string = request.data.decode('utf-8')
            logger.info(f"Raw JSON string: {raw_json_string}")
            # Try manual parsing to validate
            parsed_data = json.loads(raw_json_string)
            logger.info(f"Successfully parsed manually: {parsed_data}")
    except Exception as e:
        logger.error(f"Error in manual JSON parsing: {str(e)}")
    
    # Ensure we have JSON data
    try:
        data = request.get_json(force=True)  # Use force=True to ignore content-type
        if data is None:
            logger.error("No JSON data received")
            return jsonify({"error": "No JSON data received"}), 400
    except Exception as e:
        logger.error(f"Error parsing JSON: {str(e)}")
        return jsonify({"error": f"Error parsing JSON: {str(e)}"}), 400
    
    if not data or 'question' not in data or 'world_description' not in data:
        return jsonify({"error": "Both question and world description are required"}), 400
    
    question = data['question']
    world_description = data['world_description']
    
    if not OPENAI_API_KEY or OPENAI_API_KEY == 'your_openai_api_key_here':
        # Provide mock data if no API key is available
        logger.info("No OpenAI API key configured, returning mock response")
        
        # For steampunk world communication question, provide a more specific mock answer
        if "steampunk" in world_description.lower() and "communicat" in question.lower():
            return jsonify({
                "answer": "In this steampunk world without electricity, long-distance communication relies on advanced steam technology. People use elaborate networks of pneumatic tubes to send physical messages between buildings and across cities. For greater distances, they employ a system of steam-powered semaphore towers with mechanical signaling arms visible from miles away. The wealthiest citizens might use personal mechanical carrier pigeons - intricate brass and copper automatons that can deliver small messages between pre-programmed locations. Submarine telegraph cables also exist, using steam-powered pressure differentials rather than electricity to transmit coded messages across oceans. Voice communication happens through sophisticated acoustic horns and tubes that can amplify and direct sound over moderate distances.",
                "question": question
            })
        
        # Generic mock response for other questions
        return jsonify({
            "answer": f"I would answer your question about '{question}' related to the world you described, but the AI service is not configured with a valid API key. This is a placeholder response for development.",
            "question": question
        })
    
    try:
        # Set up the prompt for the AI
        system_prompt = """
        You are a helpful lore expert for fictional worlds. Given a description of a fictional world 
        and a question about that world, provide a detailed and creative answer that's consistent 
        with the world's established facts. If the question asks about something not explicitly 
        mentioned in the world description, invent a plausible answer that would fit with the world's 
        theme, technology level, magic system, or social structures.
        
        Keep your answer concise (around 3-4 paragraphs) but informative.
        """
        
        user_prompt = f"""
        World Description:
        {world_description}
        
        Question:
        {question}
        """
        
        # Call OpenAI API
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4",  # or another appropriate model
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 500
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            answer = result["choices"][0]["message"]["content"]
            
            return jsonify({
                "answer": answer,
                "question": question
            })
        else:
            logger.error(f"AI API error: {response.status_code}, {response.text}")
            return jsonify({"error": "Failed to generate answer"}), 500
            
    except Exception as e:
        logger.error(f"Error answering question: {str(e)}")
        return jsonify({"error": f"Failed to answer question: {str(e)}"}), 500

# World Character API Routes
@app.route('/api/world/generate', methods=['POST'])
def generate_world_character():
    """Generate character(s) from world description"""
    data = request.json
    
    if not data or 'world_description' not in data:
        return jsonify({"error": "World description is required"}), 400
    
    world_description = data['world_description']
    character_count = int(data.get('character_count', 1))
    style = data.get('style')
    
    # Limit character count to prevent abuse
    if character_count > 5:
        character_count = 5
    
    # Initialize character generator
    generator = WorldCharacterGenerator()
    
    # Generate characters
    characters = generator.generate_character(world_description, character_count, style)
    
    if not characters:
        return jsonify({"error": "Failed to generate characters"}), 500
    
    return jsonify({"characters": characters})

@app.route('/api/world/character/<character_id>', methods=['GET'])
def get_world_character(character_id):
    """Get a generated character by ID"""
    generator = WorldCharacterGenerator()
    character = generator.get_character_by_id(character_id)
    
    if not character:
        return jsonify({"error": "Character not found"}), 404
    
    return jsonify(character)

@app.route('/api/world/character/image/<filename>', methods=['GET'])
def get_character_image(filename):
    """Retrieve a character image"""
    if not filename.endswith(('.png', '.jpg', '.jpeg')):
        return jsonify({"error": "Invalid file format"}), 400
    
    filepath = os.path.join(app.config['PROCESSED_FOLDER'], filename)
    if not os.path.exists(filepath):
        return jsonify({"error": "Image not found"}), 404
    
    return send_file(filepath, mimetype=f'image/{filename.split(".")[-1]}')

@app.route('/api/world/character/mint/<character_id>', methods=['POST'])
def mint_character_nft(character_id):
    """Create NFT metadata and prepare for minting"""
    generator = WorldCharacterGenerator()
    character = generator.get_character_by_id(character_id)
    
    if not character:
        return jsonify({"error": "Character not found"}), 404
    
    # Create metadata for the NFT
    metadata = generator.create_nft_metadata(character_id)
    
    if not metadata:
        return jsonify({"error": "Failed to create NFT metadata"}), 500
    
    # For this endpoint, we'll just return the metadata that would be used for the NFT
    # In a real scenario, we might store this in IPFS or another decentralized storage
    return jsonify({
        "status": "success",
        "character_id": character_id,
        "metadata": metadata
    })

@app.route('/api/world/character/claim/<character_id>', methods=['POST'])
def generate_character_claim(character_id):
    """Generate a claim secret for a character NFT"""
    generator = WorldCharacterGenerator()
    character = generator.get_character_by_id(character_id)
    
    if not character:
        return jsonify({"error": "Character not found"}), 404
    
    # Generate a claim secret
    claim_data = generator.generate_claim_secret(character_id)
    
    return jsonify({
        "status": "success",
        "character_id": character_id,
        "character_name": character.get("name", "Unknown Character"),
        "claim_secret": claim_data["secret"],
        "claim_hash": claim_data["hash"]
    })

# Web3 NFT integration endpoints
@app.route('/api/web3/metadata/<token_id>', methods=['GET'])
def get_nft_metadata(token_id):
    """Get metadata for an NFT token in standard format"""
    # Check if this is a character NFT (prefixed with 'char_')
    if token_id.startswith('char_'):
        character_id = token_id[5:]  # Remove 'char_' prefix
        generator = WorldCharacterGenerator()
        metadata = generator.create_nft_metadata(character_id)
        
        if metadata:
            return jsonify(metadata)
    
    # If not a character or character not found, assume it's a meme NFT
    meme_id = token_id
    return get_meme_metadata(meme_id)

# Prompt Management API Routes

# Public API to get prompts (no authentication required)
@app.route('/api/prompts', methods=['GET'])
def get_public_prompts():
    """Get all prompts for public use"""
    prompts = Database().get_all_prompts()
    
    # Convert MongoDB objects to JSON-serializable format
    prompts_list = []
    for prompt in prompts:
        prompt['id'] = prompt.pop('_id')  # Convert _id to id for frontend
        prompts_list.append(prompt)
    
    return jsonify({"prompts": prompts_list})

@app.route('/api/admin/prompts', methods=['OPTIONS'])
def admin_prompts_options():
    """Handle OPTIONS preflight requests for admin prompts"""
    return '', 204

@app.route('/api/admin/prompts', methods=['GET'])
@admin_required
def get_all_prompts():
    """Get all prompts"""
    # Use the Database class directly instead of get_db()
    prompts = Database().get_all_prompts()
    
    # Convert MongoDB objects to JSON-serializable format
    prompts_list = []
    for prompt in prompts:
        prompt['id'] = prompt.pop('_id')  # Convert _id to id for frontend
        prompts_list.append(prompt)
    
    return jsonify({"prompts": prompts_list})

@app.route('/api/admin/prompts/<prompt_id>', methods=['OPTIONS'])
def admin_prompt_id_options(prompt_id):
    """Handle OPTIONS preflight requests for specific prompt"""
    return '', 204

@app.route('/api/admin/prompts/<prompt_id>', methods=['GET'])
@admin_required
def get_prompt(prompt_id):
    """Get a specific prompt by ID"""
    prompt = Database().get_prompt_by_id(prompt_id)
    
    if not prompt:
        return jsonify({"error": "Prompt not found"}), 404
    
    # Convert _id to id for frontend
    prompt['id'] = prompt.pop('_id')
    
    return jsonify(prompt)

@app.route('/api/admin/prompts', methods=['POST'])
@admin_required
def create_prompt():
    """Create a new prompt"""
    data = request.json
    
    if not data or 'name' not in data or 'content' not in data:
        return jsonify({"error": "Name and content are required"}), 400
    
    # Check if prompt with same name already exists
    existing = Database().get_prompt_by_name(data['name'])
    if existing:
        return jsonify({"error": "A prompt with this name already exists"}), 400
    
    # Prepare prompt data
    prompt_data = {
        'name': data['name'],
        'content': data['content'],
        'description': data.get('description', ''),
        'category': data.get('category', 'general'),
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }
    
    # Insert into database
    result = Database().create_prompt(prompt_data)
    
    return jsonify({
        "status": "success",
        "message": "Prompt created successfully",
        "id": prompt_data.get('_id')
    }), 201

@app.route('/api/admin/prompts/<prompt_id>', methods=['OPTIONS'])
def update_prompt_options(prompt_id):
    """Handle OPTIONS request for updating prompts"""
    return '', 204

@app.route('/api/admin/prompts/<prompt_id>', methods=['PUT'])
@admin_required
def update_prompt(prompt_id):
    """Update an existing prompt"""
    data = request.json
    
    if not data:
        return jsonify({"error": "No data provided"}), 400
    
    # Check if prompt exists
    existing = Database().get_prompt_by_id(prompt_id)
    if not existing:
        return jsonify({"error": "Prompt not found"}), 404
    
    # Check if trying to update to a name that already exists
    if 'name' in data and data['name'] != existing['name']:
        name_check = Database().get_prompt_by_name(data['name'])
        if name_check and name_check['_id'] != prompt_id:
            return jsonify({"error": "A prompt with this name already exists"}), 400
    
    # Prepare update data
    update_data = {
        'updated_at': datetime.now().isoformat()
    }
    
    # Add fields to update
    for field in ['name', 'content', 'description', 'category']:
        if field in data:
            update_data[field] = data[field]
    
    # Update in database
    Database().update_prompt(prompt_id, update_data)
    
    return jsonify({
        "status": "success",
        "message": "Prompt updated successfully"
    })

@app.route('/api/admin/prompts/<prompt_id>', methods=['OPTIONS'])
def delete_prompt_options(prompt_id):
    """Handle OPTIONS request for deleting a prompt"""
    return '', 204

@app.route('/api/admin/prompts/<prompt_id>', methods=['DELETE'])
@admin_required
def delete_prompt(prompt_id):
    """Delete a prompt"""
    # Check if prompt exists
    existing = Database().get_prompt_by_id(prompt_id)
    if not existing:
        return jsonify({"error": "Prompt not found"}), 404
    
    # Delete from database
    Database().delete_prompt(prompt_id)
    
    return jsonify({
        "status": "success",
        "message": "Prompt deleted successfully"
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)