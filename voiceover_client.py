import requests
import json
import time
from typing import Optional, List, Dict, Any
from dataclasses import dataclass

@dataclass
class VoiceOverResponse:
    success: bool
    message: Optional[str] = None
    currentItem: Optional[str] = None
    responses: Optional[List[str]] = None
    error: Optional[str] = None

class VoiceOverClient:
    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url
        
    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> VoiceOverResponse:
        """Make HTTP request to VoiceOver server"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url)
            elif method.upper() == "POST":
                response = requests.post(url, json=data or {})
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            result = response.json()
            
            return VoiceOverResponse(
                success=result.get("success", False),
                message=result.get("message"),
                currentItem=result.get("currentItem"),
                responses=result.get("responses"),
                error=result.get("error")
            )
            
        except requests.exceptions.ConnectionError:
            return VoiceOverResponse(
                success=False,
                error="Could not connect to VoiceOver server. Make sure it's running."
            )
        except Exception as e:
            return VoiceOverResponse(
                success=False,
                error=str(e)
            )
    
    def start_voiceover(self) -> VoiceOverResponse:
        """Start VoiceOver"""
        return self._make_request("POST", "/voiceover/start")
    
    def stop_voiceover(self) -> VoiceOverResponse:
        """Stop VoiceOver"""
        return self._make_request("POST", "/voiceover/stop")
    
    def type_text(self, text: str) -> VoiceOverResponse:
        """Type text using VoiceOver"""
        return self._make_request("POST", "/voiceover/type", {"text": text})
    
    def navigate_next(self) -> VoiceOverResponse:
        """Navigate to next element"""
        return self._make_request("POST", "/voiceover/next")
    
    def navigate_previous(self) -> VoiceOverResponse:
        """Navigate to previous element"""
        return self._make_request("POST", "/voiceover/previous")
    
    def get_current_item(self) -> VoiceOverResponse:
        """Get current item being read by VoiceOver"""
        return self._make_request("GET", "/voiceover/current")
    
    def click_current(self) -> VoiceOverResponse:
        """Click/activate current item"""
        return self._make_request("POST", "/voiceover/click")
    
    def open_app(self, app_name: str) -> VoiceOverResponse:
        """Open an application"""
        return self._make_request("POST", "/system/open-app", {"appName": app_name})
    
    def press_key(self, key: str) -> VoiceOverResponse:
        """Press a key"""
        return self._make_request("POST", "/system/press-key", {"key": key})
    
    def open_copilot_and_send_message(self, message: str) -> VoiceOverResponse:
        """Complete operation: open Copilot and send a message"""
        return self._make_request("POST", "/operations/open-copilot-and-send-message", {"message": message})
    
    def health_check(self) -> VoiceOverResponse:
        """Check server health"""
        return self._make_request("GET", "/health")

# Example usage and LLM integration helper
class AccessibilityAgent:
    def __init__(self):
        self.voice_over = VoiceOverClient()
        
    def execute_llm_command(self, llm_response: Dict[str, Any]) -> VoiceOverResponse:
        """
        Execute VoiceOver commands based on LLM response
        
        Expected LLM response format:
        {
            "action": "type" | "navigate_next" | "navigate_previous" | "click" | "open_app" | "press_key",
            "text": "text to type (for type action)",
            "app_name": "app name (for open_app action)",
            "key": "key to press (for press_key action)"
        }
        """
        action = llm_response.get("action")
        
        if action == "type":
            text = llm_response.get("text", "")
            return self.voice_over.type_text(text)
        
        elif action == "navigate_next":
            return self.voice_over.navigate_next()
        
        elif action == "navigate_previous":
            return self.voice_over.navigate_previous()
        
        elif action == "click":
            return self.voice_over.click_current()
        
        elif action == "open_app":
            app_name = llm_response.get("app_name", "")
            return self.voice_over.open_app(app_name)
        
        elif action == "press_key":
            key = llm_response.get("key", "")
            return self.voice_over.press_key(key)
        
        else:
            return VoiceOverResponse(
                success=False,
                error=f"Unknown action: {action}"
            )
    
    def get_current_state(self) -> str:
        """Get current accessibility state for LLM context"""
        result = self.voice_over.get_current_item()
        if result.success:
            return result.currentItem or "No current item"
        return f"Error getting current state: {result.error}"
    
    def demo_conversation_with_copilot(self) -> None:
        """Demo function showing how to use with Copilot"""
        print("=== Accessibility Agent Demo ===")
        
        # Start VoiceOver
        print("Starting VoiceOver...")
        result = self.voice_over.start_voiceover()
        if not result.success:
            print(f"Failed to start VoiceOver: {result.error}")
            return
        
        # Send message to Copilot
        message = "Hello, can you help me with accessibility testing on macOS?"
        print(f"Sending message to Copilot: {message}")
        
        result = self.voice_over.open_copilot_and_send_message(message)
        if result.success:
            print("Message sent successfully!")
            if result.responses:
                print("Responses found:")
                for i, response in enumerate(result.responses, 1):
                    print(f"  {i}. {response}")
        else:
            print(f"Failed to send message: {result.error}")
        
        # Stop VoiceOver
        print("Stopping VoiceOver...")
        self.voice_over.stop_voiceover()

if __name__ == "__main__":
    # Example usage
    agent = AccessibilityAgent()
    
    # Test basic functionality
    print("Testing VoiceOver server connection...")
    health = agent.voice_over.health_check()
    
    if health.success:
        print("✅ VoiceOver server is running")
        
        # Example LLM command execution
        llm_command = {
            "action": "type",
            "text": "Hello from Python!"
        }
        
        print(f"Executing LLM command: {llm_command}")
        result = agent.execute_llm_command(llm_command)
        print(f"Result: {result}")
        
    else:
        print("❌ VoiceOver server is not running")
        print("Please start the server with: npm run server")
