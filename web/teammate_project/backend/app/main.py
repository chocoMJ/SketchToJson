import base64
import json
import sys
from functools import lru_cache
from pathlib import Path
from uuid import uuid4

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware

PROJECT_ROOT = Path(__file__).resolve().parents[4]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

from classify_segment import ShapeClassifier
from createForm import make_form_data_item
from segmentation import segment_connected_components

app = FastAPI(
    title='SketchToJson API',
    version='0.1.0',
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/api/health')
def health_check() -> dict[str, str]:
    return {'status': 'ok'}


@app.get('/api')
def read_root() -> dict[str, str]:
    return {'message': 'FastAPI server is running.'}


@lru_cache(maxsize=1)
def get_shape_classifier() -> ShapeClassifier:
    model_path = PROJECT_ROOT / 'shape_classifier_cnn.pth'

    if not model_path.exists():
        raise RuntimeError(f'Model file not found: {model_path}')

    return ShapeClassifier(str(model_path))


def decode_upload_image(file_bytes: bytes) -> np.ndarray:
    image_array = np.frombuffer(file_bytes, dtype=np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(status_code=400, detail='Uploaded file is not a valid image.')

    return image


def to_web_shape(segment_type: str) -> str:
    if segment_type == 'structure':
        return 'line'

    return segment_type


def build_multipart_response(
    metadata_list: list[dict],
    file_list: list[dict],
    payload: dict,
) -> Response:
    boundary = f'sketchtojson-{uuid4().hex}'
    body_parts = []

    def append_json_field(name: str, value: object) -> None:
        body_parts.extend(
            [
                f'--{boundary}\r\n'.encode('ascii'),
                f'Content-Disposition: form-data; name="{name}"\r\n'.encode('ascii'),
                b'Content-Type: application/json; charset=utf-8\r\n\r\n',
                json.dumps(value, ensure_ascii=False).encode('utf-8'),
                b'\r\n',
            ],
        )

    append_json_field('metadata', metadata_list)
    append_json_field('payload', payload)

    for file_item in file_list:
        body_parts.extend(
            [
                f'--{boundary}\r\n'.encode('ascii'),
                (
                    'Content-Disposition: form-data; '
                    f'name="{file_item["field_name"]}"; '
                    f'filename="{file_item["filename"]}"\r\n'
                ).encode('ascii'),
                f'Content-Type: {file_item["content_type"]}\r\n\r\n'.encode('ascii'),
                file_item['content'],
                b'\r\n',
            ],
        )

    body_parts.append(f'--{boundary}--\r\n'.encode('ascii'))

    return Response(
        content=b''.join(body_parts),
        media_type=f'multipart/form-data; boundary={boundary}',
    )


@app.post('/api/segment-image')
async def segment_image(image: UploadFile = File(...)) -> Response:
    if image.content_type not in {'image/png', 'image/x-png'}:
        raise HTTPException(status_code=400, detail='Only PNG images are supported.')

    file_bytes = await image.read()

    if not file_bytes:
        raise HTTPException(status_code=400, detail='Uploaded image is empty.')

    decoded_image = decode_upload_image(file_bytes)
    original_height, original_width = decoded_image.shape[:2]
    segments = segment_connected_components(
        decoded_image,
        debug_dir=str(PROJECT_ROOT / 'debug_segments'),
    )
    classifier = get_shape_classifier()
    metadata_list = []
    file_list = []
    objects = []

    for segment in segments:
        segment_type = classifier.predict_crop(segment['crop'])
        metadata, file_item = make_form_data_item(
            segment=segment,
            segment_type=segment_type,
            original_height=original_height,
            original_width=original_width,
            tile_count=50,
        )

        metadata_list.append(metadata)
        file_list.append(
            {
                'segment_id': file_item['segment_id'],
                'field_name': file_item['field_name'],
                'filename': file_item['filename'],
                'content_type': file_item['content_type'],
                'content': file_item['content'],
            },
        )
        objects.append(
            {
                'id': file_item['segment_id'],
                'shape': to_web_shape(segment_type),
                'x': segment['x'],
                'y': segment['y'],
                'width': segment['w'],
                'height': segment['h'],
                'data': {
                    'encoding': 'base64',
                    'mimeType': file_item['content_type'],
                    'value': base64.b64encode(file_item['content']).decode('ascii'),
                },
            },
        )

    payload = {
        'id': Path(image.filename or 'uploaded-image').stem,
        'name': image.filename or 'uploaded-image.png',
        'image': {
            'width': original_width,
            'height': original_height,
            'name': image.filename or 'uploaded-image.png',
        },
        'objects': objects,
    }

    return build_multipart_response(metadata_list, file_list, payload)
