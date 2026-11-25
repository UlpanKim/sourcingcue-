"""
07SourcingCue 860px Coupang Mobile Detail Renderer (Hardened)
Renders 430px HTML at 2x device_scale_factor (860px width) using Playwright
with JS disabled, strict CDN-only routing, and Pillow height bounds.
"""
import argparse
import os
from pathlib import Path
from urllib.parse import urlparse
from PIL import Image
from playwright.sync_api import sync_playwright

SLICE_HEIGHT_PX = 1600
VIEWPORT_WIDTH = 430
VIEWPORT_HEIGHT = 1200
SCALE = 2  # 430 * 2 = 860px Coupang WING standard
MAX_SCROLL_HEIGHT_PX = 20_000
Image.MAX_IMAGE_PIXELS = 40_000_000


def is_allowed_request_url(raw_url: str) -> bool:
    parsed = urlparse(raw_url)
    if parsed.scheme in ("about", "data"):
        return parsed.scheme == "about"
    if parsed.scheme != "https":
        return False
    host = (parsed.hostname or "").lower()
    return host == "alicdn.com" or host.endswith(".alicdn.com")


def render_html_to_860px_pngs(input_html: Path, out_dir: Path) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    html_text = input_html.read_text(encoding="utf-8")
    tile_paths: list[Path] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": VIEWPORT_WIDTH, "height": VIEWPORT_HEIGHT},
            device_scale_factor=SCALE,
            java_script_enabled=False,
        )
        page = context.new_page()

        def handle_route(route) -> None:
            if is_allowed_request_url(route.request.url):
                route.continue_()
            else:
                route.abort()

        page.route("**/*", handle_route)
        page.set_content(html_text, wait_until="load", timeout=15_000)
        raw_height = int(page.evaluate("() => document.body.scrollHeight"))
        total_height = max(1, min(raw_height, MAX_SCROLL_HEIGHT_PX))

        y = 0
        idx = 0
        while y < total_height:
            page.evaluate(f"() => window.scrollTo(0, {y})")
            page.wait_for_timeout(120)
            tile_path = out_dir / f"_tile_{idx:03d}.png"
            page.screenshot(path=str(tile_path), full_page=False)
            tile_paths.append(tile_path)
            y += VIEWPORT_HEIGHT
            idx += 1
        context.close()
        browser.close()

    # Stitch tiles into full canvas and slice into 860x1600px Coupang PNGs
    tiles = [Image.open(tp) for tp in tile_paths]
    target_w = VIEWPORT_WIDTH * SCALE
    full_h = total_height * SCALE
    canvas = Image.new("RGB", (target_w, full_h), (255, 255, 255))

    for i, tile in enumerate(tiles):
        y_offset = i * VIEWPORT_HEIGHT * SCALE
        remaining = full_h - y_offset
        if tile.height > remaining:
            tile = tile.crop((0, 0, target_w, remaining))
        canvas.paste(tile, (0, y_offset))
        tile.close()

    for tp in tile_paths:
        os.remove(tp)

    outputs: list[Path] = []
    slice_idx = 1
    for top in range(0, full_h, SLICE_HEIGHT_PX):
        bottom = min(top + SLICE_HEIGHT_PX, full_h)
        cropped = canvas.crop((0, top, target_w, bottom))
        out_path = out_dir / f"detail_860_{slice_idx:02d}.png"
        cropped.save(out_path, format="PNG", optimize=True)
        outputs.append(out_path)
        slice_idx += 1

    canvas.close()
    return outputs


def main() -> None:
    parser = argparse.ArgumentParser(description="Render detail HTML to 860px PNG slices.")
    parser.add_argument("--input", required=True, help="Path to detail HTML file")
    parser.add_argument("--out", required=True, help="Output directory for 860px PNGs")
    args = parser.parse_args()

    results = render_html_to_860px_pngs(Path(args.input), Path(args.out))
    for r in results:
        with Image.open(r) as img:
            print(f"Generated {r} ({img.width}x{img.height})")


if __name__ == "__main__":
    main()
