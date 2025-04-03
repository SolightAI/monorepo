/**
 * Validates if a URL is properly formatted with a valid domain
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if the URL is valid, false otherwise
 */
export const isValidUrl = (url) => {
  try {
    const urlObj = new URL(url);
    // Check if the URL has both protocol and hostname
    // Ensure hostname has at least one dot and doesn't end with a dot
    return urlObj.protocol && 
           urlObj.hostname && 
           urlObj.hostname.includes('.') && 
           !urlObj.hostname.endsWith('.') &&
           urlObj.hostname.split('.').every(part => part.length > 0);
  } catch (e) {
    return false;
  }
}; 