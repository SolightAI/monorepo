"""
JavaScript Log Extensions for AgentHistoryList

Extends browser-use's AgentHistoryList with JavaScript log and exception tracking capabilities,
allowing easier access to browser diagnostics after agent runs.
"""

import functools
import inspect
from typing import Dict, Any, List, Optional

from run_tests.tracing.js_logger import collector, get_collector


def extend_agent_history(agent_history_class=None):
    """
    Extend the AgentHistoryList class with JS logs and exceptions tracking.
    
    Args:
        agent_history_class: Optional class to extend. If None, will try to import
                            AgentHistoryList from browser_use.agent.views
    
    Returns:
        bool: True if extension was successful, False otherwise
    """
    try:
        # Get the class to extend
        if agent_history_class is None:
            from browser_use.agent.views import AgentHistoryList
            agent_history_class = AgentHistoryList
        
        # Add logs property to AgentHistoryList - this is the single source of truth
        def get_logs(self) -> Dict[str, List[Dict[str, Any]]]:
            """Get all JavaScript console logs and uncaught exceptions"""
            # Check if we have logs stored as an attribute first
            if hasattr(self, '_js_logs'):
                return self._js_logs
            return get_collector().get_all_as_dict()
        
        agent_history_class.get_logs = get_logs
        
        # Add a method to store logs explicitly
        def add_logs(self, logs_data: Dict[str, List[Dict[str, Any]]]) -> None:
            """Store JavaScript logs in the history object"""
            self._js_logs = logs_data
        
        agent_history_class.add_logs = add_logs
        
        # Add convenience methods that use get_logs() internally
        def get_console_logs(self, type_filter: Optional[str] = None) -> List[Dict[str, Any]]:
            """Get JavaScript console logs, optionally filtered by type"""
            logs_dict = self.get_logs()
            logs = [log for log in logs_dict.get('console_logs', [])]
            
            if type_filter:
                logs = [log for log in logs if log.get('type') == type_filter]
                
            return logs
        
        agent_history_class.get_console_logs = get_console_logs
        
        def get_js_exceptions(self) -> List[Dict[str, Any]]:
            """Get uncaught JavaScript exceptions"""
            return self.get_logs().get('js_exceptions', [])
        
        agent_history_class.get_js_exceptions = get_js_exceptions
        
        # Add property to access logs directly through get_logs()
        agent_history_class.logs = property(lambda self: self.get_logs())
        agent_history_class.console_logs = property(lambda self: self.get_console_logs())
        agent_history_class.js_exceptions = property(lambda self: self.get_js_exceptions())
        
        print("Successfully extended AgentHistoryList class with logging capabilities")
        return True
    except Exception as e:
        print(f"Failed to extend AgentHistoryList class: {e}")
        return False 