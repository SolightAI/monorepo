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


def wait_for_page_to_load_on_page_change() -> None:

	dir_path = get_base_dir()
	temp_file = tempfile.mktemp()
	file_to_change = os.path.join(dir_path, "controller", "service.py")

	to_replace = '''@time_execution_sync('--act')
	async def act(
		self,
		action: ActionModel,
		browser_context: BrowserContext,
		#
		page_extraction_llm: Optional[BaseChatModel] = None,
		sensitive_data: Optional[Dict[str, str]] = None,
		available_file_paths: Optional[list[str]] = None,
		#
		context: Context | None = None,
	) -> ActionResult:
		"""Execute an action"""

		try:
			for action_name, params in action.model_dump(exclude_unset=True).items():
				if params is not None:
					# with Laminar.start_as_current_span(
					# 	name=action_name,
					# 	input={
					# 		'action': action_name,
					# 		'params': params,
					# 	},
					# 	span_type='TOOL',
					# ):
					result = await self.registry.execute_action(
						action_name,
						params,
						browser=browser_context,
						page_extraction_llm=page_extraction_llm,
						sensitive_data=sensitive_data,
						available_file_paths=available_file_paths,
						context=context,
					)

					# Laminar.set_span_output(result)

					if isinstance(result, str):
						return ActionResult(extracted_content=result)
					elif isinstance(result, ActionResult):
						return result
					elif result is None:
						return ActionResult()
					else:
						raise ValueError(f'Invalid action result type: {type(result)} of {result}')
			return ActionResult()
		except Exception as e:
			raise e'''

	new_content = '''@time_execution_sync('--act')
	async def act(
		self,
		action: ActionModel,
		browser_context: BrowserContext,
		#
		page_extraction_llm: Optional[BaseChatModel] = None,
		sensitive_data: Optional[Dict[str, str]] = None,
		available_file_paths: Optional[list[str]] = None,
		#
		context: Context | None = None,
	) -> ActionResult:
		"""Execute an action"""

		try:
			page = await browser_context.get_current_page()
			initial_url = page.url
			for action_name, params in action.model_dump(exclude_unset=True).items():
				if params is not None:
					# with Laminar.start_as_current_span(
					# 	name=action_name,
					# 	input={
					# 		'action': action_name,
					# 		'params': params,
					# 	},
					# 	span_type='TOOL',
					# ):
					result = await self.registry.execute_action(
						action_name,
						params,
						browser=browser_context,
						page_extraction_llm=page_extraction_llm,
						sensitive_data=sensitive_data,
						available_file_paths=available_file_paths,
						context=context,
					)

					# Laminar.set_span_output(result)
					new_page = await browser_context.get_current_page()
					new_url = new_page.url
					if initial_url != new_url:
						await new_page.wait_for_load_state()
						logger.info(f'URL changed from {initial_url} to {new_url}, waited for page load state.')

					if isinstance(result, str):
						return ActionResult(extracted_content=result)
					elif isinstance(result, ActionResult):
						return result
					elif result is None:
						return ActionResult()
					else:
						raise ValueError(f'Invalid action result type: {type(result)} of {result}')
			return ActionResult()
		except Exception as e:
			raise e
	'''

	with open(file_to_change, 'r') as input_file, open(temp_file, 'w') as output_file:
		content = input_file.read()

		if to_replace not in content:
			raise RuntimeError(f"Couldn't find target to replace in {file_to_change}")

		content = content.replace(to_replace, new_content)

		output_file.write(content)

	shutil.move(temp_file, file_to_change)

	print("Successfully forced waiting for page to load on page change")


def replace_click_element_by_click_element_by_index() -> None:

    modified = False

    dir_path = get_base_dir()
    temp_file = tempfile.mktemp()
    file_to_change = os.path.join(dir_path, "agent", "message_manager", "service.py")

    element_to_find = "'click_element'"
    element_to_replace_with = "'click_element_by_index'"

    with open(file_to_change, 'r') as input_file, open(temp_file, 'w') as output_file:
        for line in input_file:

            if element_to_find in line:
                modified = True
                line = line.replace(element_to_find, element_to_replace_with)

            output_file.write(line)

    if not modified:
        raise RuntimeError(f"Couldn't modify the file in {file_to_change}")

    shutil.move(temp_file, file_to_change)

    print(f"Successfully replaced click_element by click_element_by_index in {file_to_change}")

    modified = False

    dir_path = get_base_dir()
    temp_file = tempfile.mktemp()
    file_to_change = os.path.join(dir_path, "agent", "system_prompt.md")

    element_to_find = '"click_element"'
    element_to_replace_with = '"click_element_by_index"'

    with open(file_to_change, 'r') as input_file, open(temp_file, 'w') as output_file:
        for line in input_file:

            if element_to_find in line:
                modified = True
                line = line.replace(element_to_find, element_to_replace_with)

            output_file.write(line)

    shutil.move(temp_file, file_to_change)

    if not modified:
        raise RuntimeError(f"Couldn't modify the file in {file_to_change}")

    print(f"Successfully replaced click_element by click_element_by_index in {file_to_change}")


def prevent_agent_to_use_content_from_extract_page_to_click_element() -> None:

    modified_first_element = False
    modified_second_element = False

    dir_path = get_base_dir()
    temp_file = tempfile.mktemp()
    file_to_change = os.path.join(dir_path, "controller", "service.py")

    warning_message = "'Elements listed above cannot be used for the \"click_element_by_index\" action and are only informatives about what you can find on the page.'"

    to_find_first_element = "msg = f'📄  Extracted from page\\n: {output.content}\\n'"
    to_replace_first_element = f"msg = f'📄  Extracted from the whole page (not only viewport)\\n: {{output.content}}\\n' + {warning_message}"

    to_find_second_element = "msg = f'📄  Extracted from page\\n: {content}\\n'"
    to_replace_second_element = f"msg = f'📄  Extracted from page\\n: {{content}}\\n' + {warning_message}"

    with open(file_to_change, 'r') as input_file, open(temp_file, 'w') as output_file:
        for line in input_file:

            if to_find_first_element in line:
                modified_first_element = True
                line = line.replace(to_find_first_element, to_replace_first_element)

            if to_find_second_element in line:
                modified_second_element = True
                line = line.replace(to_find_second_element, to_replace_second_element)

            output_file.write(line)

    if not modified_first_element:
        raise RuntimeError(f"Couldn't modify first element of the file in {file_to_change}")

    if not modified_second_element:
        raise RuntimeError(f"Couldn't modify second element of the file in {file_to_change}")

    shutil.move(temp_file, file_to_change)

    print(f"Successfully prevented agent to use content from extract_page to click_element in {file_to_change}")


if __name__ == "__main__":
    remove_debug_port()
    limit_max_scroll()
    prevent_screenshot_to_modify_dom()
    replace_invoke_by_ainvoke_in_get_next_action()
    replace_invoke_by_ainvoke_in_extract_content()
    wait_for_page_to_load_on_page_change()
    replace_click_element_by_click_element_by_index()
    prevent_agent_to_use_content_from_extract_page_to_click_element()
