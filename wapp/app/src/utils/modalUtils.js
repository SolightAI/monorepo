/**
 * Modal utility functions for consistent modal behavior
 */

/**
 * Creates the outer container props for modals
 * @param {Function} onClose - Function to close the modal
 * @returns {Object} Props to apply to the outer container
 */
export const getModalContainerProps = (onClose) => ({
  className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4",
  onClick: onClose,
});

/**
 * Creates the inner container props for modals
 * @param {string} additionalClasses - Additional classes to apply to the inner container
 * @returns {Object} Props to apply to the inner container
 */
export const getModalContentProps = (additionalClasses = "") => ({
  className: `bg-white rounded-lg shadow-lg max-h-[90vh] overflow-y-auto ${additionalClasses}`,
  onClick: (e) => e.stopPropagation(),
});

/**
 * Hook to disable body scrolling when modal is open
 * Add this to useEffect in components that manage modal state
 * @param {boolean} isOpen - Whether the modal is open
 * @returns {Function} Cleanup function
 */
export const disableBodyScroll = (isOpen) => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  return () => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  };
};
