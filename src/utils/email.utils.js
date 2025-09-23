// utils/email.utils.js
import nodemailer from 'nodemailer';
 
const transporter = nodemailer.createTransport({
    service: 'gmail', // or your preferred service
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD, // Use an App Password for Gmail
    },
});

export const sendEmailWithAttachment = async ({ to, subject, text, pdfBuffer, filename }) => {
    const mailOptions = {
        from: process.env.EMAIL,
        to,
        subject,
        text,
        attachments: [{
            filename,
            content: pdfBuffer,
            contentType: 'application/pdf',
        }],
    };
    await transporter.sendMail(mailOptions);
};