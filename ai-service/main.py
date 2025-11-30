from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"status": "AI Service is Ready ✅ (Model henüz eklenmedi)"}