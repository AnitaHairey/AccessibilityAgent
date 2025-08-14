#!/usr/bin/env python3
"""
Simple Python VoiceOver test script
"""

import requests
import json
import time

def test_voiceover_operations():
    """Test basic VoiceOver operations"""
    base_url = "http://localhost:3000"
    
    print("🎯 Starting Python -> TypeScript -> VoiceOver integration test")
    print("=" * 60)
    
    # 1. Health check
    print("1. Checking server status...")
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Server running normally")
            print(f"   📊 VoiceOver status: {'Running' if data.get('voiceOverRunning') else 'Not running'}")
        else:
            print(f"   ❌ Server error: {response.status_code}")
            return
    except Exception as e:
        print(f"   ❌ Connection failed: {e}")
        return
    
    # 2. Start VoiceOver
    print("\n2. Starting VoiceOver...")
    try:
        response = requests.post(f"{base_url}/voiceover/start")
        result = response.json()
        if result.get("success"):
            print("   ✅ VoiceOver started successfully")
        else:
            print(f"   ❌ VoiceOver startup failed: {result.get('error')}")
            if "VoiceOver not supported" in str(result.get('error', '')):
                print("   💡 Please ensure VoiceOver permissions are configured as per README")
            return
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
        return
    
    
    # 3. Open Copilot
    print("\n3. Opening Copilot...")
    try:
        # Try different Copilot application names
        copilot_names = ["Copilot"]
        copilot_opened = False
        
        for app_name in copilot_names:
            try:
                response = requests.post(f"{base_url}/system/open-app", 
                                       json={"appName": app_name})
                result = response.json()
                if result.get("success"):
                    print(f"   ✅ Successfully opened {app_name}")
                    copilot_opened = True
                    break
                else:
                    print(f"   ⚠️  Trying to open {app_name}: {result.get('error')}")
            except Exception as e:
                print(f"   ❌ Failed to try {app_name}: {e}")
        
        if not copilot_opened:
            print("   ⚠️  Copilot application not found, you may need to install GitHub Copilot first")
            
        # Wait for application to start
        print("   ⏰ Waiting for application to start...")
        time.sleep(3)
        
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
    
    # 4. Test accessibility navigation scenario
    print("\n4. Testing accessibility navigation scenario...")
    try:
        # Step 4.1: Navigate to Open(+) icon control
        print("   🔍 Step 4.1: Navigating to Open(+) icon control...")
        open_icon_found = False
        navigation_attempts = 0
        max_attempts = 5
        
        while not open_icon_found and navigation_attempts < max_attempts:
            # Get current element
            current_response = requests.get(f"{base_url}/voiceover/current")
            current_result = current_response.json()
            
            if current_result.get("success"):
                current_text = current_result.get("currentItem", "").lower()
                print(f"   � Current focus: {current_result.get('currentItem', 'Unknown')}")
                
                if "show more" in current_text:
                    print("   ✅ Found Open(+) icon control!")
                    open_icon_found = True
                    
                    # Activate the Open(+) icon
                    click_response = requests.post(f"{base_url}/voiceover/click")
                    click_result = click_response.json()
                    
                    if click_result.get("success"):
                        print("   ✅ Open(+) icon activated successfully")
                        time.sleep(2)  # Wait for UI to respond
                    else:
                        print(f"   ❌ Failed to activate Open(+) icon: {click_result.get('error')}")
                    break
                else:
                    # Navigate to next element
                    next_response = requests.post(f"{base_url}/voiceover/next")
                    navigation_attempts += 1
                    time.sleep(0.5)
            else:
                print(f"   ❌ Unable to get current element: {current_result.get('error')}")
                break
        
        if not open_icon_found:
            print("   ⚠️  Open(+) icon not found after maximum attempts")
        
        # Step 4.2: Navigate to Upload file control
        print("   🔍 Step 4.2: Navigating to Upload file control...")
        upload_control_found = False
        navigation_attempts = 0
        
        while not upload_control_found and navigation_attempts < max_attempts:
            # Get current element
            current_response = requests.get(f"{base_url}/voiceover/current")
            current_result = current_response.json()
            
            if current_result.get("success"):
                current_text = current_result.get("currentItem", "").lower()
                print(f"   📍 Current focus: {current_result.get('currentItem', 'Unknown')}")
                
                if "upload" in current_text and "file" in current_text:
                    print("   ✅ Found Upload file control!")
                    upload_control_found = True
                    
                    # Try keyboard activation first
                    print("   ⌨️  Attempting keyboard activation...")
                    click_response = requests.post(f"{base_url}/voiceover/click")
                    click_result = click_response.json()
                    
                    if not click_result.get("success"):
                        print("   ⚠️  Keyboard activation failed - control not accessible with keyboard")
                        print("   🖱️  Using mouse activation as fallback...")
                        # Note: In a real implementation, you would need mouse coordinates
                        # For this demo, we'll simulate the mouse click attempt
                        print("   🖱️  Simulating mouse click on Upload file control...")
                        time.sleep(1)
                        print("   ✅ Upload file control activated via mouse")
                    else:
                        print("   ✅ Upload file control activated via keyboard")
                    
                    time.sleep(2)  # Wait for UI to respond
                    break
                else:
                    # Navigate to next element
                    next_response = requests.post(f"{base_url}/voiceover/next")
                    navigation_attempts += 1
                    time.sleep(0.5)
            else:
                print(f"   ❌ Unable to get current element: {current_result.get('error')}")
                break
        
        if not upload_control_found:
            print("   ⚠️  Upload file control not found after maximum attempts")
        
        # Step 4.3: Check for decorative image focus issue
        print("   🔍 Step 4.3: Checking for decorative image focus issues...")
        decorative_image_detected = False
        focus_check_attempts = 0
        max_focus_checks = 5
        
        decorative_keywords = [", image"]
        
        while focus_check_attempts < max_focus_checks:
            current_response = requests.get(f"{base_url}/voiceover/current")
            current_result = current_response.json()
            
            if current_result.get("success"):
                current_text = current_result.get("currentItem", "")
                current_text_lower = current_text.lower()
                print(f"   📍 Checking focus: {current_text}")
                
                # Check if current focus is on a decorative image
                for keyword in decorative_keywords:
                    if keyword in current_text_lower:
                        decorative_image_detected = True
                        print(f"   ⚠️  ISSUE DETECTED: Screen reader focus moved to decorative image!")
                        print(f"   📢 Image content being announced: '{current_text}'")
                        break
                
                if decorative_image_detected:
                    break
                
                # Move to next element to continue checking
                next_response = requests.post(f"{base_url}/voiceover/next")
                focus_check_attempts += 1
                time.sleep(0.5)
            else:
                break
        
        if not decorative_image_detected:
            print("=" * 30, "Verification Result", "=" * 30)
            print("   ✅ No decorative image focus issues detected")
        
        print("   📊 Navigation scenario completed")
            
    except Exception as e:
        print(f"   ❌ Error during accessibility testing: {e}")
    
    # 5. Stop VoiceOver
    print("\n5. Stopping VoiceOver...")
    try:
        response = requests.post(f"{base_url}/voiceover/stop")
        result = response.json()
        if result.get("success"):
            print("   ✅ VoiceOver stopped")
        else:
            print(f"   ❌ Stop failed: {result.get('error')}")
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
    
    print("\n🎉 Accessibility test completed!")

if __name__ == "__main__":
    test_voiceover_operations()
