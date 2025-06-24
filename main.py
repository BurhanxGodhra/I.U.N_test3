from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Body, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, validator
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, List
import os
import json
import logging
from dotenv import load_dotenv
from bson import ObjectId
import boto3
from botocore.exceptions import ClientError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
MONGODB_URI = os.getenv("MONGODB_URI")
JWT_SECRET = os.getenv("JWT_SECRET")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_BUCKET_NAME = os.getenv("AWS_BUCKET_NAME")
AWS_REGION = os.getenv("AWS_REGION")

# Validate environment variables
if not all([MONGODB_URI, JWT_SECRET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_BUCKET_NAME, AWS_REGION]):
    logger.error("Missing required environment variables")
    raise ValueError("Missing required environment variables")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# Initialize FastAPI
app = FastAPI(title="Insha Un Nazm API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB client
try:
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client["poetry_platform"]
    users_collection = db["users"]
    poets_collection = db["poets"]
    poems_collection = db["poems"]
    verses_collection = db["opening_verses"]
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {str(e)}")
    raise

# S3 client
try:
    s3_client = boto3.client(
        "s3",
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_REGION
    )
except ClientError as e:
    logger.error(f"Failed to initialize S3 client: {str(e)}")
    raise

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Pydantic models
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    country: str  # Add country field

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class PoemCreate(BaseModel):
    type: str
    content: Optional[str] = None
    language: str
    submissionMethod: str
    inspiredBy: Optional[str] = None

    @validator("type")
    def validate_type(cls, v):
        if v not in ["individual", "full"]:
            raise ValueError("Type must be 'individual' or 'full'")
        return v

    @validator("submissionMethod")
    def validate_submission_method(cls, v):
        if v not in ["manual", "upload", "recording"]:
            raise ValueError("Submission method must be 'manual', 'upload', or 'recording'")
        return v

class AuthorResponse(BaseModel):
    userId: str
    name: str

class PoemResponse(BaseModel):
    id: str
    type: str
    content: Optional[str]
    language: str
    submissionMethod: str
    author: AuthorResponse
    status: str
    approved: bool
    rating: Optional[float]
    fileName: Optional[str]
    audioFileName: Optional[str]
    arazContent: Optional[str]
    arazFileName: Optional[str]
    createdAt: datetime
    featured: bool
    featuredDate: Optional[datetime]

class PoemListResponse(BaseModel):
    poems: List[PoemResponse]
    total: int
    page: int
    perPage: int

class ApproveRequest(BaseModel):
    approved: bool

class RateRequest(BaseModel):
    rating: float

    @validator("rating")
    def validate_rating(cls, v):
        if v < 0.5 or v > 5.0 or (v * 10) % 5 != 0:
            raise ValueError("Rating must be between 0.5 and 5.0 in 0.5 increments")
        return v

class StatusUpdateRequest(BaseModel):
    status: str

    @validator("status")
    def validate_status(cls, v):
        if v not in ["araz_done", "araz_pending"]:
            raise ValueError("Status must be 'araz_done' or 'araz_pending'")
        return v

class VerseResponse(BaseModel):
    id: str
    content: str
    day: int
    language: str
    author: Optional[str] = None
    createdAt: datetime

class LeaderboardEntry(BaseModel):
    authorName: str
    totalStars: float
    submissionCount: int

class LeaderboardResponse(BaseModel):
    entries: List[LeaderboardEntry]

# JWT functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    logger.info(f"Created token with payload: {to_encode}")
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        logger.info(f"JWT payload: {payload}")
        user_id: str = payload.get("sub")
        if user_id is None:
            logger.warning("No user_id in payload")
            raise credentials_exception
        user = await users_collection.find_one({"_id": ObjectId(user_id)})
        if user is None:
            logger.warning(f"User not found: user_id={user_id}")
            raise credentials_exception
        return {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    except JWTError as e:
        logger.error(f"JWTError: {str(e)}")
        raise credentials_exception

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# S3 functions
async def upload_to_s3(file: UploadFile, poem_id: str, file_type: str):
    allowed_text_types = {".txt", ".doc", ".docx", ".pdf"}
    allowed_audio_types = {".mp3", ".wav", ".m4a", ".ogg"}
    file_ext = os.path.splitext(file.filename)[1].lower()

    if file_type == "text" and file_ext not in allowed_text_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: .txt, .doc, .docx, .pdf")
    if file_type == "audio" and file_ext not in allowed_audio_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: .mp3, .wav, .m4a, .ogg")

    max_size = 5 * 1024 * 1024 if file_type == "text" else 10 * 1024 * 1024
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail=f"File too large (max {max_size / 1024 / 1024}MB)")

    s3_path = f"poems/{poem_id}/{file.filename}"
    try:
        s3_client.put_object(
            Bucket=AWS_BUCKET_NAME,
            Key=s3_path,
            Body=content,
            ContentType=file.content_type
        )
        return s3_path
    except ClientError as e:
        logger.error(f"S3 upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"S3 upload failed: {str(e)}")

def generate_presigned_url(s3_path: str, expiry: int = 604800):
    try:
        url = s3_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": AWS_BUCKET_NAME, "Key": s3_path},
            ExpiresIn=expiry
        )
        return url
    except ClientError as e:
        logger.error(f"Failed to generate URL: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate URL: {str(e)}")

# Register endpoint
@app.post("/api/auth/register", response_model=TokenResponse)
async def register_user(form_data: RegisterRequest):
    logger.info(f"Register attempt for email: {form_data.email}")
    if await users_collection.find_one({"email": form_data.email}):
        logger.warning(f"Email already in use: {form_data.email}")
        raise HTTPException(status_code=400, detail="Email already in use")

    hashed_password = pwd_context.hash(form_data.password)
    user = {
        "name": form_data.name,
        "email": form_data.email,
        "password": hashed_password,
        "role": "user",
        "createdAt": datetime.utcnow()
    }
    try:
        user_result = await users_collection.insert_one(user)
        user_id = str(user_result.inserted_id)

        poet = {
            "userId": ObjectId(user_id),
            "name": form_data.name,
            "email": form_data.email,
            "country": form_data.country,  # Use the provided country instead of hardcoding ""
            "points": 0,
            "poemsCount": 0,
            "bio": "",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        await poets_collection.insert_one(poet)

        access_token = create_access_token(
            data={"sub": user_id, "email": form_data.email, "role": "user"}
        )

        logger.info(f"Registration successful for user_id: {user_id}")
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "name": form_data.name,
                "email": form_data.email,
                "role": "user"
            }
        }
    except Exception as e:
        logger.error(f"Registration failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Login endpoint
@app.post("/api/auth/login", response_model=TokenResponse)
async def login_user(form_data: LoginRequest):
    user = await users_collection.find_one({"email": form_data.email})
    if not user or not pwd_context.verify(form_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access_token = create_access_token(
        data={"sub": str(user["_id"]), "email": user["email"], "role": user["role"]}
    )
    logger.info(f"Login successful for email: {user['email']}")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"]
        }
    }

# Get current user endpoint
@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_data(current_user: dict = Depends(get_current_user)):
    return current_user

# Submit poem manually endpoint
@app.post("/api/poems/manual", response_model=dict)
async def submit_poem_manual(
    poem: PoemCreate = Body(...),
    current_user: dict = Depends(get_current_user)
):
    if poem.submissionMethod != "manual":
        raise HTTPException(status_code=400, detail="Submission method must be 'manual'")
    if not poem.content:
        raise HTTPException(status_code=400, detail="Content required for manual submission")
    if not poem.type:
        raise HTTPException(status_code=400, detail="Type is required")
    if not poem.language:
        raise HTTPException(status_code=400, detail="Language is required")

    if poem.inspiredBy:
        try:
            verse_id = ObjectId(poem.inspiredBy)
            if not await verses_collection.find_one({"_id": verse_id}):
                raise HTTPException(status_code=400, detail="Invalid inspiredBy verse")
        except:
            raise HTTPException(status_code=400, detail="Invalid inspiredBy ID")

    poem_doc = {
        "type": poem.type,
        "content": poem.content,
        "language": poem.language,
        "submissionMethod": poem.submissionMethod,
        "author": {"userId": ObjectId(current_user["id"]), "name": current_user["name"]},
        "status": "araz_pending",
        "approved": False,
        "rating": None,
        "fileName": None,
        "audioFileName": None,
        "arazContent": None,
        "arazFileName": None,
        "inspiredBy": ObjectId(poem.inspiredBy) if poem.inspiredBy else None,
        "featured": False,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }

    result = await poems_collection.insert_one(poem_doc)
    poem_id = str(result.inserted_id)
    return {"message": "Nazm submitted successfully", "poemId": poem_id}

# Submit poem with file upload endpoint
@app.post("/api/poems/upload", response_model=dict)
async def submit_poem_upload(
    file: UploadFile = File(...),
    poem_json: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    try:
        poem_data = json.loads(poem_json)
        poem = PoemCreate(**poem_data)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid poem JSON")

    if poem.submissionMethod not in ["upload", "recording"]:
        raise HTTPException(status_code=400, detail="Submission method must be 'upload' or 'recording'")
    if not poem.type:
        raise HTTPException(status_code=400, detail="Type is required")
    if not poem.language:
        raise HTTPException(status_code=400, detail="Language is required")

    if poem.inspiredBy:
        try:
            verse_id = ObjectId(poem.inspiredBy)
            if not await verses_collection.find_one({"_id": verse_id}):
                raise HTTPException(status_code=400, detail="Invalid inspiredBy verse")
        except:
            raise HTTPException(status_code=400, detail="Invalid inspiredBy ID")

    file_type = "text" if poem.submissionMethod == "upload" else "audio"
    temp_path = await upload_to_s3(file, "temp", file_type)

    poem_doc = {
        "type": poem.type,
        "content": None,
        "language": poem.language,
        "submissionMethod": poem.submissionMethod,
        "author": {"userId": ObjectId(current_user["id"]), "name": current_user["name"]},
        "status": "araz_pending",
        "approved": False,
        "rating": None,
        "fileName": None,
        "audioFileName": None,
        "arazContent": None,
        "arazFileName": None,
        "inspiredBy": ObjectId(poem.inspiredBy) if poem.inspiredBy else None,
        "featured": False,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    poem_doc["fileName" if file_type == "text" else "audioFileName"] = temp_path

    result = await poems_collection.insert_one(poem_doc)
    poem_id = str(result.inserted_id)

    final_path = f"poems/{poem_id}/{file.filename}"
    s3_client.copy_object(
        Bucket=AWS_BUCKET_NAME,
        CopySource=f"{AWS_BUCKET_NAME}/{temp_path}",
        Key=final_path
    )
    s3_client.delete_object(Bucket=AWS_BUCKET_NAME, Key=temp_path)
    update_field = "fileName" if poem.submissionMethod == "upload" else "audioFileName"
    await poems_collection.update_one(
        {"_id": ObjectId(poem_id)},
        {"$set": {update_field: final_path}}
    )

    return {"message": "Nazm submitted successfully", "poemId": poem_id}

# Get poems endpoint
@app.get("/api/poems", response_model=PoemListResponse)
async def get_poems(
    type: Optional[str] = None,
    language: Optional[str] = None,
    status: Optional[str] = None,
    approved: Optional[bool] = None,
    featured: Optional[bool] = None,
    authorId: Optional[str] = None,
    page: int = 1,
    perPage: int = 20,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if type:
        query["type"] = type
    if language:
        query["language"] = language
    if status and current_user["role"] == "admin":
        query["status"] = status
    if approved is not None and current_user["role"] == "admin":
        query["approved"] = approved
    if featured is not None:
        query["featured"] = featured
    if authorId:
        try:
            query["author.userId"] = ObjectId(authorId)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Invalid authorId")

    skip = (page - 1) * perPage
    total = await poems_collection.count_documents(query)
    poems = await poems_collection.find(query).skip(skip).limit(perPage).to_list(perPage)

    return {
        "poems": [
            {
                "id": str(poem["_id"]),
                "type": poem["type"],
                "content": poem.get("content"),
                "language": poem["language"],
                "submissionMethod": poem["submissionMethod"],
                "author": {
                    "userId": str(poem["author"]["userId"]),
                    "name": poem["author"]["name"]
                },
                "status": poem["status"],
                "approved": poem["approved"],
                "rating": poem["rating"],
                "fileName": poem.get("fileName"),
                "audioFileName": poem.get("audioFileName"),
                "arazContent": poem.get("arazContent"),
                "arazFileName": poem.get("arazFileName"),
                "createdAt": poem["createdAt"],
                "featured": poem.get("featured", False),
                "featuredDate": poem.get("featuredDate")
            }
            for poem in poems
        ],
        "total": total,
        "page": page,
        "perPage": perPage
    }

# Get single poem endpoint
@app.get("/api/poems/{_id}", response_model=PoemResponse)
async def get_poem(
    _id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        poem = await poems_collection.find_one({"_id": ObjectId(_id)})
        if not poem:
            raise HTTPException(status_code=404, detail="Poem not found")
        if current_user["role"] != "admin" and str(poem["author"]["userId"]) != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        return {
            "id": str(poem["_id"]),
            "type": poem["type"],
            "content": poem.get("content"),
            "language": poem["language"],
            "submissionMethod": poem["submissionMethod"],
            "author": {
                "userId": str(poem["author"]["userId"]),
                "name": poem["author"]["name"]
            },
            "status": poem["status"],
            "approved": poem["approved"],
            "rating": poem["rating"],
            "fileName": poem.get("fileName"),
            "audioFileName": poem.get("audioFileName"),
            "arazContent": poem.get("arazContent"),
            "arazFileName": poem.get("arazFileName"),
            "createdAt": poem["createdAt"],
            "featured": poem.get("featured", False),
            "featuredDate": poem.get("featuredDate")
        }
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="Invalid poem ID")

# Get best poems endpoint
@app.get("/api/poems/best", response_model=PoemListResponse)
async def get_best_poems(
    limit: int = 3,  # Default to top 3
    current_user: dict = Depends(get_current_user)
):
    query = {
        "approved": True,
        "rating": {"$exists": True, "$ne": None}  # Ensure rating exists
    }
    # Sort by rating in descending order and limit
    poems = await poems_collection.find(query).sort("rating", -1).limit(limit).to_list(limit)

    return {
        "poems": [
            {
                "id": str(poem["_id"]),
                "type": poem["type"],
                "content": poem.get("content"),
                "language": poem["language"],
                "submissionMethod": poem["submissionMethod"],
                "author": {
                    "userId": str(poem["author"]["userId"]),
                    "name": poem["author"]["name"]
                },
                "status": poem["status"],
                "approved": poem["approved"],
                "rating": poem["rating"],
                "fileName": poem.get("fileName"),
                "audioFileName": poem.get("audioFileName"),
                "arazContent": poem.get("arazContent"),
                "arazFileName": poem.get("arazFileName"),
                "createdAt": poem["createdAt"],
                "featured": poem.get("featured", False),
                "featuredDate": poem.get("featuredDate")
            }
            for poem in poems
        ],
        "total": len(poems),
        "page": 1,
        "perPage": limit
    }

# Approve poem endpoint
@app.put("/api/poems/{poem_id}/approve", response_model=dict)
async def approve_poem(
    poem_id: str,
    approve_data: ApproveRequest,
    current_user: dict = Depends(get_admin_user)
):
    try:
        poem = await poems_collection.find_one({"_id": ObjectId(poem_id)})
        if not poem:
            raise HTTPException(status_code=404, detail="Poem not found")

        update_data = {"approved": approve_data.approved, "updatedAt": datetime.utcnow()}
        if approve_data.approved:
            update_data["status"] = "araz_done"
            await poets_collection.update_one(
                {"userId": poem["author"]["userId"]},
                {"$inc": {"poemsCount": 1}, "$set": {"updatedAt": datetime.utcnow()}}
            )
        else:
            update_data["status"] = "araz_pending"

        await poems_collection.update_one(
            {"_id": ObjectId(poem_id)},
            {"$set": update_data}
        )
        return {"message": "Poem approval updated successfully"}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid poem ID")

# Rate poem endpoint
@app.put("/api/poems/{poem_id}/rate", response_model=dict)
async def rate_poem(
    poem_id: str,
    rate_data: RateRequest,
    current_user: dict = Depends(get_admin_user)
):
    try:
        poem = await poems_collection.find_one({"_id": ObjectId(poem_id)})
        if not poem:
            raise HTTPException(status_code=404, detail="Poem not found")
        if not poem["approved"]:
            raise HTTPException(status_code=400, detail="Poem must be approved to rate")

        points = int(rate_data.rating * 20)
        await poems_collection.update_one(
            {"_id": ObjectId(poem_id)},
            {"$set": {"rating": rate_data.rating, "updatedAt": datetime.utcnow()}}
        )
        await poets_collection.update_one(
            {"userId": poem["author"]["userId"]},
            {"$inc": {"points": points}, "$set": {"updatedAt": datetime.utcnow()}}
        )
        return {"message": "Poem rated successfully"}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid poem ID")

# Update poem status endpoint
@app.put("/api/poems/{poem_id}/status", response_model=dict)
async def update_poem_status(
    poem_id: str,
    status_data: StatusUpdateRequest,
    current_user: dict = Depends(get_admin_user)
):
    try:
        poem = await poems_collection.find_one({"_id": ObjectId(poem_id)})
        if not poem:
            raise HTTPException(status_code=404, detail="Poem not found")

        await poems_collection.update_one(
            {"_id": ObjectId(poem_id)},
            {"$set": {"status": status_data.status, "updatedAt": datetime.utcnow()}}
        )
        return {"message": "Poem status updated successfully"}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid poem ID")

# Download poem file endpoint
@app.get("/api/poems/{poem_id}/download", response_model=dict)
async def download_poem_file(
    poem_id: str,
    current_user: dict = Depends(get_current_user)
):
    try:
        poem = await poems_collection.find_one({"_id": ObjectId(poem_id)})
        if not poem:
            raise HTTPException(status_code=404, detail="Poem not found")
        if current_user["role"] != "admin" and poem["author"]["userId"] != ObjectId(current_user["id"]):
            raise HTTPException(status_code=403, detail="Access denied")

        s3_path = poem.get("fileName") or poem.get("audioFileName") or poem.get("arazFileName")
        if not s3_path:
            raise HTTPException(status_code=400, detail="No file associated with this poem")

        url = generate_presigned_url(s3_path)
        return {"url": url}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid poem ID")

# Get verses endpoint
@app.get("/api/verses", response_model=List[VerseResponse])
async def get_verses(
    day: Optional[int] = None,
    language: Optional[str] = None
):
    try:
        query = {}
        if day:
            query["day"] = day
        if language:
            query["language"] = language
        logger.info(f"GET /api/verses query: {query}")
        verses = await verses_collection.find(query).to_list(100)
        logger.info(f"Found verses: {verses}")
        return [
            {
                "id": str(verse["_id"]),
                "content": verse.get("content", verse.get("text", "")),
                "day": verse.get("day", 1),
                "language": verse.get("language", "Unknown"),
                "author": verse.get("author"),
                "createdAt": verse.get("createdAt", datetime.utcnow()),
            }
            for verse in verses
        ]
    except Exception as e:
        logger.error(f"Error in get_verses: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch verses: {str(e)}")

class VerseCreate(BaseModel):
    content: str
    day: int
    language: str
    author: Optional[str] = None

    @validator("day")
    def validate_day(cls, v):
        if v < 1 or v > 10:
            raise ValueError("Day must be between 1 and 10")
        return v

    @validator("language")
    def validate_language(cls, v):
        allowed = ["English", "Arabic", "Urdu", "Lisan al-Dawah", "French"]
        if v not in allowed:
            raise ValueError(f"Language must be one of {allowed}")
        return v

class VerseUpdate(BaseModel):
    content: Optional[str] = None
    day: Optional[int] = None
    language: Optional[str] = None
    author: Optional[str] = None

    @validator("day", always=True)
    def validate_day(cls, v):
        if v is not None and (v < 1 or v > 10):
            raise ValueError("Day must be between 1 and 10")
        return v

    @validator("language", always=True)
    def validate_language(cls, v):
        if v is not None:
            allowed = ["English", "Arabic", "Urdu", "Lisan al-Dawah", "French"]
            if v not in allowed:
                raise ValueError(f"Language must be one of {allowed}")
            return v

# Add new verse
@app.post("/api/verses", response_model=VerseResponse)
async def add_verse(
    verse: VerseCreate,
    current_user: dict = Depends(get_admin_user)
):
    verse_doc = {
        "content": verse.content,
        "day": verse.day,
        "language": verse.language,
        "createdAt": datetime.utcnow(),
    }
    if verse.author:
        verse_doc["author"] = verse.author
    result = await verses_collection.insert_one(verse_doc)
    return {
        "id": str(result.inserted_id),
        "content": verse_doc["content"],
        "day": verse_doc["day"],
        "language": verse_doc["language"],
        "author": verse_doc.get("author"),
        "createdAt": verse_doc["createdAt"],
    }

# Update verse
@app.patch("/api/verses/{verse_id}", response_model=VerseResponse)
async def update_verse(
    verse_id: str,
    verse: VerseUpdate,
    current_user: dict = Depends(get_admin_user)
):
    try:
        verse_doc = await verses_collection.find_one({"_id": ObjectId(verse_id)})
        if not verse_doc:
            raise HTTPException(status_code=404, detail="Verse not found")
        update_data = {
            k: v for k, v in {
                "content": verse.content,
                "day": verse.day,
                "language": verse.language,
                "updatedAt": datetime.utcnow(),
            }.items() if v is not None
        }
        if verse.author is not None:
            update_data["author"] = verse.author
        await verses_collection.update_one(
            {"_id": ObjectId(verse_id)},
            {"$set": update_data}
        )
        updated_doc = await verses_collection.find_one({"_id": ObjectId(verse_id)})
        return {
            "id": str(updated_doc["_id"]),
            "content": updated_doc["content"],
            "day": updated_doc["day"],
            "language": updated_doc["language"],
            "author": updated_doc.get("author"),
            "createdAt": updated_doc["createdAt"],
        }
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid verse ID")

# Delete verse
@app.delete("/api/verses/{verse_id}", response_model=dict)
async def delete_verse(
    verse_id: str,
    current_user: dict = Depends(get_admin_user)
):
    try:
        result = await verses_collection.delete_one({"_id": ObjectId(verse_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Verse not found")
        return {"message": "Verse deleted successfully"}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid verse ID")

# Add araz endpoint
@app.post("/api/poems/{poem_id}/araz", response_model=dict)
async def add_araz(
    poem_id: str,
    araz_content: Optional[str] = Form(None),
    araz_file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_admin_user)
):
    try:
        poem = await poems_collection.find_one({"_id": ObjectId(poem_id)})
        if not poem:
            raise HTTPException(status_code=404, detail="Poem not found")
        if not poem["approved"]:
            raise HTTPException(status_code=400, detail="Poem must be approved for araz")

        if not araz_content and not araz_file:
            raise HTTPException(status_code=400, detail="Araz content or file required")

        update_data = {"updatedAt": datetime.utcnow()}
        if araz_content:
            update_data["arazContent"] = araz_content
        if araz_file:
            araz_path = await upload_to_s3(araz_file, poem_id, "text")
            update_data["arazFileName"] = araz_path

        await poems_collection.update_one(
            {"_id": ObjectId(poem_id)},
            {"$set": update_data}
        )
        return {"message": "Araz added successfully"}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid poem ID")

# Feature poem endpoint
@app.patch("/api/poems/{poem_id}/feature", response_model=dict)
async def feature_poem(
    poem_id: str,
    feature_data: dict = Body(...),  # Expect { featured: bool }
    current_user: dict = Depends(get_admin_user)
):
    try:
        poem = await poems_collection.find_one({"_id": ObjectId(poem_id)})
        if not poem:
            raise HTTPException(status_code=404, detail="Poem not found")
        if not poem["approved"]:
            raise HTTPException(status_code=400, detail="Poem must be approved to feature")

        featured = feature_data.get("featured", False)
        update_data = {
            "featured": featured,
            "featuredDate": datetime.utcnow() if featured else None,
            "updatedAt": datetime.utcnow()
        }
        await poems_collection.update_one(
            {"_id": ObjectId(poem_id)},
            {"$set": update_data}
        )

        # Unfeature other poems if a new one is featured
        if featured:
            await poems_collection.update_many(
                {"_id": {"$ne": ObjectId(poem_id)}, "featured": True},
                {"$set": {"featured": False, "featuredDate": None}}
            )

        return {"message": f"Poem {'featured' if featured else 'unfeatured'} successfully"}
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid poem ID")

# Get leaderboard endpoint
@app.get("/api/leaderboard", response_model=LeaderboardResponse)
async def get_leaderboard(
    type: str,
    current_user: dict = Depends(get_current_user)
):
    if type not in ["individual", "full"]:
        raise HTTPException(status_code=400, detail="Type must be 'individual' or 'full'")
    
    # Aggregate poets' data based on poem type
    pipeline = [
        {"$match": {"type": type, "approved": True}},
        {
            "$group": {
                "_id": "$author.userId",
                "authorName": {"$first": "$author.name"},
                "totalStars": {"$sum": {"$ifNull": ["$rating", 0]}},
                "submissionCount": {"$sum": 1}
            }
        },
        {"$sort": {"totalStars": -1, "submissionCount": -1}}
    ]
    
    leaderboard_data = await poems_collection.aggregate(pipeline).to_list(length=None)  # No limit to include all poets
    
    entries = [
        {
            "authorName": entry["authorName"],
            "totalStars": float(entry["totalStars"]),
            "submissionCount": int(entry["submissionCount"])
        }
        for entry in leaderboard_data
    ]
    
    return {"entries": entries}

# Root endpoint
@app.get("/")
async def root():
    return {"message": "Welcome to Insha Un Nazm API!"}

# Test endpoint
@app.get("/test")
async def test():
    return {"status": "API is running"}