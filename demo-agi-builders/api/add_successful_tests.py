import os
import re
from datetime import datetime, timedelta
import random
from typing import Dict, List, Tuple
import uuid
import requests

# Import functions from client.py
from client import (
    create_product,
    create_epic,
    create_feature,
    create_user_story,
    create_test,
    create_bug
)

# Base URL for API calls
BASE_URL = "http://localhost:8000"

def update_test_status(test_id: str, status: str, started_at: str = None, ended_at: str = None) -> Dict:
    """Update the status of a test using the PUT /{test_id}/status endpoint"""
    data = {
        "status": status
    }
    
    # Add timestamps if provided
    if started_at:
        data["started_at"] = started_at
    if ended_at:
        data["ended_at"] = ended_at
        
    response = requests.put(f"{BASE_URL}/tests/{test_id}/status", json=data)
    
    if response.status_code != 200:
        raise RuntimeError(f"Failed to update test status: {response.status_code} - {response.text}")
    
    print(f"Updated test status to {status}")
    return response.json()

def get_existing_product():
    """Get the existing PI Mobile Interface product or create it if it doesn't exist"""
    # For demo purposes, we'll just create a new product
    product = create_product(
        name="PI Mobile Interface",
        description="Mobile interface for the PI application",
        url="https://www.predictiveindex.com/",
        documentation="Mobile usability and design issues across multiple pages"
    )
    return product

def create_successful_tests(product_id: str):
    """Create successful tests that relate to the bugs in the report"""
    # Pages that were tested
    pages = [
        "Talent Strategy",
        "Talent Optimization Certification",
        "Education",
        "Plans",
        "HR Leaders",
        "Science Page",
        "Software Page",
        "Consultants Page",
        "PI for Managers Page",
        "Software Managing Page"
    ]
    
    # Successful test scenarios for each page
    successful_tests = {
        "Talent Strategy": [
            {
                "name": "Mobile Link Visibility Test",
                "description": "Verified that all links on the page are visible and clickable on mobile devices",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Content Rendering Test",
                "description": "Confirmed that all text content is readable and properly formatted on mobile screens",
                "category": "COMPATIBILITY"
            },
            {
                "name": "Mobile Layout Adaptation Test",
                "description": "Verified that page layout adapts properly to different mobile screen sizes",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Button Size Test",
                "description": "Confirmed that all buttons are appropriately sized for touch interactions on mobile",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Image Loading Test",
                "description": "Verified that images load correctly and are appropriately sized for mobile devices",
                "category": "PERFORMANCE"
            },
            {
                "name": "Mobile Navigation Menu Test",
                "description": "Confirmed that the navigation menu opens and closes smoothly on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Menu Item Click Test",
                "description": "Verified that all menu items are clickable and navigate to correct pages on mobile",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Portrait Orientation Test",
                "description": "Confirmed that page renders correctly in portrait orientation on mobile devices",
                "category": "COMPATIBILITY"
            },
            {
                "name": "Mobile Landscape Orientation Test",
                "description": "Verified that page renders correctly in landscape orientation on mobile devices",
                "category": "COMPATIBILITY"
            },
            {
                "name": "Mobile Page Load Speed Test",
                "description": "Confirmed that the page loads within acceptable time limits on mobile connections",
                "category": "PERFORMANCE"
            }
        ],
        "Talent Optimization Certification": [
            {
                "name": "Mobile Video Controls Test",
                "description": "Verified that video controls work properly on mobile when tapped once",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Form Submission Test",
                "description": "Successfully completed and submitted certification forms on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Video Playback Quality Test",
                "description": "Confirmed that video playback quality automatically adjusts based on mobile connection",
                "category": "PERFORMANCE"
            },
            {
                "name": "Mobile Video Fullscreen Mode Test",
                "description": "Verified that videos properly enter and exit fullscreen mode on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Certificate Download Test",
                "description": "Confirmed that certification documents can be downloaded on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Form Field Validation Test",
                "description": "Verified that form field validation works correctly on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Progress Tracking Test",
                "description": "Confirmed that certification progress is tracked correctly across mobile sessions",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Quiz Functionality Test",
                "description": "Verified that certification quizzes function correctly on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Timeout Recovery Test",
                "description": "Confirmed that certification progress is saved if mobile session times out",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Certificate Sharing Test",
                "description": "Verified that earned certificates can be shared via mobile platforms",
                "category": "FUNCTIONAL"
            }
        ],
        "Education": [
            {
                "name": "Mobile Search Functionality Test",
                "description": "Confirmed that search results display correctly for most common search terms",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Article Rendering Test",
                "description": "Verified that education articles render properly on mobile screens with correct formatting",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Search Filter Test",
                "description": "Confirmed that search filters work correctly on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Article Pagination Test",
                "description": "Verified that pagination controls in article listings work correctly on mobile",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile PDF Viewing Test",
                "description": "Confirmed that educational PDFs can be viewed directly on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Content Categorization Test",
                "description": "Verified that education content categories are accessible on mobile devices",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Related Articles Test",
                "description": "Confirmed that related articles section works correctly on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Content Sharing Test",
                "description": "Verified that educational content can be shared via mobile platforms",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Bookmark Functionality Test",
                "description": "Confirmed that article bookmarking works correctly on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Image Zoom Test",
                "description": "Verified that educational images can be zoomed and viewed in detail on mobile",
                "category": "USABILITY"
            }
        ],
        "Plans": [
            {
                "name": "Mobile Pricing Table Test",
                "description": "Confirmed that pricing tables are readable and correctly formatted on mobile devices",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Plan Comparison Test",
                "description": "Verified that plan comparison features work correctly on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Plan Selection Test",
                "description": "Confirmed that users can select plans and proceed to checkout on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Price Calculator Test",
                "description": "Verified that the price calculator works correctly on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Feature List Display Test",
                "description": "Confirmed that plan feature lists display correctly on mobile screens",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Plan Filter Test",
                "description": "Verified that plan filtering options work correctly on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Discount Application Test",
                "description": "Confirmed that discount codes can be applied to plans on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Plan FAQ Accordion Test",
                "description": "Verified that plan FAQ accordions expand and collapse correctly on mobile",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Payment Processing Test",
                "description": "Confirmed that payment processing works correctly for plan purchases on mobile",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Receipt Display Test",
                "description": "Verified that purchase receipts display correctly on mobile devices",
                "category": "USABILITY"
            }
        ],
        "HR Leaders": [
            {
                "name": "Mobile Content Spacing Test",
                "description": "Verified that content spacing is appropriate for most sections on mobile devices",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Navigation Menu Test",
                "description": "Confirmed that navigation menu opens and closes correctly on mobile",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Leadership Chart Display Test",
                "description": "Verified that leadership structure charts display correctly on mobile devices",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Resource Download Test",
                "description": "Confirmed that HR resources can be downloaded on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Case Study Display Test",
                "description": "Verified that HR case studies display correctly on mobile screens",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Tool Selection Test",
                "description": "Confirmed that HR tool selection menus work correctly on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Image Carousel Test",
                "description": "Verified that image carousels on HR pages function correctly on mobile",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Template Download Test",
                "description": "Confirmed that HR templates can be previewed and downloaded on mobile",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Video Testimonial Test",
                "description": "Verified that HR leader testimonial videos play correctly on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Contact Form Test",
                "description": "Confirmed that HR leader contact forms can be submitted on mobile devices",
                "category": "FUNCTIONAL"
            }
        ],
        "Science Page": [
            {
                "name": "Mobile Image Rendering Test",
                "description": "Verified that scientific diagrams and images render correctly on mobile screens",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Text Readability Test",
                "description": "Confirmed that scientific explanations and text are readable on mobile devices",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Interactive Element Test",
                "description": "Verified that interactive scientific elements work correctly on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Chart Rendering Test",
                "description": "Confirmed that scientific charts and graphs display correctly on mobile screens",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Scientific Video Test",
                "description": "Verified that scientific explanation videos play correctly on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Research Citation Test",
                "description": "Confirmed that research citations display correctly on mobile screens",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Timeline Display Test",
                "description": "Verified that scientific timelines display correctly on mobile devices",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Scientific PDF Download Test",
                "description": "Confirmed that scientific papers can be downloaded on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Formula Display Test",
                "description": "Verified that scientific formulas display correctly on mobile screens",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Reference Link Test",
                "description": "Confirmed that scientific reference links work correctly on mobile devices",
                "category": "FUNCTIONAL"
            }
        ],
        "Software Page": [
            {
                "name": "Mobile Feature Highlights Test",
                "description": "Verified that software feature highlights are properly displayed on mobile",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Screenshot Gallery Test",
                "description": "Confirmed that software screenshots gallery works properly on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Feature Description Test",
                "description": "Verified that software feature descriptions display correctly on mobile screens",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Interface Preview Test",
                "description": "Confirmed that software interface previews work correctly on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Demo Request Form Test",
                "description": "Verified that software demo request forms can be submitted on mobile",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Feature Comparison Test",
                "description": "Confirmed that software feature comparison tables display correctly on mobile",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Testimonial Display Test",
                "description": "Verified that software testimonials display correctly on mobile screens",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Integration List Test",
                "description": "Confirmed that software integration lists display correctly on mobile",
                "category": "USABILITY"
            },
            {
                "name": "Mobile System Requirements Test",
                "description": "Verified that system requirements information displays correctly on mobile",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Feature Video Test",
                "description": "Confirmed that software feature videos play correctly on mobile devices",
                "category": "FUNCTIONAL"
            }
        ],
        "Consultants Page": [
            {
                "name": "Mobile Contact Form Test",
                "description": "Verified that consultant contact forms can be completed and submitted on mobile",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Consultant Directory Test",
                "description": "Confirmed that consultant directory listings display correctly on mobile devices",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Consultant Filter Test",
                "description": "Verified that consultant filtering options work correctly on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Consultant Profile Test",
                "description": "Confirmed that consultant profiles display correctly on mobile screens",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Map Integration Test",
                "description": "Verified that consultant location maps display correctly on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Certification Badge Display Test",
                "description": "Confirmed that consultant certification badges display correctly on mobile",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Appointment Booking Test",
                "description": "Verified that consultant appointment booking works correctly on mobile",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Testimonial Display Test",
                "description": "Confirmed that consultant testimonials display correctly on mobile screens",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Specialization Filter Test",
                "description": "Verified that consultant specialization filters work correctly on mobile",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Consultant Search Test",
                "description": "Confirmed that consultant search functionality works correctly on mobile",
                "category": "FUNCTIONAL"
            }
        ],
        "PI for Managers Page": [
            {
                "name": "Mobile Tool Navigation Test",
                "description": "Verified that manager tools navigation works correctly on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Case Study Display Test",
                "description": "Confirmed that manager case studies display properly on mobile screens",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Leadership Assessment Test",
                "description": "Verified that leadership assessment tools work correctly on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Team Visualization Test",
                "description": "Confirmed that team visualization charts display correctly on mobile screens",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Manager Resource Download Test",
                "description": "Verified that manager resources can be downloaded on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Training Module Navigation Test",
                "description": "Confirmed that manager training modules navigate correctly on mobile",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Leadership Tip Display Test",
                "description": "Verified that leadership tips display correctly on mobile screens",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Progress Tracking Test",
                "description": "Confirmed that manager training progress tracking works on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Team Comparison Tool Test",
                "description": "Verified that team comparison tools work correctly on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Manager FAQ Display Test",
                "description": "Confirmed that manager FAQs display and expand correctly on mobile screens",
                "category": "USABILITY"
            }
        ],
        "Software Managing Page": [
            {
                "name": "Mobile Feature Comparison Test",
                "description": "Verified that feature comparison tables render correctly on mobile for most screen sizes",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Demo Request Test",
                "description": "Confirmed that demo request forms can be successfully completed on mobile",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Admin Interface Preview Test",
                "description": "Verified that admin interface previews display correctly on mobile screens",
                "category": "USABILITY"
            },
            {
                "name": "Mobile User Management Demo Test",
                "description": "Confirmed that user management demos work correctly on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Feature Video Playback Test",
                "description": "Verified that feature demonstration videos play correctly on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile Integration Diagram Test",
                "description": "Confirmed that integration diagrams display correctly on mobile screens",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Software Update Notes Test",
                "description": "Verified that software update notes display correctly on mobile devices",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Pricing Calculator Test",
                "description": "Confirmed that pricing calculators work correctly on mobile devices",
                "category": "FUNCTIONAL"
            },
            {
                "name": "Mobile System Requirements Test",
                "description": "Verified that system requirements display correctly on mobile screens",
                "category": "USABILITY"
            },
            {
                "name": "Mobile Feature Request Form Test",
                "description": "Confirmed that feature request forms can be submitted on mobile devices",
                "category": "FUNCTIONAL"
            }
        ]
    }
    
    print("Creating epics for successful tests...")
    # Create epics for successful tests
    visual_epic = create_epic(
        product_id=product_id,
        name="Mobile Visual Verification",
        description="Visual verification tests for the mobile interface that passed successfully"
    )
    
    functional_epic = create_epic(
        product_id=product_id,
        name="Mobile Functionality Verification",
        description="Functionality verification tests for the mobile interface that passed successfully"
    )
    
    created_tests = []
    
    # For each page, create features, user stories and tests
    for page, tests in successful_tests.items():
        print(f"Creating successful tests for {page}...")
        
        # Create visual and functional features
        feature_visual = create_feature(
            epic_id=visual_epic["id"],
            name=f"{page} - Visual Verification",
            description=f"Visual aspects of the {page} that were verified to work correctly",
            url=f"https://www.predictiveindex.com/{page.lower().replace(' ', '-')}"
        )
        
        feature_functional = create_feature(
            epic_id=functional_epic["id"],
            name=f"{page} - Functional Verification",
            description=f"Functional aspects of the {page} that were verified to work correctly",
            url=f"https://www.predictiveindex.com/{page.lower().replace(' ', '-')}"
        )
        
        # Create user stories
        user_story_visual = create_user_story(
            feature_id=feature_visual["id"],
            title=f"As a user, I want the {page} to display correctly on mobile",
            description=f"The {page} should have proper visual formatting on mobile devices"
        )
        
        user_story_functional = create_user_story(
            feature_id=feature_functional["id"],
            title=f"As a user, I want to use {page} features on mobile",
            description=f"The {page} functionality should work correctly on mobile devices"
        )
        
        # Create successful tests
        for test_data in tests:
            # Determine if this is a visual or functional test
            is_functional = test_data["category"] in ["FUNCTIONAL", "INTEGRATION", "END_TO_END"]
            
            # Select the appropriate user story
            user_story = user_story_functional if is_functional else user_story_visual
            
            # Create test (initially with default status)
            test = create_test(
                user_story_id=user_story["id"],
                name=test_data["name"],
                description=test_data["description"],
                category=test_data["category"],
                status="NOT_STARTED",  # Default status
                severity="Low",  # For passed tests, severity is low
                url=f"https://www.predictiveindex.com/test/{test_data['name'].lower().replace(' ', '-')}"
            )
            
            # Set start and end times for completed tests
            # Set start time to a random time in the past (1-5 days ago)
            start_time = datetime.now() - timedelta(days=random.randint(1, 5))
            
            # Set end time to a random time between start_time and now (1-8 hours later)
            # Ensure at least 1 hour difference to simulate real test duration
            max_hours = int((datetime.now() - start_time).total_seconds() / 3600) - 1
            if max_hours <= 0:
                # If start_time is too close to now, just set end_time to now
                end_time = datetime.now()
            else:
                hours_later = random.randint(1, min(max_hours, 8))  # Cap at 8 hours max
                end_time = start_time + timedelta(hours=hours_later)
            
            # Update the test status to PASSED
            updated_test = update_test_status(
                test_id=test["id"],
                status="PASSED",
                started_at=start_time.isoformat(),
                ended_at=end_time.isoformat()
            )
            
            created_tests.append(updated_test)
            print(f"Created successful test: {test_data['name']} for {page} with status PASSED")
    
    print(f"Created {len(created_tests)} successful tests")
    return created_tests

def update_bug_test_statuses():
    """Update tests associated with bugs to have FAILED status"""
    print("Updating status of tests with bugs to FAILED...")
    
    # Get all bugs
    response = requests.get(f"{BASE_URL}/bugs/")
    if response.status_code != 200:
        print(f"Failed to get bugs: {response.status_code}")
        return
    
    bugs = response.json()
    updated_tests = set()  # Keep track of tests we've already updated
    
    for bug in bugs:
        test_id = bug.get("test_id")
        if test_id and test_id not in updated_tests:
            try:
                # Set start time to a random time in the past (1-10 days ago)
                start_time = datetime.now() - timedelta(days=random.randint(1, 10))
                
                # Set end time to a random time between start_time and now
                # Ensure at least 1 hour difference to simulate real test duration
                max_hours = int((datetime.now() - start_time).total_seconds() / 3600) - 1
                if max_hours <= 0:
                    # If start_time is too close to now, just set end_time to now
                    end_time = datetime.now()
                else:
                    hours_later = random.randint(1, min(max_hours, 8))  # Cap at 8 hours max
                    end_time = start_time + timedelta(hours=hours_later)
                
                # Update the test status to FAILED
                update_test_status(
                    test_id=test_id,
                    status="FAILED",
                    started_at=start_time.isoformat(),
                    ended_at=end_time.isoformat()
                )
                
                updated_tests.add(test_id)
                print(f"Updated test {test_id} status to FAILED")
            except Exception as e:
                print(f"Error updating test {test_id}: {str(e)}")
    
    print(f"Updated {len(updated_tests)} tests to FAILED status")

def main():
    """Main function to create successful tests"""
    # Get or create the product
    print("Getting product...")
    product = get_existing_product()
    
    # Create successful tests
    print("Creating successful tests...")
    successful_tests = create_successful_tests(product["id"])
    
    # Update the status of tests associated with bugs
    update_bug_test_statuses()
    
    print("Done!")

if __name__ == "__main__":
    main() 