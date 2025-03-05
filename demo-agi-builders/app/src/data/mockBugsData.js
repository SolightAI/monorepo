export const aiDetectedBugs = [
    {
      id: 1,
      title: "Price filter slider not updating product list",
      page: "Products",
      category: "Filtering",
      severity: "Medium",
      description:
        "When adjusting the price range filter on the products page, the product list does not update to reflect the new price range.",
      detectedAt: "3/4/2025, 3:59:03 PM",
    },
    {
      id: 2,
      title: "Remove from wishlist button not working",
      page: "Wishlist",
      category: "E-commerce",
      severity: "Medium",
      description:
        "The button to remove items from the wishlist does not function. Clicking it has no effect and the item remains in the wishlist.",
      detectedAt: "3/4/2025, 2:59:09 PM",
    },
    {
      id: 3,
      title: "Product images not loading in Safari browser",
      page: "Product Details",
      category: "UI/UX",
      severity: "Medium",
      description: "Product images fail to load when viewing the site in Safari browser on both macOS and iOS devices.",
      detectedAt: "3/4/2025, 10:59:03 AM",
    },
    {
      id: 4,
      title: "Search results not displaying for certain keywords",
      page: "Products",
      category: "Search",
      severity: "High",
      description:
        "When searching for products with keywords containing special characters, no results are displayed even when matching products exist in the database.",
      detectedAt: "3/4/2025, 4:59:03 PM",
    },
    {
      id: 5,
      title: "Mobile menu disappears when scrolling",
      page: "Global",
      category: "UI/UX",
      severity: "High",
      description:
        "On mobile devices, the navigation menu disappears when the user scrolls down the page, making it impossible to navigate the site.",
      detectedAt: "3/4/2025, 12:59:03 PM",
    },
    {
      id: 6,
      title: "Login persists after clicking logout",
      page: "Global",
      category: "Authentication",
      severity: "High",
      description:
        "When users click the logout button, they appear to be logged out but upon refreshing the page, they are still logged in.",
      detectedAt: "3/4/2025, 9:59:03 AM",
    },
    {
      id: 7,
      title: "Contact form submission fails with server error",
      page: "Contact",
      category: "Communication",
      severity: "Critical",
      description:
        "When submitting the contact form, users receive a 500 server error and the form data is not processed.",
      detectedAt: "3/4/2025, 1:59:03 PM",
    },
    {
      id: 8,
      title: "Checkout process fails for international addresses",
      page: "Checkout",
      category: "E-commerce",
      severity: "Critical",
      description:
        "Users with shipping addresses outside the US cannot complete the checkout process. The form validation fails even with valid international address formats.",
      detectedAt: "3/4/2025, 11:59:03 AM",
    },
  ]
  
  