from PIL import Image


def convert_gif_to_images(gif_path: str) -> list[Image.Image]:

    gif = Image.open(gif_path)

    # Store frames in a list
    frames = []

    # Iterate over each frame
    try:
        while True:
            frame = gif.copy()
            frames.append(frame)
            gif.seek(gif.tell() + 1)
    except EOFError:
        pass  # End of sequence

    return frames
