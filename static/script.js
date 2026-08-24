document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const emailText = document.getElementById('email-text');
    const charCount = document.getElementById('char-count');
    const btnAnalyze = document.getElementById('btn-analyze');
    const btnText = document.getElementById('btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    const btnClear = document.getElementById('btn-clear');
    
    const resultCard = document.getElementById('result-card');
    const gaugeFill = document.getElementById('gauge-fill');
    const percentageVal = document.getElementById('percentage-val');
    const predictionBadge = document.getElementById('prediction-badge');
    const resultTitle = document.getElementById('result-title');
    const resultDesc = document.getElementById('result-desc');
    
    const exampleBtns = document.querySelectorAll('.example-btn');

    // Constants
    const MAX_CHAR = 50000;
    const GAUGE_CIRCUMFERENCE = 314.16; // 2 * PI * 50

    // Character Counter
    emailText.addEventListener('input', () => {
        const count = emailText.value.length;
        charCount.textContent = `${count.toLocaleString()} / ${MAX_CHAR.toLocaleString()}`;
        
        if (count > MAX_CHAR) {
            charCount.style.color = '#f87171'; // Red warning
        } else {
            charCount.style.color = '#64748b'; // Normal
        }
    });

    // Clear Button
    btnClear.addEventListener('click', () => {
        emailText.value = '';
        charCount.textContent = `0 / ${MAX_CHAR.toLocaleString()}`;
        charCount.style.color = '#64748b';
        resultCard.classList.add('hidden');
        emailText.focus();
    });

    // Example Buttons loading
    exampleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const templateText = btn.getAttribute('data-text');
            emailText.value = templateText;
            
            // Trigger character count update
            const count = templateText.length;
            charCount.textContent = `${count.toLocaleString()} / ${MAX_CHAR.toLocaleString()}`;
            charCount.style.color = '#64748b';
            
            // Trigger analysis
            analyzeMessage(templateText);
        });
    });

    // Analyze Click Handler
    btnAnalyze.addEventListener('click', () => {
        const text = emailText.value.trim();
        if (!text) {
            alert('Please enter some text to analyze.');
            emailText.focus();
            return;
        }
        analyzeMessage(text);
    });

    // Main Analysis Function
    async function analyzeMessage(text) {
        // 1. Enter loading state
        btnAnalyze.disabled = true;
        btnText.textContent = 'Analyzing...';
        btnSpinner.classList.remove('hidden');
        
        try {
            // 2. Call local API endpoint
            const response = await fetch('/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: text })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.detail || 'An error occurred during prediction.');
            }

            // 3. Render prediction outputs
            showResults(data.prediction, data.spam_probability);
        } catch (error) {
            console.error('Error during analysis:', error);
            alert(`Analysis failed: ${error.message}`);
        } finally {
            // 4. Exit loading state
            btnAnalyze.disabled = false;
            btnText.textContent = 'Analyze Message';
            btnSpinner.classList.add('hidden');
        }
    }

    // Result Rendering
    function showResults(prediction, spamProb) {
        // Show container
        resultCard.classList.remove('hidden');
        
        // Reset classes
        predictionBadge.className = 'badge';
        gaugeFill.className = 'gauge-fill';
        
        // Convert to percentage representation
        const percentage = Math.round(spamProb * 100);
        percentageVal.textContent = `${percentage}%`;
        
        // Animate circular gauge
        // dashoffset = circumference * (1 - fraction)
        const offset = GAUGE_CIRCUMFERENCE * (1 - spamProb);
        gaugeFill.style.strokeDashoffset = offset;
        
        // Update elements based on outcome class
        if (prediction === 'spam') {
            predictionBadge.textContent = 'Spam Detected';
            predictionBadge.classList.add('badge-spam');
            gaugeFill.classList.add('gauge-spam-fill');
            resultTitle.textContent = 'High Alert: Marked as Spam';
            
            // Set dynamic explanation descriptions
            if (spamProb > 0.85) {
                resultDesc.textContent = `This message has a very high spam score of ${percentage}%. It displays strong signs of fraudulent solicitation, phishing links, or unsolicited advertising.`;
            } else {
                resultDesc.textContent = `This message is flagged as spam (score of ${percentage}%). It exhibits patterns resembling bulk marketing campaigns, financial claims, or suspicious links.`;
            }
        } else {
            predictionBadge.textContent = 'Safe (Ham)';
            predictionBadge.classList.add('badge-ham');
            gaugeFill.classList.add('gauge-ham-fill');
            resultTitle.textContent = 'Safe: Clear of Spam Indicators';
            
            if (spamProb < 0.15) {
                resultDesc.textContent = `This message is clean (spam probability: ${percentage}%). It is highly characteristic of standard personal, conversational, or transactional correspondence.`;
            } else {
                resultDesc.textContent = `This message is classified as safe (spam probability: ${percentage}%). Although it contains a few terms commonly associated with promotions, it lacks strong spam markers.`;
            }
        }
        
        // Smooth scroll to the results on mobile
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
});
