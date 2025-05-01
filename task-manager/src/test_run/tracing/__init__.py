"""
Browser-use Tracing Tools

This package provides tools for tracing and analyzing browser behavior in browser-use
applications, including console logs and uncaught JavaScript exceptions.
"""

from test_run.tracing.js_logger import initialize, JSLogCollector, ConsoleMessage, JSException, collector
from test_run.tracing.history_tracker import extend_agent_history

__all__ = [
    'initialize',
    'extend_agent_history',
    'JSLogCollector',
    'ConsoleMessage',
    'JSException',
    'collector',
]
