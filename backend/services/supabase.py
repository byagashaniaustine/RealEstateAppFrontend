from supabase import create_client, Client
from dotenv import load_dotenv
from fastapi import UploadFile, Request
import logging
import os
import uuid

# ===============================
# ENV SETUP
# ===============================

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_PROJECT_URL")
SUPABASE_KEY = os.getenv("SUPABASE_PUBLIC_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")    
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.critical("❌ Supabase credentials missing.")
    raise Exception("Supabase credentials missing")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

if not SUPABASE_SERVICE_KEY:
    raise Exception("Missing SUPABASE_SERVICE_KEY")

logger.debug(f"Service key loaded: {bool(SUPABASE_SERVICE_KEY)}")
logger.debug(f"Service key starts with: {SUPABASE_SERVICE_KEY[:20]}")
# ===============================
# STORAGE CONFIG
# ===============================

BUCKET_NAME = "Nyumba"

# =====================================================
# ------------------ IMAGE UPLOAD ---------------------
# =====================================================
async def upload_image_to_bucket(image: UploadFile, folder: str):
    try:
        if not image or not image.filename:
            return None

        file_ext = image.filename.split(".")[-1].lower()
        unique_name = f"{uuid.uuid4()}.{file_ext}"
        storage_path = f"{folder}/{unique_name}"

        file_bytes = await image.read()

        if not file_bytes:
            raise ValueError("Uploaded image is empty")

        supabase_admin.storage.from_(BUCKET_NAME).upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": image.content_type}
        )

        public_url = supabase_admin.storage.from_(BUCKET_NAME).get_public_url(storage_path)

        logger.debug(f"✅ Uploaded image to {storage_path}")
        return public_url

    except Exception as e:
        logger.error(f"❌ Image upload failed: {e}")
        return None


# =====================================================
# ------------------ AGENT FUNCTIONS ------------------
# =====================================================
async def store_agent_details(
    request: Request,
    name: str,
    phone: str,
    email: str,
    password: str,
    location: str,
    image_file: UploadFile = None
):
    try:
        image_url = None

        if image_file:
            image_url = await upload_image_to_bucket(image_file, "agents")

        # ✅ Create user (ADMIN)
        auth_response = supabase_admin.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True
        })

        user = auth_response.user
        if not user:
            return {
                "status": "failed",
                "message": "Auth user not created"
            }

        user_id = user.id

        # ✅ Insert profile (ADMIN client bypasses RLS)
        response = supabase_admin.table("agents_dalalikiganjani").insert({
            "user_id": user_id,
            "name": name,
            "phone": phone,
            "email": email,
            "location": location,
            "profile_image": image_url
        }).execute()

        return {
            "status": "success",
            "message": "Agent registered successfully",
            "data": response.data
        }

    except Exception as e:
        logger.error(f"❌ Error storing agent: {e}")
        return {
            "status": "failed",
            "message": str(e)
        }
# =====================================================
# ------------------ AGENT LOGIN ----------------------
# =====================================================
async def login_agent(email, password):
    try:
        # 1. AUTHENTICATE WITH SUPABASE
        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        supabase_user_id = auth_response.user.id

        # 2. QUERY YOUR AGENTS TABLE
        agent_query = supabase.table("agents_dalalikiganjani") \
            .select("*") \
            .eq("user_id", supabase_user_id) \
            .execute()

        if not agent_query.data:
            return {"status": "failed", "message": "Agent profile not found in database"}

        agent_db_info = agent_query.data[0]

        # 3. FIX: Changed key from 'agent' to 'data' to match your Frontend logic
        return {
            "status": "success",
            "message": "Login successful",
            "data": {  # <--- Changed this from 'agent' to 'data'
                "id": agent_db_info["id"],
                "name": agent_db_info["name"],
                "phone": agent_db_info["phone"],
                "email": agent_db_info["email"],
                "location": agent_db_info["location"],
                "profile_image": agent_db_info.get("profile_image")
            }
        }

    except Exception as e:
        logger.error(f"Login failed: {e}")
        return {"status": "failed", "message": str(e)}
# =====================================================
# ---------------- GET ALL AGENTS ---------------------
# =====================================================
async def get_all_agents():
    try:
        response = supabase.table("agents_dalalikiganjani") \
            .select("id, name, phone, location, profile_image") \
            .execute()

        # ✅ Ensure always list
        agents = response.data if response.data else []

        return {
            "status": "success",
            "count": len(agents),   # optional but useful
            "data": agents
        }

    except Exception as e:
        return {
            "status": "failed",
            "message": str(e),
            "data": []  # ✅ prevent frontend crash
        }


# =====================================================
# ---------------- GET AGENT BY ID --------------------
# =====================================================
async def get_agent_by_id(agent_id: int):
    try:
        response = supabase.table("agents_dalalikiganjani") \
            .select("*") \
            .eq("id", agent_id) \
            .execute()

        if response.data:
            return {
                "status": "success",
                "data": response.data
            }

        return {
            "status": "failed",
            "message": "Agent not found"
        }

    except Exception as e:
        return {
            "status": "failed",
            "message": str(e)
        }

# =====================================================
# ---------------- PROPERTY FUNCTIONS -----------------
# =====================================================

async def add_property(
    name: str,
    location: str,
    price: float,
    status: str,
    phone_number: str,
    agent_id: int,
    image: UploadFile = None
):

    try:
        image_url = None

        if image:
            image_url = await upload_image_to_bucket(
                image,
                f"properties/{agent_id}"
            )
            logger.debug(f"Image uploaded to: {image_url}")

        response = supabase.table("Properties").insert({
            "name": name,
            "location": location,
            "price": price,
            "status": status,
            "phone": phone_number,
            "agent_id": agent_id,
            "image": image_url
        }).execute()
        logger.debug(f"Supabase insert response: {response}")
        return {
            "status": "success",
            "message": "Property added",
            "data": response.data
        }

    except Exception as e:
        logger.critical(f"❌ Error adding property: {e}")
        return {
            "status": "failed",
            "message": str(e)
        }


# =====================================================
# ---------------- GET ALL PROPERTIES -----------------
# =====================================================

async def get_all_properties():

    try:
        response = supabase.table("Properties") \
            .select("*") \
            .execute()

        return {
            "status": "success",
            "data": response.data
        }

    except Exception as e:
        return {
            "status": "failed",
            "message": str(e)
        }


# =====================================================
# -------------- GET PROPERTIES BY AGENT --------------
# =====================================================

async def get_properties_by_agent(agent_id: int):

    try:
        response = supabase.table("Properties") \
            .select("*") \
            .eq("agent_id", agent_id) \
            .execute()

        return {
            "status": "success",
            "data": response.data
        }

    except Exception as e:
        return {
            "status": "failed",
            "message": str(e)
        }


# =====================================================
# ---------------- UPDATE PROPERTY --------------------
# =====================================================
async def update_property(
    prop_id: int,
    prop_name: str,
    prop_location: str,
    prop_price: float,
    agent_id: int,
    image: UploadFile = None
):
    try:
        update_data = {
            "name": prop_name,
            "location": prop_location,
            "price": prop_price,
            "agent_id": agent_id
        }

        if image:
            image_url = await upload_image_to_bucket(
                image,
                f"properties/{agent_id}"
            )
            update_data["image"] = image_url

        response = supabase.table("Properties") \
            .update(update_data) \
            .eq("id", prop_id) \
            .eq("agent_id", agent_id).execute()

        return {
            "status": "success",
            "message": "Property updated",
            "data": response.data
        }

    except Exception as e:
        return {
            "status": "failed",
            "message": str(e)
        }

# =====================================================
# ---------------- DELETE PROPERTY --------------------
# =====================================================
async def delete_property(prop_id: int):
    try:
        res = supabase.table("Properties") \
            .delete() \
            .eq("id", prop_id) \
            .execute()

        # 🔍 Check for errors
        if res.error:
            return {
                "status": "failed",
                "message": res.error.message
            }

        # 🔍 Check if anything was deleted
        if not res.data:
            return {
                "status": "failed",
                "message": "No matching property found or not authorized"
            }

        return {
            "status": "success",
            "message": "Property deleted",
            "data": res.data
        }

    except Exception as e:
        return {
            "status": "failed",
            "message": str(e)
        }