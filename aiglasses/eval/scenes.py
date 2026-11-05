"""Draw the frames named by the perception-eval fixture pack.

Every scene is generated in process. The pack does not read a video file,
a webcam, or a downloaded weight file.
"""

from __future__ import annotations

CANVAS = (240, 320)  # height, width — same canvas as aiglasses.vision.draw_lamp


def render_frame(spec: dict):
    if not isinstance(spec, dict):
        raise ValueError("generate must be an object")
    kind = spec.get("kind")
    if kind == "blank":
        return _canvas()
    if kind == "lamp":
        from aiglasses.vision import draw_lamp

        color = _color(spec)
        radius = spec.get("radius", 36)
        if isinstance(radius, bool) or not isinstance(radius, int) or not 1 <= radius <= 80:
            raise ValueError("lamp radius must be an integer from 1 to 80")
        center = spec.get("center")
        point = None
        if center is not None:
            if (
                not isinstance(center, list)
                or len(center) != 2
                or any(isinstance(item, bool) or not isinstance(item, int) for item in center)
            ):
                raise ValueError("lamp center must be [x, y] integers")
            point = (center[0], center[1])
        return draw_lamp(color, radius=radius, center=point)
    if kind == "red_square":
        from aiglasses.vision import red_square

        return red_square()
    if kind == "conflicting_lamps":
        from aiglasses.vision import conflicting_lamps

        return conflicting_lamps()
    if kind == "column":
        image = _canvas()
        color = _color(spec, default=(80, 80, 80))
        image[20:220, 140:180] = color
        return image
    raise ValueError(
        "generate.kind must be blank, lamp, red_square, conflicting_lamps, or column"
    )


def _canvas():
    from aiglasses.vision import _numpy

    np = _numpy()
    height, width = CANVAS
    return np.zeros((height, width, 3), dtype=np.uint8)


def _color(spec: dict, default: tuple[int, int, int] | None = None) -> tuple[int, int, int]:
    raw = spec.get("color_bgr", default)
    if (
        not isinstance(raw, list)
        or len(raw) != 3
        or any(isinstance(item, bool) or not isinstance(item, int) or not 0 <= item <= 255 for item in raw)
    ):
        raise ValueError("color_bgr must be three integers from 0 to 255")
    return (raw[0], raw[1], raw[2])
