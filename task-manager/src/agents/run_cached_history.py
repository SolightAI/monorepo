import asyncio

from functools import wraps
from logging import getLogger
from typing import Any, Callable
from fixtures.tools import TOOLS
from pydantic import create_model
from lmnr import observe
from browser_use.agent.views import AgentHistory
from browser_use import Agent, AgentHistoryList, ActionResult
from browser_use.agent.views import AgentStepInfo
from browser_use.agent.views import BrowserStateHistory
from langchain_core.messages import HumanMessage
from browser_use.agent.prompts import AgentMessagePrompt


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
        def wrapper(*args: Any, **kwargs: Any) -> str:
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
                agent.controller.action(GENERATION_TASKS[action_taken].__doc__)(new_action_fn)

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


@observe()
async def rerun_history(
    agent: Agent,
    history: AgentHistoryList,
    max_retries: int = 3,
    skip_failures: bool = False,
    fallback_to_llm: bool = True,
    max_failures: int = 5,
    delay_between_actions: float = 2.0,
) -> AgentHistoryList:
    """
    Rerun a saved history of actions with error handling and retry logic.

    Args:
            history: The history to replay
            max_retries: Maximum number of retries per action
            skip_failures: Whether to skip failed actions or stop execution
            fallback_to_llm: Whether to fallback to LLM if the action fails
            max_failures: Maximum number of actions allowed to fallback to llm before stopping execution
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

    number_of_failures = 0
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
        skip_action = False
        while skip_action is False and retry_count < max_retries and number_of_failures < max_failures:
            try:
                # Capture browser state before executing the actions for this history_item
                browser_state_before_action = await agent.browser_context.get_state(cache_clickable_elements_hashes=True)

                # check if next actions evaluated current action as failed. If so, skip current action
                if i < len(history.history) - 1:
                    model_output = history.history[i + 1].model_output
                    if model_output is not None and model_output.current_state.evaluation_previous_goal.startswith("Failed - "):
                        logger.info("Next action evaluated current action as failed, skipping current action")
                        skip_action = True
                        continue

                step_action_results = await agent._execute_history_step(history_item, delay_between_actions)

                if any([_action.error for _action in step_action_results]):  # if any action failed, raise an error (triggering the retry on agent logic)
                    raise RuntimeError(f"Step {i + 1} failed: {step_action_results}")

                results.extend(step_action_results)  # Accumulate overall results for the function's return value

                if history_item.model_output:
                    # Add the LLM's thought/action from the original run
                    agent.message_manager.add_model_output(history_item.model_output)

                    # Add the outcome of replaying those actions as HumanMessages
                    # This helps build the narrative for the LLM.
                    # Filter out results from 'done' actions, as a new 'done' will be generated.
                    action_models_for_this_step = history_item.model_output.action
                    if step_action_results:
                        for r_idx, r_item in enumerate(step_action_results):
                            is_done_action_result = False
                            if action_models_for_this_step and r_idx < len(action_models_for_this_step):
                                action_model = action_models_for_this_step[r_idx]
                                # Get the action name (e.g., 'click_element', 'done')
                                action_name = next((name for name in action_model.model_fields_set if name != 'index'), None)
                                if action_name == 'done':
                                    is_done_action_result = True

                            if not is_done_action_result and r_item.include_in_memory:
                                if r_item.extracted_content:
                                    msg_content = 'Action result: ' + str(r_item.extracted_content)
                                    agent.message_manager._add_message_with_tokens(HumanMessage(content=msg_content))
                                if r_item.error:
                                    last_line = r_item.error.split('\n')[-1]
                                    msg_content = 'Action error: ' + last_line
                                    agent.message_manager._add_message_with_tokens(HumanMessage(content=msg_content))

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
                    agent.state.last_result = step_action_results  # NEW

                break

            except Exception as e:
                retry_count += 1

                if retry_count < max_retries:
                    logger.warning(f'Step {i + 1} failed (attempt {retry_count}/{max_retries}), retrying...')
                    await asyncio.sleep(delay_between_actions)
                    continue

                number_of_failures += 1

                if max_failures > 0 and number_of_failures >= max_failures:
                    raise RuntimeError(f"Reached the maximum number of failures: ({number_of_failures}/{max_failures})")

                error_msg = f'Step {i + 1} failed after {max_retries} attempts: {str(e)}'
                logger.error(error_msg)

                if fallback_to_llm:
                    logger.info("Falling back to LLM.")
                    await agent.step(AgentStepInfo(step_number=len(history.history), max_steps=len(history.history) + 10))  # '+10' to prevent llm from using the 'done' action

                    if agent.state.last_result and agent.state.last_result[0].error:
                        raise RuntimeError(f"Step {i + 1} failed after {max_retries} attempts and falling back on LLM: {str(e)}")

                    if agent.state.last_result and agent.state.last_result[0].success is False:
                        raise RuntimeError(f"Step {i + 1} failed after {max_retries} attempts and falling back on LLM: {str(e)=} {agent.state.last_result=}")

                    state = await agent.browser_context.get_state(cache_clickable_elements_hashes=True)
                    state_message = AgentMessagePrompt(
                        state,
                        result,
                        include_attributes=agent.settings.include_attributes,
                        step_info=AgentStepInfo(step_number=len(history.history), max_steps=len(history.history) + 10),
                    ).get_user_message(False)

                    input_messages = agent._message_manager.get_messages()
                    model_output = await agent.get_next_action(input_messages + [state_message])

                    # doing another step just to get the evaluation_previous_goal (we don't use agent.step to not mess the history)
                    if model_output and model_output.current_state.evaluation_previous_goal.startswith("Failed - "):
                        raise RuntimeError(f"Step {i + 1} failed after {max_retries} attempts and falling back on LLM: {str(e)=}")
                    continue

                if not skip_failures:
                    results.append(ActionResult(error=error_msg))
                    raise RuntimeError(error_msg)

    # set last_result before final agent.step
    if agent.state.history.history:  # Check if there's anything to pop
        # Assuming the last item corresponds to the original "done" action's replay
        agent.state.history.history.pop()
        if agent.state.history.history:  # If there are still items left
            agent.state.last_result = agent.state.history.history[-1].result
        else:
            # History became empty after pop; original history might have been just one "done" step.
            # An empty list for last_result is safer to not mislead the final agent.step().
            agent.state.last_result = []
    else:
        # Agent's history was already empty (e.g., all steps failed/skipped).
        agent.state.last_result = []

    await agent.step(AgentStepInfo(step_number=len(history.history), max_steps=len(history.history)))

    return agent.state.history
