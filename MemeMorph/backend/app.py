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
from datetime import datetime
from database import get_db, Database

# Set up logging
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

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

# API Routes
@app.route('/')
def index():
    return jsonify({
        "status": "online",
        "service": "MemeMorph API",
        "version": "1.0.0"
    })

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

# Web3 NFT integration endpoints
@app.route('/api/web3/metadata/<token_id>', methods=['GET'])
def get_nft_metadata(token_id):
    """Get metadata for an NFT token in standard format"""
    # This would typically query a database to find the meme associated with this token
    # For now, we'll just assume the token_id maps directly to a meme_id
    meme_id = token_id
    
    # Redirect to the meme metadata endpoint
    return get_meme_metadata(meme_id)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)