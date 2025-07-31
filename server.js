const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables
dotenv.config({ path: __dirname + '/.env' });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Multiple Gemini AI providers dynamically
const geminiProviders = [];

// Function to initialize all available Gemini API keys
function initializeGeminiProviders() {
    const apiKeys = [];
    
    // Collect all available API keys from environment variables
    for (let i = 1; i <= 10; i++) {
        const keyName = i === 1 ? 'GEMINI_API_KEY' : `GEMINI_API_KEY_${i}`;
        const apiKey = process.env[keyName];
        
        if (apiKey && apiKey.trim()) {
            apiKeys.push({ name: keyName, key: apiKey });
        }
    }
    
    // Initialize providers for each API key
    apiKeys.forEach((apiKeyInfo, index) => {
        try {
            const genAI = new GoogleGenerativeAI(apiKeyInfo.key);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            
            geminiProviders.push({
                name: `Gemini API ${index + 1} (${apiKeyInfo.name})`,
                model: model,
                keyName: apiKeyInfo.name,
                isExhausted: false // Track if this provider is quota-exhausted
            });
            
            console.log(`✅ Initialized ${apiKeyInfo.name}`);
        } catch (error) {
            console.error(`❌ Failed to initialize ${apiKeyInfo.name}:`, error.message);
        }
    });
    
    console.log(`🚀 Total Gemini providers initialized: ${geminiProviders.length}`);
    console.log(`📊 Total daily quota available: ${geminiProviders.length * 50} requests`);
    
    return geminiProviders.length;
}

// Initialize all providers
const providerCount = initializeGeminiProviders();

// Enhanced AI call function with multiple provider support
async function callGeminiAI(prompt, maxRetries = 2) {
    // Filter out exhausted providers, but reset all if all are exhausted (daily reset scenario)
    const availableProviders = geminiProviders.filter(p => !p.isExhausted);
    
    if (availableProviders.length === 0) {
        console.log('🔄 All providers marked as exhausted, resetting flags (might be daily reset)');
        geminiProviders.forEach(p => p.isExhausted = false);
        availableProviders.push(...geminiProviders);
    }
    
    const providersToTry = availableProviders.length > 0 ? availableProviders : geminiProviders;
    
    for (const provider of providersToTry) {
        // Skip if we know this provider is exhausted
        if (provider.isExhausted) {
            console.log(`⏭️ Skipping ${provider.name} (quota exhausted)`);
            continue;
        }
        
        try {
            console.log(`🔄 Attempting to call ${provider.name}...`);
            const result = await retryApiCall(async () => {
                return await provider.model.generateContent(prompt);
            }, maxRetries);
            console.log(`✅ ${provider.name} responded successfully`);
            return result;
        } catch (error) {
            console.error(`❌ ${provider.name} failed:`, error.message);
            
            // Check if it's a quota/rate limit error (429) - mark as exhausted
            if (error.status === 429 || error.message.includes('quota') || error.message.includes('Too Many Requests')) {
                console.log(`🚫 ${provider.name} quota exhausted - marking as unavailable`);
                provider.isExhausted = true;
                
                // Continue to next provider immediately
                continue;
            }
            
            // For other errors, continue to next provider
            if (provider !== providersToTry[providersToTry.length - 1]) {
                console.log(`⏭️ Switching to next provider...`);
                continue;
            }
        }
    }
    
    // If we get here, all providers failed
    const exhaustedCount = geminiProviders.filter(p => p.isExhausted).length;
    console.log(`🚨 All providers exhausted. ${exhaustedCount}/${geminiProviders.length} quota-limited`);
    throw new Error(`All ${geminiProviders.length} Gemini providers are currently unavailable`);
}

// Retry function for API calls
// Retry function for API calls with better 503 handling
async function retryApiCall(apiFunction, maxRetries = 3, delay = 2000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await apiFunction();
        } catch (error) {
            console.log(`API call attempt ${attempt} failed:`, error.message);
            
            // Don't retry on quota/rate limit errors (429) - fail fast for provider switching
            if (error.status === 429 || error.message.includes('quota') || error.message.includes('Too Many Requests')) {
                console.log('Quota/rate limit error detected - failing fast for provider switch');
                throw error;
            }
            
            // For 503 Service Unavailable, use longer delays and fewer retries
            if (error.status === 503 || error.message.includes('Service Unavailable') || error.message.includes('overloaded')) {
                console.log('Service overload detected - using optimized retry strategy');
                if (attempt === 1) { // Only retry once for 503 errors
                    const waitTime = 5000; // Wait 5 seconds for overload
                    console.log(`Service overloaded, waiting ${waitTime}ms before final attempt...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                } else {
                    console.log('Service still overloaded, switching to next provider');
                    throw error;
                }
            }
            
            if (attempt === maxRetries) {
                throw error;
            }
            
            // Wait before retrying, with exponential backoff
            const waitTime = delay * Math.pow(2, attempt - 1);
            console.log(`Retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
}

// Server-side session storage
const interviewSessions = new Map();

// Serve static files FIRST (for serving the HTML file)
app.use(express.static(__dirname));

// Explicit route for root to serve index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// API route for backend status
app.get('/api/status', (req, res) => {
    res.json({ message: 'AI Interviewer Backend is running!' });
});

// Health check route
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test Gemini AI connection
app.get('/test-ai', async (req, res) => {
    try {
        if (geminiProviders.length === 0) {
            return res.status(500).json({ 
                success: false, 
                message: 'No Gemini API keys found in environment variables',
                debug: 'Please set GEMINI_API_KEY, GEMINI_API_KEY_2, etc.'
            });
        }

        const prompt = "Say hello and confirm you're working!";
        const result = await callGeminiAI(prompt);
        const response = await result.response;
        const text = response.text();
        
        // Get provider status
        const availableProviders = geminiProviders.filter(p => !p.isExhausted).length;
        const totalProviders = geminiProviders.length;
        const totalQuota = totalProviders * 50;
        const availableQuota = availableProviders * 50;
        
        res.json({ 
            success: true, 
            message: 'Gemini AI is working!', 
            aiResponse: text,
            providers: {
                total: totalProviders,
                available: availableProviders,
                exhausted: totalProviders - availableProviders
            },
            quota: {
                total: totalQuota,
                available: availableQuota,
                used: totalQuota - availableQuota
            }
        });
    } catch (error) {
        console.error('Error testing AI:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error connecting to Gemini AI', 
            error: error.message,
            providers: {
                total: geminiProviders.length,
                available: geminiProviders.filter(p => !p.isExhausted).length,
                exhausted: geminiProviders.filter(p => p.isExhausted).length
            }
        });
    }
});

// Provider status endpoint
app.get('/api/provider-status', (req, res) => {
    const providerStatus = geminiProviders.map((provider, index) => ({
        id: index + 1,
        name: provider.name,
        keyName: provider.keyName,
        isExhausted: provider.isExhausted,
        status: provider.isExhausted ? 'quota-exhausted' : 'available'
    }));
    
    const available = geminiProviders.filter(p => !p.isExhausted).length;
    const exhausted = geminiProviders.length - available;
    
    res.json({
        summary: {
            total: geminiProviders.length,
            available: available,
            exhausted: exhausted,
            totalQuota: geminiProviders.length * 50,
            availableQuota: available * 50
        },
        providers: providerStatus
    });
});

// API endpoint to start interview
app.post('/api/start-interview', async (req, res) => {
    try {
        const { resume } = req.body;
        
        if (!resume) {
            return res.status(400).json({ 
                success: false, 
                message: 'Resume is required' 
            });
        }
        
        // Generate unique session ID
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create interview prompt to generate multiple questions
        const interviewPrompt = `You are an experienced HR interviewer. Based on the following resume/background information, generate 3 relevant interview questions. 

Resume/Background:
${resume}

Generate 3 thoughtful interview questions that would be appropriate for this candidate. The questions should be professional, relevant to their background, and explore different aspects (technical skills, experience, behavioral). 

Format your response as a JSON array of strings, like this:
["Question 1 here", "Question 2 here", "Question 3 here"]

Only return the JSON array, nothing else.`;

        // Get questions from AI with backup support
        let result;
        try {
            result = await callGeminiAI(interviewPrompt);
            const response = await result.response;
            aiResponse = response.text().trim();
        } catch (aiError) {
            console.error('All AI providers exhausted, using fallback questions:', aiError.message);
            // Use predefined questions when AI is unavailable
            aiResponse = JSON.stringify([
                "Can you tell me about yourself and your professional background?",
                "What interests you most about this type of role?",
                "Describe a challenging project you've worked on recently and how you overcame obstacles."
            ]);
        }
        
        const response = result ? await result.response : null;
        
        // Parse the questions array
        let questions;
        try {
            // Clean up the response to ensure it's valid JSON
            const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
            questions = JSON.parse(cleanResponse);
            
            // Validate that we got an array of strings
            if (!Array.isArray(questions) || questions.length === 0) {
                throw new Error('Invalid questions format');
            }
        } catch (parseError) {
            console.error('Error parsing questions:', parseError);
            // Fallback: create default questions
            questions = [
                "Can you tell me about yourself and your professional background?",
                "What interests you most about this position and our company?",
                "Describe a challenging project you've worked on recently and how you overcame obstacles."
            ];
        }
        
        // Store session data
        const sessionData = {
            sessionId: sessionId,
            resume: resume,
            questions: questions,
            currentQuestionIndex: 0,
            answers: [],
            startTime: new Date(),
            isComplete: false
        };
        
        interviewSessions.set(sessionId, sessionData);
        
        // Return session info with first question
        res.json({
            success: true,
            sessionId: sessionId,
            firstQuestion: questions[0],
            totalQuestions: "Unlimited - say 'thank you' to end",
            currentQuestion: 1
        });
        
    } catch (error) {
        console.error('Error starting interview:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to start interview', 
            error: error.message 
        });
    }
});

// API endpoint to handle answers and get next questions
app.post('/api/answer', async (req, res) => {
    try {
        const { answer, sessionId } = req.body;
        
        if (!answer || !sessionId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Answer and session ID are required' 
            });
        }
        
        // Get session data
        const sessionData = interviewSessions.get(sessionId);
        if (!sessionData) {
            return res.status(404).json({ 
                success: false, 
                message: 'Interview session not found. Please start a new interview.' 
            });
        }
        
        // Store the answer
        sessionData.answers.push({
            questionIndex: sessionData.currentQuestionIndex,
            question: sessionData.questions[sessionData.currentQuestionIndex],
            answer: answer,
            timestamp: new Date()
        });
        
        // Move to next question
        sessionData.currentQuestionIndex++;
        
        // Check if interview is complete
        const isComplete = sessionData.currentQuestionIndex >= sessionData.questions.length;
        
        if (isComplete) {
            sessionData.isComplete = true;
            sessionData.endTime = new Date();
            
            // Generate final feedback
            const feedbackPrompt = `Interview Summary:
Resume: ${sessionData.resume}

Questions and Answers:
${sessionData.answers.map((qa, index) => 
    `Q${index + 1}: ${qa.question}
    A${index + 1}: ${qa.answer}`
).join('\n\n')}

Based on this interview session, provide brief, constructive feedback on the candidate's performance. Be positive and professional, highlighting strengths and suggesting areas for improvement if any. Keep it concise (2-3 sentences).`;
            
            try {
                const result = await callGeminiAI(feedbackPrompt);
                const response = await result.response;
                const feedback = response.text().trim();
                
                res.json({
                    success: true,
                    response: "Thank you for completing the interview!",
                    feedback: feedback,
                    isComplete: true,
                    totalQuestions: sessionData.questions.length,
                    currentQuestion: sessionData.currentQuestionIndex
                });
            } catch (feedbackError) {
                console.error('Error generating feedback:', feedbackError);
                res.json({
                    success: true,
                    response: "Thank you for completing the interview!",
                    feedback: "Thank you for your time and thoughtful answers throughout this interview session.",
                    isComplete: true,
                    totalQuestions: sessionData.questions.length,
                    currentQuestion: sessionData.currentQuestionIndex
                });
            }
        } else {
            // Return next question
            const nextQuestion = sessionData.questions[sessionData.currentQuestionIndex];
            
            res.json({
                success: true,
                response: nextQuestion,
                isComplete: false,
                currentQuestion: sessionData.currentQuestionIndex + 1,
                totalQuestions: sessionData.questions.length
            });
        }
        
        // Update session in storage
        interviewSessions.set(sessionId, sessionData);
        
    } catch (error) {
        console.error('Error processing answer:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to process answer', 
            error: error.message 
        });
    }
});

// API endpoint to submit answer with evaluation
app.post('/api/submit-answer', async (req, res) => {
    try {
        const { sessionId, userAnswer } = req.body;
        
        if (!sessionId || !userAnswer) {
            return res.status(400).json({ 
                success: false, 
                message: 'Session ID and user answer are required' 
            });
        }

        // Retrieve session data
        const sessionData = interviewSessions.get(sessionId);
        if (!sessionData) {
            return res.status(404).json({ 
                success: false, 
                message: 'Interview session not found. Please start a new interview.' 
            });
        }

        // Check if user wants to end the interview
        const thankYouPattern = /^(thank\s*you|thanks|thx|goodbye|bye|end|finish|done|that's all|stop)$/i;
        const isEndingInterview = thankYouPattern.test(userAnswer.trim());

        if (isEndingInterview) {
            // End the interview session
            sessionData.isComplete = true;
            sessionData.endTime = new Date();
            
            // Calculate overall score if there are answers
            let averageScore = 0;
            let overallFeedback = "Thank you for your time! Have a great day!";
            
            if (sessionData.answers.length > 0) {
                const totalScore = sessionData.answers.reduce((sum, answer) => sum + answer.evaluation.score, 0);
                averageScore = totalScore / sessionData.answers.length;
                
                // Generate final summary
                const summaryPrompt = `Interview session ended. Here's the summary:

Total Questions Answered: ${sessionData.answers.length}
Average Score: ${averageScore.toFixed(1)}/10

Individual Answers and Scores:
${sessionData.answers.map((qa, index) => 
    `Q${index + 1}: ${qa.question}
    Answer: ${qa.answer}
    Score: ${qa.evaluation.score}/10`
).join('\n\n')}

Based on this interview performance, provide a brief overall assessment (2-3 sentences) highlighting the candidate's key strengths and thanking them for their time.`;

                try {
                    const summaryResult = await callGeminiAI(summaryPrompt);
                    const summaryResponse = await summaryResult.response;
                    overallFeedback = summaryResponse.text().trim();
                } catch (summaryError) {
                    console.error('Error generating summary:', summaryError);
                    overallFeedback = `Thank you for completing ${sessionData.answers.length} questions with us! You demonstrated good communication skills throughout the session. Have a great day!`;
                }
            }
            
            // Update session in storage
            interviewSessions.set(sessionId, sessionData);
            
            // Respond with final summary
            return res.json({
                success: true,
                isFinal: true,
                message: "Thank you for your time!",
                averageScore: averageScore.toFixed(1),
                overallFeedback: overallFeedback,
                totalQuestions: sessionData.answers.length
            });
        }

        // Regular answer processing
        const currentQuestion = sessionData.questions[sessionData.currentQuestionIndex];
        if (!currentQuestion) {
            return res.status(400).json({ 
                success: false, 
                message: 'No current question found for this session.' 
            });
        }

        // Create evaluation prompt for Gemini
        const evaluationPrompt = `You are an experienced HR interviewer evaluating a candidate's answer. Please analyze the following:

Question Asked: "${currentQuestion}"
Candidate's Answer: "${userAnswer}"
Candidate's Background: ${sessionData.resume}

Please provide a detailed evaluation in JSON format with the following structure:
{
  "score": [number from 1-10],
  "feedback": "[constructive feedback on the answer, highlighting strengths and areas for improvement]",
  "idealAnswer": "[a brief example of what a strong answer might include]"
}

Criteria for evaluation:
- Relevance to the question (25%)
- Clarity and communication (25%)
- Depth and specificity (25%)
- Professional presentation (25%)

Be constructive and encouraging while providing honest feedback. Only return the JSON object, nothing else.`;

        // Call Gemini AI for evaluation with backup support
        let result;
        let aiResponse;
        try {
            result = await callGeminiAI(evaluationPrompt);
            const response = await result.response;
            aiResponse = response.text().trim();
        } catch (aiError) {
            console.error('AI evaluation unavailable, using fallback scoring:', aiError.message);
            // Fallback: Simple scoring based on answer length and keywords
            const answerLength = userAnswer.length;
            const hasExamples = /example|experience|project|worked|managed|led/i.test(userAnswer);
            const isDetailed = answerLength > 100;
            
            let fallbackScore = 6; // Base score
            if (hasExamples) fallbackScore += 1;
            if (isDetailed) fallbackScore += 1;
            if (answerLength > 200) fallbackScore += 1;
            
            aiResponse = JSON.stringify({
                score: Math.min(fallbackScore, 10),
                feedback: "Thank you for your detailed response. You provided good insights and demonstrated clear communication skills.",
                idealAnswer: "A strong answer typically includes specific examples from your experience and demonstrates practical knowledge of the topic."
            });
        }
        
        // Parse the evaluation JSON
        let evaluation;
        try {
            // Clean up the response to ensure it's valid JSON
            const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
            evaluation = JSON.parse(cleanResponse);
            
            // Validate the evaluation structure
            if (!evaluation.score || !evaluation.feedback || !evaluation.idealAnswer) {
                throw new Error('Invalid evaluation format');
            }
            
            // Ensure score is within valid range
            evaluation.score = Math.max(1, Math.min(10, Number(evaluation.score)));
            
        } catch (parseError) {
            console.error('Error parsing evaluation:', parseError);
            // Fallback evaluation
            evaluation = {
                score: 7,
                feedback: "Thank you for your thoughtful answer. You demonstrated good understanding and communication skills.",
                idealAnswer: "A strong answer would include specific examples and demonstrate clear understanding of the topic."
            };
        }

        // Store the answer and evaluation
        sessionData.answers.push({
            questionIndex: sessionData.currentQuestionIndex,
            question: currentQuestion,
            answer: userAnswer,
            evaluation: evaluation,
            timestamp: new Date()
        });

        // Increment currentQuestionIndex
        sessionData.currentQuestionIndex++;

        // Generate next question dynamically
        const nextQuestionPrompt = `Based on this ongoing interview conversation, generate the next relevant interview question.

Candidate's Background: ${sessionData.resume}

Previous Questions and Answers:
${sessionData.answers.map((qa, index) => 
    `Q${index + 1}: ${qa.question}
    A${index + 1}: ${qa.answer}`
).join('\n\n')}

Generate 1 follow-up interview question that:
1. Builds naturally on the conversation so far
2. Explores a different aspect of their experience/skills
3. Is professional and engaging
4. Avoids repeating previous topics

Return only the question text, nothing else.`;

        try {
            const nextQuestionResult = await callGeminiAI(nextQuestionPrompt);
            const nextQuestionResponse = await nextQuestionResult.response;
            const nextQuestion = nextQuestionResponse.text().trim();
            
            // Add the new question to the session
            sessionData.questions.push(nextQuestion);
            
            // Update session in storage
            interviewSessions.set(sessionId, sessionData);
            
            // Respond with evaluation and next question
            res.json({
                success: true,
                evaluation: evaluation,
                nextQuestion: nextQuestion,
                currentQuestion: sessionData.currentQuestionIndex + 1,
                totalQuestions: "Unlimited - say 'thank you' to end",
                isFinal: false
            });
            
        } catch (nextQuestionError) {
            console.error('AI question generation unavailable, using smart fallbacks:', nextQuestionError.message);
            
            // Smart fallback questions based on interview progression
            const questionCount = sessionData.answers.length;
            const smartFallbackQuestions = [
                // Early interview questions
                "What motivates you in your professional work?",
                "How do you handle working under pressure or tight deadlines?",
                "Can you describe your approach to learning new technologies or skills?",
                // Mid interview questions  
                "Tell me about a time when you had to collaborate with a difficult team member.",
                "Describe a situation where you had to adapt to significant changes at work.",
                "What do you consider to be your greatest professional strength?",
                // Later interview questions
                "Where do you see yourself in your career five years from now?",
                "What type of work environment brings out your best performance?",
                "Can you share an example of a mistake you made and how you handled it?"
            ];
            
            // Select question based on progression, with some randomness
            const baseIndex = Math.min(questionCount, smartFallbackQuestions.length - 1);
            const randomOffset = Math.floor(Math.random() * 3); // Add some variety
            const selectedIndex = Math.min(baseIndex + randomOffset, smartFallbackQuestions.length - 1);
            const smartQuestion = smartFallbackQuestions[selectedIndex];
            
            sessionData.questions.push(smartQuestion);
            
            // Update session in storage
            interviewSessions.set(sessionId, sessionData);
            
            // Respond with evaluation and smart fallback question
            res.json({
                success: true,
                evaluation: evaluation,
                nextQuestion: smartQuestion,
                currentQuestion: sessionData.currentQuestionIndex + 1,
                totalQuestions: "Unlimited - say 'thank you' to end",
                isFinal: false,
                note: "Using backup question system - AI temporarily unavailable"
            });
        }
        
    } catch (error) {
        console.error('Error submitting answer:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to process answer submission', 
            error: error.message 
        });
    }
});

// API endpoint to get session info (optional utility)
app.get('/api/session/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const sessionData = interviewSessions.get(sessionId);
    
    if (!sessionData) {
        return res.status(404).json({ 
            success: false, 
            message: 'Session not found' 
        });
    }
    
    // Return safe session info (without answers for security)
    res.json({
        success: true,
        sessionId: sessionData.sessionId,
        currentQuestion: sessionData.currentQuestionIndex + 1,
        totalQuestions: sessionData.questions.length,
        isComplete: sessionData.isComplete,
        startTime: sessionData.startTime
    });
});

// Clean up expired sessions (runs every hour)
setInterval(() => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    for (const [sessionId, sessionData] of interviewSessions.entries()) {
        if (sessionData.startTime < oneHourAgo) {
            interviewSessions.delete(sessionId);
            console.log(`Cleaned up expired session: ${sessionId}`);
        }
    }
}, 60 * 60 * 1000);

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
