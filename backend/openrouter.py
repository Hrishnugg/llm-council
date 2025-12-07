"""OpenRouter API client for making LLM requests."""

import httpx
import base64
import json
import asyncio
from typing import List, Dict, Any, Optional, Union, AsyncGenerator


from .config import OPENROUTER_API_KEY, OPENROUTER_API_URL


def build_multimodal_content(
    text: str, 
    attachments: Optional[List[Dict[str, str]]] = None
) -> Union[str, List[Dict[str, Any]]]:
    """
    Build content for a message, supporting both text-only and multimodal (with images/files).
    
    Args:
        text: The text content
        attachments: Optional list of attachments with 'type', 'media_type', 'data' (base64), and 'filename'
    
    Returns:
        Either a string (text-only) or a list of content parts (multimodal)
    """
    if not attachments:
        return text
    
    # Build multimodal content array
    content_parts: List[Dict[str, Any]] = []
    
    # Add text first
    if text:
        content_parts.append({
            "type": "text",
            "text": text
        })
    
    # Add attachments
    for attachment in attachments:
        media_type = attachment.get("media_type", "")
        data = attachment.get("data", "")
        filename = attachment.get("filename", "unknown")
        
        if attachment.get("type") == "image":
            # Images are sent as image_url with base64 data URL
            content_parts.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{media_type};base64,{data}"
                }
            })
        elif media_type == "application/pdf":
            # PDFs - send as file content for models that support it
            # OpenRouter/OpenAI format for file attachments
            content_parts.append({
                "type": "file",
                "file": {
                    "filename": filename,
                    "file_data": f"data:{media_type};base64,{data}"
                }
            })
            # Also add a text note about the file
            content_parts.append({
                "type": "text", 
                "text": f"\n[The above is the content of the attached PDF file: {filename}]\n"
            })
        elif media_type.startswith("text/") or filename.endswith(('.txt', '.md', '.json', '.csv', '.py', '.js', '.ts')):
            # Text files - decode and include as text
            try:
                decoded_text = base64.b64decode(data).decode('utf-8')
                content_parts.append({
                    "type": "text",
                    "text": f"\n--- Content of {filename} ---\n{decoded_text}\n--- End of {filename} ---\n"
                })
            except Exception as e:
                content_parts.append({
                    "type": "text",
                    "text": f"\n[Attached file: {filename} (could not decode: {str(e)})]\n"
                })
        else:
            # Other file types - just note that they were attached
            content_parts.append({
                "type": "text",
                "text": f"\n[Attached file: {filename} ({media_type}) - binary content not directly readable]\n"
            })
    
    return content_parts if content_parts else text


async def query_model(
    model: str,
    messages: List[Dict[str, Any]],
    timeout: float = 120.0
) -> Optional[Dict[str, Any]]:
    """
    Query a single model via OpenRouter API.

    Args:
        model: OpenRouter model identifier (e.g., "openai/gpt-4o")
        messages: List of message dicts with 'role' and 'content' (content can be string or multimodal array)
        timeout: Request timeout in seconds

    Returns:
        Response dict with 'content' and optional 'reasoning_details', or None if failed
    """
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                OPENROUTER_API_URL,
                headers=headers,
                json=payload
            )
            response.raise_for_status()

            data = response.json()
            message = data['choices'][0]['message']
            
            # Debug: print message keys to understand the structure
            print(f"[{model}] Message keys: {list(message.keys())}")
            
            # OpenRouter returns reasoning in various fields depending on model
            reasoning = (
                message.get('reasoning') or 
                message.get('reasoning_content') or 
                message.get('reasoning_details') or
                message.get('thinking') or
                message.get('thought')
            )
            
            # If reasoning is an array of objects, extract readable text
            if isinstance(reasoning, list):
                readable_parts = []
                for item in reasoning:
                    if isinstance(item, dict):
                        # Skip encrypted reasoning (not readable)
                        item_type = item.get('type', '')
                        if 'encrypted' in item_type:
                            continue
                        # Extract summary (OpenAI format) or text/thinking
                        text = item.get('summary') or item.get('text') or item.get('thinking') or item.get('content')
                        if text:
                            readable_parts.append(str(text))
                    elif isinstance(item, str):
                        readable_parts.append(item)
                
                reasoning = '\n\n'.join(readable_parts) if readable_parts else None
            
            # Debug: log what we got
            if reasoning:
                print(f"[{model}] Reasoning found: {len(str(reasoning))} chars, preview: {str(reasoning)[:100]}...")
            else:
                print(f"[{model}] No readable reasoning found")

            return {
                'content': message.get('content'),
                'reasoning_details': reasoning
            }

    except Exception as e:
        print(f"Error querying model {model}: {e}")
        return None


async def query_models_parallel(
    models: List[str],
    messages: List[Dict[str, Any]]
) -> Dict[str, Optional[Dict[str, Any]]]:
    """
    Query multiple models in parallel.

    Args:
        models: List of OpenRouter model identifiers
        messages: List of message dicts to send to each model

    Returns:
        Dict mapping model identifier to response dict (or None if failed)
    """
    # Create tasks for all models
    tasks = [query_model(model, messages) for model in models]

    # Wait for all to complete
    responses = await asyncio.gather(*tasks)

    # Map models to their responses
    return {model: response for model, response in zip(models, responses)}


async def query_model_stream(
    model: str,
    messages: List[Dict[str, Any]],
    timeout: float = 120.0
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Query a single model via OpenRouter API with streaming.

    Args:
        model: OpenRouter model identifier (e.g., "openai/gpt-4o")
        messages: List of message dicts with 'role' and 'content'
        timeout: Request timeout in seconds

    Yields:
        Dicts with 'type' ('delta', 'reasoning', 'done', 'error') and content
    """
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST",
                OPENROUTER_API_URL,
                headers=headers,
                json=payload
            ) as response:
                response.raise_for_status()
                
                full_content = ""
                reasoning_parts = []
                
                async for line in response.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    
                    data_str = line[6:]  # Remove "data: " prefix
                    
                    if data_str == "[DONE]":
                        break
                    
                    try:
                        data = json.loads(data_str)
                        
                        if "choices" in data and len(data["choices"]) > 0:
                            choice = data["choices"][0]
                            delta = choice.get("delta", {})
                            
                            # Handle content delta
                            if "content" in delta and delta["content"]:
                                content_chunk = delta["content"]
                                full_content += content_chunk
                                yield {
                                    "type": "delta",
                                    "content": content_chunk
                                }
                            
                            # Handle reasoning (some models stream this)
                            if "reasoning" in delta:
                                reasoning_parts.append(delta["reasoning"])
                                yield {
                                    "type": "reasoning_delta",
                                    "content": delta["reasoning"]
                                }
                            
                    except json.JSONDecodeError:
                        continue
                
                # Process any accumulated reasoning
                reasoning = None
                if reasoning_parts:
                    # Join reasoning parts
                    raw_reasoning = reasoning_parts if isinstance(reasoning_parts[0], dict) else ''.join(reasoning_parts)
                    
                    if isinstance(raw_reasoning, list):
                        readable_parts = []
                        for item in raw_reasoning:
                            if isinstance(item, dict):
                                item_type = item.get('type', '')
                                if 'encrypted' in item_type:
                                    continue
                                text = item.get('summary') or item.get('text') or item.get('thinking') or item.get('content')
                                if text:
                                    readable_parts.append(str(text))
                            elif isinstance(item, str):
                                readable_parts.append(item)
                        reasoning = '\n\n'.join(readable_parts) if readable_parts else None
                    else:
                        reasoning = raw_reasoning
                
                # Yield final complete response
                yield {
                    "type": "done",
                    "content": full_content,
                    "reasoning": reasoning
                }
                
    except Exception as e:
        print(f"Error streaming model {model}: {e}")
        yield {
            "type": "error",
            "error": str(e)
        }


async def stream_models_parallel(
    models: List[str],
    messages: List[Dict[str, Any]]
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Stream responses from multiple models in parallel.
    Yields events as each model produces content.

    Args:
        models: List of OpenRouter model identifiers
        messages: List of message dicts to send to each model

    Yields:
        Dicts with 'model', 'type', and content fields
    """
    # Create queues for each model's output
    queues: Dict[str, asyncio.Queue] = {model: asyncio.Queue() for model in models}
    results: Dict[str, Dict[str, Any]] = {}
    
    async def stream_single_model(model: str, queue: asyncio.Queue):
        """Stream a single model and put results in queue."""
        full_content = ""
        reasoning = None
        
        async for event in query_model_stream(model, messages):
            if event["type"] == "delta":
                full_content += event["content"]
                await queue.put({
                    "model": model,
                    "type": "delta",
                    "content": event["content"]
                })
            elif event["type"] == "reasoning_delta":
                await queue.put({
                    "model": model,
                    "type": "reasoning_delta", 
                    "content": event["content"]
                })
            elif event["type"] == "done":
                reasoning = event.get("reasoning")
                await queue.put({
                    "model": model,
                    "type": "done",
                    "content": event["content"],
                    "reasoning": reasoning
                })
            elif event["type"] == "error":
                await queue.put({
                    "model": model,
                    "type": "error",
                    "error": event["error"]
                })
        
        # Signal this model is complete
        await queue.put(None)
        
        # Store final result
        results[model] = {
            "content": full_content,
            "reasoning_details": reasoning
        }
    
    # Start all model streams
    tasks = [
        asyncio.create_task(stream_single_model(model, queues[model]))
        for model in models
    ]
    
    # Merge outputs from all queues
    active_models = set(models)
    
    while active_models:
        # Check each queue for new data
        for model in list(active_models):
            queue = queues[model]
            try:
                # Non-blocking get
                event = queue.get_nowait()
                if event is None:
                    # Model completed
                    active_models.remove(model)
                else:
                    yield event
            except asyncio.QueueEmpty:
                pass
        
        # Small delay to prevent busy-waiting
        if active_models:
            await asyncio.sleep(0.01)
    
    # Wait for all tasks to complete
    await asyncio.gather(*tasks)
    
    # Yield final results summary
    yield {
        "type": "all_complete",
        "results": results
    }
