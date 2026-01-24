-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Create a table to store document embeddings
-- Optimized for text-embedding-004 (768 dimensions)
create table if not exists content_embeddings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) not null,
  content text,
  metadata jsonb,
  embedding vector(768),
  created_at timestamptz default now()
);

-- Create an HNSW index for faster approximate nearest neighbor queries
-- This is critical for performance as the dataset grows
create index on content_embeddings using hnsw (embedding vector_cosine_ops);

-- RLS Policies
alter table content_embeddings enable row level security;

create policy "Users can view their organization's embeddings"
  on content_embeddings for select
  using (
    organization_id in (
      select organization_id from users where users.id = auth.uid()
    )
  );

create policy "Service role has full access"
  on content_embeddings for all
  using ( auth.jwt() ->> 'role' = 'service_role' );

-- RPC: Match Content (Semantic Search)
create or replace function match_content (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_organization_id uuid
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    content_embeddings.id,
    content_embeddings.content,
    content_embeddings.metadata,
    1 - (content_embeddings.embedding <=> query_embedding) as similarity
  from content_embeddings
  where 1 - (content_embeddings.embedding <=> query_embedding) > match_threshold
  and content_embeddings.organization_id = filter_organization_id
  order by content_embeddings.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- RPC: Calculate Similarity (Offload math to DB)
-- Useful if we want to compare two vectors without storing them, 
-- though typically we'd just do this in the Edge Function if they are ephemeral.
-- But this helper can be useful for 'Check against Best Practice' where Best Practice is stored.
create or replace function calculate_similarity (
  vec_a vector(768),
  vec_b vector(768)
)
returns float
language plpgsql
as $$
begin
  return 1 - (vec_a <=> vec_b);
end;
$$;
