"""Browser End-to-End Test for WoundWatch AI using Playwright and Microsoft Edge."""
import os
import sys
import time
from pathlib import Path

# Fix Windows console encoding for Unicode logs
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from playwright.sync_api import sync_playwright

SAMPLE_IMAGE = Path(__file__).resolve().parent.parent / "data" / "FUSeg" / "data" / "Foot Ulcer Segmentation Challenge" / "test" / "images" / "1011.png"

def run_browser_tests():
    print(f"Sample image exists: {SAMPLE_IMAGE.is_file()} ({SAMPLE_IMAGE})")
    assert SAMPLE_IMAGE.is_file(), f"Sample image not found: {SAMPLE_IMAGE}"

    screenshots_dir = Path(__file__).resolve().parent.parent / "data" / "test_screenshots"
    screenshots_dir.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        print("Launching Edge browser...")
        browser = p.chromium.launch(channel="msedge", headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        page = context.new_page()

        page.on("console", lambda msg: print(f"[BROWSER CONSOLE] {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: print(f"[BROWSER ERROR] {err}"))

        # Step 1: Open Test Your Wound page
        print("Navigating to http://localhost:5173/test-wound...")
        page.goto("http://localhost:5173/test-wound", wait_until="networkidle")
        time.sleep(1)

        # Verify Minimal Form elements
        print("Verifying minimal form layout and inputs...")
        page.wait_for_selector("h1:has-text('Test Your Wound')")

        # 1. Image
        assert page.locator("text=Choose a photograph or drag here").is_visible()

        # 2. Record Tracking
        assert page.locator("text=New Wound Record").is_visible()
        assert page.locator("text=Follow-up Photo").is_visible()

        # 3. Duration
        assert page.locator("text=Less than 1 week").is_visible()
        assert page.locator("text=1 to 4 weeks").is_visible()
        assert page.locator("text=More than 4 weeks").is_visible()

        # 4. Progression
        assert page.get_by_text("Getting better", exact=True).is_visible()
        assert page.get_by_text("Staying the same", exact=True).is_visible()
        assert page.get_by_text("Getting worse", exact=True).is_visible()

        # 5. Warning Signs
        assert page.locator("text=Spreading redness or swelling").is_visible()
        assert page.locator("text=Increasing pain, throbbing, or intense localized warmth").is_visible()
        assert page.locator("text=Pus, yellow/green discharge, or foul-smelling fluid").is_visible()
        assert page.locator("text=Fever or shaking chills").is_visible()
        assert page.locator("text=Confusion, dizziness, lightheadedness, or fainting").is_visible()

        print("Minimal form layout verified successfully.")

        # Test Emergency warning banner trigger
        print("Testing emergency symptom banner reaction...")
        emergency_cb = page.locator("text=Confusion, dizziness, lightheadedness, or fainting")
        emergency_cb.click()
        time.sleep(0.5)
        assert page.locator("text=URGENT: Emergency Warning Signs Reported").is_visible()
        page.screenshot(path=str(screenshots_dir / "01_emergency_banner.png"))
        print("Emergency banner verified.")
        # Uncheck emergency for normal test
        emergency_cb.click()
        time.sleep(0.5)

        # Upload baseline image
        print("Uploading baseline wound image...")
        file_input = page.locator("input[type='file']")
        file_input.set_input_files(str(SAMPLE_IMAGE))
        time.sleep(1)

        assert page.locator("img[alt='Wound preview']").is_visible()
        page.screenshot(path=str(screenshots_dir / "02_baseline_form_filled.png"))

        # Submit analysis
        print("Submitting baseline analysis...")
        submit_btn = page.locator("button:has-text('Analyze Wound & View Results')")
        submit_btn.click()

        # Wait for Results Page
        print("Waiting for results page navigation...")
        page.wait_for_url("**/results/**", timeout=20000)
        page.wait_for_selector("h2:has-text('1. Wound Risk Assessment')", timeout=15000)
        time.sleep(1)

        page.screenshot(path=str(screenshots_dir / "03_baseline_results.png"), full_page=True)
        print("Results page loaded successfully.")

        # VERIFY STRICT ORDER OF SECTIONS:
        # 1. Wound Risk Assessment
        # 2. Estimated Healing Time
        # 3. Wound Progress Graph
        # 4. Segmentation & Detailed Measurements
        print("Verifying strict section ordering...")
        content_text = page.content()
        pos_risk = content_text.find("1. Wound Risk Assessment")
        pos_healing = content_text.find("2. Estimated Healing Time")
        pos_graph = content_text.find("3. Wound Progress Graph")
        pos_seg = content_text.find("4. Segmentation")

        print(f"Section indices in DOM: Risk={pos_risk}, Healing={pos_healing}, Graph={pos_graph}, Seg={pos_seg}")
        assert pos_risk != -1, "Section 1 'Wound Risk Assessment' not found"
        assert pos_healing != -1, "Section 2 'Estimated Healing Time' not found"
        assert pos_graph != -1, "Section 3 'Wound Progress Graph' not found"
        assert pos_seg != -1, "Section 4 'Segmentation & Detailed Measurements' not found"

        assert pos_risk < pos_healing, "Risk Assessment must appear BEFORE Estimated Healing Time"
        assert pos_healing < pos_graph, "Estimated Healing Time must appear BEFORE Wound Progress Graph"
        assert pos_graph < pos_seg, "Wound Progress Graph must appear BEFORE Segmentation & Measurements"
        print("Strict Section Ordering (1 -> 2 -> 3 -> 4) verified!")

        # Verify Baseline notification
        assert page.locator("text=Baseline Measurement Established").is_visible() or page.locator("text=Single Baseline Measurement Recorded").is_visible()
        print("Single-point baseline status verified.")

        # Test Follow-up Upload Workflow
        print("Testing Follow-up upload workflow...")
        followup_btn = page.locator("a:has-text('Add Follow-up Photo')").first
        followup_btn.click()
        page.wait_for_url("**/test*wound=**", timeout=10000)
        time.sleep(1)

        # Verify that follow-up radio is selected
        followup_radio = page.locator("input[value='followup']")
        assert followup_radio.is_checked()
        print("Follow-up mode pre-selected with existing wound ID.")

        # Upload second image
        print("Uploading second follow-up image...")
        file_input_2 = page.locator("input[type='file']")
        file_input_2.set_input_files(str(SAMPLE_IMAGE))
        time.sleep(1)

        submit_btn_2 = page.locator("button:has-text('Analyze Wound & View Results')")
        submit_btn_2.click()

        # Wait for Results Page
        print("Waiting for follow-up results page...")
        page.wait_for_url("**/results/**", timeout=20000)
        time.sleep(2)

        page.screenshot(path=str(screenshots_dir / "04_followup_results.png"), full_page=True)
        print("Follow-up results loaded.")

        # Verify that graph contains multi-point history
        assert page.locator("text=BASELINE:").is_visible()
        assert page.locator("text=LATEST:").is_visible()
        print("Multi-timepoint trajectory confirmed on graph!")

        browser.close()
        print("\n[ALL BROWSER E2E TESTS PASSED SUCCESSFULLY!]")

if __name__ == "__main__":
    run_browser_tests()
