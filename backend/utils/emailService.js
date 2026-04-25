const sgMail = require('@sendgrid/mail');
const fs = require('fs');
require('dotenv').config();

let isConfigured = false;

function initSendGrid() {
    if (!isConfigured) {
        if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_SENDER_EMAIL) {
            console.error('[Email Service] Error: SENDGRID_API_KEY or SENDGRID_SENDER_EMAIL environment variables are missing.');
            console.error('Please configure them in your .env file to enable email dispatch.');
            return false;
        }

        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        console.log(`[Email Service] SendGrid Initialized with Sender: ${process.env.SENDGRID_SENDER_EMAIL}`);
        isConfigured = true;
    }
    return isConfigured;
}

exports.sendEmailWithAttachment = async (toEmail, subject, text, attachmentPath) => {
    try {
        if (!initSendGrid()) {
            console.warn(`[Email Service] Skipping email to ${toEmail} because SendGrid is not configured.`);
            return false;
        }

        let attachments = [];
        if (attachmentPath && fs.existsSync(attachmentPath)) {
            const fileName = attachmentPath.split(/[\\\/]/).pop();
            // SendGrid requires attachments to be base64 encoded strings
            const attachmentBuffer = fs.readFileSync(attachmentPath);
            const base64Attachment = attachmentBuffer.toString('base64');
            
            attachments.push({
                content: base64Attachment,
                filename: fileName,
                type: 'application/pdf',
                disposition: 'attachment'
            });
        } else {
            console.warn(`[Email Service] Attachment not found at path: ${attachmentPath}`);
        }

        const msg = {
            to: toEmail,
            from: process.env.SENDGRID_SENDER_EMAIL,
            subject: subject,
            text: text,
            attachments: attachments
        };

        await sgMail.send(msg);

        console.log(`\n======================================================`);
        console.log(`[Email Service] Email sent successfully via SendGrid API!`);
        console.log(`To: ${toEmail}`);
        console.log(`Subject: ${subject}`);
        console.log(`======================================================\n`);

        return true;
    } catch (error) {
        console.error(`[Email Service] Failed to send email via SendGrid:`);
        if (error.response) {
            console.error(error.response.body);
        } else {
            console.error(error);
        }
        return false;
    }
};
