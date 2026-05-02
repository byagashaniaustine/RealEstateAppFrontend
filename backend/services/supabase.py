from supabase import create_client, Client
from dotenv import load_dotenv
from fastapi import UploadFile, Request
import logging
import os
import uuid
from datetime import datetime, timedelta

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
# --- services/supabase.py ---
async def add_property(
    name: str,
    location: str,
    price: float,
    status: str,
    phone_number: str,
    agent_id: int,
    images: list[UploadFile] = None
):
    try:
        image_urls = []
        
        # 1. Upload multiple images to the 'Nyumba' bucket
        if images:
            for image in images:
                # Store in a folder named after the agent_id for organization
                url = await upload_image_to_bucket(image, f"properties/{agent_id}")
                if url:
                    image_urls.append(url)

        # 2. Insert into Supabase table
        # Ensure the 'image' column in Supabase is set to text[]
        response = supabase.table("Properties").insert({
            "name": name,
            "location": location,
            "price": price,
            "status": status,
            "phone": phone_number,
            "agent_id": agent_id,
            "image": image_urls if image_urls else [] 
        }).execute()
        
        return {
            "status": "success", 
            "message": "Property added successfully",
            "data": response.data
        }
    except Exception as e:
        logger.error(f"❌ Error in add_property service: {e}")
        return {"status": "failed", "message": str(e)}
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
# Update this in services/supabase.py
async def update_property(
    prop_id: int,
    prop_name: str,
    prop_location: str,
    prop_price: float,
    agent_id: int,
    status: str,
    images: list[UploadFile] = None
):
    try:
        update_data = {
            "name": prop_name,
            "location": prop_location,
            "price": prop_price,
            "agent_id": agent_id,
            "status": status
        }

        # If the user selected new images in the app
        if images:
            image_urls = []
            for img in images:
                url = await upload_image_to_bucket(img, f"properties/{agent_id}")
                if url:
                    image_urls.append(url)
            
            if image_urls:
                update_data["image"] = image_urls 

        response = supabase.table("Properties") \
            .update(update_data) \
            .eq("id", prop_id) \
            .eq("agent_id", agent_id).execute()

        return {"status": "success", "data": response.data}
    except Exception as e:
        logger.error(f"❌ Update failed: {e}")
        return {"status": "failed", "message": str(e)}
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

# ================= BOOK VISIT =================
async def book_visit(property_id: int, user_name: str, user_phone: str, visit_date: str):
    try:
        existing = supabase_admin.table("Bookings") \
            .select("*") \
            .eq("property_id", property_id) \
            .eq("visit_date", visit_date) \
            .eq("user_phone", user_phone) \
            .execute()

        if existing.data:
            return {"status": "failed", "message": "You already have a booking for this property on that date"}

        response = supabase_admin.table("Bookings").insert({
            "property_id": property_id,
            "user_name": user_name,
            "user_phone": user_phone,
            "visit_date": visit_date,
            "stage": "new",
        }).execute()

        # WhatsApp notification to agent
        try:
            from services.whatsapp import notify_new_booking
            prop_res = supabase.table("Properties").select("name, agent_id").eq("id", property_id).execute()
            if prop_res.data:
                prop = prop_res.data[0]
                agent_res = supabase.table("agents_dalalikiganjani").select("phone").eq("id", prop["agent_id"]).execute()
                if agent_res.data:
                    notify_new_booking(agent_res.data[0]["phone"], user_name, prop["name"], visit_date)
        except Exception as wa_err:
            logger.warning(f"WhatsApp booking notify failed: {wa_err}")

        return {"status": "success", "data": response.data}

    except Exception as e:
        return {"status": "failed", "message": str(e)}


# ================= GET BOOKINGS =================
async def get_bookings(property_id: int):
    try:
        response = supabase_admin.table("Bookings") \
            .select("*") \
            .eq("property_id", property_id) \
            .execute()

        return {"status": "success", "data": response.data}

    except Exception as e:
        return {"status": "failed", "message": str(e)}


# ================= TAKE PROPERTY =================
async def take_property(property_id: int):
    try:
        response = supabase.table("Properties") \
            .update({"status": "unavailable"}) \
            .eq("id", property_id) \
            .execute()

        return {"status": "success", "data": response.data}

    except Exception as e:
        return {"status": "failed", "message": str(e)}


# =====================================================
# ---------------- NEGOTIATIONS -----------------------
# =====================================================

async def send_negotiation(
    property_id: int,
    agent_id: int,
    client_name: str,
    client_phone: str,
    offer_price: float,
    client_message: str,
) -> dict:
    try:
        existing = supabase_admin.table("negotiations") \
            .select("id") \
            .eq("property_id", property_id) \
            .eq("client_phone", client_phone) \
            .execute()

        if existing.data:
            response = supabase_admin.table("negotiations") \
                .update({
                    "offer_price": offer_price,
                    "client_message": client_message,
                    "status": "pending",
                    "agent_response": None,
                }) \
                .eq("id", existing.data[0]["id"]) \
                .execute()
        else:
            response = supabase_admin.table("negotiations").insert({
                "property_id": property_id,
                "agent_id": agent_id,
                "client_name": client_name,
                "client_phone": client_phone,
                "offer_price": offer_price,
                "client_message": client_message,
                "status": "pending",
            }).execute()

        # WhatsApp notification to agent
        try:
            from services.whatsapp import notify_new_offer
            agent_res = supabase.table("agents_dalalikiganjani").select("phone").eq("id", agent_id).execute()
            prop_res = supabase.table("Properties").select("name").eq("id", property_id).execute()
            if agent_res.data and prop_res.data:
                notify_new_offer(agent_res.data[0]["phone"], client_name, prop_res.data[0]["name"], offer_price)
        except Exception as wa_err:
            logger.warning(f"WhatsApp offer notify failed: {wa_err}")

        return {"status": "success", "data": response.data}
    except Exception as e:
        return {"status": "failed", "message": str(e)}


async def get_negotiations_for_client(client_phone: str) -> dict:
    try:
        response = supabase_admin.table("negotiations") \
            .select("*") \
            .eq("client_phone", client_phone) \
            .execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        return {"status": "failed", "message": str(e)}


async def get_negotiations_for_agent(agent_id: int) -> dict:
    try:
        response = supabase_admin.table("negotiations") \
            .select("*") \
            .eq("agent_id", agent_id) \
            .execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        return {"status": "failed", "message": str(e)}


async def respond_to_negotiation(negotiation_id: int, agent_response: str, status: str) -> dict:
    try:
        response = supabase_admin.table("negotiations") \
            .update({"agent_response": agent_response, "status": status}) \
            .eq("id", negotiation_id) \
            .execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        return {"status": "failed", "message": str(e)}


async def reset_agent_password(email: str) -> dict:
    try:
        supabase.auth.reset_password_for_email(email)
        return {"status": "success", "message": "Password reset email sent"}
    except Exception as e:
        return {"status": "failed", "message": str(e)}


# =====================================================
# ---------------- ANALYTICS --------------------------
# =====================================================
async def get_agent_analytics(agent_id: int) -> dict:
    try:
        props_res = supabase.table("Properties").select("id, status").eq("agent_id", agent_id).execute()
        props = props_res.data or []
        prop_ids = [p["id"] for p in props]

        bookings = []
        if prop_ids:
            b_res = supabase_admin.table("Bookings").select("*").in_("property_id", prop_ids).execute()
            bookings = b_res.data or []

        negs_res = supabase_admin.table("negotiations").select("status").eq("agent_id", agent_id).execute()
        negs = negs_res.data or []

        # Last 6 months booking count
        monthly = {}
        for i in range(5, -1, -1):
            d = datetime.now() - timedelta(days=30 * i)
            monthly[d.strftime("%b")] = 0
        for b in bookings:
            try:
                d = datetime.fromisoformat((b.get("created_at") or "")[:10])
                key = d.strftime("%b")
                if key in monthly:
                    monthly[key] += 1
            except Exception:
                pass

        return {
            "status": "success",
            "data": {
                "properties": {
                    "total": len(props),
                    "available": sum(1 for p in props if p["status"] == "available"),
                    "booked": sum(1 for p in props if p["status"] == "booked"),
                    "unavailable": sum(1 for p in props if p["status"] == "unavailable"),
                },
                "bookings": {
                    "total": len(bookings),
                    "stages": {
                        "new": sum(1 for b in bookings if (b.get("stage") or "new") == "new"),
                        "contacted": sum(1 for b in bookings if b.get("stage") == "contacted"),
                        "viewing_scheduled": sum(1 for b in bookings if b.get("stage") == "viewing_scheduled"),
                        "closed": sum(1 for b in bookings if b.get("stage") == "closed"),
                        "lost": sum(1 for b in bookings if b.get("stage") == "lost"),
                    },
                    "monthly": monthly,
                },
                "negotiations": {
                    "total": len(negs),
                    "pending": sum(1 for n in negs if n.get("status") == "pending"),
                    "accepted": sum(1 for n in negs if n.get("status") == "accepted"),
                    "rejected": sum(1 for n in negs if n.get("status") == "rejected"),
                },
            },
        }
    except Exception as e:
        return {"status": "failed", "message": str(e)}


# =====================================================
# ---------------- LEAD PIPELINE ----------------------
# =====================================================
async def get_agent_leads(agent_id: int) -> dict:
    try:
        props_res = supabase.table("Properties").select("id, name").eq("agent_id", agent_id).execute()
        prop_map = {p["id"]: p["name"] for p in (props_res.data or [])}
        prop_ids = list(prop_map.keys())

        if not prop_ids:
            return {"status": "success", "data": []}

        b_res = supabase_admin.table("Bookings").select("*").in_("property_id", prop_ids).execute()
        bookings = b_res.data or []
        for b in bookings:
            b["property_name"] = prop_map.get(b.get("property_id"), "Unknown")
            if not b.get("stage"):
                b["stage"] = "new"

        return {"status": "success", "data": bookings}
    except Exception as e:
        return {"status": "failed", "message": str(e)}


async def update_lead_stage(booking_id: int, stage: str) -> dict:
    try:
        res = supabase_admin.table("Bookings").update({"stage": stage}).eq("id", booking_id).execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        return {"status": "failed", "message": str(e)}


# =====================================================
# ---------------- SUBSCRIPTIONS ----------------------
# =====================================================
async def get_agent_subscription(agent_id: int) -> dict:
    try:
        res = supabase_admin.table("subscriptions") \
            .select("*") \
            .eq("agent_id", agent_id) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        return {"status": "success", "data": res.data[0] if res.data else None}
    except Exception as e:
        return {"status": "failed", "message": str(e)}


async def create_subscription(agent_id: int, plan: str, tx_ref: str, amount: float) -> dict:
    try:
        days = 365 if plan == "annual" else 30
        start = datetime.now()
        end = start + timedelta(days=days)

        supabase_admin.table("subscriptions") \
            .update({"status": "expired"}) \
            .eq("agent_id", agent_id) \
            .eq("status", "active") \
            .execute()

        res = supabase_admin.table("subscriptions").insert({
            "agent_id": agent_id,
            "plan": plan,
            "status": "active",
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "tx_ref": tx_ref,
            "amount": amount,
        }).execute()
        return {"status": "success", "data": res.data}
    except Exception as e:
        return {"status": "failed", "message": str(e)}


async def update_property_status(property_id: int, agent_id: int, new_status: str) -> dict:
    try:
        response = supabase_admin.table("Properties") \
            .update({"status": new_status}) \
            .eq("id", property_id) \
            .eq("agent_id", agent_id) \
            .execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        return {"status": "failed", "message": str(e)}