import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from PIL import Image

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
    

class ShapeClassifier:
    """전처리 후 crop의 타입을 반환"""
    def __init__(self, model_path, device=None):
        self.class_names = ["triangle", "star", "structure"]

        if device is None:
            self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            self.device = device

        self.model = ShapeNet().to(self.device)
        self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        self.model.eval()

    def preprocess_crop(self, crop):
        if not isinstance(crop, np.ndarray):
            crop = np.array(crop)

        h, w = crop.shape
        size = max(h, w)

        #리사이즈를 위해 중앙 배치 후 resize
        canvas = np.zeros((size, size), dtype=np.uint8)

        top = (size - h) // 2
        left = (size - w) // 2

        canvas[top:top + h, left:left + w] = crop

        #resize
        img = Image.fromarray(canvas)
        img = img.resize((28, 28), Image.Resampling.BILINEAR)

        arr = np.array(img).astype(np.float32)

        arr = arr / 255.0

        # 학습 때 한 정규화와 동일
        arr = (arr - 0.5) / 0.5

        tensor = torch.tensor(arr, dtype=torch.float32)

        # [H, W] -> [B, C, H, W]
        tensor = tensor.unsqueeze(0).unsqueeze(0)

        return tensor.to(self.device)

    def predict_crop(self, crop):
        input_tensor = self.preprocess_crop(crop)

        with torch.no_grad():
            output = self.model(input_tensor)

            probs = torch.exp(output)

            confidence, pred_idx = torch.max(probs, dim=1)

            pred_idx = pred_idx.item()
            confidence = confidence.item()

        return self.class_names[pred_idx]
