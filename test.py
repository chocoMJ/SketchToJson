import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from PIL import Image
from image_convert import load_custom_image


class ShapeNet(nn.Module):
    def __init__(self):
        super(ShapeNet, self).__init__()
        self.conv1 = nn.Conv2d(1, 32, 3, 1)
        self.conv2 = nn.Conv2d(32, 64, 3, 1)
        self.dropout1 = nn.Dropout(0.25)
        self.dropout2 = nn.Dropout(0.5)
        self.fc1 = nn.Linear(9216, 128)
        self.fc2 = nn.Linear(128, 3)

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

# npy 이미지들 중 인덱스 하나 꺼내서 모델에 넣을 수 있는 형태로 바꿔준다.
def load_quickdraw_sample(npy_path, index):
    data = np.load(npy_path)

    img = data[index].reshape(28, 28)

    img = torch.tensor(img, dtype=torch.float32).unsqueeze(0).unsqueeze(0) / 255.0
    img = (img - 0.5) / 0.5

    return img


def predict(model, image_tensor, class_names):
    model.eval()

    with torch.no_grad():
        output = model(image_tensor)

        # log_softmax 출력이므로 exp를 하면 확률처럼 볼 수 있음
        probs = torch.exp(output)

        confidence, pred_idx = torch.max(probs, dim=1)

        pred_idx = pred_idx.item()
        confidence = confidence.item()

        return class_names[pred_idx], confidence, probs.squeeze()


def main():
    class_names = ["triangle", "star", "structure"]

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model = ShapeNet().to(device)
    model.load_state_dict(torch.load("shape_classifier_cnn.pth", map_location=device))

    # 테스트할 샘플
    img = Image.open("debug_segments/segment_3.png")
    image_tensor = load_custom_image(img)
    image_tensor = image_tensor.to(device)

    label, confidence, probs = predict(model, image_tensor, class_names)

    print("Prediction:", label)
    print("Confidence:", confidence)
    print("Probabilities:")
    for class_name, prob in zip(class_names, probs):
        print(f"  {class_name}: {prob.item():.4f}")


if __name__ == "__main__":
    main()