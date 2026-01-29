// ============================================
// STATE MANAGEMENT
// ============================================
let currentStep = 1;
let formData = {
    companyName: '',
    location: '',
    phone: '',
    revenue: '',
    investment: ''
};

// ============================================
// STEP NAVIGATION
// ============================================
function nextStep(from) {
    // Hide current step
    document.getElementById(`step-${from}`).classList.remove('active');
    
    // Show next step
    const nextStepNum = from + 1;
    document.getElementById(`step-${nextStepNum}`).classList.add('active');
    
    // Update progress
    updateProgress(nextStepNum);
    
    // Update current step
    currentStep = nextStepNum;
    
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgress(step) {
    const steps = document.querySelectorAll('.progress-step');
    steps.forEach((el, index) => {
        if (index + 1 < step) {
            el.classList.add('completed');
            el.classList.remove('active');
        } else if (index + 1 === step) {
            el.classList.add('active');
            el.classList.remove('completed');
        } else {
            el.classList.remove('active', 'completed');
        }
    });
}

// ============================================
// STEP 2: COMPANY NAME
// ============================================
function enableStep2Button() {
    const companyInput = document.getElementById('company-name');
    const nextBtn = document.getElementById('step2-next-btn');
    
    if (companyInput.value.trim().length > 0) {
        nextBtn.disabled = false;
    } else {
        nextBtn.disabled = true;
    }
}

function goToQuiz() {
    const companyInput = document.getElementById('company-name');
    
    if (!companyInput.value.trim()) return;
    
    formData.companyName = companyInput.value.trim();
    console.log('Company name:', formData.companyName);
    
    // Track quiz start with Meta Pixel
    if (typeof fbq !== 'undefined') {
        fbq('track', 'Lead', { content_name: 'Quiz Started' });
    }
    
    // Update personalization in quiz
    updatePersonalization();
    
    // Reset quiz to first question
    showQuizSlide(1);
    
    nextStep(2);
}

// ============================================
// STEP 3: GAMIFIED QUIZ
// ============================================
let currentQuizQuestion = 1;
const totalQuizQuestions = 4;

function updateQuizProgress() {
    const progress = ((currentQuizQuestion - 1) / totalQuizQuestions) * 100;
    document.getElementById('quiz-progress-bar').style.width = `${progress}%`;
    document.getElementById('quiz-progress-text').textContent = `Question ${currentQuizQuestion} of ${totalQuizQuestions}`;
}

function updatePersonalization() {
    const nameElements = document.querySelectorAll('.personalized-name');
    const companyName = formData.companyName || 'your company';
    nameElements.forEach(el => {
        el.textContent = companyName;
    });
}

function showQuizSlide(questionNum) {
    // Hide all slides
    document.querySelectorAll('.quiz-slide').forEach(slide => {
        slide.classList.remove('active');
    });
    
    // Show target slide
    const targetSlide = document.querySelector(`.quiz-slide[data-question="${questionNum}"]`);
    if (targetSlide) {
        targetSlide.classList.add('active');
    }
    
    currentQuizQuestion = questionNum;
    updateQuizProgress();
}

function nextQuizQuestion(fromQuestion) {
    if (fromQuestion === 1) {
        const location = document.getElementById('location').value.trim();
        if (!location) return;
        formData.location = location;
        showQuizSlide(2);
    } else if (fromQuestion === 2) {
        const phone = document.getElementById('phone').value.trim();
        if (!phone) return;
        formData.phone = phone;
        showQuizSlide(3);
    }
}

function selectRevenue(value, btn) {
    formData.revenue = value;
    
    // Visual feedback
    document.querySelectorAll('.quiz-slide[data-question="3"] .quiz-option').forEach(b => {
        b.classList.remove('selected');
    });
    btn.classList.add('selected');
    
    // Auto-advance after short delay
    setTimeout(() => {
        showQuizSlide(4);
    }, 300);
}

function selectInvestment(value, btn) {
    formData.investment = value;
    
    // Visual feedback
    document.querySelectorAll('.quiz-slide[data-question="4"] .quiz-option').forEach(b => {
        b.classList.remove('selected');
    });
    btn.classList.add('selected');
    
    // Complete quiz - go to calendar
    setTimeout(() => {
        console.log('Quiz complete:', formData);
        
        // Send lead data to Zapier
        sendToZapier(formData, 'quiz_complete');
        
        // Track quiz completion with Meta Pixel
        if (typeof fbq !== 'undefined') {
            fbq('track', 'Schedule', {
                content_name: 'Calendar Shown',
                value: formData.investment,
                currency: 'USD'
            });
        }
        
        nextStep(3);
    }, 300);
}

// ============================================
// ZAPIER WEBHOOK
// ============================================
function sendToZapier(data, eventType) {
    const webhookUrl = 'https://hooks.zapier.com/hooks/catch/23450484/ul66ub4/';
    
    const payload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        company_name: data.companyName || '',
        location: data.location || '',
        phone: data.phone || '',
        revenue: data.revenue || '',
        investment: data.investment || '',
        page_url: window.location.href
    };
    
    fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
    })
    .then(() => {
        console.log('Lead sent to Zapier:', payload);
    })
    .catch((error) => {
        console.error('Zapier webhook error:', error);
    });
}

function handleQuizEnter(event, questionNum) {
    if (event.key === 'Enter') {
        event.preventDefault();
        nextQuizQuestion(questionNum);
    }
}

// Enable/disable continue buttons based on input
document.addEventListener('DOMContentLoaded', () => {
    // Location input
    const locationInput = document.getElementById('location');
    if (locationInput) {
        locationInput.addEventListener('input', () => {
            const btn = document.getElementById('q1-btn');
            btn.disabled = !locationInput.value.trim();
        });
    }
    
    // Phone input with formatting
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            
            if (value.length > 0) {
                if (value.length <= 3) {
                    value = `(${value}`;
                } else if (value.length <= 6) {
                    value = `(${value.slice(0, 3)}) ${value.slice(3)}`;
                } else {
                    value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`;
                }
            }
            
            e.target.value = value;
            
            const btn = document.getElementById('q2-btn');
            btn.disabled = value.replace(/\D/g, '').length < 10;
        });
    }
});

// ============================================
// SOCIAL PROOF POPUP
// ============================================
const proofData = [
    { name: 'Mike from Texas', action: 'Booked a call', time: '2 hours ago' },
    { name: 'Jason from Florida', action: 'Booked a call', time: '4 hours ago' },
    { name: 'Steve from Arizona', action: 'Booked a call', time: '6 hours ago' },
    { name: 'Chris from California', action: 'Booked a call', time: 'Yesterday' },
    { name: 'Dave from Ohio', action: 'Booked a call', time: 'Yesterday' }
];

let proofIndex = 0;

function showProofPopup() {
    const popup = document.getElementById('proof-popup');
    const data = proofData[proofIndex];
    
    // Update content
    popup.querySelector('.proof-name').textContent = data.name;
    popup.querySelector('.proof-action').textContent = data.action;
    popup.querySelector('.proof-time').textContent = data.time;
    
    // Show popup
    popup.classList.add('show');
    
    // Hide after 4 seconds
    setTimeout(() => {
        popup.classList.remove('show');
    }, 4000);
    
    // Cycle through proof data
    proofIndex = (proofIndex + 1) % proofData.length;
}

// Show first popup after 5 seconds, then every 30 seconds
setTimeout(() => {
    showProofPopup();
    setInterval(showProofPopup, 30000);
}, 5000);

// ============================================
// KEYBOARD HANDLING
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const companyInput = document.getElementById('company-name');
    
    if (companyInput) {
        companyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && companyInput.value.trim()) {
                e.preventDefault();
                goToQuiz();
            }
        });
    }
});

// ============================================
// CALENDLY BOOKING TRACKING
// ============================================
// Listen for Calendly events
window.addEventListener('message', function(e) {
    if (e.origin === 'https://calendly.com') {
        if (e.data.event && e.data.event === 'calendly.event_scheduled') {
            // Update URL with tracking parameter
            const url = new URL(window.location);
            url.searchParams.set('booked', 'true');
            url.searchParams.set('event', 'scheduled');
            window.history.pushState({}, '', url);
            
            // Send booking confirmation to Zapier
            sendToZapier(formData, 'call_booked');
            
            // Fire Meta Pixel event for completed booking
            if (typeof fbq !== 'undefined') {
                fbq('track', 'CompleteRegistration', {
                    content_name: 'Call Booked',
                    value: formData.investment || '0',
                    currency: 'USD',
                    status: 'booked'
                });
            }
            
            console.log('Meeting scheduled! URL updated with ?booked=true');
        }
    }
});
