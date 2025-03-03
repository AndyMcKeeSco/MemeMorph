import os
import requests
import shutil
from PIL import Image
import io

# Directory for templates
TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
os.makedirs(TEMPLATES_DIR, exist_ok=True)

# Popular meme templates to download
TEMPLATES = [
    {
        "name": "drake",
        "url": "https://imgflip.com/s/meme/Drake-Hotline-Bling.jpg"
    },
    {
        "name": "distracted_boyfriend",
        "url": "https://imgflip.com/s/meme/Distracted-Boyfriend.jpg"
    },
    {
        "name": "two_buttons",
        "url": "https://imgflip.com/s/meme/Two-Buttons.jpg"
    },
    {
        "name": "change_my_mind",
        "url": "https://imgflip.com/s/meme/Change-My-Mind.jpg"
    },
    {
        "name": "expanding_brain",
        "url": "https://imgflip.com/s/meme/Expanding-Brain.jpg"
    },
    {
        "name": "woman_yelling",
        "url": "https://imgflip.com/s/meme/Woman-Yelling-At-Cat.jpg"
    },
    {
        "name": "stonks",
        "url": "https://imgflip.com/s/meme/Stonks.jpg"
    },
    {
        "name": "one_does_not_simply",
        "url": "https://imgflip.com/s/meme/One-Does-Not-Simply.jpg"
    }
]

def download_templates():
    """Download popular meme templates"""
    print(f"Downloading {len(TEMPLATES)} meme templates...")
    
    for template in TEMPLATES:
        name = template["name"]
        url = template["url"]
        filename = f"{name}.jpg"
        output_path = os.path.join(TEMPLATES_DIR, filename)
        
        # Skip if file already exists
        if os.path.exists(output_path):
            print(f"Template {name} already exists, skipping.")
            continue
        
        try:
            print(f"Downloading {name}...")
            response = requests.get(url, stream=True)
            
            if response.status_code == 200:
                # Save the image
                with open(output_path, 'wb') as f:
                    response.raw.decode_content = True
                    shutil.copyfileobj(response.raw, f)
                
                # Resize if necessary
                with Image.open(output_path) as img:
                    # Limit maximum dimensions while preserving aspect ratio
                    max_size = (800, 800)
                    if img.width > max_size[0] or img.height > max_size[1]:
                        img.thumbnail(max_size, Image.LANCZOS)
                        img.save(output_path)
                
                print(f"Downloaded {name} successfully.")
            else:
                print(f"Failed to download {name}. Status code: {response.status_code}")
        
        except Exception as e:
            print(f"Error downloading {name}: {str(e)}")

if __name__ == "__main__":
    download_templates()
    print("Template download complete.")