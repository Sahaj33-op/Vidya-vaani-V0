-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
    user_id TEXT PRIMARY KEY,
    role TEXT NOT NULL
);

-- Create the documents table for vector embeddings
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    metadata JSONB,
    embedding vector(384)
);