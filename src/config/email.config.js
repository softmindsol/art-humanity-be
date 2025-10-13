import dotenv from 'dotenv'
dotenv.config()
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Function to send email
export const sendEmail = async ({ recipient, subject, html, text }) => {
  try {
    const msg = {
      from: `MurArt <${process.env.EMAIL}>`, // sender address
      to: recipient, // recipient
      subject: subject, // email subject
      text,
      html, // email body
    };
    // Send the email
    await sgMail.send(msg);
    console.log('Email sent successfully to:', to);
  } catch (error) {
    console.error('Error sending email:', error.response ? error.response.body : error.message);
  }
};

