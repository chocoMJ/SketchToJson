import cv2
from segmentation import segment_connected_components
from classify_segment import ShapeClassifier
from createForm import make_form_data_item
import json

img = cv2.imread("images/chunk_0_0.png")
segments = segment_connected_components(img)

classifier = ShapeClassifier("shape_classifier_cnn.pth")

metadata_list = []
file_list = []

original_height, original_width = img.shape[:2]

for segment in segments:
    segment_type = classifier.predict_crop(segment["crop"])

    metadata, file_item = make_form_data_item(
        segment=segment,
        segment_type=segment_type,
        original_height=original_height,
        original_width=original_width,
        tile_count=50
    )

    metadata_list.append(metadata)
    file_list.append(file_item)
    

with open("form_data.json", "w", encoding="utf-8") as f:
    json.dump(metadata_list, f, ensure_ascii=False, indent=4)

print("form_data.json 저장 완료")