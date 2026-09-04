#!/usr/bin/env python3
"""
Test script to examine the structure of a single chapter page
"""

import requests
from bs4 import BeautifulSoup

def test_chapter_structure():
    url = "https://www.ecatholic2000.com/catena/untitled-08.shtml"  # Matthew Chapter 1
    
    print(f"Fetching: {url}")
    
    response = requests.get(url)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Print basic page info
    title = soup.find('title')
    print(f"Title: {title.get_text() if title else 'No title found'}")
    
    # Look for main content area
    print("\n=== Looking for main content areas ===")
    
    # Check various possible content containers
    possible_containers = [
        soup.find('div', {'id': 'content'}),
        soup.find('main'),
        soup.find('article'),
        soup.find('div', {'class': 'content'}),
        soup.body
    ]
    
    for i, container in enumerate(possible_containers):
        if container:
            print(f"Container {i}: Found {container.name} with {len(container.get_text())} characters")
        else:
            print(f"Container {i}: Not found")
    
    # Get the text content and show first 1000 characters
    text_content = soup.get_text()
    print(f"\n=== First 1000 characters of page content ===")
    print(text_content[:1000])
    print("...")
    
    # Look for patterns that might indicate verse structure
    lines = text_content.split('\n')
    verse_lines = []
    source_lines = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Look for potential verse numbers
        if line and line[0].isdigit() and '.' in line[:10]:
            verse_lines.append(line[:100])
        
        # Look for potential patristic sources (all caps words)
        if any(word.isupper() and len(word) > 3 for word in line.split()):
            source_lines.append(line[:100])
    
    print(f"\n=== Potential verse lines (first 10) ===")
    for line in verse_lines[:10]:
        print(f"  {line}")
    
    print(f"\n=== Potential source lines (first 10) ===")
    for line in source_lines[:10]:
        print(f"  {line}")
    
    # Save raw HTML for manual inspection
    with open('sample_chapter.html', 'w', encoding='utf-8') as f:
        f.write(response.text)
    
    print(f"\nSaved raw HTML to sample_chapter.html for manual inspection")

if __name__ == "__main__":
    test_chapter_structure()