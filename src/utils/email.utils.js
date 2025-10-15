import dotenv from 'dotenv'
dotenv.config()
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);


export const sendEmailWithAttachment = async ({ recipient, subject, text, pdfBuffer, filename }) => {
    try {
        // PDF buffer ko Base64 string mein convert karein, jo SendGrid ke liye zaroori hai
        const attachmentInBase64 = pdfBuffer.toString('base64');

        const msg = {
            from: `MurArt <${process.env.EMAIL}>`, // Verified Sender
            to: recipient,
            subject: subject,
            text: text, // Plain text version of the email
            html: `<p>${text}</p>`, // HTML version of the email
            attachments: [
                {
                    content: attachmentInBase64,
                    filename: filename,
                    type: 'application/pdf',
                    disposition: 'attachment',
                },
            ],
        };

        await sgMail.send(msg);
        console.log(`Email with PDF attachment sent successfully to: ${to}`);
    } catch (error) {
        console.error('Error sending email with attachment:', error.response ? error.response.body : error.message);
        // Error ko aage throw karein taake catch block usay handle kar sake
        throw error;
    }
};