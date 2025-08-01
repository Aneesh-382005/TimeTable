import html2canvas from 'html2canvas';
import React, { useState } from 'react';
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
        setIsSubmitting(true);

        try {
            console.log('Form Data:', formData);
            setSubmitStatus('success');

            setTimeout(() => {
                setSubmitStatus(null);
                setFormData({
                    issueType: '',
                    description: '',
                    email: '',
                    pageURL: window.location.href,
                    userAgent: navigator.userAgent
                });
                handleClose();
            }, 2000);
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

    return (
        <div className={`feedback-popup ${show ? 'show' : ''} ${isHiddenForCapture ? 'hidden-for-capture' : ''}`}>
            <div className="feedback-popup-content">
                {!isHiddenForCapture && (
                    <>
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
                                        type = "submit"
                                        className = 'feedback-submit'
                                        disabled = {isSubmitting}
                                    >
                                        {isSubmitting ? 'Sending...': 'Send Feedback'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </>
                )}
                
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