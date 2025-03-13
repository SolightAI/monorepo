import React from 'react';
import PropTypes from 'prop-types';
import { MinusIcon, MaximizeIcon, XIcon, DownloadIcon } from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';

/**
 * A configurable dashboard widget component with header controls
 * for minimizing, maximizing, and hiding widgets.
 */
function DashboardWidget({
  id,
  title,
  children,
  className = '',
  allowHide = true,
  allowMinimize = true,
  allowExport = false,
  exportData = null,
  exportFilename = 'dashboard-export',
  colSpan = 'col-span-12 md:col-span-6',
}) {
  const { widgetConfig, toggleWidgetMinimized, toggleWidgetVisibility } = useDashboard();

  // Get widget configuration, default to visible and not minimized if not in config
  const config = widgetConfig[id] || { visible: true, minimized: false };

  // If widget is hidden, don't render anything
  if (!config.visible) {
    return null;
  }

  // Handle export button click
  const handleExport = () => {
    if (!exportData) return;

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `${exportFilename}.json`);
    linkElement.click();
  };

  return (
    <div className={`${colSpan} ${className}`}>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Widget Header */}
        <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b">
          <h3 className="text-lg font-medium text-gray-700">{title}</h3>

          <div className="flex items-center space-x-2">
            {/* Export button */}
            {allowExport && exportData && (
              <button
                onClick={handleExport}
                className="text-gray-500 hover:text-blue-500 focus:outline-none"
                title="Export data"
              >
                <DownloadIcon className="h-4 w-4" />
              </button>
            )}

            {/* Minimize/Maximize button */}
            {allowMinimize && (
              <button
                onClick={() => toggleWidgetMinimized(id)}
                className="text-gray-500 hover:text-blue-500 focus:outline-none"
                title={config.minimized ? 'Maximize' : 'Minimize'}
              >
                {config.minimized ? (
                  <MaximizeIcon className="h-4 w-4" />
                ) : (
                  <MinusIcon className="h-4 w-4" />
                )}
              </button>
            )}

            {/* Hide button */}
            {allowHide && (
              <button
                onClick={() => toggleWidgetVisibility(id)}
                className="text-gray-500 hover:text-red-500 focus:outline-none"
                title="Hide widget"
              >
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Widget Content */}
        {!config.minimized && (
          <div className="p-4">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

DashboardWidget.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
  className: PropTypes.string,
  allowHide: PropTypes.bool,
  allowMinimize: PropTypes.bool,
  allowExport: PropTypes.bool,
  exportData: PropTypes.any,
  exportFilename: PropTypes.string,
  colSpan: PropTypes.string,
};

export default DashboardWidget;
