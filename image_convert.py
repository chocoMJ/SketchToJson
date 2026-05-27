from PIL import Image
from torchvision import transforms

transform = transforms.Compose([
        transforms.Grayscale(num_output_channels=1),
        transforms.Resize((28, 28)),
        transforms.ToTensor(),
        transforms.Normalize((0.5,), (0.5,))
    ])

def load_custom_image(img):

    img = transform(img)

    # 모델 입력은 [batch, channel, height, width] 형태여야 함
    img = img.unsqueeze(0)

    return img