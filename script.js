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
// META PIXEL VERIFICATION
// ============================================
function verifyMetaPixel() {
    if (typeof fbq === 'undefined') {
        console.error('Meta Pixel not loaded! Events will not be tracked.');
        return false;
    }
    console.log('Meta Pixel verified and ready');
    return true;
}

// Verify pixel on page load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        verifyMetaPixel();
    }, 1000);
});

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
    
    // Update personalization in quiz
    updatePersonalization();
    
    // Reset quiz to first question
    showQuizSlide(1);
    
    // Lock quiz immediately - no escape
    document.body.classList.add('quiz-locked');
    
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
    
    setTimeout(() => {
        // Check if disqualified (no budget)
        if (value === 'no-budget') {
            console.log('User disqualified - no budget');
            showQuizSlide('disqualified');
            return;
        }
        
        // Qualified - complete quiz and go to calendar
        console.log('Quiz complete:', formData);
        
        // Send lead data to Zapier
        sendToZapier(formData, 'quiz_complete');
        
        // Track Lead event with all collected data
        if (verifyMetaPixel()) {
            const eventId = 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Set investment value based on new options
            let investmentValue = 1500; // Base investment amount
            if (value === 'ready-to-grow') investmentValue = 1500;
            else if (value === 'interested') investmentValue = 1500;
            
            const leadEventData = {
                eventID: eventId,
                content_name: 'Epoxy Business Lead',
                content_category: 'Quiz Completed',
                value: investmentValue,
                currency: 'USD',
                source: 'website',
                method: 'quiz',
                lead_company: formData.companyName || '',
                lead_location: formData.location || '',
                lead_phone: formData.phone || '',
                lead_revenue: formData.revenue || '',
                lead_investment: formData.investment || ''
            };
            
            console.log('Firing Meta Pixel Lead event:', leadEventData);
            fbq('trackSingle', '911888651189317', 'Lead', leadEventData);
            
            const scheduleEventId = 'schedule_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            const scheduleEventData = {
                eventID: scheduleEventId,
                content_name: 'Calendar Shown',
                value: investmentValue,
                currency: 'USD'
            };
            console.log('Firing Meta Pixel Schedule event:', scheduleEventData);
            fbq('trackSingle', '911888651189317', 'Schedule', scheduleEventData);
        }
        
        // Unlock the quiz when moving to calendar
        document.body.classList.remove('quiz-locked');
        
        nextStep(3);
    }, 300);
}

// ============================================
// ZAPIER WEBHOOK
// ============================================
let zapierSent = {
    quiz_complete: false,
    call_booked: false
};

// Generate unique request ID for deduplication
function generateRequestId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function sendToZapier(data, eventType) {
    // Create unique key based on event type + phone number (most unique identifier)
    const uniqueKey = eventType + '_' + (data.phone || 'unknown');
    
    // Prevent duplicate sends - check localStorage for this session
    const sentKey = 'zapier_sent_' + uniqueKey;
    if (sessionStorage.getItem(sentKey)) {
        console.log('Zapier webhook already sent for:', eventType, 'Phone:', data.phone);
        return;
    }
    
    // Mark as sent immediately in sessionStorage
    sessionStorage.setItem(sentKey, 'true');
    
    // Also mark in memory
    zapierSent[eventType] = true;
    
    const webhookUrl = 'https://hooks.zapier.com/hooks/catch/23450484/ul66ub4/';
    const timestamp = new Date().toISOString();
    
    // Create unique dedupe key using phone + timestamp (Zapier can use this)
    const dedupeKey = (data.phone || 'unknown') + '_' + Date.now();
    
    // Build form data that Zapier can read
    const formData = new FormData();
    formData.append('event', eventType);
    formData.append('timestamp', timestamp);
    formData.append('dedupe_key', dedupeKey); // Use phone + timestamp for deduplication
    formData.append('company_name', data.companyName || '');
    formData.append('location', data.location || '');
    formData.append('phone', data.phone || '');
    formData.append('revenue', data.revenue || '');
    formData.append('investment', data.investment || '');
    formData.append('page_url', window.location.href);
    
    // Send as form data - Zapier reads this natively
    fetch(webhookUrl, {
        method: 'POST',
        body: formData
    })
    .then(response => response.text())
    .then(result => {
        console.log('Zapier response:', result);
    })
    .catch(error => {
        console.log('Zapier fetch blocked by CORS, using fallback');
        // Only use fallback if fetch fails
        const params = new URLSearchParams({
            event: eventType,
            timestamp: timestamp,
            dedupe_key: dedupeKey,
            company_name: data.companyName || '',
            location: data.location || '',
            phone: data.phone || '',
            revenue: data.revenue || '',
            investment: data.investment || '',
            page_url: window.location.href
        }).toString();
        
        const img = new Image();
        img.src = webhookUrl + '?' + params;
    });
    
    console.log('Lead sent to Zapier:', eventType, 'Dedupe Key:', dedupeKey, data);
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
            if (btn) btn.disabled = value.replace(/\D/g, '').length < 10;
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
let calendlyProcessed = false;

// Listen for Calendly events
window.addEventListener('message', function(e) {
    if (e.origin === 'https://calendly.com') {
        if (e.data.event && e.data.event === 'calendly.event_scheduled') {
            // Prevent duplicate processing
            if (calendlyProcessed) {
                console.log('Calendly event already processed, skipping duplicate');
                return;
            }
            
            calendlyProcessed = true;
            
            // Update URL with tracking parameter
            const url = new URL(window.location);
            url.searchParams.set('booked', 'true');
            url.searchParams.set('event', 'scheduled');
            window.history.pushState({}, '', url);
            
            // Send booking confirmation to Zapier
            sendToZapier(formData, 'call_booked');
            
            // Fire Meta Pixel event for completed booking
            if (verifyMetaPixel()) {
                // Generate unique event ID
                const registrationEventId = 'registration_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                
                // Parse investment value to number
                let investmentValue = 1500;
                if (formData.investment === 'ready-to-grow' || formData.investment === 'interested') {
                    investmentValue = 1500;
                }
                
                const registrationEventData = {
                    eventID: registrationEventId,
                    content_name: 'Call Booked',
                    value: investmentValue,
                    currency: 'USD',
                    status: 'booked',
                    method: 'calendly'
                };
                console.log('Firing Meta Pixel CompleteRegistration event:', registrationEventData);
                fbq('trackSingle', '911888651189317', 'CompleteRegistration', registrationEventData);
            } else {
                console.error('Meta Pixel (fbq) is not defined. Check if Pixel is loaded correctly.');
            }
            
            console.log('Meeting scheduled! URL updated with ?booked=true');
        }
    }
});
