#!/usr/bin/env python3
"""
Analysis script to examine the generated knowledge graph
"""

import json
from collections import Counter, defaultdict

def analyze_graph():
    with open('catena_aurea_graph.json', 'r', encoding='utf-8') as f:
        graph_data = json.load(f)
    
    nodes = graph_data['nodes']
    edges = graph_data['edges']
    
    print("=== Catena Aurea Knowledge Graph Analysis ===\n")
    
    # Node type breakdown
    node_types = Counter(node['type'] for node in nodes)
    print("Node Types:")
    for node_type, count in node_types.items():
        print(f"  {node_type}: {count:,}")
    print()
    
    # Edge type breakdown  
    edge_types = Counter(edge['type'] for edge in edges)
    print("Edge Types:")
    for edge_type, count in edge_types.items():
        print(f"  {edge_type}: {count:,}")
    print()
    
    # Patristic sources
    sources = [node for node in nodes if node['type'] == 'Patristic_Source']
    print(f"Patristic Sources Identified ({len(sources)} total):")
    source_names = sorted([source['name'] for source in sources])
    for name in source_names:
        print(f"  • {name}")
    print()
    
    # Verses per Gospel
    verses = [node for node in nodes if node['type'] == 'Gospel_Verse']
    verses_by_gospel = defaultdict(int)
    for verse in verses:
        gospel = verse['properties']['gospel']
        verses_by_gospel[gospel] += 1
    
    print("Gospel Verse Breakdown:")
    for gospel, count in sorted(verses_by_gospel.items()):
        print(f"  {gospel.title()}: {count:,} verses")
    print()
    
    # Commentary statistics
    commentaries = [node for node in nodes if node['type'] == 'Patristic_Narrative']
    
    # Count commentaries per source
    commentary_by_source = defaultdict(int)
    for commentary in commentaries:
        source = commentary['properties']['source']
        commentary_by_source[source] += 1
    
    print("Most Prolific Sources (by number of commentary excerpts):")
    top_sources = sorted(commentary_by_source.items(), key=lambda x: x[1], reverse=True)
    for source, count in top_sources[:15]:  # Top 15
        print(f"  {source}: {count:,} commentaries")
    print()
    
    # Sample relationships
    print("Sample Relationships:")
    
    # Find a sample verse with its commentaries
    sample_verse = None
    for node in nodes:
        if node['type'] == 'Gospel_Verse' and 'matthew' in node['id'] and '1_1' in node['id']:
            sample_verse = node
            break
    
    if sample_verse:
        print(f"Sample: {sample_verse['name']}")
        print(f"Text: {sample_verse['properties']['text']}")
        print("Commentaries on this verse:")
        
        # Find commentaries related to this verse
        for edge in edges:
            if edge['type'] == 'Commentary' and edge['source'] == sample_verse['id']:
                commentary_node = next(n for n in nodes if n['id'] == edge['target'])
                source_name = commentary_node['properties']['source']
                text = commentary_node['properties']['text'][:150] + "..."
                print(f"  • {source_name}: {text}")
    
    print("\n=== Summary ===")
    print(f"Successfully processed {len([n for n in nodes if n['type'] == 'Chapter']):,} chapters")
    print(f"Extracted {len(verses):,} Gospel verses")
    print(f"Identified {len(sources):,} patristic sources")
    print(f"Created {len(commentaries):,} commentary excerpts")
    print(f"Total graph: {len(nodes):,} nodes, {len(edges):,} edges")

if __name__ == "__main__":
    analyze_graph()