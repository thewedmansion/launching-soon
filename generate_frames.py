import cv2
import os
import numpy as np
from PIL import Image

def generate_hero_frames():
    video_path = '/Users/fao/stydy/out.mp4'
    out_dir = '/Users/fao/stydy/assets/hero_frames'
    os.makedirs(out_dir, exist_ok=True)
    
    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    print(f'Processing video: {video_path}, Total Frames: {total_frames}, Resolution: {w}x{h}')
    
    target_w, target_h = 1600, 900
    num_output_frames = 60
    indices = [int(i * (total_frames - 1) / (num_output_frames - 1)) for i in range(num_output_frames)]
    
    # Precompute edge fade masks
    left_w = int(w * 0.08)
    right_w = int(w * 0.08)
    left_fade = np.linspace(0, 1, left_w, dtype=np.float32)[np.newaxis, :]
    right_fade = np.linspace(1, 0, right_w, dtype=np.float32)[np.newaxis, :]
    
    erode_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    close_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17))
    
    for out_idx, frame_idx in enumerate(indices):
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame_bgr = cap.read()
        if not ret:
            print(f'Failed to read frame at index {frame_idx}')
            break
            
        img_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        
        # Calculate maximum channel intensity
        max_c = np.max(img_rgb, axis=2).astype(np.float32)
        
        # Initial foreground threshold
        fg = max_c > 12
        
        # Morphological closing to seal suit jacket and bridal lace interiors
        fg_closed = cv2.morphologyEx(fg.astype(np.uint8), cv2.MORPH_CLOSE, close_kernel)
        
        # Filter connected components to remove isolated noise pixels
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(fg_closed)
        cleaned_mask = np.zeros((h, w), dtype=np.uint8)
        for i in range(1, num_labels):
            if stats[i, cv2.CC_STAT_AREA] > 2500:
                cleaned_mask[labels == i] = 1
                
        # Erode by 1 pixel to cut cleanly into the illuminated pixels and avoid black fringe
        eroded = cv2.erode(cleaned_mask, erode_kernel, iterations=1)
        
        # Soft antialiased Gaussian blur on alpha border
        mask_soft = cv2.GaussianBlur(eroded.astype(np.float32), (5, 5), 0)
        
        # Mask out any corner watermark
        mask_soft[int(h * 0.70):, int(w * 0.82):] = 0.0
        
        # Feather arm entrances on the extreme left and right
        mask_soft[:, :left_w] *= left_fade
        mask_soft[:, -right_w:] *= right_fade
        
        # Un-premultiply RGB colors at edges so they blend naturally on soft ivory
        alpha_norm = np.expand_dims(mask_soft, axis=2)
        unmul_rgb = np.clip(img_rgb.astype(np.float32) / np.maximum(alpha_norm, 0.35), 0, 255)
        
        # Create 4-channel RGBA
        alpha_byte = (mask_soft * 255).astype(np.uint8)
        rgba = np.dstack((unmul_rgb.astype(np.uint8), alpha_byte))
        
        # Resize to crisp high-DPI target resolution
        pil_img = Image.fromarray(rgba)
        pil_resized = pil_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        
        # Save WebP with high quality
        out_filename = f'frame_{out_idx:03d}.webp'
        out_path = os.path.join(out_dir, out_filename)
        pil_resized.save(out_path, 'WEBP', quality=88, method=4)
        
        if out_idx % 15 == 0 or out_idx == num_output_frames - 1:
            print(f'Rendered frame {out_idx + 1}/{num_output_frames} ({out_filename})')

    print('Frame generation completed successfully!')

if __name__ == '__main__':
    generate_hero_frames()
