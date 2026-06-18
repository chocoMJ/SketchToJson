import argparse
import base64
import html
import io
from pathlib import Path

import numpy as np
from PIL import Image


SUPPORTED_FLAT_SHAPE = 28 * 28
THUMBNAIL_SIZE = 112


def positive_int(value):
    parsed = int(value)
    if parsed < 1:
        raise argparse.ArgumentTypeError("must be a positive integer")
    return parsed


def parse_seed(value):
    normalized = value.lower()
    if normalized in {"random", "none"}:
        return None
    return int(value)


def format_bytes(size):
    units = ["B", "KB", "MB", "GB", "TB"]
    amount = float(size)
    for unit in units:
        if amount < 1024 or unit == units[-1]:
            if unit == "B":
                return f"{int(amount)} {unit}"
            return f"{amount:.1f} {unit}"
        amount /= 1024


def is_supported_shape(shape):
    return (
        len(shape) == 2
        and shape[1] == SUPPORTED_FLAT_SHAPE
    ) or (
        len(shape) == 3
        and shape[1:] == (28, 28)
    )


def sample_to_png_data_uri(sample):
    image_array = np.asarray(sample).reshape(28, 28)
    if image_array.dtype != np.uint8:
        image_array = np.clip(image_array, 0, 255).astype(np.uint8)

    image = Image.fromarray(image_array).resize(
        (THUMBNAIL_SIZE, THUMBNAIL_SIZE),
        resample=Image.Resampling.NEAREST,
    )
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def choose_indices(total, count, rng):
    sample_count = min(total, count)
    if sample_count == 0:
        return []
    return [int(index) for index in rng.choice(total, size=sample_count, replace=False)]


def render_dataset_card(path, samples_per_file, rng):
    try:
        array = np.load(path, mmap_mode="r")
    except Exception as exc:
        return render_error_card(path, f"파일을 열 수 없습니다: {exc}")

    shape = tuple(int(part) for part in array.shape)
    dtype = str(array.dtype)
    file_size = format_bytes(path.stat().st_size)

    if not is_supported_shape(shape):
        return render_error_card(
            path,
            f"지원하지 않는 shape입니다: {shape}. (N, 784) 또는 (N, 28, 28)만 지원합니다.",
            shape=shape,
            dtype=dtype,
            file_size=file_size,
        )

    total = shape[0]
    indices = choose_indices(total, samples_per_file, rng)
    sample_tiles = []

    for index in indices:
        data_uri = sample_to_png_data_uri(array[index])
        sample_tiles.append(
            f"""
            <figure class="sample">
              <img src="{data_uri}" alt="{html.escape(path.name)} sample {index}">
              <figcaption>#{index}</figcaption>
            </figure>
            """
        )

    samples_html = "\n".join(sample_tiles) if sample_tiles else '<p class="empty">샘플이 없습니다.</p>'

    return f"""
    <section class="dataset-card">
      <header>
        <div>
          <p class="eyebrow">Dataset</p>
          <h2>{html.escape(path.name)}</h2>
        </div>
        <span class="badge">samples: {total:,}</span>
      </header>
      <dl class="meta-grid">
        <div><dt>shape</dt><dd>{html.escape(str(shape))}</dd></div>
        <div><dt>dtype</dt><dd>{html.escape(dtype)}</dd></div>
        <div><dt>file size</dt><dd>{html.escape(file_size)}</dd></div>
        <div><dt>shown indices</dt><dd>{html.escape(", ".join(str(index) for index in indices))}</dd></div>
      </dl>
      <div class="sample-grid">
        {samples_html}
      </div>
    </section>
    """


def render_error_card(path, message, shape=None, dtype=None, file_size=None):
    shape_html = f"<div><dt>shape</dt><dd>{html.escape(str(shape))}</dd></div>" if shape is not None else ""
    dtype_html = f"<div><dt>dtype</dt><dd>{html.escape(dtype)}</dd></div>" if dtype is not None else ""
    size_html = f"<div><dt>file size</dt><dd>{html.escape(file_size)}</dd></div>" if file_size is not None else ""

    return f"""
    <section class="dataset-card error-card">
      <header>
        <div>
          <p class="eyebrow">Skipped</p>
          <h2>{html.escape(path.name)}</h2>
        </div>
      </header>
      <p class="error-message">{html.escape(message)}</p>
      <dl class="meta-grid">
        {shape_html}
        {dtype_html}
        {size_html}
      </dl>
    </section>
    """


def build_html(data_dir, cards):
    cards_html = "\n".join(cards)
    if not cards_html:
        cards_html = '<section class="dataset-card"><p class="empty">표시할 .npy 파일이 없습니다.</p></section>'

    return f"""<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>NPY Dataset Preview</title>
  <style>
    :root {{
      color-scheme: light;
      --bg: #f6f7f9;
      --panel: #ffffff;
      --ink: #1d2433;
      --muted: #687386;
      --line: #d9dee7;
      --accent: #0f766e;
      --error: #b42318;
      --sample-bg: #101216;
    }}

    * {{
      box-sizing: border-box;
    }}

    body {{
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }}

    main {{
      width: min(1180px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 32px 0 48px;
    }}

    .page-header {{
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-end;
      margin-bottom: 24px;
      border-bottom: 1px solid var(--line);
      padding-bottom: 20px;
    }}

    h1,
    h2,
    p {{
      margin: 0;
    }}

    h1 {{
      font-size: 28px;
      font-weight: 720;
    }}

    h2 {{
      font-size: 20px;
      font-weight: 700;
    }}

    .subtitle,
    .empty {{
      color: var(--muted);
      margin-top: 6px;
    }}

    .dataset-card {{
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 20px;
      margin-top: 16px;
    }}

    .dataset-card header {{
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 16px;
    }}

    .eyebrow {{
      color: var(--accent);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
      margin-bottom: 2px;
    }}

    .badge {{
      display: inline-flex;
      align-items: center;
      min-height: 28px;
      border: 1px solid #99d8d0;
      border-radius: 999px;
      color: #0b5c55;
      background: #e8f7f5;
      padding: 2px 10px;
      font-size: 13px;
      white-space: nowrap;
    }}

    .meta-grid {{
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px;
      margin: 0 0 18px;
    }}

    .meta-grid div {{
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 10px;
      min-width: 0;
    }}

    dt {{
      color: var(--muted);
      font-size: 12px;
      margin-bottom: 4px;
    }}

    dd {{
      margin: 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      overflow-wrap: anywhere;
    }}

    .sample-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
      gap: 12px;
    }}

    .sample {{
      margin: 0;
      border: 1px solid var(--line);
      border-radius: 6px;
      overflow: hidden;
      background: var(--sample-bg);
    }}

    .sample img {{
      width: 100%;
      aspect-ratio: 1;
      display: block;
      image-rendering: pixelated;
      object-fit: contain;
      background: var(--sample-bg);
    }}

    figcaption {{
      background: #fff;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      padding: 5px 7px;
      text-align: center;
    }}

    .error-card {{
      border-color: #f3b8b2;
    }}

    .error-message {{
      color: var(--error);
      margin-bottom: 12px;
    }}

    @media (max-width: 760px) {{
      main {{
        width: min(100vw - 20px, 1180px);
        padding-top: 20px;
      }}

      .page-header,
      .dataset-card header {{
        display: block;
      }}

      .badge {{
        margin-top: 10px;
      }}

      .meta-grid {{
        grid-template-columns: 1fr;
      }}
    }}
  </style>
</head>
<body>
  <main>
    <section class="page-header">
      <div>
        <h1>NPY Dataset Preview</h1>
        <p class="subtitle">Source: {html.escape(str(data_dir))}</p>
      </div>
    </section>
    {cards_html}
  </main>
</body>
</html>
"""


def parse_args():
    parser = argparse.ArgumentParser(description="Generate a self-contained HTML preview for 28x28 .npy datasets.")
    parser.add_argument("--data-dir", default="data_polygon", type=Path, help="Directory containing .npy dataset files.")
    parser.add_argument("--output", default="dataset_preview.html", type=Path, help="HTML output path.")
    parser.add_argument("--samples-per-file", default=24, type=positive_int, help="Number of random samples to show per file.")
    parser.add_argument(
        "--seed",
        default="random",
        type=parse_seed,
        help='Random seed for sample selection. Use "random" for a different sample set on each run.',
    )
    return parser.parse_args()


def main():
    args = parse_args()
    rng = np.random.default_rng(args.seed)

    data_dir = args.data_dir
    if not data_dir.exists():
        raise SystemExit(f"data directory does not exist: {data_dir}")
    if not data_dir.is_dir():
        raise SystemExit(f"data path is not a directory: {data_dir}")

    npy_paths = sorted(path for path in data_dir.glob("*.npy") if path.is_file())
    cards = [render_dataset_card(path, args.samples_per_file, rng) for path in npy_paths]
    output_html = build_html(data_dir, cards)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(output_html, encoding="utf-8")
    print(f"wrote {args.output}")
    print(f"datasets: {len(npy_paths)}")


if __name__ == "__main__":
    main()
