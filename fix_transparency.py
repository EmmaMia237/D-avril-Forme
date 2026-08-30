#!/usr/bin/env python3
from PIL import Image
import os

os.chdir(r"c:/Users/GWANMESIA RITA/Downloads/avril-forme-print-studio-main/D'avril Forme")

# Load the source transparent logo
source_path = 'frontend/images/OsanPrints Logo.png'
source = Image.open(source_path)

print("=== Processing Logo Images ===\n")
print(f"Source file: {source_path}")
print(f"Mode: {source.mode}, Size: {source.size}")
print(f"Alpha range: {source.split()[-1].getextrema()}\n")

# Ensure it's RGBA
if source.mode != 'RGBA':
    source = source.convert('RGBA')

# Copy to frontend public logo
frontend_public_logo = 'frontend/public/images/logo.png'
source.save(frontend_public_logo, 'PNG')
print(f"✓ Saved: {frontend_public_logo}")
verify = Image.open(frontend_public_logo)
print(f"  Verified: {verify.mode}, Alpha: {verify.split()[-1].getextrema()}\n")

# Copy to admin-frontend public logo
admin_public_logo = 'admin-frontend/public/images/logo.png'
source.save(admin_public_logo, 'PNG')
print(f"✓ Saved: {admin_public_logo}")
verify = Image.open(admin_public_logo)
print(f"  Verified: {verify.mode}, Alpha: {verify.split()[-1].getextrema()}\n")

# Regenerate favicon with proper transparency
favicon_path = 'frontend/public/favicon.ico'
# Resize to 32x32 for better favicon quality
favicon_img = source.resize((32, 32), Image.Resampling.LANCZOS)
favicon_img.save(favicon_path, 'ICO')
print(f"✓ Generated: {favicon_path}")
verify = Image.open(favicon_path)
print(f"  Verified: {verify.mode}, Size: {verify.size}")
if 'A' in verify.mode:
    alpha_range = verify.split()[-1].getextrema()
    print(f"  Alpha range: {alpha_range}\n")
else:
    print(f"  WARNING: No alpha channel\n")

print("=== All files processed with true transparency ===")
