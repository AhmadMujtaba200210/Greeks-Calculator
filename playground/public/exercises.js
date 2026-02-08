// Practice Exercises

const exercises = {
    'delta-quiz': {
        title: 'Delta Quiz',
        questions: [
            {
                question: 'A call option has a delta of 0.7. If the stock price increases by $2, approximately how much will the option price increase?',
                options: ['$0.70', '$1.40', '$2.00', '$2.80'],
                correct: 1,
                explanation: 'Delta of 0.7 means the option moves $0.70 for every $1 move in the stock. So for a $2 move: 0.7 × $2 = $1.40'
            },
            {
                question: 'Which option typically has the highest delta?',
                options: ['Deep OTM call', 'ATM call', 'Deep ITM call', 'All have the same delta'],
                correct: 2,
                explanation: 'Deep in-the-money calls have delta closest to 1.0, meaning they move almost 1-to-1 with the underlying stock.'
            },
            {
                question: 'You own 100 call options with delta = 0.5. How many shares should you sell to be delta-neutral?',
                options: ['50 shares', '100 shares', '500 shares', '5,000 shares'],
                correct: 3,
                explanation: '100 contracts × 100 shares/contract × 0.5 delta = 5,000 shares'
            },
            {
                question: 'What happens to call option delta as expiration approaches and the option is ATM?',
                options: ['Approaches 0', 'Approaches 0.5', 'Approaches 1', 'Becomes unstable'],
                correct: 3,
                explanation: 'As expiration nears, ATM options become very sensitive to small price moves. Delta becomes unstable and can jump between 0 and 1.'
            },
            {
                question: 'A put option has delta = -0.3. What does this mean?',
                options: [
                    'The option loses $0.30 when stock rises $1',
                    'The option gains $0.30 when stock falls $1',
                    'Both A and B',
                    'The option is worthless'
                ],
                correct: 2,
                explanation: 'Put deltas are negative. Delta of -0.3 means the option loses $0.30 when stock rises $1, and gains $0.30 when stock falls $1.'
            }
        ]
    },

    'greeks-calc': {
        title: 'Calculate the Greeks',
        scenarios: [
            {
                description: 'Calculate the Greeks for this option:',
                params: { spot: 100, strike: 105, maturity: 0.5, volatility: 0.30, rate: 0.05, dividend: 0.02, type: 'call' },
                tasks: ['What is the option price?', 'What is the delta?', 'Is this option ITM, ATM, or OTM?']
            }
        ],
        type: 'calculator' // Placeholder type for custom logic
    },

    'hedging-sim': {
        title: 'Delta Hedging Simulation',
        description: 'Practice maintaining a delta-neutral position as the market moves',
        initialPosition: { options: 100, optionDelta: 0.6, shares: 0, cash: 100000 },
        marketMoves: [
            { day: 1, priceChange: +2, newDelta: 0.65 },
            { day: 2, priceChange: -3, newDelta: 0.55 },
            { day: 3, priceChange: +1, newDelta: 0.60 }
        ],
        type: 'simulation'
    },

    'vol-surface': {
        title: 'Volatility Surface Builder',
        description: 'Experiment with SVI parameters to fit a volatility smile.',
        type: 'interactive',
        content: '<p>Interactive volatility surface builder coming soon. For now, use the "Vol Surface" tab in the Playground.</p>'
    },

    'strategy-builder': {
        title: 'Strategy Builder',
        description: 'Construct multi-leg option strategies.',
        type: 'interactive',
        content: '<p>Strategy builder coming soon. Practice by calculating P&L for individual legs in the Playground.</p>'
    },

    'scenario-analysis': {
        title: 'Scenario Analysis',
        description: 'Analyze how your portfolio performs under stress.',
        type: 'interactive',
        content: '<p>Scenario analysis tool coming soon.</p>'
    }
};

// Exercise state
let currentExercise = null;
let currentQuestion = 0;
let score = 0;

// Start an exercise
function startExercise(exerciseId) {
    currentExercise = exercises[exerciseId];
    currentQuestion = 0;
    score = 0;

    if (exerciseId === 'delta-quiz') {
        showQuiz();
    } else if (currentExercise.type === 'interactive') {
        showInteractivePlaceholder();
    } else if (exerciseId === 'greeks-calc') {
        showCalculatorExercise(); // Basic implementation below
    } else if (exerciseId === 'hedging-sim') {
        showHedgingSimulation(); // Basic implementation below
    }
}

// Show quiz interface
function showQuiz() {
    const container = document.querySelector('.practice-layout');
    const quiz = currentExercise.questions[currentQuestion];

    container.innerHTML = `
        <div class="quiz-container">
            <div class="quiz-header">
                <h2>${currentExercise.title}</h2>
                <p>Question ${currentQuestion + 1} of ${currentExercise.questions.length}</p>
                <p>Score: ${score}/${currentQuestion}</p>
            </div>
            <div class="quiz-question">
                <h3>${quiz.question}</h3>
                <div class="quiz-options">
                    ${quiz.options.map((opt, i) => `
                        <button class="quiz-option" data-index="${i}">${opt}</button>
                    `).join('')}
                </div>
            </div>
            <div id="quizFeedback" class="quiz-feedback"></div>
        </div>
    `;

    document.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', () => checkAnswer(parseInt(btn.dataset.index)));
    });
}

function checkAnswer(selectedIndex) {
    const quiz = currentExercise.questions[currentQuestion];
    const feedback = document.getElementById('quizFeedback');
    const isCorrect = selectedIndex === quiz.correct;

    if (isCorrect) score++;

    feedback.innerHTML = `
        <div class="feedback-${isCorrect ? 'correct' : 'incorrect'}">
            <h4>${isCorrect ? '✅ Correct!' : '❌ Incorrect'}</h4>
            <p>${isCorrect ? quiz.explanation : `Correct answer: ${quiz.options[quiz.correct]}. ${quiz.explanation}`}</p>
            <button onclick="nextQuestion()">Next Question</button>
        </div>
    `;
    document.querySelectorAll('.quiz-option').forEach(btn => btn.disabled = true);
}

function nextQuestion() {
    currentQuestion++;
    if (currentQuestion < currentExercise.questions.length) {
        showQuiz();
    } else {
        showQuizResults();
    }
}

function showQuizResults() {
    const container = document.querySelector('.practice-layout');
    const percentage = (score / currentExercise.questions.length * 100).toFixed(0);
    container.innerHTML = `
        <div class="quiz-results">
            <h2>Quiz Complete!</h2>
            <div class="score-display"><div class="score-circle">${percentage}%</div></div>
            <div class="results-actions">
                <button onclick="startExercise('delta-quiz')">Retake Quiz</button>
                <button onclick="location.reload()">Back to Exercises</button>
            </div>
        </div>
    `;
}

function showInteractivePlaceholder() {
    const container = document.querySelector('.practice-layout');
    container.innerHTML = `
        <div class="exercise-card">
            <h2>${currentExercise.title}</h2>
            ${currentExercise.content}
            <button onclick="location.reload()" class="start-btn">Back to Exercises</button>
        </div>
    `;
}

function showCalculatorExercise() {
    showInteractivePlaceholder(); // Valid placeholder for now
}
function showHedgingSimulation() {
    showInteractivePlaceholder(); // Valid placeholder for now
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.exercise-card .start-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.exercise-card');
            startExercise(card.dataset.exercise);
        });
    });
});
