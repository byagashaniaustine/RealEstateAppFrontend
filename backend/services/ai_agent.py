import json
import anthropic
from services.supabase import (
    get_all_properties,
    get_all_agents,
    get_agent_by_id,
    book_visit,
    get_bookings,
    send_negotiation,
    get_negotiations_for_client,
    get_properties_by_agent,
    get_negotiations_for_agent,
    respond_to_negotiation,
    update_property_status,
)

client = anthropic.Anthropic()

TOOLS = [
    {
        "name": "search_properties",
        "description": (
            "Search and filter property listings. Returns properties matching the criteria. "
            "Use this when the user asks to find, browse, or filter properties."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "Filter by location (partial match, case-insensitive)",
                },
                "name": {
                    "type": "string",
                    "description": "Filter by property name (partial match)",
                },
                "status": {
                    "type": "string",
                    "enum": ["available", "booked", "unavailable"],
                    "description": "Filter by availability status",
                },
                "max_price": {"type": "number", "description": "Maximum price (TZS)"},
                "min_price": {"type": "number", "description": "Minimum price (TZS)"},
            },
        },
    },
    {
        "name": "get_property_details",
        "description": "Get full details and existing bookings for a specific property by its ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "property_id": {"type": "integer", "description": "The numeric property ID"}
            },
            "required": ["property_id"],
        },
    },
    {
        "name": "book_property_visit",
        "description": (
            "Book a property visit for a client. "
            "Requires the client's name, phone number, the property ID, and the desired visit date."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "property_id": {"type": "integer", "description": "The property ID"},
                "user_name": {"type": "string", "description": "Client's full name"},
                "user_phone": {"type": "string", "description": "Client's phone number"},
                "visit_date": {
                    "type": "string",
                    "description": "Visit date in YYYY-MM-DD format",
                },
            },
            "required": ["property_id", "user_name", "user_phone", "visit_date"],
        },
    },
    {
        "name": "get_agents",
        "description": "Get a list of registered real estate agents, or look up a specific agent by ID.",
        "input_schema": {
            "type": "object",
            "properties": {
                "agent_id": {
                    "type": "integer",
                    "description": "Specific agent ID (omit to get all agents)",
                }
            },
        },
    },
    {
        "name": "check_property_bookings",
        "description": "Check existing bookings for a property to see which dates are already taken.",
        "input_schema": {
            "type": "object",
            "properties": {
                "property_id": {"type": "integer", "description": "The property ID"}
            },
            "required": ["property_id"],
        },
    },
    {
        "name": "send_offer",
        "description": (
            "Send a price offer / negotiation message to the property's agent on behalf of the client. "
            "Use this when the user wants to negotiate price or make an offer on a property. "
            "You MUST have property_id, agent_id, client name, phone, offer price, and a message before calling this."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "property_id": {"type": "integer", "description": "The property ID"},
                "agent_id": {"type": "integer", "description": "The agent ID who owns the property"},
                "client_name": {"type": "string", "description": "Client's full name"},
                "client_phone": {"type": "string", "description": "Client's phone number"},
                "offer_price": {"type": "number", "description": "The offered price in TZS"},
                "client_message": {
                    "type": "string",
                    "description": "The negotiation message to send to the agent",
                },
            },
            "required": [
                "property_id", "agent_id", "client_name",
                "client_phone", "offer_price", "client_message",
            ],
        },
    },
    {
        "name": "get_my_offers",
        "description": "Get all negotiation offers previously sent by this client, including agent responses.",
        "input_schema": {
            "type": "object",
            "properties": {
                "client_phone": {"type": "string", "description": "Client's phone number"}
            },
            "required": ["client_phone"],
        },
    },
]

SYSTEM_PROMPT = """You are Dalali AI, the smart assistant for DalaliKiganjani — a Tanzanian real estate platform.
You help clients find properties, book visits, negotiate prices, and connect with agents.

Guidelines:
- When searching for properties, always call search_properties first.
- Before booking, confirm you have the user's name, phone, desired property, and date.
- When the user wants to negotiate or make an offer, first get the property details (to get the agent_id),
  then help craft a compelling but fair negotiation message, then call send_offer.
- If the user asks about their offers/negotiations, call get_my_offers with their phone number.
- Always include property IDs when listing properties.
- Format prices as "TZS X,XXX,XXX".
- If the user writes in Swahili, respond in Swahili.
- Be concise and friendly. This is a mobile app — keep responses short."""


async def _execute_tool(tool_name: str, tool_input: dict) -> str:
    try:
        if tool_name == "search_properties":
            result = await get_all_properties()
            props = result.get("data") or []

            if tool_input.get("location"):
                loc = tool_input["location"].lower()
                props = [p for p in props if loc in (p.get("location") or "").lower()]
            if tool_input.get("name"):
                nm = tool_input["name"].lower()
                props = [p for p in props if nm in (p.get("name") or "").lower()]
            if tool_input.get("status"):
                props = [p for p in props if p.get("status") == tool_input["status"]]
            if tool_input.get("max_price") is not None:
                props = [p for p in props if (p.get("price") or 0) <= tool_input["max_price"]]
            if tool_input.get("min_price") is not None:
                props = [p for p in props if (p.get("price") or 0) >= tool_input["min_price"]]

            simplified = [
                {
                    "id": p.get("id"),
                    "name": p.get("name"),
                    "location": p.get("location"),
                    "price": p.get("price"),
                    "status": p.get("status"),
                    "phone": p.get("phone_number") or p.get("phone"),
                    "agent_id": p.get("agent_id"),
                }
                for p in props
            ]
            return json.dumps({"properties": simplified, "count": len(simplified)})

        elif tool_name == "get_property_details":
            result = await get_all_properties()
            props = result.get("data") or []
            pid = tool_input["property_id"]
            prop = next((p for p in props if p.get("id") == pid), None)
            if not prop:
                return json.dumps({"error": "Property not found"})
            bookings_result = await get_bookings(pid)
            return json.dumps(
                {
                    "property": {
                        "id": prop.get("id"),
                        "name": prop.get("name"),
                        "location": prop.get("location"),
                        "price": prop.get("price"),
                        "status": prop.get("status"),
                        "phone": prop.get("phone_number") or prop.get("phone"),
                        "agent_id": prop.get("agent_id"),
                    },
                    "bookings": bookings_result.get("data") or [],
                }
            )

        elif tool_name == "book_property_visit":
            result = await book_visit(
                tool_input["property_id"],
                tool_input["user_name"],
                tool_input["user_phone"],
                tool_input["visit_date"],
            )
            return json.dumps(result)

        elif tool_name == "get_agents":
            if tool_input.get("agent_id"):
                result = await get_agent_by_id(tool_input["agent_id"])
            else:
                result = await get_all_agents()
            return json.dumps(result)

        elif tool_name == "check_property_bookings":
            result = await get_bookings(tool_input["property_id"])
            return json.dumps(result)

        elif tool_name == "send_offer":
            result = await send_negotiation(
                property_id=tool_input["property_id"],
                agent_id=tool_input["agent_id"],
                client_name=tool_input["client_name"],
                client_phone=tool_input["client_phone"],
                offer_price=tool_input["offer_price"],
                client_message=tool_input["client_message"],
            )
            return json.dumps(result)

        elif tool_name == "get_my_offers":
            result = await get_negotiations_for_client(tool_input["client_phone"])
            return json.dumps(result)

        return json.dumps({"error": f"Unknown tool: {tool_name}"})

    except Exception as e:
        return json.dumps({"error": str(e)})


async def run_agent(
    message: str,
    user_name: str = None,
    user_phone: str = None,
    property_context: dict = None,
    history: list = None,
) -> dict:
    system = SYSTEM_PROMPT
    if user_name or user_phone:
        system += f"\n\nCurrent user — name: {user_name or 'unknown'}, phone: {user_phone or 'unknown'}."
    if property_context:
        system += (
            f"\n\nThe user is currently viewing property: ID={property_context.get('id')}, "
            f"name='{property_context.get('name')}', price={property_context.get('price')}, "
            f"location='{property_context.get('location')}', agent_id={property_context.get('agent_id')}."
        )

    messages = []
    if history:
        for turn in history:
            messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": message})

    for _ in range(10):
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=system,
            tools=TOOLS,
            messages=messages,
        )

        if response.stop_reason == "end_turn":
            text = next(
                (block.text for block in response.content if hasattr(block, "text")), ""
            )
            return {"status": "success", "reply": text}

        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = await _execute_tool(block.name, block.input)
                    tool_results.append(
                        {"type": "tool_result", "tool_use_id": block.id, "content": result}
                    )
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})
        else:
            text = next(
                (block.text for block in response.content if hasattr(block, "text")), ""
            )
            return {"status": "success", "reply": text or "I could not process that request."}

    return {"status": "error", "reply": "The request took too many steps. Please try again."}


# =====================================================
# ----------------  AGENT AI  -------------------------
# =====================================================

AGENT_TOOLS = [
    {
        "name": "get_my_properties",
        "description": "Get all properties listed by this agent, with optional status filter.",
        "input_schema": {
            "type": "object",
            "properties": {
                "status": {
                    "type": "string",
                    "enum": ["available", "booked", "unavailable"],
                    "description": "Filter by status (omit for all)",
                }
            },
        },
    },
    {
        "name": "get_my_negotiations",
        "description": "Get all price offers/negotiations sent by clients for this agent's properties.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "respond_to_offer",
        "description": (
            "Accept, reject, or counter a client's price offer. "
            "Use this when the agent wants to reply to a negotiation."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "negotiation_id": {"type": "integer", "description": "The negotiation ID"},
                "agent_response": {"type": "string", "description": "The response message to the client"},
                "status": {
                    "type": "string",
                    "enum": ["accepted", "rejected", "countered"],
                    "description": "Outcome of the negotiation",
                },
            },
            "required": ["negotiation_id", "agent_response", "status"],
        },
    },
    {
        "name": "update_property_status",
        "description": "Change the availability status of one of this agent's properties.",
        "input_schema": {
            "type": "object",
            "properties": {
                "property_id": {"type": "integer", "description": "The property ID"},
                "new_status": {
                    "type": "string",
                    "enum": ["available", "booked", "unavailable"],
                },
            },
            "required": ["property_id", "new_status"],
        },
    },
]

AGENT_SYSTEM_PROMPT = """You are Dalali AI Assistant — an intelligent assistant for real estate agents on DalaliKiganjani, a Tanzanian property platform.

Your job is to help agents manage their business efficiently:
- Summarize their portfolio (listings, statuses, pricing)
- Review and help respond to client offers and negotiations
- Draft professional yet friendly negotiation responses in the agent's voice
- Suggest pricing strategies based on property details
- Update property statuses when instructed

Guidelines:
- Always fetch data before giving advice (e.g. call get_my_negotiations before discussing offers).
- When drafting negotiation responses, be professional, concise, and reflect Tanzanian business culture.
- Format prices as "TZS X,XXX,XXX".
- If the agent writes in Swahili, respond in Swahili.
- Be concise — this is a mobile app."""


async def _execute_agent_tool(tool_name: str, tool_input: dict, agent_id: int) -> str:
    try:
        if tool_name == "get_my_properties":
            result = await get_properties_by_agent(agent_id)
            props = result.get("data") or []
            if tool_input.get("status"):
                props = [p for p in props if p.get("status") == tool_input["status"]]
            simplified = [
                {
                    "id": p.get("id"),
                    "name": p.get("name"),
                    "location": p.get("location"),
                    "price": p.get("price"),
                    "status": p.get("status"),
                }
                for p in props
            ]
            return json.dumps({"properties": simplified, "count": len(simplified)})

        elif tool_name == "get_my_negotiations":
            result = await get_negotiations_for_agent(agent_id)
            return json.dumps(result)

        elif tool_name == "respond_to_offer":
            result = await respond_to_negotiation(
                tool_input["negotiation_id"],
                tool_input["agent_response"],
                tool_input["status"],
            )
            return json.dumps(result)

        elif tool_name == "update_property_status":
            result = await update_property_status(
                tool_input["property_id"],
                agent_id,
                tool_input["new_status"],
            )
            return json.dumps(result)

        return json.dumps({"error": f"Unknown tool: {tool_name}"})

    except Exception as e:
        return json.dumps({"error": str(e)})


async def run_agent_assistant(message: str, agent_id: int, agent_name: str = None, history: list = None) -> dict:
    system = AGENT_SYSTEM_PROMPT
    system += f"\n\nCurrent agent — ID: {agent_id}, name: {agent_name or 'unknown'}."

    messages = []
    if history:
        for turn in history:
            messages.append({"role": turn["role"], "content": turn["content"]})
    messages.append({"role": "user", "content": message})

    for _ in range(10):
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=system,
            tools=AGENT_TOOLS,
            messages=messages,
        )

        if response.stop_reason == "end_turn":
            text = next(
                (block.text for block in response.content if hasattr(block, "text")), ""
            )
            return {"status": "success", "reply": text}

        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = await _execute_agent_tool(block.name, block.input, agent_id)
                    tool_results.append(
                        {"type": "tool_result", "tool_use_id": block.id, "content": result}
                    )
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})
        else:
            text = next(
                (block.text for block in response.content if hasattr(block, "text")), ""
            )
            return {"status": "success", "reply": text or "I could not process that request."}

    return {"status": "error", "reply": "The request took too many steps. Please try again."}
