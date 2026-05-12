import os
import pickle

from PyPDF2 import PdfReader
from sentence_transformers import SentenceTransformer

PDF_PATH = os.path.join(os.path.dirname(__file__), "who_dengue.pdf")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "rag_data.pkl")
MODEL_NAME = "all-MiniLM-L6-v2"
CHUNK_SIZE = 700
CHUNK_OVERLAP = 100


def extract_text(pdf_path: str) -> str:
    # Read the PDF and concatenate text from all pages.
    reader = PdfReader(pdf_path)
    pages_text = []
    for page in reader.pages:
        page_text = page.extract_text() or ""
        pages_text.append(page_text)
    return "\n".join(pages_text).strip()


def chunk_text(text: str, chunk_size: int, overlap: int) -> list:
    # Split text into overlapping chunks for better retrieval.
    if not text:
        return []
    chunks = []
    step = max(chunk_size - overlap, 1)
    for start in range(0, len(text), step):
        end = min(start + chunk_size, len(text))
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(f"[WHO Guideline]\n{chunk}")
    return chunks


def build_embeddings(chunks: list) -> list:
    # Encode each chunk into a vector for semantic search.
    model = SentenceTransformer(MODEL_NAME)
    embeddings = model.encode(chunks, batch_size=16, show_progress_bar=True)
    return embeddings.tolist()


def build_rag_data() -> dict:
    if not os.path.exists(PDF_PATH):
        raise FileNotFoundError(f"PDF not found at {PDF_PATH}")

    text = extract_text(PDF_PATH)
    if not text:
        raise ValueError("No text extracted from PDF.")

    chunks = chunk_text(text, CHUNK_SIZE, CHUNK_OVERLAP)
    if not chunks:
        raise ValueError("Chunking produced no text.")

    embeddings = build_embeddings(chunks)
    if not embeddings:
        raise ValueError("Failed to create embeddings.")

    return {"chunks": chunks, "embeddings": embeddings}


def main() -> None:
    payload = build_rag_data()

    with open(OUTPUT_PATH, "wb") as handle:
        pickle.dump(payload, handle)

    print(f"Saved {len(payload['chunks'])} chunks to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
