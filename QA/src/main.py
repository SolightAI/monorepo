import os
import json
import asyncio

from generate_website_documentation import generate_website_documentation
from generate_section_guide import generate_section_guide
from generate_qa_tests import generate_qa_tests, print_test_plan, verify_test_plan, TestCase, TestPlan, TestCategory
from get_sections_to_test import get_sections_to_test, print_test_sections, TestSection, SectionsToTest
from run_qa_tests import run_qa_tests, test_results_to_markdown
from generate_report import generate_report

example_website_documentation = """# User Guide for CRM Pro Platform

## Table of Contents
1. **Introduction**
2. **Website Overview**
3. **Features**
   - Dashboard
   - Customers
   - Companies
   - Deals
4. **Feature Descriptions and Usage**
   - Dashboard
   - Customers
   - Companies
   - Deals
5. **Dependencies Between Features**
6. **External Links**

---

## 1. Introduction
Welcome to the **CRM Pro Platform** user guide. This document provides a comprehensive overview of the platform, its features, and step-by-step instructions for using each feature. Designed for both beginners and experienced users, this guide ensures you can maximize the potential of CRM Pro.

---

## 2. Website Overview
The **CRM Pro Platform** is a CRM tool designed to showcase autonomous testing capabilities using QA.tech. It provides a centralized interface for managing customers, companies, and deals, making it an ideal solution for businesses looking to streamline their operations.

---

## 3. Features
### Dashboard
- Overview of the platform.
- Displays total customer count and recent customer activity.

### Customers
- Manage customer details.
- Add new customers.

### Companies
- View and manage company information.

### Deals
- Track deals across various stages.

---

## 4. Feature Descriptions and Usage
### Dashboard
**Description:**
The Dashboard provides an overview of the platform, including:
- Total Customers: Displays the total number of customers (e.g., 42).
- Recent Customers: Shows recent customer activity (currently unavailable due to a database connection error).

**How to Use:**
1. Navigate to the Dashboard by clicking the **Dashboard** link in the navigation menu.
2. View the total customer count and recent customer activity.

### Customers
**Description:**
The Customers section allows you to manage customer details, including name, contact information, and address.

**How to Use:**
1. Click the **Customers** link in the navigation menu.
2. View the list of existing customers (e.g., John Doe, Jane Smith).
3. To add a new customer:
   - Click the **Add Customer** button.
   - Fill out the form with the required details (e.g., Name, Email, Phone, etc.).
   - Click **Add Customer** to save or **Close** to exit without saving.

### Companies
**Description:**
The Companies section provides information about various companies, including industry, founding year, and descriptions.

**How to Use:**
1. Click the **Companies** link in the navigation menu.
2. View the list of companies

### Deals
**Description:**
The Deals section categorizes deals into stages, such as NEW, TALKING, MEETING, PROPOSAL, CLOSED - WON, and CLOSED - LOST.

**How to Use:**
1. Click the **Deals** link in the navigation menu.
2. View deals categorized by stage, including details like title, company, and value (e.g., 'Enterprise License' for TechCorp at $50,000).

---

## 5. Dependencies Between Features
- The **Dashboard** provides an overview and links to other sections (Customers, Companies, Deals).
- The **Customers** section is independent but complements the Deals section by providing customer details.
- The **Companies** section is independent but provides context for deals.
- The **Deals** section relies on customer and company data for deal tracking.

---

## 6. External Links
- The platform includes an external link to **QA.tech** for more information about autonomous testing.

**How to Use:**
1. Click the link labeled **https://qa.tech** on the Dashboard.
2. The link opens in a new tab, directing you to the QA.tech website.

---

**Note:** This guide is based on the current state of the CRM Pro platform as of February 17, 2025. Future updates may introduce new features or changes to existing ones.
"""


example_guide = """# User Guide: Adding a New Customer to CRM Pro

## Table of Contents
1. **Introduction**
2. **Prerequisites and Access Levels**
3. **Step-by-Step Procedure**
4. **Input Fields and Descriptions**
5. **Data Validation Rules**
6. **Mandatory vs Optional Fields**
7. **Common Errors and Troubleshooting Tips**
8. **Related Processes and Dependencies**
9. **Best Practices and Notes**
10. **System-Specific Terminology**
11. **Examples for Complex Fields**

---

## 1. Introduction
Adding a new customer to CRM Pro is a straightforward process that allows users to manage customer information effectively. This guide provides a comprehensive step-by-step procedure for adding a new customer, including prerequisites, input field descriptions, and troubleshooting tips.

---

## 2. Prerequisites and Access Levels
- **Access Level**: Users must have access to the Customers section of CRM Pro.
- **Permissions**: Ensure you have the necessary permissions to add or edit customer data.

---

## 3. Step-by-Step Procedure
1. Navigate to the **Customers** section from the Dashboard.
2. Click the **Add Customer** button.
3. Fill out the form with the following details:
   - Name
   - Email
   - Phone
   - Company
   - Company Registration Number
   - VAT Number
   - Address
   - Zip Code
   - City
   - Country
4. Click the **Add Customer** button to save the new customer.

**Note**: Ensure all fields are filled correctly before submission.

---

## 4. Input Fields and Descriptions
- **Name**: Full name of the customer (mandatory).
- **Email**: Customer's email address (mandatory).
- **Phone**: Contact number of the customer.
- **Company**: Name of the company associated with the customer.
- **Company Registration Number**: Official registration number of the company.
- **VAT Number**: Value-added tax identification number.
- **Address**: Street address of the customer.
- **Zip Code**: Postal code of the customer's address.
- **City**: City of the customer's address.
- **Country**: Country of the customer's address.

---

## 5. Data Validation Rules
- **Name**: Must not be empty.
- **Email**: Must be in a valid email format (e.g., user@example.com).
- **Phone**: Should contain only numbers and valid symbols (e.g., +, -).
- **Zip Code**: Must be numeric.

---

## 6. Mandatory vs Optional Fields
- **Mandatory Fields**: Name, Email.
- **Optional Fields**: Phone, Company, Company Registration Number, VAT Number, Address, Zip Code, City, Country.

---

## 7. Common Errors and Troubleshooting Tips
- **Error**: "Invalid email format."
  - **Solution**: Ensure the email is correctly formatted.
- **Error**: "Name is required."
  - **Solution**: Fill in the Name field before submission.

---

## 8. Related Processes and Dependencies
- The **Customers** section contributes to the total customer count displayed on the Dashboard.
- The **Companies** section lists companies but does not directly interact with the Customers section.
- The **Deals** section tracks deals but does not link back to specific customers or companies.

---

## 9. Best Practices and Notes
- Always double-check the data before submission to avoid errors.
- Use consistent formatting for phone numbers and addresses.

---

## 10. System-Specific Terminology
- **CRM Pro**: The platform used for customer relationship management.
- **VAT Number**: A unique identifier for tax purposes.

---

## 11. Examples for Complex Fields
- **Email**: john.doe@example.com
- **Phone**: +1-555-123-4567
- **Address**: 123 Main St, New York, USA

---

This guide ensures a smooth process for adding new customers to CRM Pro while highlighting important considerations and dependencies.
"""

# from logging import getLogger
# getLogger('agent').disabled = True
# getLogger('browser_use.agent.service').disabled = True
# getLogger('browser_use.controller.service').disabled = True
# getLogger('browser_use.browser.context').disabled = True


async def process_section(website_url, website_documentation, section, all_sections, headless=True):

    print(f"# ===== {section.name} ===== #")

    try:
        example_guide = await generate_section_guide(
            website_url=website_url,
            website_documentation=website_documentation,
            section_name=section.name,
            headless=headless,
        )

        os.makedirs(f"output/{section.name}", exist_ok=True)

        if example_guide is None:
            print("⚠️" * 30)
            print(f"⚠️ Skipping {section.name} because it failed to generate a guide")
            print("⚠️" * 30)
            print("")

            with open(f"output/{section.name}/guide.md", "w+") as f:
                f.write("Error generating guide")

            return

        print(example_guide)

        with open(f"output/{section.name}/guide.md", "w+") as f:
            f.write(example_guide)

        test_plan = await generate_qa_tests(
            website_url,
            example_guide,
            section,
            other_sections=[other_section for other_section in all_sections if other_section.name != section.name],
            headless=headless,
        )

        with open(f"output/{section.name}/test_plan.txt", "w+") as f:
            f.write(print_test_plan(test_plan))

        # verification = await verify_test_plan(test_plan, example_guide)
        # print(verification)

        # with open(f"output/{section.name}/verification.txt", "w+") as f:
        #     f.write(verification)

        return {
            "section": section,
            "test_plan": test_plan,
            # "verification": verification,
        }

    except Exception as e:
        print(f"Error processing section {section.name}: {str(e)}")
        raise e


async def generate_and_save_website_documentation(website_url):

    example_website_documentation = await generate_website_documentation(website_url, headless=False)

    with open("output/website_documentation.md", "w+") as f:
        f.write(example_website_documentation)


def get_default_sections():
    return [
        # TestSection(
        #     name="Dashboard",
        #     description="Test the central hub for key metrics, including the total customer count, recent customer activity, and the QA.tech link.",
        # ),
        # TestSection(
        #     name="Customers",
        #     description="Test the management of customer details, including adding new customers and viewing existing ones.",
        # ),
        TestSection(
            name="Companies",
            description="Test the display and management of company information, including industry and founding year.",
        ),
        # TestSection(
        #     name="Deals",
        #     description="Test the categorization and tracking of deals across various stages, including details like title, company, and value.",
        # ),
        # TestSection(
        #     name="UI Component Consistency",
        #     description="Test the visual consistency of UI components across the website.",
        # ),
        # TestSection(
        #     name="Navigation and Menu Structure",
        #     description="Test the functionality of the main navigation menu, ensuring access to all sections and proper navigation flow.",
        # ),
        # TestSection(
        #     name="External Links",
        #     description="Test the external link to QA.tech, ensuring it opens in a new tab and directs to the correct URL.",
        # ),
    ]


async def get_and_save_sections_to_test(website_url, example_website_documentation):

    sections_to_test = await get_sections_to_test(website_url, example_website_documentation, headless=False)

    with open("output/sections.txt", "w+") as f:
        f.write(print_test_sections(sections_to_test))


async def generate_and_save_test_plans(website_url, example_website_documentation, sections_to_test, headless=True):

    test_plans = await asyncio.gather(
        *(process_section(website_url, example_website_documentation, section, sections_to_test, headless=headless)
          for section in sections_to_test)
    )

    with open("output/test_plans.json", "w+") as f:
        json.dump([
            {"section": _test_plan["section"].model_dump(mode='json'),
             "test_plan": _test_plan["test_plan"].model_dump(mode='json')}
            for _test_plan in test_plans
        ], f)

    return test_plans


async def generate_and_save_qa_results(website_url, test_plans, headless=True):
    for _test_plan in test_plans:

        section = TestSection.model_validate(_test_plan["section"])
        test_plan = TestPlan.model_validate(_test_plan["test_plan"])

        print(f"# ===== RUNNING TESTS FOR {section.name} ===== #")

        for (category, test_plan) in test_plan.test_cases.items():

            # FIXME: remove after debugging
            # if category.value != TestCategory.POSITIVE.value:
            #     continue

            results = await run_qa_tests(
                url=website_url,
                qa_tests=test_plan,
                headless=headless,
                gif_output_folder=f"output/{section.name}",
            )

            print(results)
            json.dump([_result.model_dump(mode='json') for _result in results], open(f"output/{section.name}/results_{category}.json", "w+"))


async def main():

    website_url = "https://qacrmdemo.netlify.app"

    # os.makedirs("output", exist_ok=True)
    # await generate_and_save_website_documentation(website_url)

    # sections_to_test = get_default_sections()
    # sections_to_test = await get_and_save_sections_to_test(website_url, example_website_documentation)

    # test_plans = await generate_and_save_test_plans(website_url, example_website_documentation, sections_to_test, headless=True)
    test_plans = json.load(open("output/test_plans.json", "r"))

    await generate_and_save_qa_results(website_url, test_plans, headless=True)

    generate_report("output")


if __name__ == "__main__":
    asyncio.run(main())
