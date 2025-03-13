import React from 'react';
import PropTypes from 'prop-types';

/**
 * A responsive grid layout for dashboard components.
 *
 * Uses CSS Grid with a 12-column layout that adapts to different screen sizes.
 * All children of this component should have a col-span-* class to define their width.
 */
function DashboardLayout({ children }) {
  return (
    <div className="grid grid-cols-12 gap-4">
      {children}
    </div>
  );
}

DashboardLayout.propTypes = {
  children: PropTypes.node
};

export default DashboardLayout;
