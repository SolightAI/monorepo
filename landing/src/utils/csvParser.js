import axios from 'axios';
import { parse } from 'papaparse';

/**
 * Parses the CSV file and returns the data with processed types
 * @returns {Promise<Array>} Array of parsed CSV rows
 */
export const parseCSV = async () => {
  try {
    const response = await axios.get('/data.csv', {
      // Set responseType to avoid text encoding issues with binary CSV
      responseType: 'blob'
    });

    // Use FileReader to read the blob
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const { data } = parse(event.target.result, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
          });

          // Process the data to handle types, especially converting Screenshot to array
          const processed = data.map(row => ({
            ...row,
            // Convert the Screenshot field from comma-separated string to array if it's not already an array
            Screenshot: Array.isArray(row.Screenshot)
              ? row.Screenshot
              : (row.Screenshot ? row.Screenshot.split(',').map(url => url.trim()) : [])
          }));

          resolve(processed);
        } catch (error) {
          console.error("Error parsing CSV content:", error);
          reject(error);
        }
      };

      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        reject(error);
      };

      reader.readAsText(response.data);
    });
  } catch (error) {
    console.error('Error fetching CSV:', error);
    throw error;
  }
};

/**
 * Extracts domain name from URL to create a route
 * @param {string} url - URL to extract domain from
 * @returns {string} Domain name for routing
 */
export const extractRouteFromUrl = (url) => {
  try {
    if (!url) return 'unknown';

    // Remove protocol and www.
    const domain = url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '');
    // Extract domain name before first slash or dot
    const routeName = domain.split('/')[0].split('.')[0];
    return routeName || 'unknown';
  } catch (error) {
    console.error('Error extracting route from URL:', error);
    return 'unknown';
  }
};
