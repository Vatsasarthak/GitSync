import sys
from PIL import Image, ImageDraw

def process_logo(input_path, output_dir):
    try:
        img = Image.open(input_path).convert("RGBA")
        width, height = img.size

        pixels = img.load()
        min_x, min_y = width, height
        max_x, max_y = 0, 0
        
        # Find the bounding box of the WHITE circle (RGB > 200)
        for y in range(height):
            for x in range(width):
                r, g, b, a = pixels[x, y]
                if r > 200 and g > 200 and b > 200:
                    if x < min_x: min_x = x
                    if x > max_x: max_x = x
                    if y < min_y: min_y = y
                    if y > max_y: max_y = y
                    
        # Crop to the white circle's bounding box
        if min_x < max_x and min_y < max_y:
            img = img.crop((min_x, min_y, max_x, max_y))
            
        width, height = img.size
        
        # Apply a precise circular mask to the cropped image to ensure PERFECT transparent corners
        mask = Image.new('L', (width, height), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, width, height), fill=255)
        
        result = Image.new('RGBA', (width, height), (0,0,0,0))
        result.paste(img, (0, 0), mask=mask)

        # Save sizes
        for size in [16, 48, 128]:
            resized = result.resize((size, size), Image.Resampling.LANCZOS)
            resized.save(f"{output_dir}/icon{size}.png", "PNG")
            
        print(f"Successfully cropped (bbox: {min_x},{min_y} to {max_x},{max_y}), masked, and resized icons!")
    except Exception as e:
        print("Error processing image:", e)

if __name__ == "__main__":
    process_logo(r"C:\Users\VATSA\.gemini\antigravity\brain\9791cf1e-5507-479b-afcf-6db7d5e1c4f1\media__1778015023321.png", r"c:\Users\VATSA\OneDrive\Desktop\gfgsync\icons")
