# main.py
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from prisma import Prisma
import os
import uuid
from pathlib import Path
from pydantic import BaseModel
import base64
import httpx
from typing import Optional


app = FastAPI()

# Enable CORS for frontend to backend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db = Prisma()

@app.get("/")
def root():
    return {"message": "API is running"}

class ImageDescription(BaseModel):
    description: str

# Create uploads directory if it doesn't exist
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

async def describe_image_with_ai(image_path: str) -> Optional[str]:
    try:
        with open(image_path, "rb") as image_file:
            base64_image = base64.b64encode(image_file.read()).decode("utf-8")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "gemini-3-flash-preview:cloud",  
                    "prompt": "Describe this image in a concise and accurate way.",
                    "images": [base64_image],
                    "stream": False
                },
                timeout=60.0
            )

        print("Ollama response:", response.text)

        if response.status_code == 200:
            result = response.json()
            return result.get("response")  # IMPORTANT for /generate API

        return None

    except Exception as e:
        print("AI error:", e)
        return None

@app.get("/api/message")
def get_message():
    return {"message": "Hello from Python backend!"}

@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    """Upload an image, save to database, and generate AI description"""
    try:
        # Generate unique filename
        file_extension = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        # Save file to disk
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Save to database (initially without description)
        image_record = await db.image.create(
            data={
                "image": unique_filename
            }
        )
        
        # Generate AI description in the background
        description = await describe_image_with_ai(file_path)
        
        # Update record with description if available
        if description:
            print(f"Generated description length: {len(description)}")
            try:
                await db.image.update(
                    where={"id": image_record.id},
                    data={"description": description}
                )
                print(f"Successfully updated description for image {image_record.id}")
            except Exception as db_error:
                print(f"Failed to update description for image {image_record.id}: {db_error}")
        
        return {
            "id": image_record.id,
            "filename": unique_filename,
            "url": f"/api/image/{image_record.id}",
            "description": description
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/api/images")
async def get_all_images():
    """Fetch all uploaded images with descriptions"""
    images = await db.image.find_many(
        order={"createdAt": "desc"}
    )
    return {
        "images": [
            {
                "id": img.id,
                "url": f"/api/image/{img.id}",
                "description": img.description,
                "createdAt": img.createdAt
            }
            for img in images
        ]
    }

@app.get("/api/image/{image_id}")
async def get_image(image_id: int):
    """Fetch a specific image by ID"""
    try:
        image_record = await db.image.find_unique(where={"id": image_id})
        if not image_record or not image_record.image:
            return {"error": "Image not found"}
        
        file_path = os.path.join(UPLOAD_DIR, image_record.image)
        if not os.path.exists(file_path):
            return {"error": "File not found"}
        
        return FileResponse(file_path)
    except Exception as e:
        return {"error": str(e)}

@app.on_event("startup")
async def startup():
    try:
        await db.connect()
        print("DB connected")
    except Exception as e:
        print("DB connection failed:", e)

@app.on_event("shutdown")
async def shutdown():
    await db.disconnect()

@app.post("/api/regenerate-description/{image_id}")
async def regenerate_description(image_id: int):
    """Manually regenerate AI description for an image"""
    try:
        image_record = await db.image.find_unique(where={"id": image_id})
        if not image_record or not image_record.image:
            return {"error": "Image not found"}
        
        file_path = os.path.join(UPLOAD_DIR, image_record.image)
        if not os.path.exists(file_path):
            return {"error": "File not found"}
        
        # Generate new description
        description = await describe_image_with_ai(file_path)
        
        if description:
            print(f"Regenerated description length: {len(description)}")
            try:
                await db.image.update(
                    where={"id": image_id},
                    data={"description": description}
                )
                print(f"Successfully updated regenerated description for image {image_id}")
                return {"id": image_id, "description": description}
            except Exception as db_error:
                print(f"Failed to update regenerated description for image {image_id}: {db_error}")
                return {"error": f"Database update failed: {str(db_error)}"}
        else:
            return {"error": "Failed to generate description"}
            
    except Exception as e:
        return {"error": str(e)}
    
