import torch
import numpy as np
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image, ImageOps
import matplotlib.pyplot as plt

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def preprocess_image(crop):
    # 1. numpy 배열로 변환
    arr = np.array(crop)

    ys, xs = np.where(arr > 50)

    

class LetterNet(nn.Module):
    def __init__(self):
        super(LetterNet, self).__init__()
        self.conv1 = nn.Conv2d(1, 32, 3, 1)
        self.conv2 = nn.Conv2d(32, 64, 3, 1)
        self.dropout1 = nn.Dropout(0.25)
        self.dropout2 = nn.Dropout(0.5)
        self.fc1 = nn.Linear(9216, 128)
        self.fc2 = nn.Linear(128, 26)

    def forward(self, x):
        x = self.conv1(x)
        x = F.relu(x)
        x = self.conv2(x)
        x = F.relu(x)
        x = F.max_pool2d(x, 2)
        x = self.dropout1(x)
        x = torch.flatten(x, 1)
        x = self.fc1(x)
        x = F.relu(x)
        x = self.dropout2(x)
        x = self.fc2(x)
        output = F.log_softmax(x, dim=1)
        return output


def index_to_char(index):
    return chr(ord("A") + index)

def main():
    print("DEVICE:", DEVICE)

    model = LetterNet().to(DEVICE)
    model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
    model.eval()

    tensor = preprocess_image(IMAGE_PATH).to(DEVICE)

    with torch.no_grad():
        output = model(tensor)

        # log_softmax 결과이므로 exp 하면 확률처럼 볼 수 있음
        probs = torch.exp(output)

        confidence, pred_index = probs.max(dim=1)

    pred_char = index_to_char(pred_index.item())

    print("Predicted:", pred_char)
    print("Confidence:", confidence.item())

    original_img = Image.open(IMAGE_PATH).convert("L")

    plt.figure(figsize=(4, 4))
    plt.imshow(original_img, cmap="gray")
    plt.title(f"Pred: {pred_char} | Confidence: {confidence.item():.2f}")
    plt.axis("off")
    plt.show()


if __name__ == "__main__":
    main()