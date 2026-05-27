import numpy as np
from torch.utils.data import Dataset
import torch

class NpyShapeDataset(Dataset):
    """.npy이미지 데이터를 pytorch학습용 DataSet형태로 바꿔준다."""
    def __init__(self, npy_paths, labels, max_per_class=None):
        self.images = []
        self.targets = []

        for npy_path, label in zip(npy_paths, labels):
            data = np.load(npy_path)

            if max_per_class is not None:
                data = data[:max_per_class]

            data = data.reshape(-1, 28, 28)

            self.images.append(data)
            self.targets.extend([label] * len(data))

        self.images = np.concatenate(self.images, axis=0)
        self.targets = np.array(self.targets)

    def __len__(self):
        return len(self.targets)

    def __getitem__(self, idx):
        img = self.images[idx]
        target = int(self.targets[idx])

        img = torch.tensor(img, dtype=torch.float32).unsqueeze(0) / 255.0
        img = (img - 0.5) / 0.5

        return img, target