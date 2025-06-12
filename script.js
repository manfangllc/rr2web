document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const painPoints = document.querySelectorAll('.pain-point');
    const diagnosticDrawer = document.getElementById('diagnosticDrawer');
    const closeDrawer = document.getElementById('closeDrawer');
    const diagnosticForm = document.getElementById('diagnosticForm');
    const skipQuizLink = document.querySelector('.skip-quiz');
    const faqItems = document.querySelectorAll('.faq-item');
    const loadingOverlay = document.getElementById('loadingOverlay');

    // State
    let selectedPainPoint = null;
    let isLoading = false;

    // Analytics
    const trackEvent = (category, action, label) => {
        if (typeof gtag !== 'undefined') {
            gtag('event', action, {
                'event_category': category,
                'event_label': label
            });
        }
        // Fallback to console in development
        console.log('Analytics Event:', { category, action, label });
    };

    // Error Handling
    const handleError = (error, context) => {
        console.error(`Error in ${context}:`, error);
        showNotification(`Sorry, something went wrong. Please try again.`, 'error');
        trackEvent('Error', context, error.message);
    };

    // Loading State
    const setLoading = (loading) => {
        isLoading = loading;
        loadingOverlay.classList.toggle('active', loading);
        document.body.style.overflow = loading ? 'hidden' : '';
    };

    // Event Listeners
    painPoints.forEach(point => {
        point.addEventListener('click', () => {
            selectedPainPoint = point.dataset.pain;
            trackEvent('Pain Point', 'Click', selectedPainPoint);
            openDrawer();
        });
    });

    closeDrawer.addEventListener('click', () => {
        trackEvent('Diagnostic', 'Close', selectedPainPoint);
        closeDrawerHandler();
    });

    diagnosticForm.addEventListener('submit', handleFormSubmit);
    skipQuizLink.addEventListener('click', (e) => {
        e.preventDefault();
        trackEvent('Navigation', 'Skip Quiz', 'Direct Contact');
        openCalendly();
    });

    // FAQ Accordion
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            trackEvent('FAQ', isActive ? 'Close' : 'Open', question.textContent);
            
            // Close all other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });

            // Toggle current item
            item.classList.toggle('active');
        });
    });

    // Functions
    function openDrawer() {
        diagnosticDrawer.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeDrawerHandler() {
        diagnosticDrawer.classList.remove('active');
        document.body.style.overflow = '';
        selectedPainPoint = null;
        diagnosticForm.reset();
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        
        if (isLoading) return;
        
        const problem = document.getElementById('problem').value;
        const submitButton = diagnosticForm.querySelector('button[type="submit"]');
        
        try {
            setLoading(true);
            trackEvent('Diagnostic', 'Submit', selectedPainPoint);
            
            const response = await fetch('/api/diagnose', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    painPoint: selectedPainPoint,
                    problem: problem
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const data = await response.json();
            displayResponse(data);
            trackEvent('Diagnostic', 'Success', selectedPainPoint);
        } catch (error) {
            handleError(error, 'Form Submission');
        } finally {
            setLoading(false);
        }
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    function displayResponse(response) {
        const drawerContent = document.querySelector('.drawer-content');
        
        // Create response HTML
        const responseHTML = `
            <div class="response">
                <h3>Here's your quick plan:</h3>
                <ol>
                    ${response.steps.map(step => `<li>${step}</li>`).join('')}
                </ol>
                <div class="cta-buttons">
                    <button class="btn-primary" onclick="openCalendly()">Book a 20-min call</button>
                    <button class="btn-secondary" onclick="requestSMS()">Text me the plan</button>
                </div>
            </div>
        `;
        
        // Replace form with response
        drawerContent.innerHTML = responseHTML;
    }

    // Close drawer when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target === diagnosticDrawer) {
            closeDrawerHandler();
        }
    });

    // Close drawer on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && diagnosticDrawer.classList.contains('active')) {
            closeDrawerHandler();
        }
    });

    // Track page view
    trackEvent('Page', 'View', window.location.pathname);
});

// Calendly Integration
function openCalendly() {
    const calendlyUrl = 'https://calendly.com/your-username/20min';
    
    // Create Calendly container if it doesn't exist
    let calendlyContainer = document.getElementById('calendlyContainer');
    if (!calendlyContainer) {
        calendlyContainer = document.createElement('div');
        calendlyContainer.id = 'calendlyContainer';
        calendlyContainer.style.position = 'fixed';
        calendlyContainer.style.top = '50%';
        calendlyContainer.style.left = '50%';
        calendlyContainer.style.transform = 'translate(-50%, -50%)';
        calendlyContainer.style.zIndex = '1000';
        calendlyContainer.style.backgroundColor = 'white';
        calendlyContainer.style.padding = '20px';
        calendlyContainer.style.borderRadius = '8px';
        calendlyContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
        document.body.appendChild(calendlyContainer);
    }

    // Initialize Calendly widget
    Calendly.initInlineWidget({
        url: calendlyUrl,
        parentElement: calendlyContainer,
        prefill: {
            name: '',
            email: '',
            customAnswers: {
                a1: selectedPainPoint || 'Direct Contact'
            }
        },
        utm: {
            utmSource: 'Website',
            utmMedium: 'Diagnostic Tool',
            utmCampaign: selectedPainPoint || 'Direct Contact'
        }
    });

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.position = 'absolute';
    closeButton.style.right = '10px';
    closeButton.style.top = '10px';
    closeButton.style.border = 'none';
    closeButton.style.background = 'none';
    closeButton.style.fontSize = '24px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => {
        calendlyContainer.remove();
        trackEvent('Calendly', 'Close', selectedPainPoint || 'Direct Contact');
    };
    calendlyContainer.appendChild(closeButton);

    trackEvent('Calendly', 'Open', selectedPainPoint || 'Direct Contact');
}

// SMS Integration
async function requestSMS() {
    const phone = prompt('Please enter your phone number:');
    if (!phone) return;

    const smsButton = document.querySelector('.btn-secondary');
    const originalText = smsButton.textContent;
    smsButton.disabled = true;
    smsButton.innerHTML = '<span class="loading-spinner"></span> Sending...';

    try {
        const response = await fetch('/api/send-sms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ phone })
        });

        if (!response.ok) {
            throw new Error('Failed to send SMS');
        }

        const data = await response.json();
        
        if (data.success) {
            showNotification('Your plan has been sent to your phone!', 'success');
            trackEvent('SMS', 'Success', selectedPainPoint || 'Direct Contact');
        } else {
            throw new Error(data.error || 'Failed to send SMS');
        }
    } catch (error) {
        handleError(error, 'SMS Request');
    } finally {
        smsButton.disabled = false;
        smsButton.textContent = originalText;
    }
} 