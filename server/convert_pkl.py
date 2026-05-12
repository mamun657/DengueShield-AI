import pickle
import json
import os

pkl_path = os.path.join(os.path.dirname(__file__), "rag_data.pkl")
json_path = os.path.join(os.path.dirname(__file__), "rag_data.json")

def convert():
    if not os.path.exists(pkl_path):
        print(f"Error: {pkl_path} not found.")
        return
        
    with open(pkl_path, "rb") as f:
        data = pickle.load(f)
        
    # data is expected to be a dict with 'chunks' and 'embeddings'
    # embeddings are likely numpy arrays, so we need to convert them to lists
    
    chunks = data.get("chunks", [])
    embeddings = data.get("embeddings", [])
    
    # Convert embeddings to lists if they are numpy arrays
    embeddings_list = [emb.tolist() if hasattr(emb, "tolist") else emb for emb in embeddings]
    
    json_data = {
        "chunks": chunks,
        "embeddings": embeddings_list
    }
    
    with open(json_path, "w") as f:
        json.dump(json_data, f)
        
    print(f"Successfully converted to {json_path}")

if __name__ == "__main__":
    convert()
