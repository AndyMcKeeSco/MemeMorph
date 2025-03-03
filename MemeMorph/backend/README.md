# MemeMorph Backend

This is the Flask backend for the MemeMorph application, providing APIs for meme generation, customization, and NFT metadata.

## Setup

1. Create a virtual environment:
   ```
   python -m venv venv
   ```

2. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Unix/Mac: `source venv/bin/activate`

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```
   cp .env.example .env
   # Edit .env with your settings
   ```

5. Run the application:
   ```
   flask run
   # or
   python app.py
   ```

## API Endpoints

### Basic

- `GET /` - API status check
- `GET /api/meme/filters` - List available image filters

### Templates

- `GET /api/meme/templates` - List all meme templates
- `GET /api/meme/templates/<filename>` - Get a specific template
- `POST /api/meme/upload` - Upload a custom template

### Meme Generation

- `POST /api/meme/generate` - Generate a meme from a template
- `GET /api/meme/view/<filename>` - View a generated meme
- `GET /api/meme/uploads/<filename>` - View an uploaded image

### NFT Integration

- `GET /api/meme/metadata/<meme_id>` - Get meme metadata
- `GET /api/web3/metadata/<token_id>` - Get NFT metadata

## Adding Meme Templates

To add new meme templates, place image files in the `templates` folder. The system will automatically detect and make them available for use.

## Image Processing Features

- Text addition with stroke/outline
- Multiple visual filters (deep fried, vaporwave, glitch, vintage)
- Image resizing and optimization
- Metadata generation for NFTs