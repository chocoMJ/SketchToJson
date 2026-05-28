import base64
import mimetypes
import re
from contextlib import asynccontextmanager
from pathlib import Path

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile

from classify_segment import ShapeClassifier
from createForm import make_form_data_item
from segmentation import segment_connected_components


MODEL_PATH = Path(__file__).with_name("shape_classifier_cnn.pth")
DEFAULT_IMAGE_NAME = "uploaded-image"
TILE_COUNT = 50


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.classifier = ShapeClassifier(MODEL_PATH)
    yield


app = FastAPI(title="SketchToJson Recognition API", lifespan=lifespan)


def make_binary_data(content, mime_type):
    return {
        "encoding": "base64",
        "mimeType": mime_type,
        "value": base64.b64encode(content).decode("ascii"),
    }


def make_payload_id(filename):
    stem = Path(filename or DEFAULT_IMAGE_NAME).stem
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", stem).strip("-").lower()

    return f"recognition-{slug or DEFAULT_IMAGE_NAME}"


def get_upload_name(filename):
    return filename or f"{DEFAULT_IMAGE_NAME}.png"


def get_upload_mime_type(upload):
    if upload.content_type:
        return upload.content_type

    guessed_type, _ = mimetypes.guess_type(upload.filename or "")

    return guessed_type or "image/png"


def decode_image(image_bytes):
    encoded = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(encoded, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(
            status_code=400,
            detail="업로드된 파일을 이미지로 디코딩하지 못했습니다.",
        )

    return image


@app.post("/api/recognitions")
async def recognize_image(image: UploadFile = File(...)):
    image_bytes = await image.read()

    if not image_bytes:
        raise HTTPException(status_code=400, detail="업로드된 이미지가 비어 있습니다.")

    decoded_image = decode_image(image_bytes)
    original_height, original_width = decoded_image.shape[:2]
    segments = segment_connected_components(decoded_image)
    objects = []

    for segment in segments:
        segment_type, confidence = app.state.classifier.predict_crop_with_confidence(
            segment["crop"]
        )
        metadata, file_item = make_form_data_item(
            segment=segment,
            segment_type=segment_type,
            original_height=original_height,
            original_width=original_width,
            tile_count=TILE_COUNT,
        )

        objects.append(
            {
                "id": file_item["segment_id"],
                "shape": metadata["type"],
                "x": int(segment["x"]),
                "y": int(segment["y"]),
                "width": int(segment["w"]),
                "height": int(segment["h"]),
                "confidence": confidence,
                "data": make_binary_data(
                    file_item["content"],
                    file_item["content_type"],
                ),
            }
        )

    upload_name = get_upload_name(image.filename)
    payload = {
        "id": make_payload_id(upload_name),
        "name": upload_name,
        "image": {
            "width": int(original_width),
            "height": int(original_height),
            "name": upload_name,
            "data": make_binary_data(image_bytes, get_upload_mime_type(image)),
        },
        "objects": objects,
    }

    return [payload]
