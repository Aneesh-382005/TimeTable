import html2canvas from 'html2canvas';
import React, { useState, useEffect } from 'react';
import './FeedbackModal.css';

const FeedbackModal = ({ show, handleClose}) => {
    const [formData, setFormData] = useState({
        issueType: '',
        description: '',
        email: '',
        pageURL : window.location.href,
        userAgent: navigator.userAgent,
        screenshot: null
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);

    const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
    const [capturedScreenshot, setCapturedScreenshot] = useState(null);
    const [isHiddenForCapture, setIsHiddenForCapture] = useState(false);

    const TURNSTILE_SITE_KEY = "0x4AAAAAABnmI8MCABrxy8RR";
    const [turnstileToken, setTurnstileToken] = useState(null);
    const [turnstileLoading, setTurnstileLoading] = useState(true);

    useEffect(() => {
        if (show) {
            setTurnstileLoading(true);
            setTurnstileToken(null);
            
            const renderTurnstileWidget = () => {
                const container = document.querySelector('.cf-turnstile');
                if (container) {
                    container.innerHTML = '';
                }
                
                setTimeout(() => {
                    if (window.turnstile && window.turnstile.render) {
                        try {
                            console.log('Auto-rendering Turnstile widget');
                            window.turnstile.render('.cf-turnstile', {
                                sitekey: TURNSTILE_SITE_KEY,
                                callback: (token) => {
                                    console.log('Direct callback - Turnstile success:', token);
                                    setTurnstileToken(token);
                                    setTurnstileLoading(false);
                                },
                                'error-callback': () => {
                                    console.log('Direct callback - Turnstile error');
                                    setTurnstileToken(null);
                                    setTurnstileLoading(false);
                                }
                            });
                            setTurnstileLoading(false);
                            console.log('Turnstile widget rendered successfully');
                        } catch (e) {
                            console.error('Auto render failed:', e);
                            setTurnstileLoading(false);
                        }
                    } else {
                        console.log('Turnstile API not ready, retrying...');
                        setTimeout(renderTurnstileWidget, 500);
                    }
                }, 100);
            };

            const timer = setTimeout(renderTurnstileWidget, 200);
            
            const fallbackTimeout = setTimeout(() => {
                setTurnstileLoading(false);
                console.log('Turnstile auto-render timeout');
            }, 10000);

            return () => {
                clearTimeout(timer);
                clearTimeout(fallbackTimeout);
            };
        }

        return () => {
            // Cleanup - no longer needed since we use direct callbacks
        };
    }, [show]);

    const handleInputChange = (e) => {
        const {name, value} = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.issueType || !formData.description) {
            alert('Please fill in all required fields.');
            return;
        }

        if (!turnstileToken) {
            alert('Please complete the CAPTCHA verification.');
            return;
        }

        setIsSubmitting(true);

        try {
            const submitData = new FormData();
            submitData.append('issueType', formData.issueType);
            submitData.append('description', formData.description);
            submitData.append('email', formData.email);
            submitData.append('pageURL', formData.pageURL);
            submitData.append('userAgent', formData.userAgent);
            submitData.append('turnstileToken', turnstileToken);

            if (formData.screenshot) {
                submitData.append('screenshot', formData.screenshot);
            }

            const response = await fetch('/api/feedback', {
                method: 'POST',
                body: submitData
            });

            if (response.ok) {
                setSubmitStatus('success');
                setTimeout(() => {
                    setSubmitStatus(null);
                    setFormData({
                        issueType: '',
                        description: '',
                        email: '',
                        pageURL: window.location.href,
                        userAgent: navigator.userAgent,
                        screenshot: null
                    });
                    setCapturedScreenshot(null);
                    setTurnstileToken(null);
                    
                    const fileInput = document.getElementById('screenshot-upload');
                    if (fileInput) {
                        fileInput.value = '';
                    }
                    
                    if (window.turnstile) {
                        window.turnstile.reset();
                    }
                    
                    handleClose();
                }, 2000);
            } else {
                throw new Error('Submission failed');
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const captureScreenshot = async () => {
        setIsCapturingScreenshot(true);
        setIsHiddenForCapture(true); // Hide modal content without affecting event handlers

        try {
            // Wait for UI to update
            await new Promise(resolve => setTimeout(resolve, 100));

            const canvas = await html2canvas(document.body, {
                height: window.innerHeight,
                width: window.innerWidth,
                scrollX: 0,
                scrollY: 0,
                useCORS: true,
                allowTaint: true,
                scale: 0.5
            });

            canvas.toBlob((blob) => {
                setCapturedScreenshot(blob);
                setFormData(prev => ({
                    ...prev,
                    screenshot: blob
                }));
            }, 'image/png', 0.8);

        } catch (error) {
            console.error('Error capturing screenshot:', error);
            alert('Failed to capture screenshot. Please try again.');
        } finally {
            setIsCapturingScreenshot(false);
            setIsHiddenForCapture(false); // Show modal content again
        }
    };

    const removeScreenshot = () => {
        setCapturedScreenshot(null);
        setFormData(prev => ({
            ...prev,
            screenshot: null
        }));
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        
        if (file) {
            if (!file.type.startsWith('image/')) {
                alert('Please upload a valid image file.');
                return;
            }

            const maxSize = 5 * 1024 * 1024; // 5 MB
            if (file.size > maxSize) {
                alert('File size must be less than 5 MB');
                return;
            }

            setCapturedScreenshot(file);
            setFormData(prev => ({
                ...prev,
                screenshot: file
            }));
        }
    };

    const isFormValid = formData.issueType && formData.description && turnstileToken;    

    return (
        <div className={`feedback-popup ${show ? 'show' : ''} ${isHiddenForCapture ? 'hidden-for-capture' : ''}`}>
            <div className="feedback-popup-content">
                <div style={{ 
                    visibility: isHiddenForCapture ? 'hidden' : 'visible',
                    position: isHiddenForCapture ? 'absolute' : 'relative'
                }}>
                    <button className='feedback-popup-close' onClick={handleClose}>×</button>
                        <h2 className='feedback-title'>Feedback</h2>
                        <p className='feedback-subtitle'>
                            Found an issue or have a suggestion? We'd love to hear from you!
                        </p>

                        <div className='feedback-form-placeholder'>
                            <form className='feedback-form' onSubmit={handleSubmit}>
                                {/* Issue Type */}
                                <div className = 'feedback-field'>
                                    <label htmlFor='issueType' className = 'feedback-label'>
                                        Issue Type <span className = 'required'>*</span>
                                    </label>
                                    <select
                                        id = 'issueType'
                                        name = 'issueType'
                                        value = {formData.issueType}
                                        onChange = {handleInputChange}
                                        className = 'feedback-select'
                                        required
                                    >
                                        <option value = "">Select an issue type</option>
                                        <option value = "bug">Bug Report</option>
                                        <option value = "feature">Feature Request</option>
                                        <option value = "data">Data Inaccuracy</option>
                                        <option value = "UI">UI/UX Issue</option>
                                        <option value = "other">Other</option>
                                    </select>
                                </div>
                                {/* Description */}
                                <div className = 'feedback-field'>
                                    <label htmlFor = 'description' className = 'feedback-label'>
                                        Description <span className = 'required'>*</span>
                                    </label>
                                    <textarea
                                        id = 'description'
                                        name = 'description'
                                        value = {formData.description}
                                        onChange = {handleInputChange}
                                        className = 'feedback-textarea'
                                        placeholder = "Describe the issue you're experiencing or suggest a feature..."
                                        rows = "4"
                                        required
                                    />
                                </div>
                                {/* Email */}
                                <div className = 'feedback-field'>
                                    <label htmlFor = 'email' className = 'feedback-label'>
                                        Thapar Email
                                    </label>
                                    <input
                                        type = 'email'
                                        id = 'email'
                                        name = 'email'
                                        value = {formData.email}
                                        onChange = {handleInputChange}
                                        className = 'feedback-input'
                                        placeholder = "your.email@thapar.edu"
                                    />
                                    <small className = 'feedback-help'>
                                        Leave your email if you'd like us to follow up
                                    </small>
                                </div>
                                {/* Screenshot Capture - Replace your existing screenshot section with this */}
                                <div className = 'feedback-field'>
                                    <label className = 'feedback-label'>
                                        Screenshot (optional)
                                    </label>
                                    <div className = 'feedback-screenshot'>
                                        {!capturedScreenshot ? (
                                            <div className='screenshot-options'>
                                                <button
                                                    type = 'button'
                                                    onClick = {captureScreenshot}
                                                    disabled = {isCapturingScreenshot}
                                                    className = 'feedback-screenshot-button'
                                                >
                                                    {isCapturingScreenshot ? '📸 Capturing...' : '📸 Capture this page'}
                                                </button>
                                                
                                                <div className='screenshot-divider'>or</div>
                                                
                                                <label htmlFor="screenshot-upload" className='screenshot-upload-label'>
                                                    📁 Upload Screenshot
                                                    <input
                                                        type="file"
                                                        id="screenshot-upload"
                                                        accept="image/*"
                                                        onChange={handleFileUpload}
                                                        className='screenshot-upload-input'
                                                    />
                                                </label>
                                            </div>
                                        ) : (
                                            <div className = 'screenshot-preview'>
                                                <div className = 'screenshot-info'>
                                                    {capturedScreenshot instanceof File 
                                                        ? `📁 ${capturedScreenshot.name} (${Math.round(capturedScreenshot.size / 1024)}KB)` 
                                                        : `📸 Screenshot captured (${Math.round(capturedScreenshot.size / 1024)}KB)`
                                                    }
                                                </div>
                                                <button
                                                    type = 'button'
                                                    onClick = {removeScreenshot}
                                                    className = 'screenshot-remove-button'
                                                >
                                                    ❌ Remove
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <small className = 'feedback-help'>
                                        Capture the current page or upload an existing screenshot to help us understand the issue better
                                    </small>
                                </div>
                                {/* Turnstile CAPTCHA */}
                                <div className='feedback-field'>
                                    <label className='feedback-label'>
                                        Security Verification <span className='required'>*</span>
                                    </label>
                                    <div className='turnstile-container'>
                                        {turnstileLoading && (
                                            <div className="turnstile-loading">
                                                🔄 Loading CAPTCHA...
                                            </div>
                                        )}
                                        
                                        <div
                                            className='cf-turnstile'
                                            data-sitekey={TURNSTILE_SITE_KEY}
                                            data-callback="handleTurnstileSuccess"
                                            data-error-callback="handleTurnstileError"
                                            data-expired-callback="handleTurnstileError"
                                            data-theme="auto"
                                            data-size="normal"
                                        ></div>
                                        
                                        {turnstileToken && (
                                            <small className="feedback-success-small">
                                                ✅ Verification complete
                                            </small>
                                        )}
                                        
                                        <small className='feedback-help'>
                                            Please verify you're human to submit feedback
                                        </small>
                                    </div>
                                </div>
                                {/* Submit Button */}
                                <div className = 'feedback-actions'>
                                    { submitStatus === 'success' && (
                                        <div className='feedback-success'>
                                            Thank you! Your feedback has been submitted.
                                        </div>
                                    )}

                                    { submitStatus === 'error' && (
                                        <div className='feedback-error'>
                                            Oops! Something went wrong. Please try again later.
                                        </div>
                                    )}

                                    <button 
                                        type="submit" 
                                        disabled={!isFormValid || isSubmitting}
                                        className={`feedback-submit ${isFormValid ? 'ready' : 'pending'}`}
                                    >
                                        {isSubmitting ? 'Sending...' : 
                                         !turnstileToken ? 'Submit CAPTCHA to Send' :
                                         !formData.issueType || !formData.description ? 'Fill Required Fields' :
                                         'Send Feedback'}
                                    </button>
                                </div>
                            </form>
                        </div>
                </div>
                
                {isHiddenForCapture && (
                    <div className="capture-in-progress">
                        📸 Capturing screenshot...
                    </div>
                )}
            </div>
        </div>
    );
};

export default FeedbackModal;