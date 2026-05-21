from PIL import Image
import torch
from torchvision import transforms

def load_custom_image(image_path):
    transform = transforms.Compose([
        transforms.Grayscale(num_output_channels=1),
        transforms.Resize((28, 28)),
        transforms.ToTensor(),
        transforms.Normalize((0.5,), (0.5,))
    ])

    img = Image.open(image_path)
    img = transform(img)

    # 모델 입력은 [batch, channel, height, width] 형태여야 함
    img = img.unsqueeze(0)

    return img