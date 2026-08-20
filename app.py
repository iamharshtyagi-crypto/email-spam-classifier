from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib

# 1. Initialize the FastAPI app
app = FastAPI(title="Email Spam Classifier API")

# 2. Load the trained model and vectorizer at startup
try:
    model = joblib.load('spam_detector_model.pkl')
    vectorizer = joblib.load('tfidf_vectorizer.pkl')
except FileNotFoundError:
    raise RuntimeError("Model files not found. Please run your training script first.")

# 3. Define the request structure using Pydantic
class EmailInput(BaseModel):
    text: str

# 4. Create the prediction endpoint
@app.post("/predict")
def predict_spam(email: EmailInput):
    if not email.text.strip():
        raise HTTPException(status_code=400, detail="Email text cannot be empty")
    
    # Vectorize the incoming text
    text_vectorized = vectorizer.transform([email.text])
    
    # Predict class and probabilities
    prediction = model.predict(text_vectorized)[0]
    probabilities = model.predict_proba(text_vectorized)[0]
    
    # Find the confidence score for the predicted class
    spam_index = 1 if model.classes_[1] == 'spam' else 0
    spam_probability = probabilities[spam_index]

    return {
        "prediction": prediction,
        "spam_probability": round(float(spam_probability), 4),
        "status": "success"
    }

# 5. Health check endpoint
@app.get("/")
def read_root():
    return {"message": "Spam Classifier API is up and running!"}