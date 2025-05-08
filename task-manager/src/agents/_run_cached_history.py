import asyncio

from typing import Callable
from functools import wraps
from logging import getLogger
from fixtures.tools import TOOLS
from pydantic import create_model
from browser_use.agent.views import AgentHistory
from browser_use import Agent, AgentHistoryList, ActionResult
from browser_use.agent.views import AgentStepInfo
from browser_use.agent.views import BrowserStateHistory


logger = getLogger(__name__)


def fill_placeholder(history: list[AgentHistory], placeholder: str, content: str) -> None:

    for step_number, step_history in enumerate(history):

        if not step_history.model_output:
            continue

        # --- replace generation tasks by placeholders in the next_goal string ---
        step_history.model_output.current_state.next_goal = step_history.model_output.current_state.next_goal.replace(placeholder, content)
        # -------------------------------------------------------------------------

        # Iterate through each action taken in this step
        for i, action_result in enumerate(step_history.result):

            if not step_history.model_output.action or i >= len(step_history.model_output.action):
                continue

            action_model = step_history.model_output.action[i]
            action_taken = next((action_name for action_name in action_model.model_fields_set if action_name != 'index'), None)

            if not action_taken:
                continue

            action_params_obj = getattr(action_model, action_taken, None)

            # can happen if the action is just a flag, e.g., { "done": True } where done is not a sub-model
            if not action_params_obj:
                continue

            # --- replace the action parameters with the placeholder ---
            action_parameters = action_params_obj.model_dump(exclude_unset=True)
            for k, v in action_parameters.items():
                # FIXME: this works only for strings, not for other types
                if isinstance(v, str):
                    action_parameters[k] = v.replace(placeholder, content)
            setattr(step_history.model_output.action[i], action_taken, type(action_params_obj)(**action_parameters))
            # ----------------------------------------------------------

            # --- replace generation tasks by placeholders in the extracted content ---
            if action_result.extracted_content:
                action_result.extracted_content = action_result.extracted_content.replace(placeholder, content)
            step_history.result = [action_result]
            # -------------------------------------------------------------------------

            # replace the step history in the history list
            history[step_number] = step_history


def decorator_factory(history: list[AgentHistory], placeholder: str) -> Callable[[Callable], Callable]:

    def decorator(function: Callable) -> Callable:

        @wraps(function)
        def wrapper(*args, **kwargs) -> str:
            result = function(*args, **kwargs)
            fill_placeholder(history, placeholder, result)
            return result

        return wrapper

    return decorator


# NOTE: this directly modifies the history list
def _enable_cached_generation_for_history_rerun(agent: Agent, history: list[AgentHistory]) -> list[AgentHistory]:
    """
    Enable cached generation for history rerun.

    Args:
        agent: The agent to use
        history: The history to use

    Returns:
        The history with cached generation enabled
    """

    # NOTE: this does not work for credit card (as the output is one param but multiple parameters)
    # (it's ok as the function is deterministic and we can re-use the same output)
    # maybe we should have a "is_deterministic" flag in the fixture to know if we should replace the output or the parameters

    PLACEHOLDER_FORMAT = "<|{tool_name}_cached_{index}|>"
    GENERATION_TASKS = {_tool.__name__: _tool for _tool in TOOLS if _tool.__name__.startswith('generate')}

    placeholders: dict[str, dict[str, str | int]] = {}  # {output: {"fn": generation_fn, "id": "0"}}

    for step_number, step_history in enumerate(history):

        if not step_history.model_output:
            continue

        # --- replace generation tasks by placeholders in the next_goal string ---
        for key, value in placeholders.items():
            step_history.model_output.current_state.next_goal = step_history.model_output.current_state.next_goal.replace(key, PLACEHOLDER_FORMAT.format(tool_name=value["fn"], index=value["id"]))
        # -------------------------------------------------------------------------

        # Iterate through each action taken in this step
        for i, action_result in enumerate(step_history.result):

            if not step_history.model_output.action or i >= len(step_history.model_output.action):
                continue

            action_model = step_history.model_output.action[i]
            action_taken = next((action_name for action_name in action_model.model_fields_set if action_name != 'index'), None)  # we always limit to one action per step

            if not action_taken:
                continue

            action_params_obj = getattr(action_model, action_taken, None)

            # can happen if the action is just a flag, e.g., { "done": True } where done is not a sub-model
            if not action_params_obj:
                continue

            # --- replace the action parameters with the placeholder ---
            action_parameters = action_params_obj.model_dump(exclude_unset=True)
            for key, value in placeholders.items():
                for k, v in action_parameters.items():
                    # FIXME: this works only for strings, not for other types
                    if isinstance(v, str):
                        action_parameters[k] = v.replace(key, PLACEHOLDER_FORMAT.format(tool_name=value["fn"], index=value["id"]))
            setattr(step_history.model_output.action[i], action_taken, type(action_params_obj)(**action_parameters))
            # ----------------------------------------------------------

            # --- found a new placeholder to detect ---
            if action_taken in GENERATION_TASKS:
                _new_placeholder: str = action_result.extracted_content  # type: ignore
                placeholders[_new_placeholder] = {
                    "fn": action_taken,
                    "id": len(placeholders),  # some unique id in case a generation task is called multiple times
                }

                # registering new decorated function
                new_action_fn = decorator_factory(history, PLACEHOLDER_FORMAT.format(tool_name=action_taken, index=len(placeholders) - 1))(GENERATION_TASKS[action_taken])
                new_action_fn.__name__ = new_action_fn.__name__ + "_" + str(len(placeholders))
                agent.controller.action(GENERATION_TASKS[action_taken].__doc__)(new_action_fn)  # FIXME: in case rerun history fails, we need to remove the new action to prevent the llm from using the old function

                setattr(step_history.model_output.action[i], action_taken, None)  # deactivate the original function call
                new_action_to_call = {new_action_fn.__name__: type(action_params_obj)(**action_parameters)}   # create the new function call
                actions_to_execute = step_history.model_output.action[i].model_dump(exclude_unset=True) | new_action_to_call

                NewActionModel = create_model(
                    'DynamicActionModel',
                    **{new_action_fn.__name__: (type(action_params_obj), None)},  # type: ignore
                    __base__=type(step_history.model_output.action[i]),
                )  # type: ignore

                # Create the new instance with all previous + new fields
                step_history.model_output.action[i] = NewActionModel(**actions_to_execute)
            # -------------------------------------------------------------------------

            # --- replace action output with placeholders ---
            if action_result.extracted_content:
                for key, value in placeholders.items():
                    action_result.extracted_content = action_result.extracted_content.replace(key, PLACEHOLDER_FORMAT.format(tool_name=value["fn"], index=value["id"]))
            step_history.result = [action_result]
            # -------------------------------------------------------------------------

            # replace the step history in the history list
            history[step_number] = step_history

    return history


async def rerun_history(
    agent: Agent,
    history: AgentHistoryList,
    max_retries: int = 3,
    skip_failures: bool = True,
    delay_between_actions: float = 2.0,
) -> AgentHistoryList:
    """
    Rerun a saved history of actions with error handling and retry logic.

    Args:
            history: The history to replay
            max_retries: Maximum number of retries per action
            skip_failures: Whether to skip failed actions or stop execution
            delay_between_actions: Delay between actions in seconds

    Returns:
            List of action results
    """

    history.history = _enable_cached_generation_for_history_rerun(agent, history.history)
    agent.state.history.history.clear()  # Clear agent's internal history

    # Execute initial actions if provided
    if agent.initial_actions:
        result = await agent.multi_act(agent.initial_actions)
        agent.state.last_result = result

    results: list[ActionResult] = []

    for i, history_item in enumerate(history.history):
        goal = history_item.model_output.current_state.next_goal if history_item.model_output else ''
        logger.info(f'Replaying step {i + 1}/{len(history.history)}: goal: {goal}')

        if (
            not history_item.model_output
            or not history_item.model_output.action
            or history_item.model_output.action == [None]
        ):
            logger.warning(f'Step {i + 1}: No action to replay, skipping')
            results.append(ActionResult(error='No action to replay'))
            continue

        retry_count = 0
        while retry_count < max_retries:
            try:
                # Capture browser state before executing the actions for this history_item
                browser_state_before_action = await agent.browser_context.get_state(cache_clickable_elements_hashes=True)

                step_action_results = await agent._execute_history_step(history_item, delay_between_actions)
                results.extend(step_action_results)  # Accumulate overall results for the function's return value

                # Construct and append AgentHistory item to agent's internal history
                if history_item.model_output and browser_state_before_action:
                    replayed_browser_state_history = BrowserStateHistory(
                        url=browser_state_before_action.url,
                        title=browser_state_before_action.title,
                        tabs=browser_state_before_action.tabs,
                        interacted_element=AgentHistory.get_interacted_element(history_item.model_output, browser_state_before_action.selector_map),
                        screenshot=browser_state_before_action.screenshot
                    )

                    new_replayed_history_item = AgentHistory(
                        model_output=history_item.model_output,  # From original history
                        result=step_action_results,              # From replay
                        state=replayed_browser_state_history,    # From replay (state *before* action)
                        metadata=history_item.metadata           # From original history (or create new)
                    )
                    agent.state.history.history.append(new_replayed_history_item)

                break

            except Exception as e:
                retry_count += 1
                if retry_count == max_retries:
                    error_msg = f'Step {i + 1} failed after {max_retries} attempts: {str(e)}'
                    logger.error(error_msg)
                    if not skip_failures:
                        results.append(ActionResult(error=error_msg))
                        raise RuntimeError(error_msg)
                else:
                    logger.warning(f'Step {i + 1} failed (attempt {retry_count}/{max_retries}), retrying...')
                    await asyncio.sleep(delay_between_actions)

    agent.state.history.history.pop()  # Remove the cached "done" action
    await agent.step(AgentStepInfo(step_number=len(history.history), max_steps=len(history.history)))

    return agent.state.history
