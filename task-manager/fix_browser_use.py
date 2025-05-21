import os
import shutil
import tempfile


def get_base_dir() -> str:
    import browser_use

    file_path = browser_use.__file__
    dir_path = os.path.dirname(file_path)

    return dir_path


def remove_debug_port() -> None:

    dir_path = get_base_dir()
    temp_file = tempfile.mktemp()
    file_to_change = os.path.join(dir_path, "browser", "chrome.py")

    with open(file_to_change, 'r') as input_file, open(temp_file, 'w') as output_file:
        for line in input_file:
            if "--remote-debugging-port" not in line:
                output_file.write(line)

    # Replace the original file with the modified content
    shutil.move(temp_file, file_to_change)

    print(f"Successfully removed lines containing --remote-debugging-port from {file_to_change}")


def limit_max_scroll() -> None:

    modified = False

    dir_path = get_base_dir()
    temp_file = tempfile.mktemp()
    file_to_change = os.path.join(dir_path, "controller", "service.py")

    before_line = "await page.evaluate('window.scrollBy(0, window.innerHeight);')"
    after_line = "await page.evaluate('window.scrollBy(0, window.innerHeight / 2);')"

    with open(file_to_change, 'r') as input_file, open(temp_file, 'w') as output_file:
        for line in input_file:

            if before_line in line:
                modified = True
                line = line.replace(before_line, after_line)

            output_file.write(line)

    shutil.move(temp_file, file_to_change)

    if not modified:
        raise RuntimeError(f"Couldn't modify the file in {file_to_change}")

    print("Successfully limited max scrolls")


def prevent_screenshot_to_modify_dom() -> None:

    modified = False

    dir_path = get_base_dir()
    temp_file = tempfile.mktemp()
    file_to_change = os.path.join(dir_path, "browser", "context.py")

    before_line = "animations='disabled',"
    after_line = "animations='disabled', caret='initial',"

    with open(file_to_change, 'r') as input_file, open(temp_file, 'w') as output_file:
        for line in input_file:

            if before_line in line:
                modified = True
                line = line.replace(before_line, after_line)

            output_file.write(line)

    shutil.move(temp_file, file_to_change)

    if not modified:
        raise RuntimeError(f"Couldn't modify the file in {file_to_change}")

    print("Successfully prevented screenshot to modify DOM")


def replace_invoke_by_ainvoke_in_get_next_action() -> None:
    modified = False

    dir_path = get_base_dir()
    temp_file = tempfile.mktemp()
    file_to_change = os.path.join(dir_path, "agent", "service.py")

    before_line = "output = self.llm.invoke(input_messages)"
    after_line = "output = await self.llm.ainvoke(input_messages)"

    with open(file_to_change, 'r') as input_file, open(temp_file, 'w') as output_file:
        for line in input_file:

            if before_line in line:
                modified = True
                line = line.replace(before_line, after_line)

            output_file.write(line)

    shutil.move(temp_file, file_to_change)

    if not modified:
        raise RuntimeError(f"Couldn't modify the file in {file_to_change}")

    print("Successfully replaced invoke by ainvoke in get_next_action")


def replace_invoke_by_ainvoke_in_extract_content() -> None:
    modified = False

    dir_path = get_base_dir()
    temp_file = tempfile.mktemp()
    file_to_change = os.path.join(dir_path, "controller", "service.py")

    before_line = "output = page_extraction_llm.invoke(template.format(goal=goal, page=content))"
    after_line = "output = await page_extraction_llm.ainvoke(template.format(goal=goal, page=content))"

    with open(file_to_change, 'r') as input_file, open(temp_file, 'w') as output_file:
        for line in input_file:

            if before_line in line:
                modified = True
                line = line.replace(before_line, after_line)

            output_file.write(line)

    shutil.move(temp_file, file_to_change)

    if not modified:
        raise RuntimeError(f"Couldn't modify the file in {file_to_change}")

    print("Successfully replaced invoke by ainvoke in extract_content")


if __name__ == "__main__":
    remove_debug_port()
    limit_max_scroll()
    prevent_screenshot_to_modify_dom()
    replace_invoke_by_ainvoke_in_get_next_action()
    replace_invoke_by_ainvoke_in_extract_content()
