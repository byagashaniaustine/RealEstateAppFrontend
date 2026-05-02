import logging
from fastapi import FastAPI, Request, HTTPException, UploadFile, File, Form, Depends, Body
from pydantic import BaseModel
from typing import Optional

# Import your services
from services.ai_agent import run_agent, run_agent_assistant
from services.supabase import (
    get_bookings,
    store_agent_details,
    login_agent,
    add_property as add_property_service,
    get_properties_by_agent,
    take_property,
    book_visit,
    update_property,
    delete_property,
    get_all_properties,
    get_all_agents,
    get_agent_by_id,
    get_negotiations_for_agent,
    respond_to_negotiation,
    reset_agent_password,
    get_agent_analytics,
    get_agent_leads,
    update_lead_stage,
    get_agent_subscription,
    create_subscription,
)
from services.billing import initiate_payment, verify_transaction

app = FastAPI()

# ------------------ LOGGING ------------------
logger = logging.getLogger("app")
logging.basicConfig(level=logging.DEBUG)

# ------------------ MODELS ------------------

class AgentLogin(BaseModel):
    email: str
    password: str

class PropertyUpdate(BaseModel):
    name: str
    location: str
    price: float
    agent_id: int

class ChatHistoryMessage(BaseModel):
    role: str
    content: str

class AIChatRequest(BaseModel):
    message: str
    user_name: Optional[str] = None
    user_phone: Optional[str] = None
    property_context: Optional[dict] = None
    history: Optional[list[ChatHistoryMessage]] = None

class AgentChatRequest(BaseModel):
    message: str
    agent_id: int
    agent_name: Optional[str] = None
    history: Optional[list[ChatHistoryMessage]] = None

# ------------------ AGENT ROUTES ------------------

@app.post("/login")
async def login(credentials: AgentLogin):
    try:
        # This service should handle Supabase Auth + Database lookup
        # and return the agent dictionary from your 'agents' table
        response = await login_agent(credentials.email, credentials.password)
        
        if response.get("status") == "failed":
            raise HTTPException(status_code=401, detail=response.get("message"))

        logger.debug(f"Login response: {response}")
        return response

    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/forgot-password")
async def forgot_password(body: dict = Body(...)):
    email = body.get("email", "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    return await reset_agent_password(email)


@app.post("/register")
async def register_user_endpoint(
    request: Request,
    name: str = Form(...),
    phone: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    location: str = Form(...),
    image: UploadFile = File(None)
):
    try:
        response = await store_agent_details(
            request, name, phone, email, password, location, image
        )
        logger.debug(f"Registration response: {response}")
        return response
    except Exception as e:
        logger.error(f"Registration failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/get_agents")
async def get_agents_endpoint(agent_id: Optional[int] = None):
    try:
        if agent_id:
            return await get_agent_by_id(agent_id)

        return await get_all_agents()

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ------------------ PROPERTY ROUTES ------------------

@app.get("/properties")
async def get_properties_endpoint(agent_id: Optional[int] = None):
    try:
        # If agent_id is provided, filter properties
        if agent_id:
            return await get_properties_by_agent(agent_id)
        return await get_all_properties()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# --- main.py ---
@app.post("/addproperties/{agent_id}")
async def add_property_endpoint(
    agent_id: int,
    name: str = Form(...),
    location: str = Form(...),
    price: float = Form(...),
    status: str = Form(...),
    phone_number: str = Form(...), # Ensure this matches frontend key
    images: list[UploadFile] = File(None) 
):
    try:
        # Calls the updated service function below
        response = await add_property_service(
            name=name,
            location=location,
            price=price,
            status=status,
            phone_number=phone_number,
            agent_id=agent_id,
            images=images
        )
        return response
    except Exception as e:
        logger.error(f"Add property route error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.delete("/properties/{property_id}")
async def delete_property_endpoint(property_id: int):
    try:
        response = await delete_property(property_id)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@app.put("/properties/{property_id}")
async def update_property_endpoint(
    property_id: int,
    name: str = Form(...),
    location: str = Form(...),
    price: float = Form(...),
    agent_id: int = Form(...),
    status: str = Form(...),
    images: list[UploadFile] = File(None) 
):
    try:
        # Calls the updated service below
        response = await update_property(
            prop_id=property_id,
            prop_name=name,
            prop_location=location,
            prop_price=price,
            agent_id=agent_id,
            status=status,
            images=images
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# ================= BOOK =================
@app.post("/book")
async def book_property(
    property_id: int = Body(...),
    user_name: str = Body(...),
    user_phone: str = Body(...),
    visit_date: str = Body(...)
):
    return await book_visit(property_id, user_name, user_phone, visit_date)


# ================= GET BOOKINGS =================
@app.get("/bookings/{property_id}")
async def bookings(property_id: int):
    return await get_bookings(property_id)


# ================= TAKE PROPERTY =================
@app.put("/take/{property_id}")
async def take(property_id: int):
    return await take_property(property_id)


# ================= NEGOTIATIONS =================

@app.get("/negotiations/agent/{agent_id}")
async def get_agent_negotiations(agent_id: int):
    try:
        return await get_negotiations_for_agent(agent_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class NegotiationResponse(BaseModel):
    agent_response: str
    status: str  # "accepted" | "rejected" | "countered"

@app.put("/negotiations/{negotiation_id}/respond")
async def respond_negotiation(negotiation_id: int, body: NegotiationResponse):
    try:
        return await respond_to_negotiation(negotiation_id, body.agent_response, body.status)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ================= AI AGENT =================
@app.post("/ai/chat")
async def ai_chat(body: AIChatRequest):
    try:
        result = await run_agent(
            message=body.message,
            user_name=body.user_name,
            user_phone=body.user_phone,
            property_context=body.property_context,
            history=[{"role": m.role, "content": m.content} for m in body.history] if body.history else None,
        )
        return result
    except Exception as e:
        logger.error(f"AI chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ai/agent-chat")
async def agent_ai_chat(body: AgentChatRequest):
    try:
        result = await run_agent_assistant(
            message=body.message,
            agent_id=body.agent_id,
            agent_name=body.agent_name,
            history=[{"role": m.role, "content": m.content} for m in body.history] if body.history else None,
        )
        return result
    except Exception as e:
        logger.error(f"Agent AI chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ================= ANALYTICS =================

@app.get("/analytics/agent/{agent_id}")
async def analytics(agent_id: int):
    try:
        return await get_agent_analytics(agent_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ================= LEAD PIPELINE =================

@app.get("/leads/agent/{agent_id}")
async def leads(agent_id: int):
    try:
        return await get_agent_leads(agent_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class LeadStageUpdate(BaseModel):
    stage: str

@app.put("/leads/{booking_id}/stage")
async def lead_stage(booking_id: int, body: LeadStageUpdate):
    try:
        return await update_lead_stage(booking_id, body.stage)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ================= BILLING =================

class PaymentInitRequest(BaseModel):
    agent_id: int
    agent_name: str
    agent_email: str
    plan: str
    redirect_url: str

@app.post("/billing/initiate")
async def billing_initiate(body: PaymentInitRequest):
    try:
        return await initiate_payment(
            agent_id=body.agent_id,
            agent_name=body.agent_name,
            agent_email=body.agent_email,
            plan=body.plan,
            redirect_url=body.redirect_url,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/billing/webhook")
async def billing_webhook(request: Request):
    try:
        data = await request.json()
        tx_ref = data.get("txRef") or data.get("tx_ref")
        if not tx_ref:
            return {"status": "ignored"}
        result = await verify_transaction(tx_ref)
        if result.get("verified"):
            await create_subscription(
                agent_id=int(result["agent_id"]),
                plan=result["plan"],
                tx_ref=tx_ref,
                amount=result["amount"],
            )
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Billing webhook error: {e}")
        return {"status": "error"}


@app.get("/billing/status/{agent_id}")
async def billing_status(agent_id: int):
    try:
        return await get_agent_subscription(agent_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/billing/verify/{tx_ref}")
async def billing_verify(tx_ref: str, agent_id: int):
    try:
        result = await verify_transaction(tx_ref)
        if result.get("verified"):
            await create_subscription(
                agent_id=agent_id,
                plan=result.get("plan", "monthly"),
                tx_ref=tx_ref,
                amount=result.get("amount", 0),
            )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

