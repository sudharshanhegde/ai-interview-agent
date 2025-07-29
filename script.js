// DOM element selectors
const startButton = document.getElementById('start-button');
const resumeInput = document.getElementById('resume-input');
const chatContainer = document.getElementById('chat-container');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const setupArea = document.getElementById('setup-area');
const chatInterface = document.getElementById('chat-interface');
const status = document.getElementById('status');

// Global variable to hold interview state
let interviewSession = null;

// Helper function to display messages
function displayMessage(text, sender, isEvaluation = false) {
    // Create new message div
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    // Add special styling for evaluation messages
    if (isEvaluation) {
        messageDiv.classList.add('evaluation');
    }
    
    // Create message content with label
    messageDiv.innerHTML = `
        <div class="message-label">${sender === 'ai' ? 'AI Interviewer' : 'You'}</div>
        <div>${text}</div>
    `;
    
    // Append to chat container
    chatContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Event listener for start button
startButton.addEventListener('click', async function() {
    const resume = resumeInput.value.trim();
    
    // Validate resume input
    if (!resume) {
        alert('Please paste your resume or job description first.');
        return;
    }
    
    // Disable button and show loading state
    startButton.disabled = true;
    startButton.textContent = 'Starting Interview...';
    status.textContent = 'Initializing interview session...';
    
    try {
        // Make POST request to backend
        const response = await fetch('/api/start-interview', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ resume: resume })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Parse response
        const data = await response.json();
        
        // Store interview session
        interviewSession = data;
        
        // Display first question
        displayMessage(data.firstQuestion, 'ai');
        
        // Show chat interface and hide setup area
        setupArea.style.display = 'none';
        chatInterface.classList.add('active');
        
        // Update status with progress and instructions
        status.textContent = `Interview active - ${data.totalQuestions} | Say "thank you" to end the session`;
        
        // Focus on input field
        userInput.focus();
        
    } catch (error) {
        console.error('Error starting interview:', error);
        alert('Failed to start interview. Please make sure the server is running and try again.');
        
        // Reset button state
        startButton.disabled = false;
        startButton.textContent = 'Start Interview';
        status.textContent = 'Error starting interview session';
    }
});

// Event listener for chat form submission
chatForm.addEventListener('submit', function(e) {
    // Prevent default form submission
    e.preventDefault();
    
    // Get user's answer
    const userAnswer = userInput.value.trim();
    
    // Validate input
    if (!userAnswer) {
        return;
    }
    
    // Display user's message
    displayMessage(userAnswer, 'user');
    
    // Call function to send answer to backend
    sendAnswerToBackend(userAnswer);
    
    // Clear input field
    userInput.value = '';
});

// Event listener for textarea keyboard handling
userInput.addEventListener('keydown', function(e) {
    // Submit on Enter (but allow Shift+Enter for new lines)
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit'));
    }
});

// Auto-resize textarea functionality
userInput.addEventListener('input', function() {
    // Reset height to recalculate
    this.style.height = 'auto';
    
    // Set height based on scroll height but respect min/max limits
    const minHeight = 60; // matches min-height in CSS
    const maxHeight = 150; // matches max-height in CSS
    const newHeight = Math.min(Math.max(this.scrollHeight, minHeight), maxHeight);
    
    this.style.height = newHeight + 'px';
});

// Function to send answer to backend and handle evaluation response
async function sendAnswerToBackend(answer) {
    // Get sessionId from our interviewSession variable
    if (!interviewSession || !interviewSession.sessionId) {
        console.error('No interview session found');
        displayMessage('Error: No interview session found. Please restart the interview.', 'ai');
        return;
    }
    
    // Show loading message
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message ai loading';
    loadingDiv.id = 'loading-message';
    loadingDiv.innerHTML = `
        <div class="message-label">AI Interviewer</div>
        <div>Thinking...</div>
    `;
    chatContainer.appendChild(loadingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    try {
        // Make POST request to new evaluation endpoint
        const response = await fetch('/api/submit-answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                sessionId: interviewSession.sessionId,
                userAnswer: answer
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Parse response
        const data = await response.json();
        
        // Remove loading message
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) {
            loadingMessage.remove();
        }
        
        // Display evaluation feedback with nice formatting
        if (data.evaluation) {
            // Display score with visual indicator
            const scoreEmoji = data.evaluation.score >= 8 ? '🌟' : data.evaluation.score >= 6 ? '👍' : '💪';
            displayMessage(`${scoreEmoji} Your Score: ${data.evaluation.score}/10`, 'ai', true);
            
            // Small delay for better UX
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Display feedback
            displayMessage(`💬 Feedback: ${data.evaluation.feedback}`, 'ai', true);
            
            // Another small delay
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Display ideal answer
            if (data.evaluation.idealAnswer) {
                displayMessage(`💡 Ideal Answer: ${data.evaluation.idealAnswer}`, 'ai', true);
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        }
        
        // Check if interview is complete
        if (data.isFinal) {
            // Interview completed - display final thank you message
            displayMessage('🎉 Congratulations! You have completed the interview!', 'ai');
            
            // Display final summary
            if (data.averageScore) {
                const avgScore = parseFloat(data.averageScore);
                const performanceEmoji = avgScore >= 8 ? '🌟' : avgScore >= 6 ? '👍' : '💪';
                displayMessage(`${performanceEmoji} Final Overall Score: ${data.averageScore}/10`, 'ai', true);
            }
            
            if (data.overallFeedback) {
                displayMessage(`📋 Overall Assessment: ${data.overallFeedback}`, 'ai', true);
            }
            
            // Thank you message
            displayMessage('Thank you for your time and effort. We hope this practice session was valuable for your interview preparation!', 'ai');
            
            // Update status
            status.textContent = 'Interview completed - Thank you!';
            
            // Disable input
            userInput.disabled = true;
            chatForm.querySelector('#send-button').disabled = true;
            
            interviewSession.isComplete = true;
        } else {
            // Continue with next question
            if (data.nextQuestion) {
                displayMessage(data.nextQuestion, 'ai');
            }
            
            // Update session data
            interviewSession.currentQuestion = data.currentQuestion;
            interviewSession.totalQuestions = data.totalQuestions;
            
            // Update status with progress
            status.textContent = `Interview active - Question ${data.currentQuestion} | ${data.totalQuestions}`;
        }
        
    } catch (error) {
        console.error('Error sending answer:', error);
        
        // Remove loading message
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) {
            loadingMessage.remove();
        }
        
        // Display error message
        displayMessage('Sorry, there was an error processing your answer. Please try again.', 'ai');
    }
}

// Auto-resize textarea for resume input
resumeInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 200) + 'px';
});

// Handle Enter key in user input (optional enhancement)
userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event('submit'));
    }
});
