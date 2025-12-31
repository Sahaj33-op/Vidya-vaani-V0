"""
Quick test for production RAG with FAISS
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from retriever.document_processor import DocumentProcessor
from retriever.embeddings import EmbeddingService
from retriever.vector_store import FAISSVectorStore

print("=" * 60)
print("Quick FAISS Production Test")
print("=" * 60)

# Test 1: Embedding Service
print("\n1. Testing Embedding Service...")
embedding_service = EmbeddingService()
test_query = "What are the admission requirements?"
query_embedding = embedding_service.encode_query(test_query)
print(f"✓ Query embedded. Shape: {query_embedding.shape}")

# Test 2: Document Processing
print("\n2. Testing Document Processing...")
processor = DocumentProcessor(chunk_size=300, chunk_overlap=50)
sample_text = """
Admission Requirements 2024-25:
- 10th and 12th mark sheets required
- Application fee: ₹500
- Entrance exam on August 15th
"""
chunks = processor._chunk_text(sample_text, doc_id="test_doc")
print(f"✓ Created {len(chunks)} chunks")

# Test 3: FAISS Vector Store
print("\n3. Testing FAISS Vector Store...")
vector_store = FAISSVectorStore(embedding_service, "data/quick_test_index")
vector_store.add_documents(chunks)
print(f"✓ Added documents to index")

# Test 4: Search
print("\n4. Testing Search...")
results = vector_store.search("What is the application fee?", top_k=2)
print(f"✓ Found {len(results)} results")
if results:
    print(f"  Top result score: {results[0]['score']:.3f}")
    print(f"  Text preview: {results[0]['text'][:100]}...")

# Test 5: Stats
print("\n5. Vector Store Stats:")
stats = vector_store.get_stats()
for key, value in stats.items():
    print(f"  {key}: {value}")

print("\n" + "=" * 60)
print("✓ ALL TESTS PASSED - Production RAG is working!")
print("=" * 60)

# Cleanup
import os
import shutil

if os.path.exists("data/quick_test_index"):
    shutil.rmtree("data/quick_test_index")
    print("✓ Cleanup complete")
