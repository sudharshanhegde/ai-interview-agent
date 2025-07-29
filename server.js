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

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
        // Debug: Check if API key is loaded
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ 
                success: false, 
                message: 'API key not found in environment variables',
                debug: 'GEMINI_API_KEY is not set'
            });
        }

        const prompt = "Say hello and confirm you're working!";
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        res.json({ 
            success: true, 
            message: 'Gemini AI is working!', 
            aiResponse: text 
        });
    } catch (error) {
        console.error('Error testing AI:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error connecting to Gemini AI', 
            error: error.message 
        });
    }
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

        // Get questions from AI
        const result = await model.generateContent(interviewPrompt);
        const response = await result.response;
        const aiResponse = response.text().trim();
        
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
                "What interests you most about this position?",
                "Describe a challenging project you've worked on recently."
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
                const result = await model.generateContent(feedbackPrompt);
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
                    const summaryResult = await model.generateContent(summaryPrompt);
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

        // Call Gemini API for evaluation
        const result = await model.generateContent(evaluationPrompt);
        const response = await result.response;
        const aiResponse = response.text().trim();
        
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
            const nextQuestionResult = await model.generateContent(nextQuestionPrompt);
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
            console.error('Error generating next question:', nextQuestionError);
            
            // Fallback: use a generic follow-up question
            const fallbackQuestions = [
                "Can you share an example of a time when you had to solve a complex problem?",
                "How do you typically approach learning new skills or technologies?",
                "Tell me about a time when you had to work with a difficult team member.",
                "What motivates you in your professional work?",
                "Describe a situation where you had to adapt to significant changes."
            ];
            
            const randomQuestion = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
            sessionData.questions.push(randomQuestion);
            
            // Update session in storage
            interviewSessions.set(sessionId, sessionData);
            
            // Respond with evaluation and fallback question
            res.json({
                success: true,
                evaluation: evaluation,
                nextQuestion: randomQuestion,
                currentQuestion: sessionData.currentQuestionIndex + 1,
                totalQuestions: "Unlimited - say 'thank you' to end",
                isFinal: false
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
