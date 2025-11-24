#!/usr/bin/env python
"""
Test script to verify academic term validation works correctly.
"""
import os
import sys
import django

# Add the backend directory to the Python path
backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_dir)

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ActivityPass.settings')
django.setup()

from accounts.models import AcademicTerm, Course
from accounts.serializers import CourseSerializer
from django.test import RequestFactory
from rest_framework.request import Request

def test_academic_term_validation():
    """Test that academic term validation works correctly."""
    print("Testing Academic Term Validation...")

    # Check if academic terms exist
    terms = AcademicTerm.objects.all()
    print(f"Found {terms.count()} academic terms in database:")
    for term in terms:
        print(f"  - {term.academic_year} {term.semester}: {term.first_week_monday}")

    if terms.count() == 0:
        print("ERROR: No academic terms found! Run the seed command first.")
        return False

    # Test valid course creation
    print("\nTesting valid course creation...")
    valid_course_data = {
        'code': 'TEST101',
        'title': 'Test Course',
        'teacher': 'Test Teacher',
        'location': 'Test Room',
        'day_of_week': 1,
        'periods': '1,2,3',
        'academic_year': '2024-2025',
        'term': 'Fall',
        'first_week_monday': '2024-09-02',  # Should match the seeded data
        'weeks': '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17'
    }

    serializer = CourseSerializer(data=valid_course_data)
    if serializer.is_valid():
        print("✓ Valid course data accepted")
    else:
        print(f"✗ Valid course data rejected: {serializer.errors}")
        return False

    # Test invalid course creation (wrong first_week_monday)
    print("\nTesting invalid course creation (wrong first_week_monday)...")
    invalid_course_data = {
        'code': 'TEST102',
        'title': 'Test Course Invalid',
        'teacher': 'Test Teacher',
        'location': 'Test Room',
        'day_of_week': 1,
        'periods': '1,2,3',
        'academic_year': '2024-2025',
        'term': 'Fall',
        'first_week_monday': '2024-09-01',  # Wrong date - should be 2024-09-02
        'weeks': '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17'
    }

    serializer = CourseSerializer(data=invalid_course_data)
    if not serializer.is_valid():
        print("✓ Invalid course data correctly rejected")
        print(f"  Error: {serializer.errors}")
    else:
        print("✗ Invalid course data was incorrectly accepted")
        return False

    # Test invalid academic year/term combination
    print("\nTesting invalid academic year/term combination...")
    invalid_term_data = {
        'code': 'TEST103',
        'title': 'Test Course Invalid Term',
        'teacher': 'Test Teacher',
        'location': 'Test Room',
        'day_of_week': 1,
        'periods': '1,2,3',
        'academic_year': '2024-2025',
        'term': 'InvalidTerm',  # Invalid term
        'first_week_monday': '2024-09-02',
        'weeks': '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17'
    }

    serializer = CourseSerializer(data=invalid_term_data)
    if not serializer.is_valid():
        print("✓ Invalid term correctly rejected")
        print(f"  Error: {serializer.errors}")
    else:
        print("✗ Invalid term was incorrectly accepted")
        return False

    print("\n✓ All academic term validation tests passed!")
    return True

if __name__ == '__main__':
    success = test_academic_term_validation()
    sys.exit(0 if success else 1)