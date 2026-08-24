import os
import time

import pytest
from playwright.sync_api import sync_playwright


RUN_BROWSER_MATRIX = os.environ.get('RUN_BROWSER_MATRIX') == '1'


@pytest.mark.skipif(not RUN_BROWSER_MATRIX, reason='Browser matrix requires installed Playwright browsers')
def test_browser_signup_login_profile_and_direct_challenge_entrypoints():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        assert page.goto('http://localhost:5000/login').status == 200
        assert page.locator('#signupTab').count() == 1
        assert page.locator('#googleSignup').count() == 1
        assert page.locator('#avatars .avatar').count() == 8

        suffix = str(time.time_ns())
        username = f'Browser_{suffix[-8:]}'
        email = f'browser-{suffix}@example.com'
        page.click('#signupTab')
        page.locator('#signupForm input[name="username"]').fill(username)
        page.locator('#signupForm input[name="email"]').fill(email)
        page.locator('#signupForm input[name="password"]').fill('A-strong-password-123')
        page.click('#signupForm button.primary')
        page.wait_for_url('**/profile')

        assert page.locator('#name').inner_text() == username
        assert page.locator('#mmr').inner_text() == '1200'
        assert page.locator('#matches').inner_text() == '0'
        assert page.locator('#mmrGraph').count() == 1
        assert page.locator('#friends').count() == 1
        assert page.locator('#challenges').count() == 1
        assert page.locator('#achievements').count() == 1

        page.goto('http://localhost:5000/profile')
        assert page.locator('#name').inner_text() == username

        page.click('#logout')
        page.wait_for_url('**/login')
        assert page.locator('#loginForm').is_visible()

        page.click('#loginTab')
        page.locator('#loginForm input[name="identifier"]').fill(email)
        page.locator('#loginForm input[name="password"]').fill('A-strong-password-123')
        page.click('#loginForm button.primary')
        page.wait_for_url('**/profile')
        assert page.locator('#name').inner_text() == username

        browser.close()
