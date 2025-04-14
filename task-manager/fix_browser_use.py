import os
import shutil

# Get the path to the browser_use module file
import browser_use
file_path = browser_use.__file__
dir_path = os.path.dirname(file_path)
file_to_change = os.path.join(dir_path, "browser", "chrome.py")

# Create a temporary file path
import tempfile
temp_file = tempfile.mktemp()

# Remove lines containing "--remote-debugging-port"
with open(file_to_change, 'r') as input_file, open(temp_file, 'w') as output_file:
    for line in input_file:
        if "--remote-debugging-port" not in line:
            output_file.write(line)

# Replace the original file with the modified content
shutil.move(temp_file, file_to_change)

print(f"Successfully removed lines containing --remote-debugging-port from {file_to_change}")
