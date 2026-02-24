// Email Service
// Handles email notifications and communications

const nodemailer = require('nodemailer');
const { logger } = require('./logger');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initialized = false;
        this.initialize();
    }

    /**
     * Initialize email transporter
     */
    async initialize() {
        try {
            // Check if email credentials are configured
            if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
                logger.warn('Email service not configured. Email functionality will be disabled.');
                return;
            }

            // Create transporter
            this.transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST,
                port: parseInt(process.env.EMAIL_PORT || '587'),
                secure: process.env.EMAIL_SECURE === 'true',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                }
            });

            // Verify connection
            await this.transporter.verify();
            this.initialized = true;
            logger.info('Email service initialized successfully');
        } catch (error) {
            logger.error('Email service initialization failed:', error);
            this.initialized = false;
        }
    }

    /**
     * Send email
     */
    async sendEmail(to, subject, html, text = null) {
        if (!this.initialized) {
            logger.warn('Email service not initialized. Email not sent.');
            return { success: false, error: 'Email service not configured' };
        }

        try {
            const mailOptions = {
                from: `"${process.env.EMAIL_FROM_NAME || 'CreatorSync'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
                to,
                subject,
                html,
                text: text || this.stripHtml(html)
            };

            const info = await this.transporter.sendMail(mailOptions);
            logger.info(`Email sent to ${to}: ${info.messageId}`);
            
            return { success: true, messageId: info.messageId };
        } catch (error) {
            logger.error('Email send error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send welcome email
     */
    async sendWelcomeEmail(user) {
        const subject = 'Welcome to CreatorSync!';
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #6366f1;">Welcome to CreatorSync, ${user.username}!</h1>
                <p>Thank you for joining the future of music monetization.</p>
                <p>With CreatorSync, you can:</p>
                <ul>
                    <li>🎵 Upload and sell your beats</li>
                    <li>💰 Earn money from your music</li>
                    <li>🤝 Collaborate with other artists</li>
                    <li>🎛️ Access professional production tools</li>
                </ul>
                <p>Get started by uploading your first beat!</p>
                <a href="${process.env.CLIENT_URL || 'http://localhost:5501'}" 
                   style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px;">
                    Go to Dashboard
                </a>
                <p style="margin-top: 30px; color: #666; font-size: 12px;">
                    If you have any questions, feel free to reach out to our support team.
                </p>
            </div>
        `;

        return await this.sendEmail(user.email, subject, html);
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(user, resetToken) {
        const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5501'}/reset-password?token=${resetToken}`;
        const subject = 'Reset Your Password';
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #6366f1;">Reset Your Password</h1>
                <p>Hi ${user.username},</p>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <a href="${resetUrl}" 
                   style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px;">
                    Reset Password
                </a>
                <p style="margin-top: 30px;">This link will expire in 1 hour.</p>
                <p style="color: #666; font-size: 12px;">
                    If you didn't request this, please ignore this email. Your password will remain unchanged.
                </p>
            </div>
        `;

        return await this.sendEmail(user.email, subject, html);
    }

    /**
     * Send purchase confirmation email
     */
    async sendPurchaseConfirmation(buyer, beat, amount) {
        const subject = 'Purchase Confirmation - CreatorSync';
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #6366f1;">Purchase Successful!</h1>
                <p>Hi ${buyer.username},</p>
                <p>Thank you for your purchase on CreatorSync!</p>
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="margin-top: 0;">Order Details</h2>
                    <p><strong>Beat:</strong> ${beat.title}</p>
                    <p><strong>Producer:</strong> ${beat.producer}</p>
                    <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
                    <p><strong>License:</strong> ${beat.license || 'Standard'}</p>
                </div>
                <p>You can now download your beat from your dashboard.</p>
                <a href="${process.env.CLIENT_URL || 'http://localhost:5501'}/dashboard" 
                   style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px;">
                    View Purchase
                </a>
            </div>
        `;

        return await this.sendEmail(buyer.email, subject, html);
    }

    /**
     * Send sale notification email to producer
     */
    async sendSaleNotification(producer, beat, amount, buyer) {
        const subject = 'You Made a Sale! 🎉';
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #6366f1;">Congratulations! You Made a Sale! 🎉</h1>
                <p>Hi ${producer.username},</p>
                <p>Great news! Your beat has been purchased.</p>
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="margin-top: 0;">Sale Details</h2>
                    <p><strong>Beat:</strong> ${beat.title}</p>
                    <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
                    <p><strong>Your Earnings:</strong> $${(amount * 0.85).toFixed(2)} (after 15% platform fee)</p>
                </div>
                <p>Keep creating amazing music!</p>
                <a href="${process.env.CLIENT_URL || 'http://localhost:5501'}/analytics" 
                   style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px;">
                    View Analytics
                </a>
            </div>
        `;

        return await this.sendEmail(producer.email, subject, html);
    }

    /**
     * Send collaboration invitation email
     */
    async sendCollaborationInvite(invitee, inviter, projectName) {
        const subject = 'Collaboration Invitation - CreatorSync';
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #6366f1;">You've Been Invited to Collaborate!</h1>
                <p>Hi ${invitee.username},</p>
                <p>${inviter.username} has invited you to collaborate on their project: <strong>${projectName}</strong></p>
                <p>Join the session to start creating music together in real-time!</p>
                <a href="${process.env.CLIENT_URL || 'http://localhost:5501'}/collaborate" 
                   style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px;">
                    Join Collaboration
                </a>
            </div>
        `;

        return await this.sendEmail(invitee.email, subject, html);
    }

    /**
     * Send subscription confirmation email
     */
    async sendSubscriptionConfirmation(user, plan) {
        const subject = 'Subscription Activated - CreatorSync';
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #6366f1;">Welcome to ${plan}!</h1>
                <p>Hi ${user.username},</p>
                <p>Your ${plan} subscription has been activated successfully!</p>
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="margin-top: 0;">Your Benefits</h2>
                    ${this.getSubscriptionBenefits(plan)}
                </div>
                <a href="${process.env.CLIENT_URL || 'http://localhost:5501'}/finisher" 
                   style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px;">
                    Access The Finisher
                </a>
            </div>
        `;

        return await this.sendEmail(user.email, subject, html);
    }

    /**
     * Send monthly summary email
     */
    async sendMonthlySummary(user, stats) {
        const subject = 'Your Monthly CreatorSync Summary';
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #6366f1;">Your Monthly Summary</h1>
                <p>Hi ${user.username},</p>
                <p>Here's how you did this month on CreatorSync:</p>
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h2 style="margin-top: 0;">Stats</h2>
                    <p><strong>Total Plays:</strong> ${stats.plays || 0}</p>
                    <p><strong>Total Sales:</strong> ${stats.sales || 0}</p>
                    <p><strong>Revenue:</strong> $${(stats.revenue || 0).toFixed(2)}</p>
                    <p><strong>New Followers:</strong> ${stats.newFollowers || 0}</p>
                </div>
                <p>Keep up the great work!</p>
                <a href="${process.env.CLIENT_URL || 'http://localhost:5501'}/analytics" 
                   style="display: inline-block; padding: 12px 24px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px;">
                    View Full Analytics
                </a>
            </div>
        `;

        return await this.sendEmail(user.email, subject, html);
    }

    /**
     * Get subscription benefits HTML
     */
    getSubscriptionBenefits(plan) {
        const benefits = {
            'Pro': `
                <ul>
                    <li>Access to The Finisher production suite</li>
                    <li>AI Songwriter Assistant</li>
                    <li>Advanced analytics</li>
                    <li>Priority support</li>
                    <li>Unlimited uploads</li>
                </ul>
            `,
            'Enterprise': `
                <ul>
                    <li>Everything in Pro</li>
                    <li>White-label options</li>
                    <li>API access</li>
                    <li>Dedicated account manager</li>
                    <li>Custom integrations</li>
                </ul>
            `
        };

        return benefits[plan] || '<p>Thank you for subscribing!</p>';
    }

    /**
     * Strip HTML tags from text
     */
    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }
}

// Export singleton instance
module.exports = new EmailService();

