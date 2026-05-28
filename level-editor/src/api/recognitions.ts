import {
  type RecognitionPayload,
  RecognitionPayloadSchema,
} from '@/models/level';
import mockRecognitionImageUrl from '../../docs/images/chunk_0_0.png';

const RECOGNITIONS_ENDPOINT = '/api/recognitions';
const USE_RECOGNITION_MOCK =
  import.meta.env.VITE_USE_RECOGNITION_MOCK !== 'false';

const MOCK_RECOGNITION_PAYLOAD = {
  id: 'chunk-0-0-mock',
  name: 'Chunk 0 0 Mock Recognition',
  image: {
    width: 2978,
    height: 2251,
    name: 'chunk_0_0.png',
    src: mockRecognitionImageUrl,
  },
  objects: [
    {
      id: 'left-platform-outline',
      shape: 'rectangle',
      x: 595,
      y: 350,
      width: 835,
      height: 555,
      confidence: 0.94,
    },
    {
      id: 'right-platform-outline',
      shape: 'rectangle',
      x: 1865,
      y: 515,
      width: 650,
      height: 420,
      confidence: 0.93,
    },
    {
      id: 'upper-triangle',
      shape: 'triangle',
      x: 2055,
      y: 330,
      width: 250,
      height: 185,
      confidence: 0.88,
    },
    {
      id: 'lower-star-triangle',
      shape: 'triangle',
      x: 2540,
      y: 1045,
      width: 235,
      height: 285,
      confidence: 0.78,
    },
    {
      id: 'bottom-left-ground-line',
      shape: 'line',
      x: 0,
      y: 1720,
      width: 690,
      height: 24,
      confidence: 0.9,
    },
    {
      id: 'bottom-center-ground-line',
      shape: 'line',
      x: 995,
      y: 1725,
      width: 930,
      height: 28,
      confidence: 0.9,
    },
    {
      id: 'bottom-right-platform-outline',
      shape: 'rectangle',
      x: 2425,
      y: 1700,
      width: 553,
      height: 551,
      confidence: 0.9,
    },
  ],
} satisfies RecognitionPayload;

const MOCK_RECOGNITION_RESPONSE = [
  MOCK_RECOGNITION_PAYLOAD,
] satisfies RecognitionPayload[];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const unwrapRecognitionResponse = (response: unknown) => {
  if (!isRecord(response)) {
    return response;
  }

  if ('items' in response) {
    return response.items;
  }

  if ('data' in response) {
    return response.data;
  }

  if ('payload' in response) {
    return response.payload;
  }

  return response;
};

const formatValidationError = (response: unknown) => {
  const candidates = Array.isArray(response) ? response : [response];
  const result = RecognitionPayloadSchema.array().safeParse(candidates);

  if (result.success) {
    return result.data;
  }

  const issue = result.error.issues[0];

  if (!issue) {
    throw new Error('Recognition response validation failed.');
  }

  throw new Error(
    `Recognition response validation failed: ${
      issue.path.join('.') || 'payload'
    }: ${issue.message}`,
  );
};

export const normalizeRecognitionResponse = (
  response: unknown,
): RecognitionPayload[] =>
  formatValidationError(unwrapRecognitionResponse(response));

export const uploadRecognitionImage = async (file: File) => {
  if (USE_RECOGNITION_MOCK) {
    return normalizeRecognitionResponse(MOCK_RECOGNITION_RESPONSE);
  }

  const formData = new FormData();

  formData.append('image', file);

  const response = await fetch(RECOGNITIONS_ENDPOINT, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(
      `Recognition upload failed: ${response.status} ${response.statusText}`,
    );
  }

  let responseBody: unknown;

  try {
    responseBody = await response.json();
  } catch {
    throw new Error('Recognition response JSON parse failed.');
  }

  return normalizeRecognitionResponse(responseBody);
};
