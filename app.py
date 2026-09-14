from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel, Field
import joblib
import os

# 1. Initialize the FastAPI app
app = FastAPI(
    title="Email Spam Classifier API",
    description="API for predicting whether an email or SMS message is spam using a Logistic Regression model.",
    version="1.0.0"
)

# 2. Load the trained model and vectorizer at startup
model_path = os.getenv("SPAM_MODEL_PATH", "spam_detector_model.pkl")
vectorizer_path = os.getenv("SPAM_VECTORIZER_PATH", "tfidf_vectorizer.pkl")

try:
    if not os.path.exists(model_path) or not os.path.exists(vectorizer_path):
        raise FileNotFoundError()
    model = joblib.load(model_path)
    vectorizer = joblib.load(vectorizer_path)
except FileNotFoundError:
    # Fail gracefully but print a loud warning at startup
    model = None
    vectorizer = None
    print(f"WARNING: Model files not found at '{model_path}' or '{vectorizer_path}'. The /predict endpoint will return a 503 error until files are placed.")

# 3. Define the request structure using Pydantic
class EmailInput(BaseModel):
    text: str = Field(..., max_length=50000, description="The content of the email or message to classify.")

# 4. Create the prediction endpoint
@app.post("/predict")
def predict_spam(email: EmailInput):
    if model is None or vectorizer is None:
        raise HTTPException(
            status_code=503, 
            detail="Classifier model is not initialized. Please ensure model files are trained and available."
        )
        
    cleaned_text = email.text.strip()
    if not cleaned_text:
        raise HTTPException(status_code=400, detail="Email text cannot be empty or contain only whitespace.")
    
    try:
        # Vectorize the incoming text
        text_vectorized = vectorizer.transform([cleaned_text])
        
        # Predict class probabilities
        probabilities = model.predict_proba(text_vectorized)[0]
        
        # Safe lookup for the index of the 'spam' class
        classes_list = list(model.classes_)
        if 'spam' not in classes_list:
            raise ValueError("Model does not contain 'spam' class in its training outputs.")
            
        spam_index = classes_list.index('spam')
        spam_probability = float(probabilities[spam_index])
        
        # We classify as 'spam' if probability meets or exceeds 0.50
        prediction = 'spam' if spam_probability >= 0.50 else 'ham'
        
        return {
            "prediction": prediction,
            "spam_probability": round(spam_probability, 4),
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

# 5. Serve HTML Frontend
@app.get("/", response_class=HTMLResponse)
def read_root():
    try:
        with open("static/index.html", "r", encoding="utf-8") as f:
            content = f.read()
        return HTMLResponse(content=content)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Frontend file index.html not found.")

@app.get("/static/style.css")
def get_css():
    try:
        with open("static/style.css", "r", encoding="utf-8") as f:
            content = f.read()
        return Response(content=content, media_type="text/css")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Stylesheet file not found.")

@app.get("/static/script.js")
def get_js():
    try:
        with open("static/script.js", "r", encoding="utf-8") as f:
            content = f.read()
        return Response(content=content, media_type="application/javascript")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="JavaScript file not found.")

# 6. Health check endpoint (moved from /)
@app.get("/health")
def health_check():
    status_msg = "ready" if (model is not None and vectorizer is not None) else "model_missing"
    return {
        "message": "Spam Classifier API is up and running!",
        "model_status": status_msg
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
