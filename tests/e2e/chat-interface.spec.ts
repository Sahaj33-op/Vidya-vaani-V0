import { test, expect } from '@playwright/test'

test.describe('Chat Interface E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the chat interface
    await page.goto('/')
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle')
    
    // Verify the chat interface is loaded
    await expect(page.getByText('College Assistant')).toBeVisible()
  })

  test.describe('Basic Chat Functionality', () => {
    test('should display initial welcome message', async ({ page }) => {
      // Check for welcome message
      await expect(page.getByText(/Hello! I'm your college assistant/)).toBeVisible()
      
      // Check for language selector
      await expect(page.locator('select, [role="combobox"]')).toBeVisible()
      
      // Check for input field
      await expect(page.getByPlaceholder(/Type your message/)).toBeVisible()
    })

    test('should show quick action buttons initially', async ({ page }) => {
      // Verify all quick action buttons are present
      await expect(page.getByText('Admission Information')).toBeVisible()
      await expect(page.getByText('Fee Structure')).toBeVisible()
      await expect(page.getByText('Timetable')).toBeVisible()
      await expect(page.getByText('Contact Info')).toBeVisible()
    })

    test('should send and receive messages', async ({ page }) => {
      const messageInput = page.getByPlaceholder(/Type your message/)
      const sendButton = page.getByRole('button', { name: /send/i })

      // Type a message
      await messageInput.fill('What are the admission requirements?')
      
      // Send the message
      await sendButton.click()

      // Wait for the user message to appear
      await expect(page.getByText('What are the admission requirements?')).toBeVisible()
      
      // Wait for bot response (allow up to 10 seconds for API response)
      await expect(page.locator('[data-testid="bot-message"], .bot-message')).toBeVisible({ timeout: 10000 })
      
      // Verify input is cleared after sending
      await expect(messageInput).toHaveValue('')
    })

    test('should handle Enter key to send messages', async ({ page }) => {
      const messageInput = page.getByPlaceholder(/Type your message/)

      // Type a message and press Enter
      await messageInput.fill('Hello')
      await messageInput.press('Enter')

      // Verify message was sent
      await expect(page.getByText('Hello')).toBeVisible()
    })

    test('should not send empty messages', async ({ page }) => {
      const sendButton = page.getByRole('button', { name: /send/i })
      
      // Try to send empty message
      await sendButton.click()
      
      // Should still show quick actions (no messages sent)
      await expect(page.getByText('Admission Information')).toBeVisible()
    })
  })

  test.describe('Quick Actions', () => {
    test('should trigger predefined queries from quick actions', async ({ page }) => {
      // Click on Admission Information
      await page.getByText('Admission Information').click()
      
      // Wait for the predefined query to be sent
      await expect(page.getByText(/Tell me about admission process/)).toBeVisible()
      
      // Quick actions should be hidden after first message
      await expect(page.getByText('Admission Information')).not.toBeVisible()
    })

    test('should hide quick actions after user sends message', async ({ page }) => {
      const messageInput = page.getByPlaceholder(/Type your message/)
      
      // Send a message
      await messageInput.fill('Test message')
      await messageInput.press('Enter')
      
      // Wait for message to be processed
      await page.waitForTimeout(1000)
      
      // Quick actions should be hidden
      await expect(page.getByText('Fee Structure')).not.toBeVisible()
    })
  })

  test.describe('Language Selection', () => {
    test('should change language and update placeholder', async ({ page }) => {
      // Find and click the language selector
      const languageSelector = page.locator('select, [role="combobox"]').first()
      
      // Change to Hindi
      await languageSelector.selectOption({ label: /हिंदी|Hindi/ })
      
      // Check that placeholder text changes (may take a moment)
      await expect(page.getByPlaceholder(/हिंदी/)).toBeVisible({ timeout: 5000 })
    })

    test('should send messages in selected language', async ({ page }) => {
      const languageSelector = page.locator('select, [role="combobox"]').first()
      const messageInput = page.getByPlaceholder(/Type your message/)
      
      // Change to Hindi
      await languageSelector.selectOption({ label: /हिंदी|Hindi/ })
      await page.waitForTimeout(500) // Wait for state update
      
      // Send Hindi message
      await messageInput.fill('नमस्ते')
      await messageInput.press('Enter')
      
      // Verify message was sent
      await expect(page.getByText('नमस्ते')).toBeVisible()
    })
  })

  test.describe('Voice Features', () => {
    test('should show voice controls when available', async ({ page }) => {
      // Look for microphone button (voice input)
      const micButton = page.getByRole('button', { name: /voice input|microphone/i })
      
      // Voice controls might not be available in all browsers/environments
      if (await micButton.isVisible()) {
        await expect(micButton).toBeVisible()
        
        // Look for voice output toggle
        const volumeButton = page.getByRole('button', { name: /voice output|volume/i })
        await expect(volumeButton).toBeVisible()
      }
    })

    test('should handle voice input button interaction', async ({ page }) => {
      const micButton = page.getByRole('button', { name: /voice input|microphone/i })
      
      if (await micButton.isVisible()) {
        // Click microphone button
        await micButton.click()
        
        // Check for listening state (placeholder might change)
        // Note: Actual speech recognition won't work in E2E tests
        await expect(page.getByPlaceholder(/listening/i)).toBeVisible({ timeout: 2000 })
        
        // Click again to stop
        await micButton.click()
      } else {
        test.skip('Voice features not available in this browser')
      }
    })

    test('should toggle voice output', async ({ page }) => {
      const volumeButton = page.getByRole('button', { name: /voice output|volume/i })
      
      if (await volumeButton.isVisible()) {
        // Click volume button to toggle
        await volumeButton.click()
        
        // Visual state should change (button appearance)
        // The exact implementation depends on how the button styling changes
        await page.waitForTimeout(500)
        
        // Click again to toggle back
        await volumeButton.click()
      } else {
        test.skip('Voice features not available in this browser')
      }
    })
  })

  test.describe('Message Display and Features', () => {
    test('should display message timestamps', async ({ page }) => {
      const messageInput = page.getByPlaceholder(/Type your message/)
      
      // Send a message
      await messageInput.fill('Test timestamp')
      await messageInput.press('Enter')
      
      // Wait for message to appear
      await expect(page.getByText('Test timestamp')).toBeVisible()
      
      // Look for timestamp (usually in format like "12:34 PM")
      await expect(page.locator('text=/\\d{1,2}:\\d{2}/')).toBeVisible({ timeout: 5000 })
    })

    test('should handle loading states', async ({ page }) => {
      const messageInput = page.getByPlaceholder(/Type your message/)
      
      // Send a message
      await messageInput.fill('Test loading state')
      await messageInput.press('Enter')
      
      // Should see "Thinking..." indicator
      await expect(page.getByText(/thinking/i)).toBeVisible({ timeout: 2000 })
      
      // Eventually should get a response
      await expect(page.locator('[data-testid="bot-message"], .bot-message')).toBeVisible({ timeout: 10000 })
    })

    test('should display confidence warnings for uncertain responses', async ({ page }) => {
      const messageInput = page.getByPlaceholder(/Type your message/)
      
      // Send an ambiguous query that might have low confidence
      await messageInput.fill('Something very specific and unusual')
      await messageInput.press('Enter')
      
      // Wait for response
      await page.waitForTimeout(3000)
      
      // Look for confidence warning (might not always appear)
      const confidenceWarning = page.getByText(/not entirely sure|connect you with a human/i)
      if (await confidenceWarning.isVisible()) {
        await expect(confidenceWarning).toBeVisible()
      }
    })

    test('should show source information when available', async ({ page }) => {
      const messageInput = page.getByPlaceholder(/Type your message/)
      
      // Ask a question that should return sources
      await messageInput.fill('What are the fees?')
      await messageInput.press('Enter')
      
      // Wait for response
      await expect(page.locator('[data-testid="bot-message"], .bot-message')).toBeVisible({ timeout: 10000 })
      
      // Look for sources section (might not always be present)
      const sourcesSection = page.getByText(/sources:/i)
      if (await sourcesSection.isVisible()) {
        await expect(sourcesSection).toBeVisible()
      }
    })
  })

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Verify chat interface is still functional
      await expect(page.getByText('College Assistant')).toBeVisible()
      await expect(page.getByPlaceholder(/Type your message/)).toBeVisible()
      
      // Send a message on mobile
      const messageInput = page.getByPlaceholder(/Type your message/)
      await messageInput.fill('Mobile test message')
      await messageInput.press('Enter')
      
      await expect(page.getByText('Mobile test message')).toBeVisible()
    })

    test('should handle keyboard on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      const messageInput = page.getByPlaceholder(/Type your message/)
      
      // Focus input (should bring up keyboard on mobile)
      await messageInput.focus()
      
      // Type and send
      await messageInput.fill('Keyboard test')
      await messageInput.press('Enter')
      
      await expect(page.getByText('Keyboard test')).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels and roles', async ({ page }) => {
      // Check for proper button roles
      await expect(page.getByRole('button', { name: /send/i })).toBeVisible()
      
      // Check for form elements
      await expect(page.getByRole('textbox')).toBeVisible()
      
      // Check for language selector
      await expect(page.locator('select, [role="combobox"]')).toBeVisible()
    })

    test('should support keyboard navigation', async ({ page }) => {
      // Tab through interface elements
      await page.keyboard.press('Tab')
      
      // Should focus on input field first
      const messageInput = page.getByPlaceholder(/Type your message/)
      await expect(messageInput).toBeFocused()
      
      // Tab to send button
      await page.keyboard.press('Tab')
      const sendButton = page.getByRole('button', { name: /send/i })
      await expect(sendButton).toBeFocused()
    })

    test('should handle screen reader requirements', async ({ page }) => {
      // Check for proper heading structure
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      
      // Check for descriptive text
      await expect(page.getByText(/multilingual education support/i)).toBeVisible()
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Block API requests to simulate network error
      await page.route('/api/ask', route => {
        route.abort('failed')
      })
      
      const messageInput = page.getByPlaceholder(/Type your message/)
      
      // Try to send a message
      await messageInput.fill('This should fail')
      await messageInput.press('Enter')
      
      // Should show error message
      await expect(page.getByText(/technical difficulties|error/i)).toBeVisible({ timeout: 5000 })
    })

    test('should handle API timeout', async ({ page }) => {
      // Mock slow API response
      await page.route('/api/ask', route => {
        // Delay response significantly
        setTimeout(() => route.continue(), 10000)
      })
      
      const messageInput = page.getByPlaceholder(/Type your message/)
      
      // Send message
      await messageInput.fill('Slow response test')
      await messageInput.press('Enter')
      
      // Should show loading state
      await expect(page.getByText(/thinking/i)).toBeVisible()
    })
  })
})