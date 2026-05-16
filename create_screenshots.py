from PIL import Image, ImageDraw, ImageFont

# Dossier destination
import os
os.makedirs('static/screenshots', exist_ok=True)

# 1. Capture Desktop (1280x720)
img1 = Image.new('RGB', (1280, 720), color='#006633')
draw = ImageDraw.Draw(img1)
draw.text((640, 360), "Inspection du Travail - Louga", fill='white', anchor="mm")
draw.text((640, 400), "Fiche de Contrôle", fill='#f5f6f8', anchor="mm")
img1.save('static/screenshots/desktop-wide.png')
print("✅ desktop-wide.png créé")

# 2. Capture Mobile (720x1280)
img2 = Image.new('RGB', (720, 1280), color='#006633')
draw = ImageDraw.Draw(img2)
draw.text((360, 600), "Inspection du Travail", fill='white', anchor="mm")
draw.text((360, 650), "Fiche de Contrôle", fill='#f5f6f8', anchor="mm")
img2.save('static/screenshots/mobile.png')
print("✅ mobile.png créé")

print("✅ Toutes les captures sont prêtes !")